/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  */

const Web3 = require("web3");
const bip39 = require("bip39");
const hdkey = require("hdkey");
const { snapshot } = require("@openzeppelin/test-helpers");

/**
 *
 * @param {string} hdkDerivePath The derivation path of the accounts (m44'60'0'0account_index). Defaults to the first account.
 * @returns {string} The private key as a hexadecimal string.
 */
const getPrivateKeyFromFirstAddress = async (
  hdkDerivePath = "m/44'/60'/0'/0/0"
) => {
  const seed = await bip39.mnemonicToSeed(process.env.MNEMONIC ?? "lonely initial gold insect blue path episode kingdom fame execute ranch velvet");
  const hdk = hdkey.fromMasterSeed(seed);
  const addr_node = hdk.derive(hdkDerivePath); // gets first account
  const private_key = addr_node.privateKey;

  return private_key.toString("hex");
};

/**
 *
 * @param {number} timestamp Timestamp at which the proof is made
 * @param {string} toVerify Account address to verify
 * @param {string} ownerPrivKey Private key of the signer
 * @returns
 */
const createSignature = async (timestamp, toVerify, ownerPrivKey) => {
  // One time setup for the web3 constants
  const web3 = new Web3(
    new Web3.providers.HttpProvider("http://127.0.0.1:65534")
  );

  const userHash =
    "090d4910f4b4038000f6ea86644d55cb5261a1dc1f006d928dcc049b157daff8";

  const packedMessage = web3.utils.encodePacked(
    {
      type: "address",
      value: toVerify,
    },
    {
      type: "string",
      value: userHash,
    },
    {
      type: "uint256",
      value: timestamp,
    },
    {
      type: "string",
      value: "github",
    }
  );

  const hashPackedMessage = web3.utils.soliditySha3(packedMessage);

  const { messageHash: signedHashPackedMessage, signature } =
    web3.eth.accounts.sign(hashPackedMessage, ownerPrivKey);

  const ret = {
    address: toVerify,
    timestamp,
    ownerPrivKey,
    userHash,
    packedMessage,
    hashPackedMessage,
    signedHashPackedMessage,
    signature,
  };

  return ret;
};

const days = (n) => n * 24 * 60 * 60;

const snapshotHelper = async (body) => {
  // Create a snapshot we can return to after manually increasing time on the chain
  const snapshotA = await snapshot();
  try {
    await body();
    await snapshotA.restore();
  } catch (error) {
    console.log(error);
    await snapshotA.restore();
    assert(false, "This should not have thrown an error");
  }
};

const shouldFail = async (body, errorMessage) => {
  try {
    await body();
  } catch (error) {
    assert(
      error.data.reason.includes(errorMessage),
      "Error message is not correct"
    );
    return;
  }
  assert(false, "Verification should have failed");
};

module.exports = {
  getPrivateKeyFromFirstAddress,
  createSignature,
  days,
  snapshotHelper,
  shouldFail,
};