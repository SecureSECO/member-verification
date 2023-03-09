// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GithubVerification {
    mapping(address => uint256) internal verifiedTimeMap;

    address private immutable _owner;

    constructor() {
        _owner = msg.sender;
    }

    function verifyAddress(address _toVerify) external onlyOwner {
        verifiedTimeMap[_toVerify] = block.timestamp;
    }

    function addressIsVerified(address _toCheck) external view returns (bool) {
        return verifiedTimeMap[_toCheck] > 0;
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "Ownable: caller is not the owner");
        _;
    }
}
