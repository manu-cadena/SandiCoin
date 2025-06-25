import { WebSocket, WebSocketServer } from 'ws';
import { Blockchain } from '../models/Blockchain';
import { TransactionPool } from '../models/TransactionPool';
import { Transaction } from '../models/Transaction';
import { logger } from '../utils/logger';

/**
 * Network Service for SandiCoin P2P Communication
 * Handles multi-node synchronization for blockchain and transactions
 */

const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || '5001');
const PEER_NODES = process.env.PEER_NODES
  ? process.env.PEER_NODES.split(',').filter((node) => node.trim())
  : [];

export class NetworkService {
  private blockchain: Blockchain;
  private transactionPool: TransactionPool;
  private nodes: WebSocket[] = [];
  private nodeId: string;

  constructor(blockchain: Blockchain, transactionPool: TransactionPool) {
    this.blockchain = blockchain;
    this.transactionPool = transactionPool;
    this.nodeId = this.generateNodeId();

    logger.network(`Network service initialized for node: ${this.nodeId}`);
  }

  /**
   * Start WebSocket server and connect to peers
   */
  listen(): void {
    console.log('SOCKET_PORT', SOCKET_PORT);

    // Create WebSocket server
    const server = new WebSocketServer({
      port: SOCKET_PORT,
      perMessageDeflate: false, // Disable compression for faster sync
    });

    // Listen for incoming connections
    server.on('connection', (socket, req) => {
      const clientIP = req.socket.remoteAddress;
      logger.network(`New node connected from ${clientIP}`);
      this.connectNode(socket);
    });

    server.on('error', (error) => {
      logger.error('WebSocket server error:', error);
    });

    // Connect to existing peer nodes
    this.connectToPeers();

    logger.success(`🌐 SandiCoin network listening on port ${SOCKET_PORT}`);
    console.log(
      `🌐 Node ${this.nodeId} listening on ws://localhost:${SOCKET_PORT}`
    );
  }

  /**
   * Connect to existing peer nodes
   */
  private connectToPeers(): void {
    if (PEER_NODES.length === 0) {
      logger.info('No peer nodes configured');
      return;
    }

    logger.network(
      `Attempting to connect to ${PEER_NODES.length} peer(s): ${PEER_NODES.join(
        ', '
      )}`
    );

    PEER_NODES.forEach((nodeUrl) => {
      try {
        const socket = new WebSocket(nodeUrl);

        socket.on('open', () => {
          logger.network(`✅ Connected to peer: ${nodeUrl}`);
          this.connectNode(socket);

          // Request initial sync when connecting to a peer
          this.requestSync(socket);
        });

        socket.on('error', (error) => {
          logger.warn(
            `❌ Failed to connect to peer ${nodeUrl}:`,
            error.message
          );
        });

        // Connection timeout
        setTimeout(() => {
          if (socket.readyState === WebSocket.CONNECTING) {
            socket.close();
            logger.warn(`⏰ Connection timeout for peer: ${nodeUrl}`);
          }
        }, 5000);
      } catch (error) {
        logger.error(`Error connecting to ${nodeUrl}:`, error);
      }
    });
  }

  /**
   * Request initial sync from a peer
   */
  private requestSync(socket: WebSocket): void {
    const syncRequest = {
      type: 'SYNC_REQUEST',
      nodeId: this.nodeId,
      timestamp: Date.now(),
    };

    this.sendMessage(socket, syncRequest);
    logger.network('Initial sync requested from peer');
  }

  /**
   * Handle new node connection
   */
  private connectNode(socket: WebSocket): void {
    this.nodes.push(socket);
    logger.network(
      `📡 Node connected. Total active connections: ${this.nodes.length}`
    );

    // Set up message handler
    this.messageHandler(socket);

    // Send welcome message with current state
    this.sendInitialSync(socket);

    // Handle disconnection
    socket.on('close', () => {
      this.nodes = this.nodes.filter((node) => node !== socket);
      logger.network(
        `📴 Node disconnected. Remaining connections: ${this.nodes.length}`
      );
    });

    socket.on('error', (error) => {
      logger.warn('Node connection error:', error.message);
      this.nodes = this.nodes.filter((node) => node !== socket);
    });
  }

  /**
   * Send initial blockchain and transaction pool to new connection
   */
  private sendInitialSync(socket: WebSocket): void {
    // Send blockchain
    const blockchainMessage = {
      type: 'BLOCKCHAIN_SYNC',
      blockchain: this.blockchain.chain,
      nodeId: this.nodeId,
      timestamp: Date.now(),
    };

    // Send transaction pool
    const transactionMessage = {
      type: 'TRANSACTION_POOL_SYNC',
      transactionPool: this.transactionPool.toJSON(),
      nodeId: this.nodeId,
      timestamp: Date.now(),
    };

    this.sendMessage(socket, blockchainMessage);
    this.sendMessage(socket, transactionMessage);

    logger.network('Initial sync data sent to new node');
  }

  /**
   * Handle incoming messages from peers
   */
  private messageHandler(socket: WebSocket): void {
    socket.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        // Ignore messages from ourselves
        if (data.nodeId === this.nodeId) {
          return;
        }

        logger.network(`📨 Received ${data.type} from node ${data.nodeId}`);

        switch (data.type) {
          case 'BLOCKCHAIN_SYNC':
            this.handleBlockchainSync(data.blockchain);
            break;

          case 'NEW_BLOCK':
            this.handleNewBlock(data.blockchain);
            break;

          case 'NEW_TRANSACTION':
            this.handleNewTransaction(data.transaction);
            break;

          case 'TRANSACTION_POOL_SYNC':
            this.handleTransactionPoolSync(data.transactionPool);
            break;

          case 'SYNC_REQUEST':
            this.sendInitialSync(socket);
            break;

          case 'PING':
            this.sendMessage(socket, {
              type: 'PONG',
              nodeId: this.nodeId,
              timestamp: Date.now(),
            });
            break;

          default:
            logger.warn(`❓ Unknown message type: ${data.type}`);
        }
      } catch (error) {
        logger.error('Error handling network message:', error);
      }
    });
  }

  /**
   * Handle blockchain synchronization from network
   */
  private handleBlockchainSync(incomingChain: any[]): void {
    try {
      const originalLength = this.blockchain.getLength();

      // Convert raw objects to Block instances
      const { Block } = require('../models/Block');
      const blockInstances = incomingChain.map(blockData => new Block(blockData));

      if (this.blockchain.replaceChain(blockInstances)) {
        const newLength = this.blockchain.getLength();
        logger.success(
          `⛓️  Blockchain updated! ${originalLength} → ${newLength} blocks`
        );

        // Clear transactions that are now mined
        this.transactionPool.clearTransactions({ chain: incomingChain });
        logger.info('💰 Transaction pool synchronized with new blockchain');
      } else {
        logger.info(
          '📋 Blockchain sync: No update needed (chain not longer or invalid)'
        );
      }
    } catch (error) {
      logger.error('Error updating blockchain from network:', error);
    }
  }

  /**
   * Handle new block broadcast (same as blockchain sync but with different logging)
   */
  private handleNewBlock(incomingChain: any[]): void {
    try {
      const originalLength = this.blockchain.getLength();

      // Convert raw objects to Block instances
      const { Block } = require('../models/Block');
      const blockInstances = incomingChain.map(blockData => new Block(blockData));

      if (this.blockchain.replaceChain(blockInstances)) {
        const newLength = this.blockchain.getLength();
        logger.success(
          `🆕 New block received! Chain: ${originalLength} → ${newLength} blocks`
        );

        // Clear transactions that are now mined
        this.transactionPool.clearTransactions({ chain: incomingChain });
        logger.info('💰 Transaction pool cleared of mined transactions');
      }
    } catch (error) {
      logger.error('Error handling new block from network:', error);
    }
  }

  /**
   * Handle new transaction from network
   */
  private handleNewTransaction(transactionData: any): void {
    try {
      const transaction = new Transaction(transactionData);

      // Only add if valid and not already in pool
      if (Transaction.validateTransaction(transaction)) {
        const existingTx = this.transactionPool.getTransaction(transaction.id);
        if (!existingTx) {
          this.transactionPool.setTransaction(transaction);
          logger.info(
            `💸 New transaction added from network: ${transaction.id.substring(
              0,
              8
            )}...`
          );
        } else {
          logger.info(
            `💸 Transaction already in pool: ${transaction.id.substring(
              0,
              8
            )}...`
          );
        }
      } else {
        logger.warn(
          `❌ Invalid transaction received: ${transaction.id.substring(
            0,
            8
          )}...`
        );
      }
    } catch (error) {
      logger.error('Error handling network transaction:', error);
    }
  }

  /**
   * Handle transaction pool synchronization from network
   */
  private handleTransactionPoolSync(poolData: any): void {
    try {
      let addedCount = 0;

      if (poolData.transactionMap) {
        Object.entries(poolData.transactionMap).forEach(
          ([id, txData]: [string, any]) => {
            const transaction = new Transaction(txData);
            if (
              Transaction.validateTransaction(transaction) &&
              !this.transactionPool.getTransaction(transaction.id)
            ) {
              this.transactionPool.setTransaction(transaction);
              addedCount++;
            }
          }
        );

        if (addedCount > 0) {
          logger.info(
            `💰 Transaction pool sync: Added ${addedCount} new transactions`
          );
        } else {
          logger.info('💰 Transaction pool sync: No new transactions');
        }
      }
    } catch (error) {
      logger.error('Error updating transaction pool from network:', error);
    }
  }

  /**
   * Send message to specific socket
   */
  private sendMessage(socket: WebSocket, message: any): void {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Error sending message to node:', error);
        // Remove failed connection
        this.nodes = this.nodes.filter((node) => node !== socket);
      }
    }
  }

  /**
   * Broadcast new blockchain to all connected nodes (after mining)
   */
  broadcastBlockchain(): void {
    const message = {
      type: 'NEW_BLOCK',
      blockchain: this.blockchain.chain,
      nodeId: this.nodeId,
      timestamp: Date.now(),
    };

    this.broadcast(message);
    logger.network(`⛓️  New block broadcasted to ${this.nodes.length} nodes`);
  }

  /**
   * Broadcast new transaction to all connected nodes
   */
  broadcastTransaction(transaction: Transaction): void {
    const message = {
      type: 'NEW_TRANSACTION',
      transaction: transaction.toJSON(),
      nodeId: this.nodeId,
      timestamp: Date.now(),
    };

    this.broadcast(message);
    logger.network(
      `💸 Transaction broadcasted to ${
        this.nodes.length
      } nodes: ${transaction.id.substring(0, 8)}...`
    );
  }

  /**
   * Broadcast to all connected nodes
   */
  private broadcast(message: any): void {
    const messageString = JSON.stringify(message);
    let successCount = 0;

    this.nodes.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(messageString);
          successCount++;
        } catch (error) {
          logger.error('Error broadcasting to node:', error);
          // Remove failed connection
          this.nodes = this.nodes.filter((node) => node !== socket);
        }
      } else {
        // Clean up closed connections
        this.nodes = this.nodes.filter((node) => node !== socket);
      }
    });

    if (successCount !== this.nodes.length) {
      logger.warn(
        `📡 Broadcast sent to ${successCount}/${this.nodes.length} nodes (cleaned up dead connections)`
      );
    }
  }

  /**
   * Generate unique node identifier
   */
  private generateNodeId(): string {
    return `sandi-${Math.random().toString(36).substring(2, 8)}-${Date.now()
      .toString()
      .slice(-6)}`;
  }

  /**
   * Get network statistics
   */
  getNetworkStats() {
    return {
      nodeId: this.nodeId,
      connectedNodes: this.nodes.length,
      serverPort: SOCKET_PORT,
      peerNodes: PEER_NODES,
      chainLength: this.blockchain.getLength(),
      pendingTransactions: this.transactionPool.getTransactionCount(),
    };
  }

  /**
   * Ping all connected nodes (for health checking)
   */
  pingNodes(): void {
    const pingMessage = {
      type: 'PING',
      nodeId: this.nodeId,
      timestamp: Date.now(),
    };

    this.broadcast(pingMessage);
    logger.network(`🏓 Ping sent to ${this.nodes.length} nodes`);
  }

  /**
   * Stop network service
   */
  stop(): void {
    this.nodes.forEach((socket) => {
      socket.close();
    });
    this.nodes = [];
    logger.network('🛑 Network service stopped');
  }
}
