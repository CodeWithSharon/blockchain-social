const express = require("express");
const router = express.Router();
const { verifyWallet } = require("../middleware/verifyWallet");
const store = require("../data/store");

/**
 * GET /api/follows/:address/following
 * Who does this address follow?
 */
router.get("/:address/following", (req, res) => {
  const following = store.getFollowing(req.params.address);
  res.json({ address: req.params.address, following, count: following.length });
});

/**
 * GET /api/follows/:address/followers
 * Who follows this address?
 */
router.get("/:address/followers", (req, res) => {
  const followers = store.getFollowers(req.params.address);
  res.json({ address: req.params.address, followers, count: followers.length });
});

/**
 * GET /api/follows/:follower/is-following/:followee
 * Check if follower follows followee
 */
router.get("/:follower/is-following/:followee", (req, res) => {
  const result = store.isFollowing(req.params.follower, req.params.followee);
  res.json({ isFollowing: result });
});

/**
 * POST /api/follows/:followee/follow
 * Follow an address
 */
router.post("/:followee/follow", verifyWallet, (req, res) => {
  try {
    if (req.walletAddress.toLowerCase() === req.params.followee.toLowerCase()) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }
    store.follow(req.walletAddress, req.params.followee);
    res.json({ success: true, following: req.params.followee });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/follows/:followee/unfollow
 * Unfollow an address
 */
router.post("/:followee/unfollow", verifyWallet, (req, res) => {
  try {
    store.unfollow(req.walletAddress, req.params.followee);
    res.json({ success: true, unfollowed: req.params.followee });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
