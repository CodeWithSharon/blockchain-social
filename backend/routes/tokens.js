const express = require("express");
const router = express.Router();
const { getTokenBalance, getTokenInfo, getAllPosts } = require("../services/contractService");

// GET /api/tokens/balance/:address
router.get("/balance/:address", async (req, res) => {
  try {
    const balance = await getTokenBalance(req.params.address);
    res.json({ address: req.params.address, balance, symbol: "CLINK" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tokens/info
router.get("/info", async (req, res) => {
  try {
    const info = await getTokenInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tokens/leaderboard — Feature 14
router.get("/leaderboard", async (req, res) => {
  try {
    const posts = await getAllPosts();
    const tally = {};
    for (const post of posts) {
      if (!tally[post.author]) tally[post.author] = { address: post.author, totalLikes: 0, postCount: 0 };
      tally[post.author].totalLikes += post.likes;
      tally[post.author].postCount += 1;
    }
    const leaderboard = Object.values(tally)
      .sort((a, b) => b.totalLikes - a.totalLikes)
      .slice(0, 10);

    const enriched = await Promise.all(
      leaderboard.map(async entry => {
        try {
          const balance = await getTokenBalance(entry.address);
          // Feature 21: Reputation score = (likes × 2) + postCount + (balance × 0.5), max 100
          const raw = (entry.totalLikes * 2) + entry.postCount + (parseFloat(balance) * 0.5);
          const reputationScore = Math.min(100, Math.round(raw));
          return { ...entry, clinkBalance: balance, reputationScore };
        } catch {
          return { ...entry, clinkBalance: "0", reputationScore: 0 };
        }
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tokens/reputation/:address — Feature 21
router.get("/reputation/:address", async (req, res) => {
  try {
    const posts = await getAllPosts();
    const userPosts = posts.filter(p => p.author.toLowerCase() === req.params.address.toLowerCase());
    const totalLikes = userPosts.reduce((sum, p) => sum + p.likes, 0);
    const postCount = userPosts.length;
    const balance = await getTokenBalance(req.params.address);
    const raw = (totalLikes * 2) + postCount + (parseFloat(balance) * 0.5);
    const score = Math.min(100, Math.round(raw));
    res.json({ address: req.params.address, score, totalLikes, postCount, clinkBalance: balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
