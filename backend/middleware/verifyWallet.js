const { ethers } = require("ethers");

/**
 * Middleware: verify that the request contains a valid signed message
 * proving the sender owns the wallet address they claim.
 *
 * Frontend sends:
 *   headers:
 *     x-wallet-address: "0x..."
 *     x-signature: "<signature of the nonce message>"
 *     x-message: "Sign in to BlockchainSocial: <timestamp>"
 */
function verifyWallet(req, res, next) {
  try {
    const walletAddress = req.headers["x-wallet-address"];
    const signature = req.headers["x-signature"];
    const message = req.headers["x-message"];

    if (!walletAddress || !signature || !message) {
      return res
        .status(401)
        .json({ error: "Missing wallet authentication headers" });
    }

    // Recover the address from the signed message
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ error: "Signature verification failed" });
    }

    // Attach verified address to request
    req.walletAddress = walletAddress;
    next();
  } catch (err) {
    console.error("Wallet verification error:", err.message);
    res.status(401).json({ error: "Invalid signature" });
  }
}

module.exports = { verifyWallet };
