const express = require("express");
const router = express.Router();
const { verifyWallet } = require("../middleware/verifyWallet");
const { getPostComments } = require("../services/contractService");
const store = require("../data/store");

/**
 * GET /api/comments/:postId
 * Try on-chain first, fall back to off-chain store
 */
router.get("/:postId", async (req, res) => {
  try {
    // Try Person 1's on-chain comments first
    const onChain = await getPostComments(req.params.postId);
    if (onChain && onChain.length > 0) {
      return res.json(onChain);
    }
    // Fall back to off-chain store (for backwards compat)
    const offChain = store.getComments(req.params.postId);
    res.json(offChain);
  } catch (e) {
    const offChain = store.getComments(req.params.postId);
    res.json(offChain);
  }
});

/**
 * POST /api/comments/:postId
 * Save comment off-chain (frontend will also call contract directly via MetaMask)
 * Off-chain store keeps comments available even if contract call hasn't confirmed yet
 */
router.post("/:postId", verifyWallet, (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "Comment cannot be empty" });
    if (text.length > 500) return res.status(400).json({ error: "Max 500 characters" });
    const comment = store.addComment(req.params.postId, req.walletAddress, text.trim());
    res.json(comment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/comments/:postId/:commentId/like
 */
router.post("/:postId/:commentId/like", verifyWallet, (req, res) => {
  try {
    const comment = store.likeComment(req.params.postId, req.params.commentId, req.walletAddress);
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    res.json(comment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * DELETE /api/comments/:postId/:commentId
 */
router.delete("/:postId/:commentId", verifyWallet, (req, res) => {
  try {
    const ok = store.deleteComment(req.params.postId, req.params.commentId, req.walletAddress);
    if (!ok) return res.status(403).json({ error: "Not your comment" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
