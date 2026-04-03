const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ContentToken", function () {
  let contentToken;
  let postRegistry;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const ContentToken = await ethers.getContractFactory("ContentToken");
    contentToken = await ContentToken.deploy();
    await contentToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the correct token name and symbol", async function () {
      expect(await contentToken.name()).to.equal("CLINKToken");
      expect(await contentToken.symbol()).to.equal("CLINK");
    });

    it("should set the deployer as owner", async function () {
      expect(await contentToken.owner()).to.equal(owner.address);
    });

    it("should start with zero total supply", async function () {
      expect(await contentToken.totalSupply()).to.equal(0);
    });
  });

  describe("setPostRegistry", function () {
    it("should allow owner to set PostRegistry address", async function () {
      await contentToken.setPostRegistry(user1.address);
      expect(await contentToken.postRegistryAddress()).to.equal(user1.address);
    });

    it("should not allow non-owner to set PostRegistry address", async function () {
      await expect(
        contentToken.connect(user1).setPostRegistry(user2.address)
      ).to.be.reverted;
    });
  });

  describe("Mint", function () {
    beforeEach(async function () {
      await contentToken.setPostRegistry(user1.address);
    });

    it("should allow PostRegistry to mint tokens", async function () {
      const amount = ethers.parseEther("1");
      await contentToken.connect(user1).mint(user2.address, amount);
      expect(await contentToken.balanceOf(user2.address)).to.equal(amount);
    });

    it("should not allow non-PostRegistry to mint tokens", async function () {
      const amount = ethers.parseEther("1");
      await expect(
        contentToken.connect(user2).mint(user2.address, amount)
      ).to.be.revertedWith("Only PostRegistry can mint");
    });

    it("should increase total supply after minting", async function () {
      const amount = ethers.parseEther("5");
      await contentToken.connect(user1).mint(user2.address, amount);
      expect(await contentToken.totalSupply()).to.equal(amount);
    });
  });

  describe("Burn", function () {
    beforeEach(async function () {
      await contentToken.setPostRegistry(user1.address);
      await contentToken.connect(user1).mint(user2.address, ethers.parseEther("10"));
    });

    it("should allow user to burn their own tokens", async function () {
      await contentToken.connect(user2).burn(ethers.parseEther("5"));
      expect(await contentToken.balanceOf(user2.address)).to.equal(ethers.parseEther("5"));
    });

    it("should decrease total supply after burning", async function () {
      await contentToken.connect(user2).burn(ethers.parseEther("10"));
      expect(await contentToken.totalSupply()).to.equal(0);
    });
  });
});