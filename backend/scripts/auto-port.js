#!/usr/bin/env node

/**
 * Auto Port Assignment Script for SandiCoin
 * Automatically assigns available ports and configures peer connections
 */

const fs = require('fs');
const path = require('path');
const net = require('net');

// Base ports
const BASE_API_PORT = 3000;
const BASE_SOCKET_PORT = 5001;
const PORT_STATE_FILE = path.join(__dirname, '..', '.port-state.json');

// Check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, (err) => {
      if (err) {
        resolve(false);
      } else {
        server.once('close', () => resolve(true));
        server.close();
      }
    });
    
    server.on('error', () => resolve(false));
  });
}

// Find next available port
async function findNextAvailablePort(basePort) {
  let port = basePort;
  while (!(await isPortAvailable(port))) {
    port++;
  }
  return port;
}

// Load existing port state
function loadPortState() {
  try {
    if (fs.existsSync(PORT_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(PORT_STATE_FILE, 'utf8'));
    }
  } catch (error) {
    console.log('Creating new port state file...');
  }
  return { nodes: [], nextNodeIndex: 0 };
}

// Save port state
function savePortState(state) {
  fs.writeFileSync(PORT_STATE_FILE, JSON.stringify(state, null, 2));
}

// Get existing peer nodes for connection using mesh topology
function getPeerNodes(currentSocketPort, allNodes) {
  const otherNodes = allNodes.filter(node => node.socketPort !== currentSocketPort);
  
  // If no other nodes exist, return empty
  if (otherNodes.length === 0) return '';
  
  // Mesh topology: each node connects to 2 peers (or all available if less than 2)
  // This creates redundant paths without full connectivity
  const maxConnections = Math.min(2, otherNodes.length);
  
  // Sort nodes by socket port for consistent peer selection
  const sortedNodes = otherNodes.sort((a, b) => a.socketPort - b.socketPort);
  
  // Find current node index in the sorted list
  const currentNodeIndex = allNodes
    .sort((a, b) => a.socketPort - b.socketPort)
    .findIndex(node => node.socketPort === currentSocketPort);
  
  // Select peers in a circular pattern to create mesh connectivity
  const peers = [];
  for (let i = 0; i < maxConnections; i++) {
    const peerIndex = (currentNodeIndex + i + 1) % sortedNodes.length;
    peers.push(sortedNodes[peerIndex]);
  }
  
  return peers
    .map(node => `ws://localhost:${node.socketPort}`)
    .join(',');
}

// Main function
async function assignPorts() {
  const state = loadPortState();
  
  // Find next available ports
  const apiPort = await findNextAvailablePort(BASE_API_PORT + state.nextNodeIndex);
  const socketPort = await findNextAvailablePort(BASE_SOCKET_PORT + state.nextNodeIndex);
  
  // Calculate node index based on API port
  const nodeIndex = apiPort - BASE_API_PORT;
  
  // Add this node to state
  const newNode = {
    nodeIndex,
    apiPort,
    socketPort,
    startTime: new Date().toISOString()
  };
  
  state.nodes.push(newNode);
  state.nextNodeIndex = nodeIndex + 1;
  
  // Get peer connections (exclude self)
  const peerNodes = getPeerNodes(socketPort, state.nodes);
  
  // Save updated state
  savePortState(state);
  
  // Output environment variables for the spawned process
  console.log(`PORT=${apiPort}`);
  console.log(`SOCKET_PORT=${socketPort}`);
  console.log(`NODE_ENV=development`);
  console.log(`PEER_NODES=${peerNodes}`);
  
  // Log info to stderr so it doesn't interfere with env vars
  console.error(`🚀 Starting SandiCoin Node ${nodeIndex + 1}`);
  console.error(`📡 API Port: ${apiPort}`);
  console.error(`🌐 Socket Port: ${socketPort}`);
  if (peerNodes) {
    console.error(`🔗 Connecting to ${peerNodes.split(',').length} peer(s)`);
  } else {
    console.error(`💡 First node - no peers to connect to`);
  }
  console.error(`📊 Total nodes running: ${state.nodes.length}`);
}

// Cleanup function for when nodes shut down
function cleanup() {
  const state = loadPortState();
  
  // In a real implementation, you'd track which processes are still running
  // For now, we'll just reset the state when no processes are detected
  console.error('🧹 Cleaning up port state...');
  
  // Reset state
  fs.writeFileSync(PORT_STATE_FILE, JSON.stringify({ nodes: [], nextNodeIndex: 0 }, null, 2));
}

// Handle script arguments
if (process.argv.includes('--cleanup')) {
  cleanup();
} else {
  assignPorts().catch(console.error);
}