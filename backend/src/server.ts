import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

// Internal imports
import { database } from './config/database';
import authRoutes from './routes/authRoutes';
import transactionRoutes from './routes/transactionRoutes';
import blockchainRoutes from './routes/blockchainRoutes';
import miningRoutes from './routes/miningRoutes';
import { logger } from './utils/logger';
import { blockchainService } from './services/blockchainService';
import { NetworkService } from './services/networkService';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize network service variable
let networkService: NetworkService | undefined;

// Security middleware
app.use(helmet());

// CORS with enhanced origin validation
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', 
  'http://localhost:5174',
  'http://localhost:5175',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS policy'));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// NoSQL injection prevention
app.use(mongoSanitize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/mining', miningRoutes);

// Health check with network status
app.get('/health', async (req, res) => {
  const dbHealth = await database.healthCheck();
  const networkStats = networkService?.getNetworkStats();

  res.json({
    success: true,
    message: 'SandiCoin Backend is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: dbHealth.status,
    services: {
      api: 'healthy',
      database: dbHealth.status,
      network: networkService ? 'enabled' : 'disabled',
    },
    network: networkStats || null,
  });
});

// Network stats endpoint
app.get('/api/network/stats', (req, res) => {
  if (!networkService) {
    res.status(404).json({
      success: false,
      message: 'Network service is not enabled',
    });
    return;
  }

  res.json({
    success: true,
    data: networkService.getNetworkStats(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error('Unhandled error:', error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }
);

// Start server with optional database connection
const startServer = async () => {
  try {
    // Try to connect to database (non-blocking for development)
    try {
      await database.connect();
      logger.success('Database connected successfully');
    } catch (dbError) {
      logger.warn('Database connection failed - starting in offline mode');
      logger.warn('Authentication features will not work without database');
      console.log('⚠️  Database connection failed - starting in offline mode');
      console.log('💡 To use authentication, make sure MongoDB is running');
    }

    // Initialize blockchain service
    await blockchainService.initialize();
    logger.info('Blockchain service initialized');

    // Initialize network service
    if (process.env.ENABLE_NETWORK !== 'false') {
      try {
        networkService = new NetworkService(
          blockchainService.blockchain,
          blockchainService.transactionPool
        );
        networkService.listen();
        logger.success('Network service started');
      } catch (networkError) {
        logger.error('Failed to start network service:', networkError);
        logger.warn('Continuing without network functionality');
      }
    } else {
      logger.info('Network service disabled by configuration');
    }

    app.listen(PORT, () => {
      logger.success(`SandiCoin server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`Authentication API: http://localhost:${PORT}/api/auth`);
      logger.info(
        `Transactions API: http://localhost:${PORT}/api/transactions`
      );
      logger.info(`Blockchain API: http://localhost:${PORT}/api/blockchain`);
      logger.info(`Mining API: http://localhost:${PORT}/api/mining`);

      console.log(`🚀 SandiCoin server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Authentication: http://localhost:${PORT}/api/auth`);
      console.log(`💰 Transactions: http://localhost:${PORT}/api/transactions`);
      console.log(`⛓️  Blockchain: http://localhost:${PORT}/api/blockchain`);
      console.log(`⛏️  Mining: http://localhost:${PORT}/api/mining`);

      if (networkService) {
        const socketPort = process.env.SOCKET_PORT || 5001;
        console.log(`🌐 P2P Network: ws://localhost:${socketPort}`);
        console.log(
          `🔗 Network stats: http://localhost:${PORT}/api/network/stats`
        );

        const peerNodes = process.env.PEER_NODES;
        if (peerNodes) {
          console.log(`🔗 Connecting to peers: ${peerNodes}`);
        } else {
          console.log(
            `💡 To connect to peers, set PEER_NODES environment variable`
          );
        }
      } else {
        console.log(`📴 Network service disabled`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Export network service for use in controllers
export { networkService };

startServer();
