const express = require("express");
const router = express.Router();
const { getUserData, invalidateCache } = require("../services/contractService");
const { uploadJSON, fetchFromIPFS, getIPFSUrl, uploadFile } = require("../services/ipfs");
const { verifyWallet } = require("../middleware/verifyWallet");
const multer = require("multer");
const { ethers } = require("ethers");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * GET /api/users/:address
 */
router.get("/:address", async (req, res) => {
  if (req.params.address === "debug") return res.json({ msg: "use /debug/:address" });
  try {
    const { address } = req.params;
    const userData = await getUserData(address);

    if (!userData.exists) {
      return res.status(404).json({ error: "User not registered" });
    }

    // Fetch profile metadata from IPFS
    let profileMeta = {};
    if (userData.profileCID && userData.profileCID.length > 10) {
      try {
        profileMeta = await fetchFromIPFS(userData.profileCID);
      } catch (e) {
        console.warn("Profile IPFS fetch failed:", e.message);
      }
    }

    res.json({
      walletAddress:  address,
      username:       userData.username,
      profileCID:     userData.profileCID,
      profileImageUrl: profileMeta.profileImageCID ? getIPFSUrl(profileMeta.profileImageCID) : null,
      bio:            profileMeta.bio || "",
      isVisible:      userData.isVisible,
      isVerified:     !!(userData.username && userData.username.trim().length > 0),
    });
  } catch (err) {
    console.error("GET /users/:address error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/users/invalidate-cache
 * Call this AFTER a registerUser or updateProfile transaction confirms
 * so the next GET returns fresh data from the contract
 */
router.post("/invalidate-cache", verifyWallet, (req, res) => {
  invalidateCache(`user_${req.walletAddress.toLowerCase()}`);
  res.json({ success: true });
});

/**
 * POST /api/users/upload-avatar
 */
router.post("/upload-avatar", verifyWallet, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const cid = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.json({ cid, url: getIPFSUrl(cid) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/users/prepare-profile
 */
router.post("/prepare-profile", verifyWallet, async (req, res) => {
  try {
    const { bio, profileImageCID } = req.body;
    const metadata = { bio: bio || "", profileImageCID: profileImageCID || "", updatedAt: Date.now() };
    const cid = await uploadJSON(metadata, `profile-${req.walletAddress}`);
    res.json({ cid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/users/debug/:address — raw ABI decode for debugging
 */
router.get("/debug/:address", async (req, res) => {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  try {
    const selector = ethers.id("getUser(address)").slice(0, 10);
    const encoded  = ethers.zeroPadValue(req.params.address, 32);
    const raw      = await provider.call({ to: process.env.USER_REGISTRY_ADDRESS, data: selector + encoded.slice(2) });
    res.json({ raw, words: raw.slice(2).match(/.{64}/g) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
