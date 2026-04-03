// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ContentToken is ERC20, Ownable {

    address public postRegistryAddress;

    constructor() ERC20("CLINKToken", "CLINK") Ownable(msg.sender) {}

    function setPostRegistry(address _address) external onlyOwner {
        postRegistryAddress = _address;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == postRegistryAddress, "Only PostRegistry can mint");
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
