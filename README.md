🚀 Decentralized Social Media Platform — Chain.Social

A blockchain-based social media platform where users own their content, earn tokens for engagement, and participate in community-driven moderation — all without a central authority.

🌐 Overview

Chain.Social is built on the Ethereum Sepolia and uses IPFS (via Pinata) for decentralized storage.

Instead of traditional login systems, users authenticate using MetaMask, making their wallet address their identity.

All interactions — posts, likes, comments, tips — are handled through smart contracts, ensuring transparency, immutability, and trust.

🛠️ Tech Stack
Solidity — Smart contracts
Hardhat — Development & testing framework
Ethereum Sepolia — Blockchain network
OpenZeppelin — ERC-20 token standard
ethers.js — Blockchain interaction
IPFS + Pinata — Storage
Node.js + Express — Backend API
React.js — Frontend UI
Infura — RPC provider
📜 Smart Contracts
🔹 ContentToken.sol
ERC-20 token (CLINK)
Minted when posts receive likes
Used as voting power in moderation
🔹 UserRegistry.sol
Wallet-based identity system
Profile management (username, avatar, visibility)
Follow/unfollow system
Verified badge support
🔹 PostRegistry.sol
Create and manage posts
Like, comment, repost
Flagging and community moderation
ETH tipping system
Tamper detection using content hashing
📍 Deployed Contracts (Sepolia Testnet)
Contract	Address
ContentToken	0x92202484DA49D39f95bB5428a8d2faD11f7eA6eb
UserRegistry	0xb1A400B0f6FA06c25eA8fC9d06756DD1e682cd92
PostRegistry	0xF25e322879B0ECdA94b1A0F072DEcf792D89CaD9
🔎 Contract Verification

View contracts on Etherscan:

ContentToken: https://sepolia.etherscan.io/address/0x92202484DA49D39f95bB5428a8d2faD11f7eA6eb#code
UserRegistry: https://sepolia.etherscan.io/address/0xb1A400B0f6FA06c25eA8fC9d06756DD1e682cd92#code
PostRegistry: https://sepolia.etherscan.io/address/0xF25e322879B0ECdA94b1A0F072DEcf792D89CaD9#code
✨ Features Implemented
🔹 Core Features
🔐 Wallet-based login (no username/password)
👤 User profiles (create, update, delete, visibility toggle)
📝 Create posts (stored on IPFS, hash on blockchain)
❤️ Like posts → earn CLINK tokens
🔗 Ownership proof via cryptographic hashing
🛡️ Tamper detection (hash verification)
💸 ETH tipping (peer-to-peer payments)
🚩 Flagging system for harmful content
🗳️ Token-weighted community moderation
❌ Post hiding (due to blockchain immutability)
🔁 Repost system with rewards
💬 Comment system with token incentives
🔹 Enhancement Features
➕ Follow / Unfollow users
✔️ Verified badge
🔒 Profile visibility (public/private)
🏆 Token leaderboard (Top CLINK holders)
📂 Project Structure
project-root/
│
├── contracts/
│   ├── ContentToken.sol
│   ├── UserRegistry.sol
│   └── PostRegistry.sol
│
├── scripts/
│   ├── deploy.js
│   └── interact.js
│
├── test/
│   ├── ContentToken.test.js
│   ├── UserRegistry.test.js
│   └── PostRegistry.test.js
│
├── backend/
│   ├── server.js
│   ├── routes/
│   └── ipfs.js
│
├── frontend/
│   ├── src/
│   ├── App.js
│   └── services/
│       ├── ContractServices.js
│       └── contracts.js
⚙️ Project Setup
✅ Prerequisites
Node.js (v18+)
MetaMask
Sepolia test ETH (from faucet)
📥 Installation
git clone https://github.com/your-username/chain-social.git
cd chain-social
npm install
🔨 Compile Contracts
npx hardhat compile
🚀 Deploy Contracts
npx hardhat run scripts/deploy.js --network sepolia
🧪 Run Tests
npx hardhat test

✅ All tests passed: 68/68

▶️ Run Backend
cd backend
npm install
node server.js
💻 Run Frontend
cd frontend
npm install
npm start
🔐 Key Design Decisions
IPFS + Hash Storage → Reduces gas costs while ensuring integrity
Wallet Authentication → Eliminates password vulnerabilities
Token-Based Governance → Encourages quality contributions
Immutable Data Handling → Uses “hide” instead of delete
Hybrid Architecture → Combines decentralization with performance
📸 Screenshots

(Add your screenshots here)

Create Post
Like Post
Comment
Repost
Tip Author
Leaderboard
Etherscan Proof
IPFS Output
📌 Conclusion

Chain.Social demonstrates how blockchain and decentralized technologies can be used to build a secure, transparent, and user-owned social media platform. It eliminates reliance on centralized control while ensuring trust, data ownership, and fair participation.

👩‍💻 Authors
Sharon A — Blockchain & Smart Contracts
Shreela Sukumar Shetty — Full Stack & Integration
