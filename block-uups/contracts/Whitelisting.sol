// #SDPXJDSFJSDLFJDLJ
pragma solidity ^0.8.0;

import {PluginUUPSUpgradeable, IDAO} from "@aragon/osx/core/plugin/PluginUUPSUpgradeable.sol";

library SharedStructs {
    struct Stamp {
        string id;
        string _hash;
        uint verifiedAt;
    }
}

interface VerificationInterface {
    function getStamps(
        address _toCheck
    ) external view returns (SharedStructs.Stamp[] memory);
}

contract Whitelisting is PluginUUPSUpgradeable {
    bytes32 public constant WHITELIST_PERMISSION_ID =
        keccak256("WHITELIST_PERMISSION");

    address public verificationContractAddress = address(0);
    VerificationInterface verificationContract =
        VerificationInterface(verificationContractAddress);

    mapping(address => uint256) public whitelistTimestamps;

    /// @notice Initializes the plugin when v1.0 is installed.
    function initializeBuild0(IDAO _dao) external initializer {
        __PluginUUPSUpgradeable_init(_dao);
    }

    function whitelist(
        address _address
    ) external auth(WHITELIST_PERMISSION_ID) {
        whitelistTimestamps[_address] = block.timestamp;
    }

    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2 ** (8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i] = char(hi);
            s[2 * i + 1] = char(lo);
        }
        return string(s);
    }

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    function getStamps(address _address) external view returns (SharedStructs.Stamp[] memory) {
        SharedStructs.Stamp[] memory stamps = verificationContract.getStamps(
            _address
        );

        if (whitelistTimestamps[_address] == 0) {
            return stamps;
        } else {
            SharedStructs.Stamp[] memory stamps2 = new SharedStructs.Stamp[](stamps.length + 1);
            SharedStructs.Stamp memory stamp = SharedStructs.Stamp(
                "whitelist",
                toAsciiString(_address),
                whitelistTimestamps[_address]
            );

            stamps2[0] = stamp;

            for (uint i = 0; i < stamps.length; i++) {
                stamps2[i + 1] = stamps[i];
            }
            
            return stamps2;
        }
    }
}
