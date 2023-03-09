// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract GithubVerification is Ownable {
    mapping(address => uint256) internal verifiedTimeMap;

    function verifyAddress(address _toVerify) external onlyOwner {
        verifiedTimeMap[_toVerify] = block.timestamp;
    }

    function addressIsVerified(
        address _toCheck
    ) external view onlyOwner returns (bool) {
        return verifiedTimeMap[_toCheck] > 0;
    }
}
