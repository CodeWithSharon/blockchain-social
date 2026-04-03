const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UserRegistry", function () {
  let userRegistry;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    userRegistry = await UserRegistry.deploy();
    await userRegistry.waitForDeployment();
  });

  describe("Register User", function () {
    it("should register a new user", async function () {
      await userRegistry.connect(user1).registerUser("alice", "QmHash123");
      const user = await userRegistry.getUser(user1.address);
      expect(user.username).to.equal("alice");
      expect(user.avatarHash).to.equal("QmHash123");
      expect(user.exists).to.equal(true);
      expect(user.isPublic).to.equal(true);
      expect(user.isVerified).to.equal(false);
    });

    it("should not register same user twice", async function () {
      await userRegistry.connect(user1).registerUser("alice", "QmHash123");
      await expect(
        userRegistry.connect(user1).registerUser("alice2", "QmHash456")
      ).to.be.revertedWith("User already registered");
    });

    it("should not register with empty username", async function () {
      await expect(
        userRegistry.connect(user1).registerUser("", "QmHash123")
      ).to.be.revertedWith("Username cannot be empty");
    });

    it("should not register with username longer than 30 chars", async function () {
      await expect(
        userRegistry.connect(user1).registerUser("a".repeat(31), "QmHash123")
      ).to.be.revertedWith("Username too long");
    });

    it("should increase total user count", async function () {
      await userRegistry.connect(user1).registerUser("alice", "QmHash123");
      await userRegistry.connect(user2).registerUser("bob", "QmHash456");
      expect(await userRegistry.getTotalUsers()).to.equal(2);
    });
  });

  describe("Update Profile", function () {
    beforeEach(async function () {
      await userRegistry.connect(user1).registerUser("alice", "QmHash123");
    });

    it("should update username and avatar", async function () {
      await userRegistry.connect(user1).updateProfile("alice2", "QmHash999");
      const user = await userRegistry.getUser(user1.address);
      expect(user.username).to.equal("alice2");
      expect(user.avatarHash).to.equal("QmHash999");
    });

    it("should not update if user not registered", async function () {
      await expect(
        userRegistry.connect(user2).updateProfile("bob", "QmHash456")
      ).to.be.revertedWith("User not registered");
    });
  });

  describe("Visibility", function () {
    beforeEach(async function () {
      await userRegistry.connect(user1).registerUser("alice", "QmHash123");
    });

    it("should set profile to private", async function () {
      await userRegistry.connect(user1).setVisibility(false);
      const user = await userRegistry.getUser(user1.address);
      expect(user.isPublic).to.equal(false);
    });

    it("should set profile back to public", async function () {
      await userRegistry.connect(user1).setVisibility(false);
      await userRegistry.connect(user1).setVisibility(true);
      const user = await userRegistry.getUser(user1.address);
      expect(user.isPublic).to.equal(true);
    });
  });

  describe("Verified Badge", function () {
    beforeEach(async function () {
      await userRegistry.connect(user1).registerUser("alice", "QmHash123");
    });

    it("should set user as verified", async function () {
      await userRegistry.connect(user1).setVerified(true);
      const user = await userRegistry.getUser(user1.address);
      expect(user.isVerified).to.equal(true);
    });

    it("should revoke verified status", async function () {
      await userRegistry.connect(user1).setVerified(true);
      await userRegistry.connect(user1).setVerified(false);
      const user = await userRegistry.getUser(user1.address);
      expect(user.isVerified).to.equal(false);
    });
  });

  describe("Follow System", function () {
    beforeEach(async function () {
      await userRegistry.connect(user1).registerUser("alice", "QmHash123");
      await userRegistry.connect(user2).registerUser("bob", "QmHash456");
    });

    it("should follow another user", async function () {
      await userRegistry.connect(user1).follow(user2.address);
      expect(await userRegistry.checkFollowing(user1.address, user2.address)).to.equal(true);
    });

    it("should unfollow a user", async function () {
      await userRegistry.connect(user1).follow(user2.address);
      await userRegistry.connect(user1).unfollow(user2.address);
      expect(await userRegistry.checkFollowing(user1.address, user2.address)).to.equal(false);
    });

    it("should not follow yourself", async function () {
      await expect(
        userRegistry.connect(user1).follow(user1.address)
      ).to.be.revertedWith("Cannot follow yourself");
    });

    it("should not follow same user twice", async function () {
      await userRegistry.connect(user1).follow(user2.address);
      await expect(
        userRegistry.connect(user1).follow(user2.address)
      ).to.be.revertedWith("Already following");
    });

    it("should return correct follower count", async function () {
      await userRegistry.connect(user1).follow(user2.address);
      expect(await userRegistry.getFollowerCount(user2.address)).to.equal(1);
    });

    it("should return correct following count", async function () {
      await userRegistry.connect(user1).follow(user2.address);
      expect(await userRegistry.getFollowingCount(user1.address)).to.equal(1);
    });
  });

  describe("Delete User", function () {
    beforeEach(async function () {
      await userRegistry.connect(user1).registerUser("alice", "QmHash123");
    });

    it("should delete user account", async function () {
      await userRegistry.connect(user1).deleteUser();
      expect(await userRegistry.userExists(user1.address)).to.equal(false);
    });

    it("should not delete unregistered user", async function () {
      await expect(
        userRegistry.connect(user2).deleteUser()
      ).to.be.revertedWith("User not registered");
    });
  });
});