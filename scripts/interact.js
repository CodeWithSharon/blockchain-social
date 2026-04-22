const hre = require("hardhat");

async function main() {
  const [user1, user2] = await hre.ethers.getSigners();

  console.log("=== Interact with Sepolia Contracts ===\n");

  // Load deployed contracts
  const contentToken = await hre.ethers.getContractAt(
    "ContentToken",
    process.env.CONTENT_TOKEN_ADDRESS
  );
  const userRegistry = await hre.ethers.getContractAt(
    "UserRegistry",
    process.env.USER_REGISTRY_ADDRESS
  );
  const postRegistry = await hre.ethers.getContractAt(
    "PostRegistry",
    process.env.POST_REGISTRY_ADDRESS
  );

  console.log("Contracts loaded:");
  console.log("ContentToken:", process.env.CONTENT_TOKEN_ADDRESS);
  console.log("UserRegistry:", process.env.USER_REGISTRY_ADDRESS);
  console.log("PostRegistry:", process.env.POST_REGISTRY_ADDRESS);

  // 1. Check token info
  console.log("\n--- Token Info ---");
  const name = await contentToken.name();
  const symbol = await contentToken.symbol();
  const totalSupply = await contentToken.totalSupply();
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Total Supply:", hre.ethers.formatEther(totalSupply), "CLINK");

  // 2. Register a user
  console.log("\n--- Registering User ---");
  try {
    const tx1 = await userRegistry.connect(user1).registerUser("alice", "QmAvatarHash123");
    await tx1.wait();
    console.log("User registered: alice");
  } catch (e) {
    console.log("User already registered — skipping");
  }

  // 3. Get user info
  const user = await userRegistry.getUser(user1.address);
  console.log("Username:", user.username);
  console.log("Is Public:", user.isPublic);
  console.log("Is Verified:", user.isVerified);

  // 4. Create a post
  console.log("\n--- Creating Post ---");
  const contentHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("Hello Sepolia!"));
  const tx2 = await postRegistry.connect(user1).createPost("QmPostHash123", contentHash);
  await tx2.wait();
  console.log("Post created!");

  // 5. Get total posts and fetch latest
  const totalPosts = await postRegistry.getTotalPosts();
  const post = await postRegistry.getPost(totalPosts);
  console.log("Post ID:", post.id.toString());
  console.log("Author:", post.author);
  console.log("IPFS Hash:", post.ipfsHash);
  console.log("Like Count:", post.likeCount.toString());

  // 6. Check total posts
  console.log("\nTotal Posts:", totalPosts.toString());

  // 7. Check total users
  const totalUsers = await userRegistry.getTotalUsers();
  console.log("Total Users:", totalUsers.toString());

  console.log("\n=== All interactions successful! ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
