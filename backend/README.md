# 🪙 SandiCoin - Complete Cryptocurrency System

A full-featured cryptocurrency implementation built with Node.js, TypeScript, and MongoDB. SandiCoin provides a complete blockchain network with mining, transactions, P2P networking, and a comprehensive REST API.

## 🌟 Features

### 🔐 **Authentication & Security**
- JWT-based authentication with access and refresh tokens
- Role-based authorization (user, miner, admin)
- Secure password hashing with bcrypt
- HTTP-only cookie support for refresh tokens
- Rate limiting and security headers

### 💰 **Cryptocurrency Core**
- Bitcoin-style ECDSA addresses (e.g., `1ECQYSecMLQPox56db5AHoXUpY5RSUjeJB`)
- Digital signatures using secp256k1 curve
- Transaction pools (mempool) with validation
- Proof-of-work mining with adjustable difficulty
- Blockchain consensus and validation
- Starting balance: 1000 SandiCoins per user

### 🌐 **P2P Network**
- WebSocket-based peer-to-peer communication
- Real-time transaction and block broadcasting
- Automatic blockchain synchronization
- Auto-port assignment for unlimited nodes
- Network discovery and peer management

### 🏗️ **Architecture**
- RESTful API with comprehensive endpoints
- MongoDB for user and persistent data storage
- In-memory blockchain and transaction pools
- Modular TypeScript architecture
- Environment-based configuration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB running on localhost:27017
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd SandiCoin/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Required Environment Variables

Create a `.env` file:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/sandicoin

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Server Configuration
PORT=3000
NODE_ENV=development

# Mining Configuration
MINING_REWARD=50
MINE_RATE=1000
STARTING_BALANCE=1000

# Network Configuration
ENABLE_NETWORK=true
SOCKET_PORT=5001
PEER_NODES=

# Security
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

### Running the Application

```bash
# Single node
npm run dev

# Multiple nodes (automatic port assignment)
npm run dev  # Node 1: API=3000, Socket=5001
npm run dev  # Node 2: API=3001, Socket=5002  
npm run dev  # Node 3: API=3002, Socket=5003

# Clean restart (reset all nodes)
npm run dev:reset

# Production build
npm run build
npm start
```

## 📡 API Documentation

### Base URL
```
http://localhost:3000/api
```

### 🔐 Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com", 
  "password": "password123",
  "role": "user"  // optional: user, miner, admin
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "firstName": "John",
      "lastName": "Doe", 
      "email": "john@example.com",
      "role": "user",
      "walletPublicKey": "1ECQYSecMLQPox56db5AHoXUpY5RSUjeJB",
      "createdAt": "2025-01-20T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2025-01-27T10:30:00.000Z",
    "wallet": {
      "publicKey": "1ECQYSecMLQPox56db5AHoXUpY5RSUjeJB",
      "balance": 1000
    }
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

#### Logout
```http
POST /api/auth/logout
```

#### Refresh Token
```http
POST /api/auth/refresh-token
```

### 💸 Transaction Endpoints

#### Create Transaction
```http
POST /api/transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipient": "alice@example.com",  // Email or Bitcoin address
  "amount": 100
}
```

#### Get User Transactions
```http
GET /api/transactions
Authorization: Bearer <token>
```

#### Get Transaction by ID
```http
GET /api/transactions/{id}
Authorization: Bearer <token>
```

#### Get Pending Transactions
```http
GET /api/transactions/pool/pending
Authorization: Bearer <token>
```

#### Get Wallet Balance
```http
GET /api/transactions/wallet/balance
Authorization: Bearer <token>
```

### ⛓️ Blockchain Endpoints

#### Get Blockchain
```http
GET /api/blockchain
```

#### Get Blockchain Statistics
```http
GET /api/blockchain/stats
```

#### Get Block by Hash
```http
GET /api/blockchain/hash/{hash}
```

#### Get Block by Index
```http
GET /api/blockchain/block/{index}
```

#### Mine Custom Block (Admin/Miner)
```http
POST /api/blockchain/mine
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": ["custom", "block", "data"]
}
```

### ⛏️ Mining Endpoints

#### Mine Pending Transactions
```http
POST /api/mining/mine
Authorization: Bearer <token>
```

#### Get Mining Statistics
```http
GET /api/mining/stats
Authorization: Bearer <token>
```

#### Get Transactions Ready for Mining
```http
GET /api/mining/pending
Authorization: Bearer <token>
```

### 🌐 Network & Health Endpoints

#### Health Check
```http
GET /health
```

#### Network Statistics
```http
GET /api/network/stats
```

## 🏗️ Architecture Overview

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Controllers   │    │    Services     │    │     Models      │
│                 │    │                 │    │                 │
│ • AuthController│────│ • AuthService   │────│ • User          │
│ • TxController  │    │ • NetworkService│    │ • Transaction   │
│ • BlockController│   │ • Blockchain    │    │ • Block         │
│ • MiningController│  │ • TransactionPool│   │ • Wallet        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ├───────────────────────┼───────────────────────┤
         │              ┌─────────────────┐               │
         └──────────────│   Middleware    │───────────────┘
                        │ • Authentication│
                        │ • Authorization │
                        │ • Rate Limiting │
                        │ • Error Handling│
                        └─────────────────┘
```

### Database Schema

#### User Collection
```typescript
{
  _id: ObjectId,
  firstName: string,
  lastName: string, 
  email: string,          // Unique
  password: string,       // Hashed with bcrypt
  role: "user" | "miner" | "admin",
  walletPublicKey: string,         // Bitcoin-style address
  walletPrivateKey: string,        // Encrypted
  walletCryptoPublicKey: string,   // PEM format for signatures
  isActive: boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Blockchain Structure

#### Block
```typescript
{
  timestamp: number,
  lastHash: string,     // Previous block hash
  hash: string,         // Current block hash
  data: Transaction[],  // Array of transactions
  nonce: number,        // Proof-of-work nonce
  difficulty: number    // Mining difficulty
}
```

#### Transaction
```typescript
{
  id: string,           // UUID
  input: {
    timestamp: number,
    amount: number,              // Sender balance
    address: string,             // Bitcoin-style sender address
    cryptoPublicKey: string,     // PEM public key for verification
    signature: string            // ECDSA signature
  },
  outputMap: {
    [address]: amount            // recipient -> amount mapping
  }
}
```

## 🔒 Security Features

### Cryptographic Security
- **ECDSA signatures** using secp256k1 curve (same as Bitcoin)
- **SHA-256 hashing** for blocks and transactions
- **Bitcoin-style addresses** with Base58 encoding
- **Digital signature verification** for all transactions

### API Security
- **JWT authentication** with short-lived access tokens
- **HTTP-only refresh tokens** for security
- **Rate limiting** (100 requests per 15 minutes)
- **Helmet.js** security headers
- **CORS protection** with configurable origins
- **Input validation** and sanitization

### Network Security
- **WebSocket secure connections** for P2P communication
- **Signature verification** for all network messages
- **Blockchain validation** on every sync
- **Peer verification** and connection limits

## 🌐 Multi-Node Network

### Network Topology
```
     Node 1 (3000)        Node 2 (3001)        Node 3 (3002)
    ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
    │   API       │      │   API       │      │   API       │
    │   Gateway   │      │   Gateway   │      │   Gateway   │
    └─────────────┘      └─────────────┘      └─────────────┘
           │                     │                     │
    ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
    │ WebSocket   │──────│ WebSocket   │──────│ WebSocket   │
    │ (5001)      │      │ (5002)      │      │ (5003)      │
    └─────────────┘      └─────────────┘      └─────────────┘
           │                     │                     │
    ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
    │ Blockchain  │      │ Blockchain  │      │ Blockchain  │
    │ (Synced)    │      │ (Synced)    │      │ (Synced)    │
    └─────────────┘      └─────────────┘      └─────────────┘
```

### P2P Communication
- **Real-time broadcasting** of transactions and blocks
- **Automatic synchronization** of blockchain state
- **Peer discovery** and connection management
- **Fault tolerance** with automatic reconnection

### Scaling
```bash
# Start unlimited nodes automatically
npm run dev  # Node 1
npm run dev  # Node 2  
npm run dev  # Node 3
npm run dev  # Node N...

# Each node gets unique ports automatically:
# Node 1: API=3000, Socket=5001
# Node 2: API=3001, Socket=5002
# Node N: API=3000+N-1, Socket=5000+N
```

## ⛏️ Mining System

### Proof of Work Algorithm
1. **Collect pending transactions** from mempool
2. **Validate each transaction** (signature, balance, format)
3. **Create reward transaction** for miner
4. **Generate block** with transactions
5. **Find nonce** that creates hash with required difficulty
6. **Broadcast new block** to network
7. **Clear transaction pool** of mined transactions

### Mining Configuration
```typescript
// Default values
MINING_REWARD = 50        // SandiCoins per block
MINE_RATE = 1000         // Target block time (ms)
DIFFICULTY_ADJUSTMENT = 2000  // Blocks before difficulty adjustment
```

### Mining Commands
```bash
# Mine pending transactions
curl -X POST http://localhost:3000/api/mining/mine \
  -H "Authorization: Bearer <token>"

# Check mining stats
curl -X GET http://localhost:3000/api/mining/stats \
  -H "Authorization: Bearer <token>"

# View pending transactions
curl -X GET http://localhost:3000/api/mining/pending \
  -H "Authorization: Bearer <token>"
```

## 🧪 Testing & Development

### Test the Complete System

1. **Start multiple nodes:**
```bash
npm run dev:reset  # Clean start
npm run dev        # Terminal 1 - Node 1
npm run dev        # Terminal 2 - Node 2  
npm run dev        # Terminal 3 - Node 3
```

2. **Register users:**
```bash
# Alice
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Alice","lastName":"Johnson","email":"alice@sandicoin.com","password":"password123"}'

# Bob  
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Bob","lastName":"Smith","email":"bob@sandicoin.com","password":"password123"}'
```

3. **Create transactions:**
```bash
# Login and get token
ALICE_TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@sandicoin.com","password":"password123"}' | jq -r '.data.accessToken')

# Create transaction
curl -X POST http://localhost:3000/api/transactions \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipient":"bob@sandicoin.com","amount":100}'
```

4. **Mine blocks:**
```bash
# Mine on Node 2
curl -X POST http://localhost:3001/api/mining/mine \
  -H "Authorization: Bearer $BOB_TOKEN"
```

5. **Verify synchronization:**
```bash
# Check blockchain on all nodes
curl http://localhost:3000/api/blockchain/stats
curl http://localhost:3001/api/blockchain/stats  
curl http://localhost:3002/api/blockchain/stats
```

### Debug Endpoints
```bash
# Pool status
GET /api/transactions/debug/pool-status

# Transaction format info
GET /api/transactions/debug/transaction-format

# User transaction matching
GET /api/transactions/debug/user-matches

# Detailed pool contents
GET /api/transactions/debug/pool
```

## 🐛 Troubleshooting

### Common Issues

#### MongoDB Connection Error
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Or with Homebrew on macOS
brew services start mongodb-community
```

#### Port Already in Use
```bash
# Clean up ports
npm run dev:reset

# Kill processes on specific ports
lsof -ti:3000 | xargs kill -9
lsof -ti:5001 | xargs kill -9
```

#### JWT Token Issues
- Ensure `JWT_SECRET` is at least 32 characters
- Check token expiration times
- Verify Bearer token format: `Authorization: Bearer <token>`

#### Network Sync Issues
- Check WebSocket connections in logs
- Verify `ENABLE_NETWORK=true` in .env
- Ensure nodes can communicate (firewall/network)

### Logs and Debugging

The application provides detailed logging:

```bash
# View real-time logs
tail -f logs/sandicoin.log

# Filter specific operations
grep "Transaction" logs/sandicoin.log
grep "Mining" logs/sandicoin.log
grep "Network" logs/sandicoin.log
```

Log levels and formats:
- 🚀 **Startup**: Server and service initialization
- 🔐 **Auth**: Login, registration, token operations
- 💰 **Transactions**: Creation, validation, broadcasting
- ⛏️ **Mining**: Block creation, proof-of-work
- 📡 **Network**: P2P communication, synchronization
- ❌ **Errors**: Detailed error traces and debugging

## 📚 Technology Stack

### Backend
- **Node.js** - Runtime environment
- **TypeScript** - Type-safe JavaScript
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB ODM

### Cryptography
- **Node.js Crypto** - ECDSA signatures, hashing
- **secp256k1** - Elliptic curve (Bitcoin standard)
- **SHA-256** - Cryptographic hashing
- **Base58** - Bitcoin-style address encoding

### Networking  
- **WebSocket (ws)** - P2P communication
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security headers

### Development
- **tsx** - TypeScript execution
- **nodemon** - Auto-restart development
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Start development: `npm run dev`
5. Run tests: `npm test`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push branch: `git push origin feature/amazing-feature`
8. Create Pull Request

### Code Standards
- Use TypeScript for all new code
- Follow existing code style (ESLint + Prettier)
- Add tests for new features
- Update documentation for API changes
- Use conventional commit messages

### Testing
```bash
# Run all tests
npm test

# Run specific test suite
npm test auth
npm test transactions
npm test mining

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Bitcoin whitepaper for blockchain inspiration
- Ethereum for smart contract concepts
- Node.js community for excellent tooling
- MongoDB for reliable data persistence

## 📞 Support

For questions, issues, or contributions:

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email**: support@sandicoin.com

---

**SandiCoin** - Building the future of decentralized currency 🚀
