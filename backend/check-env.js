// Run this to check your .env is correct: node check-env.js
require("dotenv").config();

console.log("\n🔍 Checking your .env file...\n");

const checks = [
  ["PINATA_API_KEY",    v => v && v.length > 10 && !v.includes("your_"),  "Should be ~32 chars from Pinata dashboard → API Keys"],
  ["PINATA_SECRET_KEY", v => v && v.length > 10 && !v.includes("your_"),  "Should be ~64 chars from Pinata dashboard → API Keys"],
  ["PINATA_JWT",        v => v && v.startsWith("eyJ"),                    "Must start with 'eyJ' — get from Pinata dashboard → API Keys → JWT field"],
  ["SEPOLIA_RPC_URL",   v => v && v.includes("infura.io"),                "Should be https://sepolia.infura.io/v3/YOUR_KEY"],
  ["USER_REGISTRY_ADDRESS",  v => v && v.startsWith("0x") && v.length === 42 && !v.includes("..."), "Must be a real 42-char address from Person 1"],
  ["POST_REGISTRY_ADDRESS",  v => v && v.startsWith("0x") && v.length === 42 && !v.includes("..."), "Must be a real 42-char address from Person 1"],
  ["CONTENT_TOKEN_ADDRESS",  v => v && v.startsWith("0x") && v.length === 42 && !v.includes("..."), "Must be a real 42-char address from Person 1"],
];

let allGood = true;
for (const [key, test, hint] of checks) {
  const val = process.env[key];
  const ok = test(val);
  if (ok) {
    console.log(`✅ ${key}: OK (${val.slice(0,12)}...)`);
  } else {
    console.log(`❌ ${key}: PROBLEM`);
    console.log(`   → ${hint}`);
    console.log(`   → Current value: ${val || "(empty)"}`);
    allGood = false;
  }
}

console.log(allGood ? "\n✅ All checks passed!\n" : "\n❌ Fix the issues above then restart the backend.\n");
