// SPDX-License-Identifier: MIT
/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  */

pragma solidity ^0.8.17;

import { SignatureHelper } from "../SignatureHelper.sol";

/// @notice This contract exposes the internal functions of the SignatureHelper contract for testing purposes
contract SignatureHelperMock is SignatureHelper {
    function _getPackedMessage(
        address _toVerify,
        string memory _userHash,
        uint _timestamp
    ) external pure returns (bytes memory) {
        return getPackedMessage(_toVerify, _userHash, _timestamp);
    }

    function _getMessageHash(
        address _toVerify,
        string memory _userHash,
        uint _timestamp
    ) external pure returns (bytes32) {
        return getMessageHash(_toVerify, _userHash, _timestamp);
    }

    function _getEthSignedMessageHash(
        bytes32 _messageHash
    ) external pure returns (bytes32) {
        return getEthSignedMessageHash(_messageHash);
    }

    function _verify(
        address _signer,
        address _toVerify,
        string calldata _userHash,
        uint _timestamp,
        bytes memory _signature
    ) external pure returns (bool) {
        return verify(_signer, _toVerify, _userHash, _timestamp, _signature);
    }

    function _recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes memory _signature
    ) external pure returns (address) {
        return recoverSigner(_ethSignedMessageHash, _signature);
    }

    /// @notice Splits the signature into r, s, and v
    /// @dev This is necessary for the ecrecover function
    /// @param sig The signature
    /// @return r Returns the first 32 bytes of the signature
    /// @return s Returns the second 32 bytes of the signature
    /// @return v Returns the last byte of the signature
    function _splitSignature(
        bytes memory sig
    ) external pure returns (bytes32 r, bytes32 s, uint8 v) {
        return splitSignature(sig);
    }
}