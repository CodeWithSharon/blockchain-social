# Decentralized Social Media Platform

A blockchain-based social media platform where users own their content, earn tokens for engagement, and community governs content moderation — with no central authority.

## Tech Stack

- **Solidity** — Smart contracts
- **Hardhat** — Development and testing framework
- **Ethereum Sepolia Testnet** — Blockchain network
- **OpenZeppelin** — ERC-20 token standard
- **ethers.js** — Blockchain interaction
- **IPFS via Pinata** — Decentralized content storage

---

## Smart Contracts

### ContentToken.sol
ERC-20 token named CLINK. Minted automatically when a post gets liked. Used as voting power in community moderation.

### UserRegistry.sol
Manages user identity on-chain. Users register with their wallet address as their ID. Supports profile management, visibility controls, verified badges, and a follow system.

### PostRegistry.sol
Core contract handling all post interactions — creating posts, liking, flagging, community voting, tipping, commenting, reposting, and tamper detection.

---

## Deployed Contracts (Sepolia Testnet)

| Contract | Address |
|---|---|
| ContentToken | `0x92202484DA49D39f95bB5428a8d2faD11f7eA6eb` |
| UserRegistry | `0xb1A400B0f6FA06c25eA8fC9d06756DD1e682cd92` |
| PostRegistry | `0xF25e322879B0ECdA94b1A0F072DEcf792D89CaD9` |

### Etherscan Links
- [ContentToken](https://sepolia.etherscan.io/address/0x92202484DA49D39f95bB5428a8d2faD11f7eA6eb#code)
- [UserRegistry](https://sepolia.etherscan.io/address/0xb1A400B0f6FA06c25eA8fC9d06756DD1e682cd92#code)
- [PostRegistry](https://sepolia.etherscan.io/address/0xF25e322879B0ECdA94b1A0F072DEcf792D89CaD9#code)

---

## Features Implemented

### Core Features
- Wallet-based login — no username or password
- User profile — register, update, delete, toggle visibility
- Create posts — content stored on IPFS, hash stored on Ethereum
- Like posts — author earns 1 CLINK token per like
- Ownership proof — every post cryptographically tied to author wallet
- Tamper detection — content hash verified on-chain
- Tip system — send ETH directly to post author peer to peer
- Flag system — 3 flags puts post under community review
- Community voting — token-weighted, 51% hide votes hides post
- Delete post — author can hide their own post
- Repost — share another user's post, original author earns tokens
- Comments — comment on posts, earn tokens when comments are liked

### Enhancement Features
- Follow system — follow and unfollow any wallet address
- Verified badge — users can set verified status on-chain
- Profile visibility — public or private toggle

---

## Project Setup

### Prerequisites
- Node.js v18+
- MetaMask browser extension
- Sepolia test ETH

### Installation

```bash
