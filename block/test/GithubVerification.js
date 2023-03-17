const GithubVerification = artifacts.require("GithubVerification");

const createKeccakHash = require("keccak");
const Web3 = require("web3");
var utils = require("web3-utils");
var ethereumjsUtil = require("ethereumjs-util");
const bip39 = require('bip39');
const hdkey = require('hdkey');
const wallet = require('ethereumjs-wallet');

const dotenv = require("dotenv");
dotenv.config();

const getPrivateKeyFromFirstAddress = async () => {
  const seed = await bip39.mnemonicToSeed(process.env.MNEMONIC);
  const hdk = hdkey.fromMasterSeed(seed);
  const addr_node = hdk.derive("m/44'/60'/0'/0/0"); // gets first account
  const private_key = addr_node.privateKey;
  
  return private_key.toString("hex");
}

// Test suite for the main contract of the Github Verification
contract("GithubVerification", async (accounts) => {
  // One time setup for the web3 constants
  const web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:65534"));

  // Constants
  const [owner, alice, Peregrine, Ophelia] = accounts;
  const ownerPrivKey = await getPrivateKeyFromFirstAddress();

  
  const userHash =
    "090d4910f4b4038000f6ea86644d55cb5261a1dc1f006d928dcc049b157daff8";
  const timestamp = new Date().getTime();

  let contractInstance;

  const packedMessageWeb3 = web3.utils.encodePacked(
    {
      type: "address",
      value: alice,
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

  const hashPackedMessageWeb3 = web3.utils.soliditySha3(packedMessageWeb3);

  const { messageHash: signedHashPackedMessageWeb3, signature } =
    web3.eth.accounts.sign(
      hashPackedMessageWeb3,
      ownerPrivKey
    );

  beforeEach(async () => {
    contractInstance = await GithubVerification.new({
      from: owner,
    });
  });

  it("Successful GitHub Verification", async () => {
    try {
      const result = await contractInstance.verifyAddress(
        alice,
        userHash,
        timestamp,
        "github",
        signature
      );

      assert(true);
      
      const stamps = await contractInstance.getStamps(alice);
      assert(stamps.length === 1, "Length of stamps array is not equal to 1");
      assert(stamps[0][0] === "github", "Provider id should be github");
      assert(stamps[0][1] === userHash, "Userhashes not equal");
      // assert(stamps[0][2] === timestamp, "Timestamps not equal");
    } catch (error) {
      assert(false, error.message);
    }
  });

  it("Fail GitHub Verification: same userhash but verified by other address", async () => {
    try {
      // Alice's verification with userhash (this should succeed)
      const aliceResult = await contractInstance.verifyAddress(
        alice,
        userHash,
        timestamp,
        "github",
        signature
      );

      assert(true);

      const PeregrineResult = await contractInstance.verifyAddress(
        Peregrine,
        userHash,
        timestamp,
        "github",
        signature            
      );

      assert(false, "Verification should have failed");
    } catch (error) {
      assert(error.message.includes("ID already affiliated with another address"), "Error message is not correct");
    }
  });

  it("Fail GitHub Verification: 0x0", async () => {
    try {
      // Alice's verification with userhash (this should succeed)
      await contractInstance.verifyAddress(
        "0x0000000000000000000000000000000000000000",
        userHash,
        timestamp,
        "github",
        signature // this is not the signature for 0x0
      );
      assert(false, "Verification should have failed");
    } catch (error) {
      assert(error.message.includes("Address cannot be 0x0"), "Error message is not correct");
    }
  });

  // TODO: make signature function to make other "invalid" signatures, messageHashes etc.
  it("Can't verify if proof has expired; timestamp is older than 1 hour", async () => {

  });

  it("Can't verify if signature recovered address does not match owner's address", async () => {

  });

  it("Can't verify if address has already been verified not too long ago (half verifyThreshold)", async () => {

  });
});
