const express = require("express");
const router = express.Router();
const axios = require("axios");
const { fetchFromIPFS, getIPFSUrl } = require("../services/ipfs");

const PINATA_JWT = process.env.PINATA_JWT;

/**
 * GET /api/ipfs/content/:cid
 * Fetch JSON content from IPFS
 */
router.get("/content/:cid", async (req, res) => {
  try {
    const content = await fetchFromIPFS(req.params.cid);
    res.json({ cid: req.params.cid, content, url: getIPFSUrl(req.params.cid) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ipfs/image/:cid
 * Proxy image from IPFS with authentication
 * Frontend uses this as <img src="/api/ipfs/image/Qm..."> 
 * so the JWT never needs to be in the browser
 */
router.get("/image/:cid", async (req, res) => {
  try {
    const response = await axios.get(
      `https://gateway.pinata.cloud/ipfs/${req.params.cid}`,
      {
        headers: { Authorization: `Bearer ${PINATA_JWT}` },
        responseType: "stream",
        timeout: 20000,
      }
    );
    res.setHeader("Content-Type", response.headers["content-type"] || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    response.data.pipe(res);
  } catch (err) {
    // Try cloudflare as fallback
    try {
      const fallback = await axios.get(
        `https://cloudflare-ipfs.com/ipfs/${req.params.cid}`,
        { responseType: "stream", timeout: 20000 }
      );
      res.setHeader("Content-Type", fallback.headers["content-type"] || "image/jpeg");
      fallback.data.pipe(res);
    } catch {
      res.status(404).json({ error: "Image not available" });
    }
  }
});

module.exports = router;
