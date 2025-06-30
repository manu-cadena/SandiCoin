# 🪙 SandiCoin - Cryptocurrency with Blockchain Network

Complete cryptocurrency implementation with blockchain, P2P networking, transaction validation, and mining system.

## 🚀 Quick Start for Testing

### Prerequisites

- Node.js 18+
- MongoDB running on `localhost:27017`
- Two terminal windows

### Start the Application

**Terminal 1 - Backend:**

```bash
cd backend
npm install
cp .env.example .env  # Copy environment configuration
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm install
npm run dev
```

**Access:** Open `http://localhost:5173` in your browser

## 🎯 Assignment Requirements ✅

### **Blockchain & Cryptocurrency**

- ✅ Complete blockchain with transaction validation
- ✅ Transaction pool for pending transactions
- ✅ Mining with reward transactions
- ✅ Proof-of-work consensus mechanism

### **P2P Network**

- ✅ Multi-node support (WebSocket-based)
- ✅ Automatic blockchain synchronization
- ✅ Transaction broadcasting across nodes

### **Database Integration**

- ✅ MongoDB for blockchain, blocks, transactions, and users
- ✅ Persistent storage with automatic loading

### **Security (JWT Authentication)**

- ✅ User registration and login required
- ✅ JWT token validation for API access
- ✅ Role-based access control
- ✅ Protection against NoSQL injection, XSS, DDoS

### **React Frontend Client**

- ✅ User registration and authentication
- ✅ Create new transactions (send coins)
- ✅ View transaction history
- ✅ Browse blockchain and blocks
- ✅ Mine new blocks interface

### **TDD & Best Practices**

- ✅ 67 passing tests for transaction handling
- ✅ Clean Code, SOC, MVC architecture
- ✅ TypeScript for type safety

## 🧪 Testing Features

### 1. **Register & Login**

- Create new account with email/password
- Login receives JWT token for API access

### 2. **Send Transactions**

- Send coins to other users (by email or wallet address)
- Transactions added to pool, confirmed when mined

### 3. **Mine Blocks**

- Click "Mine Block" to process pending transactions
- Receive mining reward (50 SandiCoins)

### 4. **Multi-Node Network**

```bash
# Start multiple backend nodes
cd backend && PORT=3001 npm run dev  # Node 1
cd backend && PORT=3002 npm run dev  # Node 2
cd backend && PORT=3003 npm run dev  # Node 3
```

### 5. **View Blockchain**

- Explore all blocks with transactions
- View network statistics and node information

## 🛠️ Technology Stack

- **Backend**: Node.js, TypeScript, Express, MongoDB, WebSockets, JWT
- **Frontend**: React, TypeScript, Vite, Axios
- **Testing**: Vitest (67 tests)
- **Security**: Input validation, CORS, rate limiting, sanitization

## 📊 API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/transactions` - Create transaction
- `GET /api/transactions` - View user transactions
- `POST /api/mining/mine` - Mine new block
- `GET /api/blockchain` - Get full blockchain

---

**Assignment**: Kryptovaluta och nätverk - Backend Development Course  
**Author**: Manuel Lopez  
**Features**: All G and VG requirements implemented
