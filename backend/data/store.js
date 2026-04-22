/**
 * Simple file-based store for off-chain data:
 * - Comments (linked to post IDs)
 * - Follows (wallet → wallets)
 * - Reposts (wallet → post IDs)
 * 
 * In production you'd use a database. For this project, JSON files work fine.
 * Data persists across backend restarts.
 */
const fs = require("fs");
const path = require("path");

const FILES = {
  comments: path.join(__dirname, "comments.json"),
  follows:  path.join(__dirname, "follows.json"),
  reposts:  path.join(__dirname, "reposts.json"),
};

function read(key) {
  try {
    if (!fs.existsSync(FILES[key])) return {};
    return JSON.parse(fs.readFileSync(FILES[key], "utf8"));
  } catch {
    return {};
  }
}

function write(key, data) {
  fs.writeFileSync(FILES[key], JSON.stringify(data, null, 2));
}

// ─── Comments ─────────────────────────────────────────────────────────────────
// Structure: { [postId]: [{ id, author, text, timestamp, likes: [] }] }

function getComments(postId) {
  const all = read("comments");
  return all[postId] || [];
}

function addComment(postId, author, text) {
  const all = read("comments");
  if (!all[postId]) all[postId] = [];
  const comment = {
    id: Date.now().toString(),
    postId,
    author,
    text,
    timestamp: Math.floor(Date.now() / 1000),
    likes: [],
  };
  all[postId].unshift(comment);
  write("comments", all);
  return comment;
}

function likeComment(postId, commentId, voter) {
  const all = read("comments");
  const comments = all[postId] || [];
  const comment = comments.find(c => c.id === commentId);
  if (!comment) return null;
  if (!comment.likes.includes(voter)) comment.likes.push(voter);
  write("comments", all);
  return comment;
}

function deleteComment(postId, commentId, requestor) {
  const all = read("comments");
  const comments = all[postId] || [];
  const idx = comments.findIndex(c => c.id === commentId && c.author.toLowerCase() === requestor.toLowerCase());
  if (idx === -1) return false;
  comments.splice(idx, 1);
  all[postId] = comments;
  write("comments", all);
  return true;
}

function getCommentCount(postId) {
  return (read("comments")[postId] || []).length;
}

// ─── Follows ──────────────────────────────────────────────────────────────────
// Structure: { [follower]: [followee1, followee2, ...] }

function getFollowing(address) {
  return (read("follows")[address.toLowerCase()] || []);
}

function getFollowers(address) {
  const all = read("follows");
  return Object.entries(all)
    .filter(([, list]) => list.includes(address.toLowerCase()))
    .map(([follower]) => follower);
}

function follow(follower, followee) {
  const all = read("follows");
  const key = follower.toLowerCase();
  const target = followee.toLowerCase();
  if (!all[key]) all[key] = [];
  if (!all[key].includes(target)) all[key].push(target);
  write("follows", all);
}

function unfollow(follower, followee) {
  const all = read("follows");
  const key = follower.toLowerCase();
  const target = followee.toLowerCase();
  if (all[key]) all[key] = all[key].filter(a => a !== target);
  write("follows", all);
}

function isFollowing(follower, followee) {
  return getFollowing(follower).includes(followee.toLowerCase());
}

// ─── Reposts ──────────────────────────────────────────────────────────────────
// Structure: { [postId]: [reposterAddress, ...] }
// Also track what each user has reposted: { "user_[address]": [postId, ...] }

function getReposters(postId) {
  return (read("reposts")[postId] || []);
}

function getUserReposts(address) {
  return (read("reposts")["user_" + address.toLowerCase()] || []);
}

function repost(address, postId) {
  const all = read("reposts");
  const userKey = "user_" + address.toLowerCase();
  if (!all[postId]) all[postId] = [];
  if (!all[userKey]) all[userKey] = [];
  if (!all[postId].includes(address.toLowerCase())) all[postId].push(address.toLowerCase());
  if (!all[userKey].includes(postId)) all[userKey].push(postId);
  write("reposts", all);
}

function undoRepost(address, postId) {
  const all = read("reposts");
  const userKey = "user_" + address.toLowerCase();
  if (all[postId]) all[postId] = all[postId].filter(a => a !== address.toLowerCase());
  if (all[userKey]) all[userKey] = all[userKey].filter(id => id !== postId);
  write("reposts", all);
}

function hasReposted(address, postId) {
  return getReposters(postId).includes(address.toLowerCase());
}

module.exports = {
  getComments, addComment, likeComment, deleteComment, getCommentCount,
  getFollowing, getFollowers, follow, unfollow, isFollowing,
  getReposters, getUserReposts, repost, undoRepost, hasReposted,
};
