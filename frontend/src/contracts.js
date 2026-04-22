export const CONTRACT_ADDRESSES = {
  UserRegistry: "0x..",
  PostRegistry: "0x..",
  ContentToken: "0x..",
};

export const USER_REGISTRY_ABI = [
  "function registerUser(string memory username, string memory profileCID) external",
  "function updateProfile(string memory username, string memory profileCID) external",
  "function deleteAccount() external",
  "function toggleVisibility() external",
  "function getUser(address wallet) external view returns (address wallet, string username, string profileCID, bool isVisible, bool isDeleted, bool extra, uint256 timestamp)",
];

export const POST_REGISTRY_ABI = [
  "function createPost(string memory contentCID, bytes32 contentHash) external",
  "function deletePost(uint256 postId) external",
  "function likePost(uint256 postId) external",
  "function flagPost(uint256 postId) external",
  "function vote(uint256 postId, bool hideVote) external",
  "function tipAuthor(uint256 postId) external payable",
  "function getAllPosts() external view returns (tuple(uint256 id, address author, string contentCID, bytes32 contentHash, uint256 timestamp, uint256 likes, uint256 flags, bool isHidden)[] memory)",
  "function getPostsByUser(address user) external view returns (tuple(uint256 id, address author, string contentCID, bytes32 contentHash, uint256 timestamp, uint256 likes, uint256 flags, bool isHidden)[] memory)",
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

export const CONTENT_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function name() external view returns (string memory)",
  "function symbol() external view returns (string memory)",
];

export const SEPOLIA_CHAIN_ID = "0xaa36a7";
