const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Wallet balance:", hre.ethers.formatEther(balance), "ETH");

  // 1. Deploy ContentToken
  console.log("\nDeploying ContentToken...");
  const ContentToken = await hre.ethers.getContractFactory("ContentToken");
  const contentToken = await ContentToken.deploy();
  await contentToken.waitForDeployment();
  const contentTokenAddress = await contentToken.getAddress();
  console.log("ContentToken deployed to:", contentTokenAddress);

  // 2. Deploy UserRegistry
  console.log("\nDeploying UserRegistry...");
  const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.waitForDeployment();
  const userRegistryAddress = await userRegistry.getAddress();
  console.log("UserRegistry deployed to:", userRegistryAddress);

  // 3. Deploy PostRegistry
  console.log("\nDeploying PostRegistry...");
  const PostRegistry = await hre.ethers.getContractFactory("PostRegistry");
  const postRegistry = await PostRegistry.deploy(contentTokenAddress);
  await postRegistry.waitForDeployment();
  const postRegistryAddress = await postRegistry.getAddress();
  console.log("PostRegistry deployed to:", postRegistryAddress);

  // 4. Set PostRegistry as authorized minter
  console.log("\nSetting PostRegistry as authorized minter...");
  await contentToken.setPostRegistry(postRegistryAddress);
  console.log("Done!");

  console.log("\n===== DEPLOYMENT COMPLETE =====");
  console.log("CONTENT_TOKEN_ADDRESS=" + contentTokenAddress);
  console.log("USER_REGISTRY_ADDRESS=" + userRegistryAddress);
  console.log("POST_REGISTRY_ADDRESS=" + postRegistryAddress);
  console.log("\nUpdate your .env with these new Sepolia addresses!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});