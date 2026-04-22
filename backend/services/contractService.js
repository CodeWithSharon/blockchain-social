const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

const cache = new Map();
const CACHE_TTL = 60000; // 60s for reads

function cached(key, fn, ttl = CACHE_TTL) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < ttl) return Promise.resolve(entry.data);
  return fn().then(data => { cache.set(key, { data, ts: Date.now() }); return data; });
}

function invalidateCache(prefix) {
  for (const key of cache.keys()) {
    if (!prefix || key.startsWith(prefix)) cache.delete(key);
  }
}

const USER_REGISTRY_ABI = [
  "function registerUser(string memory username, string memory profileCID) external",
  "function updateProfile(string memory username, string memory profileCID) external",
  "function deleteAccount() external",
  "function toggleVisibility() external",
];

const POST_REGISTRY_ABI = [
  "function createPost(string memory contentCID, bytes32 contentHash) external",
  "function deletePost(uint256 postId) external",
  "function likePost(uint256 postId) external",
  "function flagPost(uint256 postId) external",
  "function vote(uint256 postId, bool hideVote) external",
  "function tipAuthor(uint256 postId) external payable",
  "function getAllPosts() external view returns (tuple(uint256 id, address author, string contentCID, bytes32 contentHash, uint256 timestamp, uint256 likes, uint256 flags, bool isHidden, bool isDeleted)[] memory)",
  "function getPostsByUser(address user) external view returns (tuple(uint256 id, address author, string contentCID, bytes32 contentHash, uint256 timestamp, uint256 likes, uint256 flags, bool isHidden, bool isDeleted)[] memory)",
  "function addComment(uint256 postId, string memory text) external",
  "function likeComment(uint256 postId, uint256 commentId) external",
  "function getPostComments(uint256 postId) external view returns (tuple(uint256 id, uint256 postId, address author, string text, uint256 timestamp, uint256 likes)[] memory)",
  "function getCommentCount(uint256 postId) external view returns (uint256)",
  "function repost(uint256 originalPostId) external",
  "function getRepostCount(uint256 postId) external view returns (uint256)",
  "function isRepost(uint256 postId) external view returns (bool)",
  "function getOriginalPostId(uint256 postId) external view returns (uint256)",
  "function getOriginalAuthor(uint256 postId) external view returns (address)",
];

const CONTENT_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function name() external view returns (string memory)",
  "function symbol() external view returns (string memory)",
  "function decimals() external view returns (uint8)",
];

// ─── getUserData ─────────────────────────────────────────────────────────────
// Confirmed struct: (address wallet, string username, string profileCID, bool isVisible, bool isDeleted, bool extra, uint256 timestamp)
async function getUserData(walletAddress) {
  const key = `user_${walletAddress.toLowerCase()}`;
  return cached(key, async () => {
    const contractAddr = process.env.USER_REGISTRY_ADDRESS;
    const selector = ethers.id("getUser(address)").slice(0, 10);
    const encoded = ethers.zeroPadValue(walletAddress, 32);
    const raw = await provider.call({ to: contractAddr, data: selector + encoded.slice(2) });

    // Try tuple decode
    try {
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ["tuple(address,string,string,bool,bool,bool,uint256)"], raw
      );
      const t = decoded[0];
      return {
        username:   String(t[1] || "").replace(/\0/g, ""),
        profileCID: String(t[2] || "").replace(/\0/g, ""),
        isVisible:  Boolean(t[3]),
        exists:     !Boolean(t[4]),
      };
    } catch (_) {}

    // Manual word parse fallback
    try {
      const data = raw.startsWith("0x") ? raw.slice(2) : raw;
      const words = [];
      for (let i = 0; i < data.length; i += 64) words.push(data.slice(i, i + 64));
      const isVisible  = parseInt(words[4] || "0", 16) === 1;
      const isDeleted  = parseInt(words[5] || "0", 16) === 1;
      const usernameLen = parseInt(words[8] || "0", 16);
      const usernameHex = words.slice(9).join("").slice(0, usernameLen * 2);
      const username    = usernameLen > 0 ? Buffer.from(usernameHex, "hex").toString("utf8").replace(/\0/g, "") : "";
      const cidOffsetFromStruct = parseInt(words[3] || "0", 16);
      const cidOffsetFromStart  = 32 + cidOffsetFromStruct;
      const cidLenWordIndex     = cidOffsetFromStart / 32;
      const cidLen     = parseInt(words[cidLenWordIndex] || "0", 16);
      const cidDataHex = words.slice(cidLenWordIndex + 1).join("").slice(0, cidLen * 2);
      const profileCID = cidLen > 0 ? Buffer.from(cidDataHex, "hex").toString("utf8").replace(/\0/g, "") : "";
      return { username, profileCID, isVisible, exists: !isDeleted };
    } catch (e) {
      console.error("getUserData parse error:", e.message);
      return { username: "", profileCID: "", isVisible: true, exists: false };
    }
  });
}

function getPostRegistry() {
  return new ethers.Contract(process.env.POST_REGISTRY_ADDRESS, POST_REGISTRY_ABI, provider);
}

function getContentToken() {
  return new ethers.Contract(process.env.CONTENT_TOKEN_ADDRESS, CONTENT_TOKEN_ABI, provider);
}

async function getAllPosts() {
  // NO cache on getAllPosts — always fresh so deletes/hides show immediately
  const posts = await getPostRegistry().getAllPosts();
  return posts
    .map(formatPost)
    .filter(p => !p.isDeleted); // filter deleted posts
}

async function getPostsByUser(walletAddress) {
  // NO cache — always fresh
  const posts = await getPostRegistry().getPostsByUser(walletAddress);
  return posts
    .map(formatPost)
    .filter(p => !p.isDeleted);
}

async function getPostComments(postId) {
  return cached(`comments_${postId}`, async () => {
    try {
      const comments = await getPostRegistry().getPostComments(postId);
      return comments.map(c => ({
        id:        c.id.toString(),
        postId:    c.postId.toString(),
        author:    c.author,
        text:      c.text,
        timestamp: Number(c.timestamp),
        likes:     Number(c.likes),
      }));
    } catch { return []; }
  }, 15000); // 15s cache for comments
}

async function getCommentCount(postId) {
  try {
    const count = await getPostRegistry().getCommentCount(postId);
    return Number(count);
  } catch { return 0; }
}

async function getRepostCount(postId) {
  try {
    const count = await getPostRegistry().getRepostCount(postId);
    return Number(count);
  } catch { return 0; }
}

async function getTokenBalance(walletAddress) {
  return cached(`balance_${walletAddress.toLowerCase()}`, async () => {
    try {
      const balance = await getContentToken().balanceOf(walletAddress);
      return ethers.formatUnits(balance, 18);
    } catch { return "0"; }
  }, 30000);
}

async function getTokenInfo() {
  return cached("token_info", async () => {
    const c = getContentToken();
    const [name, symbol, totalSupply] = await Promise.all([c.name(), c.symbol(), c.totalSupply()]);
    return { name, symbol, totalSupply: ethers.formatUnits(totalSupply, 18) };
  });
}

function formatPost(post) {
  return {
    id:          post.id.toString(),
    author:      post.author,
    contentCID:  post.contentCID,
    contentHash: post.contentHash,
    timestamp:   Number(post.timestamp),
    likes:       Number(post.likes),
    flags:       Number(post.flags),
    isHidden:    post.isHidden,
    // Handle contracts that may or may not have isDeleted field
    isDeleted:   post.isDeleted !== undefined ? post.isDeleted : false,
  };
}

function verifyContentIntegrity(content, onChainHash) {
  try {
    const str  = typeof content === "string" ? content : JSON.stringify(content);
    const hash = ethers.keccak256(ethers.toUtf8Bytes(str));
    return hash.toLowerCase() === onChainHash.toLowerCase();
  } catch { return false; }
}

module.exports = {
  getUserData, getAllPosts, getPostsByUser,
  getPostComments, getCommentCount, getRepostCount,
  getTokenBalance, getTokenInfo, verifyContentIntegrity,
  invalidateCache,
  USER_REGISTRY_ABI, POST_REGISTRY_ABI, CONTENT_TOKEN_ABI,
};
