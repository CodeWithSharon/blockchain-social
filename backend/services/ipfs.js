const axios = require("axios");
const FormData = require("form-data");

const PINATA_API_KEY    = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_JWT        = process.env.PINATA_JWT;

console.log("IPFS service init:");
console.log("  PINATA_API_KEY:", PINATA_API_KEY ? `${PINATA_API_KEY.slice(0,8)}...` : "MISSING");
console.log("  PINATA_JWT:",     PINATA_JWT     ? `${PINATA_JWT.slice(0,12)}...`    : "MISSING");

const pinataUploadHeaders = {
  pinata_api_key:        PINATA_API_KEY,
  pinata_secret_api_key: PINATA_SECRET_KEY,
};

const contentCache = new Map();

async function uploadJSON(data, name = "metadata") {
  const response = await axios.post(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    { pinataContent: data, pinataMetadata: { name } },
    { headers: pinataUploadHeaders }
  );
  return response.data.IpfsHash;
}

async function uploadFile(buffer, originalname, mimetype) {
  const formData = new FormData();
  formData.append("file", buffer, { filename: originalname, contentType: mimetype });
  formData.append("pinataMetadata", JSON.stringify({ name: originalname }));
  const response = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    formData,
    {
      headers: { ...formData.getHeaders(), ...pinataUploadHeaders },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }
  );
  return response.data.IpfsHash;
}

async function fetchFromIPFS(cid) {
  // Skip fake test CIDs immediately
  if (!cid || cid === "QmPostHash123" || cid.length < 10) {
    throw new Error("Invalid or test CID");
  }

  if (contentCache.has(cid)) return contentCache.get(cid);

  console.log(`📦 Fetching CID: ${cid.slice(0, 20)}...`);

  // Method 1: Pinata authenticated gateway (works for CIDs YOU uploaded)
  if (PINATA_JWT) {
    try {
      const res = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`, {
        headers: { Authorization: `Bearer ${PINATA_JWT}` },
        timeout: 20000,
      });
      if (res.data) {
        console.log("✅ IPFS fetch success (Pinata auth)");
        contentCache.set(cid, res.data);
        return res.data;
      }
    } catch (e) {
      console.warn(`❌ Pinata auth failed: ${e.response?.status} ${e.message}`);
    }
  }

  // Method 2: ipfs.io (no auth needed, good uptime)
  try {
    const res = await axios.get(`https://ipfs.io/ipfs/${cid}`, { timeout: 20000 });
    if (res.data) {
      console.log("✅ IPFS fetch success (ipfs.io)");
      contentCache.set(cid, res.data);
      return res.data;
    }
  } catch (e) {
    console.warn(`❌ ipfs.io failed: ${e.response?.status} ${e.message}`);
  }

  // Method 3: nftstorage link
  try {
    const res = await axios.get(`https://${cid}.ipfs.nftstorage.link/`, { timeout: 20000 });
    if (res.data) {
      console.log("✅ IPFS fetch success (nftstorage)");
      contentCache.set(cid, res.data);
      return res.data;
    }
  } catch (e) {
    console.warn(`❌ nftstorage failed: ${e.response?.status} ${e.message}`);
  }

  throw new Error("All IPFS gateways failed");
}

function getIPFSUrl(cid) {
  if (!cid || cid === "QmPostHash123") return null;
  return `/api/ipfs/image/${cid}`;
}

module.exports = { uploadJSON, uploadFile, fetchFromIPFS, getIPFSUrl };
