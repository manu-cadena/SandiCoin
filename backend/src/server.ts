import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Internal imports
import { database } from './config/database';
import authRoutes from './routes/authRoutes';
import transactionRoutes from './routes/transactionRoutes';
import blockchainRoutes from './routes/blockchainRoutes';
import miningRoutes from './routes/miningRoutes';
import { logger } from './utils/logger';
import { blockchainService } from './services/blockchainService';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/mining', miningRoutes);

// Health check
app.get('/health', async (req, res) => {
  const dbHealth = await database.healthCheck();

  res.json({
    success: true,
    message: 'SandiCoin Backend is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: dbHealth.status,
    services: {
      api: 'healthy',
      database: dbHealth.status,
    },
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
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
