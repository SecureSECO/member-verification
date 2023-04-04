const Web3 = require("web3");
const bip39 = require("bip39");
const hdkey = require("hdkey");

/**
 *
 * @param {string} hdkDerivePath The derivation path of the accounts (m44'60'0'0account_index). Defaults to the first account.
 * @returns {string} The private key as a hexadecimal string.
 */
const getPrivateKeyFromFirstAddress = async (
  hdkDerivePath = "m/44'/60'/0'/0/0"
) => {
  const seed = await bip39.mnemonicToSeed(process.env.MNEMONIC);
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

module.exports = {
  getPrivateKeyFromFirstAddress,
  createSignature,
  days,
};