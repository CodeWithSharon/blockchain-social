const express = require("express");
const router = express.Router();
const { verifyWallet } = require("../middleware/verifyWallet");
const { getRepostCount, getAllPosts, verifyContentIntegrity } = require("../services/contractService");
const { fetchFromIPFS, getIPFSUrl } = require("../services/ipfs");
const store = require("../data/store");

/**
 * GET /api/reposts/:postId/count
 * Try on-chain repost count first
 */
router.get("/:postId/count", async (req, res) => {
  try {
    const onChainCount = await getRepostCount(req.params.postId);
    const reposters    = store.getReposters(req.params.postId);
    res.json({
      postId:   req.params.postId,
      count:    onChainCount > 0 ? onChainCount : reposters.length,
      reposters,
    });
  } catch (e) {
    const reposters = store.getReposters(req.params.postId);
    res.json({ postId: req.params.postId, count: reposters.length, reposters });
  }
});

/**
 * GET /api/reposts/user/:address
 */
router.get("/user/:address", async (req, res) => {
  try {
    const repostedIds = store.getUserReposts(req.params.address);
    if (repostedIds.length === 0) return res.json([]);

    const allPosts = await getAllPosts();
    const reposted = allPosts.filter(p => repostedIds.includes(p.id));

    const enriched = await Promise.all(reposted.map(async post => {
      try {
        const content  = await fetchFromIPFS(post.contentCID);
        const isIntact = verifyContentIntegrity(content, post.contentHash);
        return {
          ...post,
          content: {
            text:      content.text || "",
            imageUrl:  content.imageCID ? getIPFSUrl(content.imageCID) : null,
            tags:      content.tags || [],
            anonymous: content.anonymous || false,
          },
          isIntact,
          isRepost:   true,
          repostedBy: req.params.address,
        };
      } catch {
        return { ...post, content: { text: "", imageUrl: null, tags: [] }, isIntact: null, isRepost: true };
      }
    }));

    res.json(enriched.sort((a, b) => b.timestamp - a.timestamp));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/reposts/:postId/repost
 * Saves repost in off-chain store; frontend ALSO calls contract.repost() via MetaMask
 */
router.post("/:postId/repost", verifyWallet, (req, res) => {
  try {
    if (store.hasReposted(req.walletAddress, req.params.postId)) {
      return res.status(400).json({ error: "Already reposted" });
    }
    store.repost(req.walletAddress, req.params.postId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/reposts/:postId/unrepost
 */
router.post("/:postId/unrepost", verifyWallet, (req, res) => {
  try {
    store.undoRepost(req.walletAddress, req.params.postId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
