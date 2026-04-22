import axios from "axios";

const BASE = "/api";

// ─── Posts ─────────────────────────────────────────────────────────────────
export async function fetchAllPosts() {
  const { data } = await axios.get(`${BASE}/posts`);
  return data;
}
export async function fetchUserPosts(address) {
  const { data } = await axios.get(`${BASE}/posts/user/${address}`);
  return data;
}
export async function preparePost(formData, authHeaders) {
  const { data } = await axios.post(`${BASE}/posts/prepare`, formData, {
    headers: { ...authHeaders, "Content-Type": "multipart/form-data" },
  });
  return data;
}
export async function verifyPost(postId) {
  const { data } = await axios.get(`${BASE}/posts/${postId}/verify`);
  return data;
}
export async function fetchTrendingTags() {
  const { data } = await axios.get(`${BASE}/posts/trending-tags`);
  return data;
}

// ─── Users ─────────────────────────────────────────────────────────────────
export async function fetchUser(address) {
  const { data } = await axios.get(`${BASE}/users/${address}`);
  return data;
}
export async function prepareProfile(bio, profileImageCID, authHeaders) {
  const { data } = await axios.post(`${BASE}/users/prepare-profile`,
    { bio, profileImageCID },
    { headers: authHeaders }
  );
  return data;
}
export async function uploadAvatar(file, authHeaders) {
  const formData = new FormData();
  formData.append("avatar", file);
  const { data } = await axios.post(`${BASE}/users/upload-avatar`, formData, {
    headers: { ...authHeaders, "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ─── Tokens ────────────────────────────────────────────────────────────────
export async function fetchTokenBalance(address) {
  const { data } = await axios.get(`${BASE}/tokens/balance/${address}`);
  return data;
}
export async function fetchLeaderboard() {
  const { data } = await axios.get(`${BASE}/tokens/leaderboard`);
  return data;
}
export async function fetchTokenInfo() {
  const { data } = await axios.get(`${BASE}/tokens/info`);
  return data;
}
export async function fetchReputation(address) {
  const { data } = await axios.get(`${BASE}/tokens/reputation/${address}`);
  return data;
}

// ─── Comments ──────────────────────────────────────────────────────────────
export async function fetchComments(postId) {
  const { data } = await axios.get(`${BASE}/comments/${postId}`);
  return data;
}
export async function addComment(postId, text, authHeaders) {
  const { data } = await axios.post(`${BASE}/comments/${postId}`,
    { text },
    { headers: authHeaders }
  );
  return data;
}
export async function likeComment(postId, commentId, authHeaders) {
  const { data } = await axios.post(`${BASE}/comments/${postId}/${commentId}/like`,
    {},
    { headers: authHeaders }
  );
  return data;
}
export async function deleteComment(postId, commentId, authHeaders) {
  const { data } = await axios.delete(`${BASE}/comments/${postId}/${commentId}`,
    { headers: authHeaders }
  );
  return data;
}

// ─── Follows ───────────────────────────────────────────────────────────────
export async function fetchFollowing(address) {
  const { data } = await axios.get(`${BASE}/follows/${address}/following`);
  return data;
}
export async function fetchFollowers(address) {
  const { data } = await axios.get(`${BASE}/follows/${address}/followers`);
  return data;
}
export async function checkIsFollowing(follower, followee) {
  const { data } = await axios.get(`${BASE}/follows/${follower}/is-following/${followee}`);
  return data.isFollowing;
}
export async function followUser(followee, authHeaders) {
  const { data } = await axios.post(`${BASE}/follows/${followee}/follow`,
    {},
    { headers: authHeaders }
  );
  return data;
}
export async function unfollowUser(followee, authHeaders) {
  const { data } = await axios.post(`${BASE}/follows/${followee}/unfollow`,
    {},
    { headers: authHeaders }
  );
  return data;
}

// ─── Reposts ───────────────────────────────────────────────────────────────
export async function fetchRepostCount(postId) {
  const { data } = await axios.get(`${BASE}/reposts/${postId}/count`);
  return data;
}
export async function fetchUserReposts(address) {
  const { data } = await axios.get(`${BASE}/reposts/user/${address}`);
  return data;
}
export async function repostPost(postId, authHeaders) {
  const { data } = await axios.post(`${BASE}/reposts/${postId}/repost`,
    {},
    { headers: authHeaders }
  );
  return data;
}
export async function unrepostPost(postId, authHeaders) {
  const { data } = await axios.post(`${BASE}/reposts/${postId}/unrepost`,
    {},
    { headers: authHeaders }
  );
  return data;
}

// ─── Cache Invalidation ────────────────────────────────────────────────────
export async function invalidateUserCache(authHeaders) {
  try {
    await axios.post("/api/users/invalidate-cache", {}, { headers: authHeaders });
  } catch {}
}
