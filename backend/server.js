require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// Routes — ordered so specific paths come before params
app.use("/api/users",    require("./routes/users"));
app.use("/api/posts",    require("./routes/posts"));
app.use("/api/tokens",   require("./routes/tokens"));
app.use("/api/ipfs",     require("./routes/ipfs"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/follows",  require("./routes/follows"));
app.use("/api/reposts",  require("./routes/reposts"));

app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`\n🚀 ChainSocial backend on http://localhost:${PORT}`);
  console.log(`📡 RPC: ${process.env.SEPOLIA_RPC_URL ? "Infura ✓" : "⚠️ MISSING SEPOLIA_RPC_URL"}`);
  console.log(`📦 IPFS: ${process.env.PINATA_JWT ? "Pinata ✓" : "⚠️ MISSING PINATA_JWT"}`);
  console.log(`📋 Contracts:`);
  console.log(`   UserRegistry: ${process.env.USER_REGISTRY_ADDRESS || "⚠️ not set"}`);
  console.log(`   PostRegistry: ${process.env.POST_REGISTRY_ADDRESS || "⚠️ not set"}`);
  console.log(`   ContentToken: ${process.env.CONTENT_TOKEN_ADDRESS || "⚠️ not set"}`);
});
