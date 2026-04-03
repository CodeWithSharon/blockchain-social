const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PostRegistry", function () {
  let contentToken;
  let postRegistry;
  let owner;
  let user1;
  let user2;
  let user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const ContentToken = await ethers.getContractFactory("ContentToken");
    contentToken = await ContentToken.deploy();
    await contentToken.waitForDeployment();
    const contentTokenAddress = await contentToken.getAddress();

    const PostRegistry = await ethers.getContractFactory("PostRegistry");
    postRegistry = await PostRegistry.deploy(contentTokenAddress);
    await postRegistry.waitForDeployment();
    const postRegistryAddress = await postRegistry.getAddress();

    await contentToken.setPostRegistry(postRegistryAddress);
  });

  describe("Create Post", function () {
    it("should create a post successfully", async function () {
      const ipfsHash = "QmTestHash123";
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test content"));

      await postRegistry.connect(user1).createPost(ipfsHash, contentHash);
      const post = await postRegistry.getPost(1);

      expect(post.author).to.equal(user1.address);
      expect(post.ipfsHash).to.equal(ipfsHash);
      expect(post.contentHash).to.equal(contentHash);
      expect(post.exists).to.equal(true);
      expect(post.isHidden).to.equal(false);
    });

    it("should increment post count", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await postRegistry.connect(user1).createPost("QmHash1", contentHash);
      await postRegistry.connect(user1).createPost("QmHash2", contentHash);
      expect(await postRegistry.getTotalPosts()).to.equal(2);
    });

    it("should not create post with empty IPFS hash", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await expect(
        postRegistry.connect(user1).createPost("", contentHash)
      ).to.be.revertedWith("IPFS hash cannot be empty");
    });

    it("should return posts by user", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await postRegistry.connect(user1).createPost("QmHash1", contentHash);
      await postRegistry.connect(user1).createPost("QmHash2", contentHash);
      const posts = await postRegistry.getPostsByUser(user1.address);
      expect(posts.length).to.equal(2);
    });
  });

  describe("Like Post", function () {
    beforeEach(async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await postRegistry.connect(user1).createPost("QmHash1", contentHash);
    });

    it("should like a post and mint token to author", async function () {
      await postRegistry.connect(user2).likePost(1);
      const post = await postRegistry.getPost(1);
      expect(post.likeCount).to.equal(1);
      expect(await contentToken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));
    });

    it("should not like your own post", async function () {
      await expect(
        postRegistry.connect(user1).likePost(1)
      ).to.be.revertedWith("Cannot like your own post");
    });

    it("should not like same post twice", async function () {
      await postRegistry.connect(user2).likePost(1);
      await expect(
        postRegistry.connect(user2).likePost(1)
      ).to.be.revertedWith("Already liked");
    });

    it("should return true for checkLiked after liking", async function () {
      await postRegistry.connect(user2).likePost(1);
      expect(await postRegistry.checkLiked(1, user2.address)).to.equal(true);
    });
  });

  describe("Flag Post", function () {
    beforeEach(async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await postRegistry.connect(user1).createPost("QmHash1", contentHash);
    });

    it("should flag a post", async function () {
      await postRegistry.connect(user2).flagPost(1);
      const post = await postRegistry.getPost(1);
      expect(post.flagCount).to.equal(1);
    });

    it("should not flag your own post", async function () {
      await expect(
        postRegistry.connect(user1).flagPost(1)
      ).to.be.revertedWith("Cannot flag your own post");
    });

    it("should not flag same post twice", async function () {
      await postRegistry.connect(user2).flagPost(1);
      await expect(
        postRegistry.connect(user2).flagPost(1)
      ).to.be.revertedWith("Already flagged");
    });
  });

  describe("Community Vote", function () {
    beforeEach(async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));

      // user1 creates the post to be voted on
      await postRegistry.connect(user1).createPost("QmHash1", contentHash);

      // Give user2 a large balance (3 CLINK) — they will vote false (keep)
      // so hide votes cannot win with just user2 alone
      // user2 creates post, liked by user1 x3 via 3 separate posts
      await postRegistry.connect(user2).createPost("QmHash2", contentHash);
      await postRegistry.connect(user3).likePost(2); // user2 gets 1 CLINK

      await postRegistry.connect(user2).createPost("QmHash3", contentHash);
      await postRegistry.connect(user3).likePost(3); // user2 gets 2nd CLINK

      await postRegistry.connect(user2).createPost("QmHash4", contentHash);
      await postRegistry.connect(user3).likePost(4); // user2 gets 3rd CLINK

      // Give user3 1 CLINK
      await postRegistry.connect(user3).createPost("QmHash5", contentHash);
      await postRegistry.connect(user2).likePost(5); // user3 gets 1 CLINK

      // user2 = 3 CLINK, user3 = 1 CLINK → total = 4 CLINK
      // user3 votes hide: 1/1 = 100% — still too early
      // BUT user2 votes first (false/keep): totalWeight=3, hideVotes=0 → 0%
      // Then user3 votes hide: totalWeight=4, hideVotes=1 → 25% < 51% → not hidden
      // For "hide" test: need user3(1) + someone else to exceed 51% of total(4)
      // user3(1) + user2(3) voting hide = 4/4 = 100% > 51% → hidden

      // Flag post 1 three times to trigger community review
      await postRegistry.connect(user2).flagPost(1);
      await postRegistry.connect(user3).flagPost(1);
      await postRegistry.connect(owner).flagPost(1);
    });

    // user2 votes first with false (keep) → hideVotes=0, total=3 → 0% → not hidden
    it("should allow token holder to vote", async function () {
      await postRegistry.connect(user2).vote(1, false);
      const post = await postRegistry.getPost(1);
      expect(post.isHidden).to.equal(false);
    });

    // user2 votes hide (3 CLINK) → 3/3=100% → hidden immediately
    it("should hide post when hide votes exceed 51 percent", async function () {
      await postRegistry.connect(user2).vote(1, true);
      const post = await postRegistry.getPost(1);
      expect(post.isHidden).to.equal(true);
    });

    it("should not vote without tokens", async function () {
      await expect(
        postRegistry.connect(owner).vote(1, true)
      ).to.be.revertedWith("Need CLINK tokens to vote");
    });

    it("should not vote twice", async function () {
      await postRegistry.connect(user2).vote(1, false);
      await expect(
        postRegistry.connect(user2).vote(1, false)
      ).to.be.revertedWith("Already voted");
    });

    it("should not vote if post not under review", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test2"));
      await postRegistry.connect(user1).createPost("QmHash6", contentHash);
      await expect(
        postRegistry.connect(user2).vote(6, true)
      ).to.be.revertedWith("Post not under review");
    });
  });

  describe("Tip Author", function () {
    beforeEach(async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await postRegistry.connect(user1).createPost("QmHash1", contentHash);
    });

    it("should send tip to author", async function () {
      const tipAmount = ethers.parseEther("1");
      const balanceBefore = await ethers.provider.getBalance(user1.address);
      await postRegistry.connect(user2).tipAuthor(1, { value: tipAmount });
      const balanceAfter = await ethers.provider.getBalance(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should not tip yourself", async function () {
      await expect(
        postRegistry.connect(user1).tipAuthor(1, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Cannot tip yourself");
    });

    it("should not tip with zero value", async function () {
      await expect(
        postRegistry.connect(user2).tipAuthor(1, { value: 0 })
      ).to.be.revertedWith("Tip amount must be greater than 0");
    });
  });

  describe("Verify Post", function () {
    it("should return true for correct content hash", async function () {
      const content = "test content";
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes(content));
      await postRegistry.connect(user1).createPost("QmHash1", contentHash);
      expect(await postRegistry.verifyPost(1, contentHash)).to.equal(true);
    });

    it("should return false for wrong content hash", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("original"));
      const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("tampered"));
      await postRegistry.connect(user1).createPost("QmHash1", contentHash);
      expect(await postRegistry.verifyPost(1, wrongHash)).to.equal(false);
    });
  });

  describe("Get All Posts", function () {
    it("should return all posts", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await postRegistry.connect(user1).createPost("QmHash1", contentHash);
      await postRegistry.connect(user2).createPost("QmHash2", contentHash);
      const posts = await postRegistry.getAllPosts();
      expect(posts.length).to.equal(2);
    });
  });
});