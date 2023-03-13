// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title A contract to verify addresses
/// @author JSC Lee
/// @notice You can use this contract to verify addresses
contract GithubVerification {
    mapping(address => uint256) internal verifiedTimeMap;
    mapping(string => address) internal usernameMap;

    address private immutable _owner;

    uint verifyDayThreshold = 60;

    /// @notice This constructor sets the owner of the contract
    constructor() {
        _owner = msg.sender;
    }

    /// @notice This function can only be called by the owner, and it verifies an address. It's not possible to re-verofuy an address before half the verifyDayThreshold has passed.
    /// @dev Verifies an address
    /// @param _toVerify The address to verify
    function verifyAddress(
        address _toVerify,
        string calldata _usernameHash
    ) external onlyOwner {
        require(
            usernameMap[_usernameHash] == address(0),
            "Username is already affiliated with an address"
        );
        require(_toVerify != address(0), "Address cannot be 0x0");
        require(
            verifiedTimeMap[_toVerify] == 0 ||
                verifiedTimeMap[_toVerify] +
                    ((verifyDayThreshold / 2) * 1 days) <
                block.timestamp,
            "Address already verified; cannot re-verify yet, wait half the verifyDayThreshold"
        );
        verifiedTimeMap[_toVerify] = block.timestamp;
    }

    /// @notice This function checks if an address is verified and if the address has been verified recently (within the set verifyDayThreshold)
    /// @param _toCheck The address to check
    /// @return A boolean indicating if the address is verified
    function addressIsVerified(address _toCheck) external view returns (bool) {
        if (
            verifiedTimeMap[_toCheck] + (verifyDayThreshold * 1 days) <
            block.timestamp
        ) return false;

        return verifiedTimeMap[_toCheck] > 0;
    }

    /// @notice This function can only be called by the owner, and it sets the verifyDayThreshold
    /// @dev Sets the verifyDayThreshold
    /// @param _days The number of days to set the verifyDayThreshold to
    function setVerifyDayThreshold(uint _days) external onlyOwner {
        verifyDayThreshold = _days;
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "Ownable: caller is not the owner");
        _;
    }
}
