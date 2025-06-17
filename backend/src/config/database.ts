import mongoose from 'mongoose';
import { logger } from '../utils/logger';

/**
 * Database configuration for SandiCoin
 * Handles MongoDB connection and configuration
 */

interface DatabaseConnection {
  isConnected: boolean;
  connection?: typeof mongoose;
}

class Database {
  private static instance: Database;
  private connectionState: DatabaseConnection = { isConnected: false };

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // Connect to MongoDB
  public async connect(): Promise<void> {
    try {
      if (this.connectionState.isConnected) {
        logger.info('Already connected to MongoDB');
        return;
      }

      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not defined');
      }

      logger.info('Connecting to MongoDB...');

      const connection = await mongoose.connect(mongoUri, {
        // Connection options for better reliability
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferCommands: false, // Disable mongoose buffering
        bufferMaxEntries: 0, // Disable mongoose buffering
      });

      this.connectionState.isConnected = true;
      this.connectionState.connection = connection;

      logger.success(`Connected to MongoDB: ${connection.connection.host}`);

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.connectionState.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.connectionState.isConnected = false;
      });

      // Handle process termination
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      this.connectionState.isConnected = false;
      throw error;
    }
  }

  // Disconnect from MongoDB
  public async disconnect(): Promise<void> {
    try {
      if (!this.connectionState.isConnected) {
        logger.info('Not connected to MongoDB');
        return;
      }

      await mongoose.disconnect();
      this.connectionState.isConnected = false;
      this.connectionState.connection = undefined;

      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  // Get connection status
  public getConnectionState(): DatabaseConnection {
    return { ...this.connectionState };
  }

  // Health check
  public async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      if (!this.connectionState.isConnected || !mongoose.connection.db) {
        return {
          status: 'disconnected',
          details: { connected: false },
        };
      }

      // Ping the database
      const adminDb = mongoose.connection.db.admin();
      const result = await adminDb.ping();

      return {
        status: 'healthy',
        details: {
          connected: true,
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name,
          readyState: mongoose.connection.readyState,
          ping: result,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        details: { error: (error as Error).message },
      };
    }
  }
}

// Export singleton instance
export const database = Database.getInstance();
