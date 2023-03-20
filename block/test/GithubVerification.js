// TODO: write separate getStamps function to avoid duplicate code
const GithubVerification = artifacts.require("GithubVerification");

const createKeccakHash = require("keccak");
const Web3 = require("web3");
var utils = require("web3-utils");
var ethereumjsUtil = require("ethereumjs-util");
const bip39 = require("bip39");
const hdkey = require("hdkey");
const wallet = require("ethereumjs-wallet");

const dotenv = require("dotenv");
dotenv.config();

const VERIFY_DAY_THRESHOLD = 60;

const getPrivateKeyFromFirstAddress = async (
  hdkDerivePath = "m/44'/60'/0'/0/0"
) => {
  const seed = await bip39.mnemonicToSeed(process.env.MNEMONIC);
  const hdk = hdkey.fromMasterSeed(seed);
  const addr_node = hdk.derive(hdkDerivePath); // gets first account
  const private_key = addr_node.privateKey;

  return private_key.toString("hex");
};

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

// Test suite for the main contract of the Github Verification
contract("GithubVerification", async (accounts) => {
  // One time setup for the web3 constants
  const web3 = new Web3(
    new Web3.providers.HttpProvider("http://127.0.0.1:65534")
  );

  // Constants
  const [owner, alice, Peregrine, Ophelia] = accounts;
  const ownerPrivKey = await getPrivateKeyFromFirstAddress();

  const userHash =
    "090d4910f4b4038000f6ea86644d55cb5261a1dc1f006d928dcc049b157daff8";
  const timestamp = Math.floor(new Date().getTime() / 1000);

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
    web3.eth.accounts.sign(hashPackedMessageWeb3, ownerPrivKey);

  beforeEach(async () => {
    contractInstance = await GithubVerification.new({
      from: owner,
    });
  });

  // TODO: the asserts now throw if not valid, rearrange structure
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
      assert(stamps[0][2] == timestamp, "Timestamps not equal");
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
    } catch (error) {
      assert(
        error.message.includes("ID already affiliated with another address"),
        "Error message is not correct"
      );
      return;
    }
    assert(false, "Verification should have failed");
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
    } catch (error) {
      assert(
        error.message.includes("Address cannot be 0x0"),
        "Error message is not correct"
      );
      return;
    }
    assert(false, "Verification should have failed");
  });

  it("Can't verify if proof has expired; timestamp is older than 1 hour", async () => {
    const newTimestamp = Math.floor(
      (new Date().getTime() - 61 * 60 * 1000) / 1000
    );
    const value = await createSignature(newTimestamp, alice, ownerPrivKey);
    try {
      await contractInstance.verifyAddress(
        alice,
        userHash,
        newTimestamp,
        "github",
        value.signature
      );
    } catch (error) {
      assert(
        error.message.includes("Proof expired, try verifying again"),
        "Error message is not correct"
      );
      return;
    }
    assert(false, "Verification should have failed");
  });

  it("Can't verify if signature recovered address does not match owner's address", async () => {
    // Suppose alice tries to sign the proof instead of us
    const alicePrivKey = await getPrivateKeyFromFirstAddress(
      "m/44'/60'/0'/0/1"
    );
    const value = await createSignature(timestamp, Peregrine, alicePrivKey);
    try {
      await contractInstance.verifyAddress(
        Peregrine,
        userHash,
        timestamp,
        "github",
        value.signature
      );
    } catch (error) {
      assert(
        error.message.includes("Proof is not valid"),
        "Error message is not correct"
      );
      return;
    }
    assert(false, "Verification should have failed");
  });

  it("Can't verify if address has already been verified not too long ago (half verifyDayThreshold)", async () => {
    try {
      // Alice's verification with userhash (this should succeed)
      await contractInstance.verifyAddress(
        alice,
        userHash,
        timestamp,
        "github",
        signature
      );

      const stamps = await contractInstance.getStamps(alice);
      assert(stamps.length === 1, "Length of stamps array is not equal to 1");
      assert(stamps[0][0] === "github", "Provider id should be github");
      assert(stamps[0][1] === userHash, "Userhashes not equal");
      assert(stamps[0][2] == timestamp, "Timestamps not equal");

      const newTimestamp = Math.floor(new Date().getTime() / 1000);
      const { signature: newSignature } = await createSignature(
        newTimestamp,
        alice,
        ownerPrivKey
      );

      // Alice's second verification (in close succession to her first) -> this should fail
      // because we don't allow reverifications within half the verifyDayThreshold
      await contractInstance.verifyAddress(
        alice,
        userHash,
        newTimestamp,
        "github",
        newSignature,
      );
    } catch (error) {
      assert(
        error.message.includes("Address already verified; cannot re-verify yet, wait at least half the verifyDayThreshold"),
        "Error message is not correct"
      );
      return;
    }
    assert(false, "Verification should have failed");
  });

  // TODO: THIS IS NOT YET TESTABLE!!!!!
  xit("Should be able to verify after half the verifyDayThreshold has passed", async () => {
    try {
      // Alice's verification with userhash (this should succeed)

      await contractInstance.verifyAddress(
        alice,
        userHash,
        timestamp,
        "github",
        signature
      ); 

      const stamps = await contractInstance.getStamps(alice);
      assert(stamps.length === 1, "Length of stamps array is not equal to 1");
      assert(stamps[0][0] === "github", "Provider id should be github");
      assert(stamps[0][1] === userHash, "Userhashes not equal");
      assert(stamps[0][2] == timestamp, "Timestamps not equal");

      const newTimestamp = Math.floor((new Date().getTime() + 60*24*60*60*1000) / 1000);
      const { signature: newSignature } = await createSignature(
        newTimestamp,
        alice,
        ownerPrivKey
      );

      // Alice's second verification (more than half the verifyDayThreshold after the first) -> this should succeed
      // because we allow reverifications after half the verifyDayThreshold
      await contractInstance.verifyAddress(
        alice,
        userHash,
        newTimestamp,
        "github",
        newSignature,
      );

      stamps = await contractInstance.getStamps(alice);
      assert(stamps.length === 1, "Length of stamps array is not equal to 1");
      assert(stamps[0][0] === "github", "Provider id should be github");
      assert(stamps[0][1] === userHash, "Userhashes not equal");
      assert(stamps[0][2] == newTimestamp, "New timestamps not equal");
    } catch (error) {
      console.log(error);
      assert(
        false,
        "This should not have thrown an error"
      );
      return;
    }
    assert(false, "Verification should have failed");
  });
});
