const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");
const { getAllPosts, getPostsByUser, verifyContentIntegrity, getUserData, invalidateCache } = require("../services/contractService");
const { uploadJSON, fetchFromIPFS, getIPFSUrl, uploadFile } = require("../services/ipfs");
const { verifyWallet } = require("../middleware/verifyWallet");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/posts/prepare — upload to IPFS, return CID+hash for MetaMask tx
router.post("/prepare", verifyWallet, upload.single("image"), async (req, res) => {
  try {
    const { text, anonymous, tags } = req.body;
    if (!text && !req.file) return res.status(400).json({ error: "Post must have text or image" });

    let imageCID = null;
    if (req.file) imageCID = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);

    const extractedTags = (text || "").match(/#\w+/g) || [];
    const manualTags    = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    const allTags       = [...new Set([...extractedTags.map(t => t.toLowerCase()), ...manualTags.map(t => t.toLowerCase())])];

    const postContent = {
      text:      text || "",
      imageCID:  imageCID || null,
      anonymous: anonymous === "true" || anonymous === true,
      author:    anonymous === "true" ? "anonymous" : req.walletAddress,
      tags:      allTags,
      createdAt: Date.now(),
    };

    const contentStr  = JSON.stringify(postContent);
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes(contentStr));
    const cid         = await uploadJSON(postContent, `post-${req.walletAddress}-${Date.now()}`);
    res.json({ cid, contentHash, preview: postContent });
  } catch (err) {
    console.error("POST /posts/prepare:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts — all posts, always fresh (no cache so deletes show immediately)
router.get("/", async (req, res) => {
  try {
    const { tag } = req.query;
    const posts   = await getAllPosts(); // NOT cached — instant delete visibility
    let enriched  = await enrichPosts(posts);
    enriched.sort((a, b) => b.timestamp - a.timestamp);
    if (tag) enriched = enriched.filter(p => (p.content?.tags || []).includes(tag.toLowerCase()));
    res.json(enriched);
  } catch (err) {
    console.error("GET /posts:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/trending-tags
router.get("/trending-tags", async (req, res) => {
  try {
    const posts    = await getAllPosts();
    const enriched = await enrichPosts(posts);
    const tagCount = {};
    for (const post of enriched) {
      for (const tag of (post.content?.tags || [])) tagCount[tag] = (tagCount[tag] || 0) + 1;
    }
    const trending = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
    res.json(trending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/user/:address
router.get("/user/:address", async (req, res) => {
  try {
    const posts    = await getPostsByUser(req.params.address);
    const enriched = await enrichPosts(posts);
    enriched.sort((a, b) => b.timestamp - a.timestamp);
    res.json(enriched);
  } catch (err) {
    console.error("GET /posts/user:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/:id/verify — tamper detection
router.get("/:id/verify", async (req, res) => {
  try {
    const posts = await getAllPosts();
    const post  = posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    const content = await fetchFromIPFS(post.contentCID);
    const isIntact = verifyContentIntegrity(content, post.contentHash);
    res.json({
      postId: post.id, isIntact,
      status: isIntact ? "✅ Verified — original and untampered" : "❌ Content mismatch — possible tampering",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/invalidate — called after deletePost tx confirms
router.post("/invalidate", verifyWallet, (req, res) => {
  invalidateCache("posts");
  invalidateCache(`posts_${req.walletAddress.toLowerCase()}`);
  res.json({ success: true });
});

// Helper — enrich posts with IPFS content + author profile
async function enrichPosts(posts) {
  return Promise.all(posts.map(async post => {
    let content      = { text: "", imageUrl: null, tags: [], anonymous: false };
    let isIntact     = null;
    let ipfsFetchFailed = false;

    try {
      const fetched = await fetchFromIPFS(post.contentCID);
      isIntact = verifyContentIntegrity(fetched, post.contentHash);
      content  = {
        text:      fetched.text || "",
        imageUrl:  fetched.imageCID ? getIPFSUrl(fetched.imageCID) : null,
        tags:      fetched.tags || [],
        anonymous: fetched.anonymous || false,
      };
    } catch { ipfsFetchFailed = true; }

    let authorProfile = null;
    try {
      const userData = await getUserData(post.author);
      if (userData.exists) {
        authorProfile = {
          username:   userData.username,
          isVerified: !!(userData.username && userData.username.trim().length > 0),
        };
      }
    } catch {}

    return { ...post, content, isIntact, ipfsFetchFailed, authorProfile };
  }));
}

module.exports = router;
