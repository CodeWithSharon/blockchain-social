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

      await postRegistry.connect(user1).createPost("QmHash1", contentHash);

      await postRegistry.connect(user2).createPost("QmHash2", contentHash);
      await postRegistry.connect(user3).likePost(2);

      await postRegistry.connect(user2).createPost("QmHash3", contentHash);
      await postRegistry.connect(user3).likePost(3);

      await postRegistry.connect(user2).createPost("QmHash4", contentHash);
      await postRegistry.connect(user3).likePost(4);

      await postRegistry.connect(user3).createPost("QmHash5", contentHash);
      await postRegistry.connect(user2).likePost(5);

      await postRegistry.connect(user2).flagPost(1);
      await postRegistry.connect(user3).flagPost(1);
      await postRegistry.connect(owner).flagPost(1);
    });

    it("should allow token holder to vote", async function () {
      await postRegistry.connect(user2).vote(1, false);
      const post = await postRegistry.getPost(1);
      expect(post.isHidden).to.equal(false);
    });

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

  describe("Delete Post", function () {
    beforeEach(async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await postRegistry.connect(user1).createPost("QmHash1", contentHash);
    });

    it("should delete post by hiding it", async function () {
      await postRegistry.connect(user1).deletePost(1);
      const post = await postRegistry.getPost(1);
      expect(post.isHidden).to.equal(true);
    });

    it("should not allow non-author to delete", async function () {
      await expect(
        postRegistry.connect(user2).deletePost(1)
      ).to.be.revertedWith("Only author can delete");
    });

    it("should not delete non-existent post", async function () {
      await expect(
        postRegistry.connect(user1).deletePost(99)
      ).to.be.revertedWith("Post does not exist");
    });
  });

  describe("Repost", function () {
    beforeEach(async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await postRegistry.connect(user1).createPost("QmHash1", contentHash);
    });

    it("should repost successfully", async function () {
      await postRegistry.connect(user2).repost(1);
      expect(await postRegistry.getTotalPosts()).to.equal(2);
    });

    it("should track original author on repost", async function () {
      await postRegistry.connect(user2).repost(1);
      expect(await postRegistry.getOriginalAuthor(2)).to.equal(user1.address);
    });

    it("should increment repost count", async function () {
      await postRegistry.connect(user2).repost(1);
      expect(await postRegistry.getRepostCount(1)).to.equal(1);
    });

    it("should identify post as repost", async function () {
      await postRegistry.connect(user2).repost(1);
      expect(await postRegistry.isRepost(2)).to.equal(true);
    });

    it("should mint token to original author on repost", async function () {
      await postRegistry.connect(user2).repost(1);
      expect(await contentToken.balanceOf(user1.address)).to.equal(ethers.parseEther("1"));
    });

    it("should not repost your own post", async function () {
      await expect(
        postRegistry.connect(user1).repost(1)
      ).to.be.revertedWith("Cannot repost your own post");
    });

    it("should not repost hidden post", async function () {
      await postRegistry.connect(user1).deletePost(1);
      await expect(
        postRegistry.connect(user2).repost(1)
      ).to.be.revertedWith("Post is hidden");
    });
  });

  describe("Comments", function () {
    beforeEach(async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await postRegistry.connect(user1).createPost("QmHash1", contentHash);
    });

    it("should add a comment successfully", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("comment"));
      await postRegistry.connect(user2).addComment(1, "QmCommentHash", contentHash);
      const comment = await postRegistry.getComment(1);
      expect(comment.author).to.equal(user2.address);
      expect(comment.postId).to.equal(1);
      expect(comment.exists).to.equal(true);
    });

    it("should increment comment count", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("comment"));
      await postRegistry.connect(user2).addComment(1, "QmCommentHash1", contentHash);
      await postRegistry.connect(user3).addComment(1, "QmCommentHash2", contentHash);
      expect(await postRegistry.getCommentCount(1)).to.equal(2);
    });

    it("should return all comments for a post", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("comment"));
      await postRegistry.connect(user2).addComment(1, "QmCommentHash1", contentHash);
      await postRegistry.connect(user3).addComment(1, "QmCommentHash2", contentHash);
      const comments = await postRegistry.getPostComments(1);
      expect(comments.length).to.equal(2);
    });

    it("should not comment on hidden post", async function () {
      await postRegistry.connect(user1).deletePost(1);
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("comment"));
      await expect(
        postRegistry.connect(user2).addComment(1, "QmCommentHash", contentHash)
      ).to.be.revertedWith("Post is hidden");
    });

    it("should like a comment and mint token to comment author", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("comment"));
      await postRegistry.connect(user2).addComment(1, "QmCommentHash", contentHash);
      await postRegistry.connect(user3).likeComment(1);
      const comment = await postRegistry.getComment(1);
      expect(comment.likeCount).to.equal(1);
      expect(await contentToken.balanceOf(user2.address)).to.equal(ethers.parseEther("1"));
    });

    it("should not like your own comment", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("comment"));
      await postRegistry.connect(user2).addComment(1, "QmCommentHash", contentHash);
      await expect(
        postRegistry.connect(user2).likeComment(1)
      ).to.be.revertedWith("Cannot like your own comment");
    });

    it("should not like same comment twice", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("comment"));
      await postRegistry.connect(user2).addComment(1, "QmCommentHash", contentHash);
      await postRegistry.connect(user3).likeComment(1);
      await expect(
        postRegistry.connect(user3).likeComment(1)
      ).to.be.revertedWith("Already liked");
    });
  });
});
