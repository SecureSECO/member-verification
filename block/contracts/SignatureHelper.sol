// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// Modified source from: https://solidity-by-example.org/signature/

/* Signature Verification

How to Sign and Verify
# Signing
1. Create message to sign
2. Hash the message
3. Sign the hash (off chain, keep your private key secret)

# Verify
1. Recreate hash from the original message
2. Recover signer from signature and hash
3. Compare recovered signer to claimed signer
*/

/// @title Set of (helper) functions for signature verification
contract SignatureHelper {
    /// @notice Packs three parameters (address, string, uint) into one packed message
    /// @dev This is done before the keccak256 hash
    /// @param _toVerify The address to verify
    /// @param _userHash Unique user hash on the platform of the stamp (GH, PoH, etc.)
    /// @param _timestamp Timestamp at which the proof was generated
    /// @return bytes Returns the packed message
    function getPackedMessage(
        address _toVerify,
        string memory _userHash,
        uint _timestamp
    ) public pure returns (bytes memory) {
        return abi.encodePacked(_toVerify, _userHash, _timestamp);
    }

    /// @notice Hashes a (packed) message using keccak256
    /// @dev This is done after packing the parameters 
    /// @param _toVerify The address to verify
    /// @param _userHash Unique user hash of the platform of the stamp (GH, PoH, etc.)
    /// @param _timestamp Timestamp at which the proof was generated
    /// @return bytes Returns the hash of the packed message (a.k.a. messageHash)
    function getMessageHash(
        address _toVerify,
        string memory _userHash,
        uint _timestamp
    ) public pure returns (bytes32) {
        bytes memory packedMsg = getPackedMessage(_toVerify, _userHash, _timestamp);
        return keccak256(packedMsg);
    }

    /// @notice Signs the messageHash with a standard prefix
    /// @param _messageHash The hash of the packed message (messageHash) to be signed
    /// @return bytes32 Returns the signed messageHash
    function getEthSignedMessageHash(
        bytes32 _messageHash
    ) public pure returns (bytes32) {
        /*
        Signature is produced by signing a keccak256 hash with the following format:
        "\x19Ethereum Signed Message\n" + len(msg) + msg
        */
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _messageHash
                )
            );
    }

    /// @notice Verify a signature
    /// @dev Generate the signed messageHash from the parameters to verify the signature against
    /// @param _signer The signer of the signature (the owner of the contract)
    /// @param _toVerify The address to verify
    /// @param _userHash Unique user hash of the platform of the stamp (GH, PoH, etc.)
    /// @param _timestamp Timestamp at which the proof was generated
    /// @param _signature The signature of the proof signed by the signer
    /// @return bool Returns the result of the verification, where true indicates success and false indicates failure
    function verify(
        address _signer,
        address _toVerify,
        string calldata _userHash,
        uint _timestamp,
        bytes memory _signature
    ) public pure returns (bool) {
        bytes32 messageHash = getMessageHash(_toVerify, _userHash, _timestamp);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return recoverSigner(ethSignedMessageHash, _signature) == _signer;
    }

    /// @notice Recover the signer from the signed messageHash and the signature
    /// @dev This uses ecrecover
    /// @param _ethSignedMessageHash The signed messageHash created from the parameters
    /// @param _signature The signature of the proof signed by the signer
    /// @return address Returns the recovered address
    function recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes memory _signature
    ) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);

        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    /// @notice Splits the signature into r, s, and v
    /// @dev This is necessary for the ecrecover function
    /// @param sig The signature
    /// @return r Returns the first 32 bytes of the signature
    /// @return s Returns the second 32 bytes of the signature
    /// @return v Returns the last byte of the signature
    function splitSignature(
        bytes memory sig
    ) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "invalid signature length");

        assembly {
            /*
            First 32 bytes stores the length of the signature

            add(sig, 32) = pointer of sig + 32
            effectively, skips first 32 bytes of signature

            mload(p) loads next 32 bytes starting at the memory address p into memory
            */

            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        // implicitly return (r, s, v)
    }
}
