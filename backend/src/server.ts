import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());

// Test route
app.get('/health', (req, res) => {
  res.json({
    message: 'SandiCoin Backend is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SandiCoin server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
