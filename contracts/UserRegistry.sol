// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UserRegistry {

    struct User {
        address walletAddress;
        string username;
        string avatarHash;
        bool isPublic;
        bool isVerified;
        bool exists;
        uint256 registeredAt;
    }

    mapping(address => User) private users;
    address[] private registeredUsers;
    mapping(address => address[]) private following;
    mapping(address => address[]) private followers;
    mapping(address => mapping(address => bool)) private isFollowing;

    event UserRegistered(address indexed wallet, string username, uint256 timestamp);
    event UserUpdated(address indexed wallet, string username);
    event UserDeleted(address indexed wallet);
    event VisibilityChanged(address indexed wallet, bool isPublic);
    event UserVerified(address indexed wallet, bool isVerified);
    event Followed(address indexed follower, address indexed followed);
    event Unfollowed(address indexed follower, address indexed followed);

    function registerUser(string memory _username, string memory _avatarHash) external {
        require(!users[msg.sender].exists, "User already registered");
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(bytes(_username).length <= 30, "Username too long");

        users[msg.sender] = User({
            walletAddress: msg.sender,
            username: _username,
            avatarHash: _avatarHash,
            isPublic: true,
            isVerified: false,
            exists: true,
            registeredAt: block.timestamp
        });

        registeredUsers.push(msg.sender);
        emit UserRegistered(msg.sender, _username, block.timestamp);
    }

    function updateProfile(string memory _username, string memory _avatarHash) external {
        require(users[msg.sender].exists, "User not registered");
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(bytes(_username).length <= 30, "Username too long");

        users[msg.sender].username = _username;
        users[msg.sender].avatarHash = _avatarHash;
        emit UserUpdated(msg.sender, _username);
    }

    function setVisibility(bool _isPublic) external {
        require(users[msg.sender].exists, "User not registered");
        users[msg.sender].isPublic = _isPublic;
        emit VisibilityChanged(msg.sender, _isPublic);
    }

    function deleteUser() external {
        require(users[msg.sender].exists, "User not registered");
        delete users[msg.sender];
        emit UserDeleted(msg.sender);
    }

    function setVerified(bool _isVerified) external {
        require(users[msg.sender].exists, "User not registered");
        users[msg.sender].isVerified = _isVerified;
        emit UserVerified(msg.sender, _isVerified);
    }

    function follow(address _user) external {
        require(users[msg.sender].exists, "You are not registered");
        require(users[_user].exists, "User not found");
        require(!isFollowing[msg.sender][_user], "Already following");
        require(msg.sender != _user, "Cannot follow yourself");
        isFollowing[msg.sender][_user] = true;
        following[msg.sender].push(_user);
        followers[_user].push(msg.sender);
        emit Followed(msg.sender, _user);
    }

    function unfollow(address _user) external {
        require(isFollowing[msg.sender][_user], "Not following");
        isFollowing[msg.sender][_user] = false;
        emit Unfollowed(msg.sender, _user);
    }

    function getUser(address _wallet) external view returns (User memory) {
        require(users[_wallet].exists, "User not found");
        return users[_wallet];
    }

    function userExists(address _wallet) external view returns (bool) {
        return users[_wallet].exists;
    }

    function getTotalUsers() external view returns (uint256) {
        return registeredUsers.length;
    }

    function getFollowing(address _user) external view returns (address[] memory) {
        return following[_user];
    }

    function getFollowers(address _user) external view returns (address[] memory) {
        return followers[_user];
    }

    function checkFollowing(address _follower, address _followed) external view returns (bool) {
        return isFollowing[_follower][_followed];
    }

    function getFollowerCount(address _user) external view returns (uint256) {
        return followers[_user].length;
    }

    function getFollowingCount(address _user) external view returns (uint256) {
        return following[_user].length;
    }
}