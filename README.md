# 🪙 SandiCoin - Full-Stack Cryptocurrency Application

A complete cryptocurrency implementation with blockchain, mining, P2P networking, and a modern React frontend.

## 🌟 Project Structure

```
SandiCoin/
├── backend/           # Node.js + TypeScript cryptocurrency backend
│   ├── API Server     # REST endpoints for transactions, mining, blockchain
│   ├── P2P Network    # WebSocket-based multi-node synchronization
│   ├── JWT Auth       # User authentication and authorization
│   └── MongoDB        # User data and persistence
├── frontend/          # React + TypeScript + Vite frontend
│   ├── Authentication # Login/register interface
│   ├── Transactions   # Send coins and view history
│   ├── Blockchain     # Explore blocks and network stats
│   └── Mining         # Mine new blocks interface
└── README.md         # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running on localhost:27017
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 🎯 Features

### ✅ Backend (Completed)

- **Blockchain Core**: Bitcoin-style ECDSA addresses and signatures
- **P2P Network**: Multi-node synchronization with WebSockets
- **Mining System**: Proof-of-work with adjustable difficulty
- **Transaction Pool**: Mempool with validation and broadcasting
- **JWT Authentication**: Secure user registration and login
- **MongoDB Integration**: User data persistence
- **67 Passing Tests**: Comprehensive test coverage

### 🚧 Frontend (In Development)

- **React + TypeScript**: Modern frontend framework
- **Authentication UI**: Login and registration forms
- **Dashboard**: Wallet balance and transaction overview
- **Transaction Interface**: Send coins between users
- **Blockchain Explorer**: View blocks and network statistics
- **Mining Interface**: Trigger block mining
- **Real-time Updates**: Live network synchronization

## 🛠️ Technology Stack

### Backend

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT tokens
- **Cryptography**: Node.js crypto (secp256k1, SHA-256)
- **Networking**: WebSocket (ws)
- **Testing**: Vitest

### Frontend

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: CSS
- **HTTP Client**: Axios
- **Routing**: React Router

## 📚 API Documentation

The backend provides comprehensive REST endpoints:

- **Authentication**: `/api/auth/*` - Register, login, token management
- **Transactions**: `/api/transactions/*` - Create, view, validate transactions
- **Mining**: `/api/mining/*` - Mine blocks, view pending transactions
- **Blockchain**: `/api/blockchain/*` - View blocks, network statistics
- **Network**: `/api/network/*` - P2P network information

## 🧪 Development

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests (when implemented)
cd frontend
npm test
```

### Multi-Node Testing

```bash
# Terminal 1 - Node 1
cd backend && npm run dev

# Terminal 2 - Node 2
cd backend && npm run dev

# Terminal 3 - Node 3
cd backend && npm run dev
```

## 📄 Course Requirements

This project fulfills all requirements for the Backend Development course:

- ✅ **Blockchain Implementation**: Complete cryptocurrency with transactions
- ✅ **P2P Network**: Multi-node synchronization with WebSockets
- ✅ **Database Integration**: MongoDB for user data
- ✅ **JWT Authentication**: Secure user registration and login
- ✅ **TDD Implementation**: 67 passing tests
- ✅ **Security**: Protection against NoSQL injection, XSS, DDoS
- ✅ **Frontend**: React application for user interaction
- ✅ **Clean Code**: MVC architecture, SOC principles

## 👨‍💻 Author

Built by a blockchain development student as part of a backend development course.

## 📄 License

MIT License - see LICENSE file for details.
