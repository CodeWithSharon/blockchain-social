// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ContentToken.sol";

contract PostRegistry {

    ContentToken public contentToken;

    struct Post {
        uint256 id;
        address author;
        string ipfsHash;
        bytes32 contentHash;
        uint256 timestamp;
        uint256 likeCount;
        uint256 flagCount;
        uint256 tipAmount;
        bool isHidden;
        bool exists;
    }

    uint256 public postCount;

    mapping(uint256 => Post) private posts;
    mapping(address => uint256[]) private userPosts;
    mapping(uint256 => mapping(address => bool)) private hasVoted;
    mapping(uint256 => uint256) private hideVotes;
    mapping(uint256 => uint256) private totalVoteWeight;
    mapping(uint256 => mapping(address => bool)) private hasLiked;
    mapping(uint256 => mapping(address => bool)) private hasFlagged;

    event PostCreated(uint256 indexed postId, address indexed author, string ipfsHash, uint256 timestamp);
    event PostLiked(uint256 indexed postId, address indexed liker, address indexed author);
    event PostFlagged(uint256 indexed postId, address indexed flagger, uint256 flagCount);
    event PostHidden(uint256 indexed postId);
    event TipSent(uint256 indexed postId, address indexed from, address indexed to, uint256 amount);
    event Voted(uint256 indexed postId, address indexed voter, bool hideVote);

    constructor(address _contentTokenAddress) {
        contentToken = ContentToken(_contentTokenAddress);
    }

    function createPost(string memory _ipfsHash, bytes32 _contentHash) external {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        postCount++;
        posts[postCount] = Post({
            id: postCount,
            author: msg.sender,
            ipfsHash: _ipfsHash,
            contentHash: _contentHash,
            timestamp: block.timestamp,
            likeCount: 0,
            flagCount: 0,
            tipAmount: 0,
            isHidden: false,
            exists: true
        });
        userPosts[msg.sender].push(postCount);
        emit PostCreated(postCount, msg.sender, _ipfsHash, block.timestamp);
    }

    function likePost(uint256 _postId) external {
        require(posts[_postId].exists, "Post does not exist");
        require(!posts[_postId].isHidden, "Post is hidden");
        require(!hasLiked[_postId][msg.sender], "Already liked");
        require(posts[_postId].author != msg.sender, "Cannot like your own post");
        hasLiked[_postId][msg.sender] = true;
        posts[_postId].likeCount++;
        contentToken.mint(posts[_postId].author, 1 * 10 ** 18);
        emit PostLiked(_postId, msg.sender, posts[_postId].author);
    }

    function flagPost(uint256 _postId) external {
        require(posts[_postId].exists, "Post does not exist");
        require(!hasFlagged[_postId][msg.sender], "Already flagged");
        require(posts[_postId].author != msg.sender, "Cannot flag your own post");
        hasFlagged[_postId][msg.sender] = true;
        posts[_postId].flagCount++;
        emit PostFlagged(_postId, msg.sender, posts[_postId].flagCount);
    }

    function vote(uint256 _postId, bool _hideVote) external {
        require(posts[_postId].exists, "Post does not exist");
        require(posts[_postId].flagCount >= 3, "Post not under review");
        require(!hasVoted[_postId][msg.sender], "Already voted");
        require(!posts[_postId].isHidden, "Post already hidden");
        uint256 voterBalance = contentToken.balanceOf(msg.sender);
        require(voterBalance > 0, "Need CLINK tokens to vote");
        hasVoted[_postId][msg.sender] = true;
        totalVoteWeight[_postId] += voterBalance;
        if (_hideVote) {
            hideVotes[_postId] += voterBalance;
        }
        if (hideVotes[_postId] * 100 / totalVoteWeight[_postId] >= 51) {
            posts[_postId].isHidden = true;
            emit PostHidden(_postId);
        }
        emit Voted(_postId, msg.sender, _hideVote);
    }

    function tipAuthor(uint256 _postId) external payable {
        require(posts[_postId].exists, "Post does not exist");
        require(msg.value > 0, "Tip amount must be greater than 0");
        require(posts[_postId].author != msg.sender, "Cannot tip yourself");
        posts[_postId].tipAmount += msg.value;
        (bool sent, ) = payable(posts[_postId].author).call{value: msg.value}("");
        require(sent, "Failed to send tip");
        emit TipSent(_postId, msg.sender, posts[_postId].author, msg.value);
    }

    function verifyPost(uint256 _postId, bytes32 _contentHash) external view returns (bool) {
        require(posts[_postId].exists, "Post does not exist");
        return posts[_postId].contentHash == _contentHash;
    }

    function getPost(uint256 _postId) external view returns (Post memory) {
        require(posts[_postId].exists, "Post does not exist");
        return posts[_postId];
    }

    function getAllPosts() external view returns (Post[] memory) {
        Post[] memory allPosts = new Post[](postCount);
        for (uint256 i = 1; i <= postCount; i++) {
            allPosts[i - 1] = posts[i];
        }
        return allPosts;
    }

    function getPostsByUser(address _user) external view returns (Post[] memory) {
        uint256[] memory ids = userPosts[_user];
        Post[] memory result = new Post[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = posts[ids[i]];
        }
        return result;
    }

    function checkLiked(uint256 _postId, address _user) external view returns (bool) {
        return hasLiked[_postId][_user];
    }

    function checkFlagged(uint256 _postId, address _user) external view returns (bool) {
        return hasFlagged[_postId][_user];
    }

    function getTotalPosts() external view returns (uint256) {
        return postCount;
    }
}
