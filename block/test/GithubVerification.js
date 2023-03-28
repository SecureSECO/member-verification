// TODO: write separate getStamps function to avoid duplicate code
const GithubVerification = artifacts.require("GithubVerification");

const Web3 = require("web3");
const bip39 = require("bip39");
const hdkey = require("hdkey");
const { time, snapshot } = require("@openzeppelin/test-helpers");

const dotenv = require("dotenv");
dotenv.config();

const VERIFY_DAY_THRESHOLD = 60;

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

/**
 * Test suite for the main contract of the Github Verification
 */
contract("GithubVerification", async (accounts) => {
  // One time setup for the web3 constants
  const web3 = new Web3(
    new Web3.providers.HttpProvider("http://127.0.0.1:65534")
  );

  // Constants
  const [owner, alice, bob] = accounts;
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

  /**
   * This gets run before each test. A new contract instance is created before each test.
   */
  beforeEach(async () => {
    contractInstance = await GithubVerification.new(VERIFY_DAY_THRESHOLD, {
      from: owner,
    });
  });

  /**
   * Simple test for a valid signature (proof) for the right address, within the verify timeframe (unexpired proof), not already verified
   */
  it("Successful GitHub Verification", async () => {
    try {
      const result = await contractInstance.verifyAddress(
        alice,
        userHash,
        timestamp,
        "github",
        signature
      );

      // Check if verification got added in the form of a GitHub stamp
      const stamps = await contractInstance.getStamps(alice);
      assert(stamps.length === 1, "Length of stamps array is not equal to 1");
      assert(stamps[0][0] === "github", "Provider id should be github");
      assert(stamps[0][1] === userHash, "Userhashes not equal");
      assert(stamps[0][2] == timestamp, "Timestamps not equal");
    } catch (error) {
      assert(false, error.message);
    }
  });

  context("Test the fail conditions", async () => {
    /**
     * The same userhash should not be used by multiple addresses.
     */
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

        // Try to verify the proof for the same userhash but another account address.
        // The signature is irrelevant as the check for the "already affiliated" status should happen before any signature verification.
        // This should thus throw an error.
        await contractInstance.verifyAddress(
          bob,
          userHash,
          timestamp,
          "github",
          signature // This is not the signature for Bob
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

    /**
     * The null address should not be able to be verified
     */
    it("Fail GitHub Verification: 0x0", async () => {
      try {
        // Try to verify the 0x0 address.
        // The signature is irrelevant as the check for the 0x0 address should happen before any signature verification.
        // This should throw an error.
        await contractInstance.verifyAddress(
          "0x0000000000000000000000000000000000000000",
          userHash,
          timestamp,
          "github",
          signature // This is not the signature for 0x0
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

    /**
     * Users can only verify within an hour of signing the proof. Any attempt after this will return an error for expired proof.
     */
    it("Can't verify if proof has expired; timestamp is older than 1 hour", async () => {
      // Create new timestamp of 61 minutes before now.
      const newTimestamp = Math.floor(
        (new Date().getTime() - 61 * 60 * 1000) / 1000
      );

      // Create new signature for the new timestamp (61 minutes ago).
      const value = await createSignature(newTimestamp, alice, ownerPrivKey);

      try {
        // Try to verify with a proof older than 1 hour.
        // The signature is irrelevant as the check for the timestamp should happen before any signature verification.
        // If the timestamp is spoofed in the parameters the signature recovery will fail.
        // This should throw an error.
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

    /**
     * A signature not signed by us should obviously fail to recover.
     */
    it("Can't verify if signature recovered address does not match owner's address", async () => {
      // Suppose alice tries to sign the proof instead of us (the owner).
      const alicePrivKey = await getPrivateKeyFromFirstAddress(
        "m/44'/60'/0'/0/1"
      );

      // Create new signature with alice as signer and bob as the address to verify.
      // The address to verify could also be alice themselves, but that's not relevant for our purpose.
      const value = await createSignature(timestamp, bob, alicePrivKey);

      try {
        // This should fail.
        await contractInstance.verifyAddress(
          bob,
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
  });

  context("Reverification threshold testing", async () => {
    /**
     * Reverification should only be possible after some time has passed (30 days in our case).
     */
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

        // Check if GitHub stamps has been added to alice's stamps
        const stamps = await contractInstance.getStamps(alice);
        assert(stamps.length === 1, "Length of stamps array is not equal to 1");
        assert(stamps[0][0] === "github", "Provider id should be github");
        assert(stamps[0][1] === userHash, "Userhashes not equal");
        assert(stamps[0][2][0] == timestamp, "Timestamps not equal");

        // New timestamp and proof (within 30 days)
        const newTimestamp = Math.floor(new Date().getTime() / 1000);
        const { signature: newSignature } = await createSignature(
          newTimestamp,
          alice,
          ownerPrivKey
        );

        // Alice's second verification (in close succession to her first), this should fail
        // Because we don't allow reverifications within half the verifyDayThreshold (which is VERIFICATION_DAY_THRESHOLD days / 2)
        await contractInstance.verifyAddress(
          alice,
          userHash,
          newTimestamp,
          "github",
          newSignature
        );
      } catch (error) {
        assert(
          error.message.includes(
            "Address already verified; cannot re-verify yet, wait at least half the verifyDayThreshold"
          ),
          "Error message is not correct"
        );
        return;
      }
      assert(false, "Verification should have failed");
    });

    /**
     * Users should be able to reverify after 30 days have passed.
     */
    it("Should be able to reverify after half the verifyDayThreshold has passed", async () => {
      // Create a snapshot we can return to after manually increasing time on the chain
      const snapshotA = await snapshot();
      try {
        

        // Alice's first verification, this should succeed
        await contractInstance.verifyAddress(
          alice,
          userHash,
          timestamp,
          "github",
          signature
        );

        // Check if first verification went successfully
        let stamps = await contractInstance.getStamps(alice);
        assert(stamps.length === 1, "Length of stamps array is not equal to 1");
        assert(stamps[0][0] === "github", "Provider id should be github");
        assert(stamps[0][1] === userHash, "Userhashes not equal");
        assert(stamps[0][2][0] == timestamp, "Timestamps not equal");

        // Manually increase the time on the blockchain by VERIFICATION_DAY_THRESHOLD / 2 days
        await time.increase(VERIFY_DAY_THRESHOLD / 2 * 24 * 60 * 60); // Time in seconds

        // New timestamp VERIFICATION_DAY_THRESHOLD / 2 days from now (which should match the current blockchain time)
        const newTimestamp = Math.floor(
          (new Date().getTime() + VERIFY_DAY_THRESHOLD / 2 * 24 * 60 * 60 * 1000) / 1000
        );

        const { signature: newSignature } = await createSignature(
          newTimestamp,
          alice,
          ownerPrivKey
        );

        // Alice's second verification (more than half the verifyDayThreshold after the first) -> this should succeed
        // Because we allow reverifications after half the verifyDayThreshold (which is VERIFICATION_DAY_THRESHOLD / 2 days)
        await contractInstance.verifyAddress(
          alice,
          userHash,
          newTimestamp,
          "github",
          newSignature
        );

        // Check if reverification successfully updated the timestamp on Alice's GitHub stamp
        stamps = await contractInstance.getStamps(alice);
        assert(stamps.length === 1, "Length of stamps array is not equal to 1");
        assert(stamps[0][0] === "github", "Provider id should be github");
        assert(stamps[0][1] === userHash, "Userhashes not equal");
        assert(stamps[0][2][0] == timestamp, "Old timestamps not equal");
        assert(stamps[0][2][1] == newTimestamp, "New timestamps not equal");
        await snapshotA.restore();
      } catch (error) {
        console.log(error);
        await snapshotA.restore();
        assert(false, "This should not have thrown an error");
      }
      
    });

    // TODO: fix comments later
    it("Should be able to correctly retrieve the stamps at any given timestamp", async () => {
      // Create a snapshot we can return to after manually increasing time on the chain
      const snapshotA = await snapshot();
      try {

        // Alice's first verification, this should succeed
        await contractInstance.verifyAddress(
          alice,
          userHash,
          timestamp,
          "github",
          signature
        );

        // Check if first verification went successfully
        let stamps = await contractInstance.getStamps(alice)
        assert(stamps.length === 1, "Length of stamps array is not equal to 1");
        assert(stamps[0][0] === "github", "Provider id should be github");
        assert(stamps[0][1] === userHash, "Userhashes not equal");
        assert(stamps[0][2][0] == timestamp, "Timestamps not equal");

        // Manually increase the time on the blockchain by VERIFICATION_DAY_THRESHOLD / 2 days
        await time.increase(VERIFY_DAY_THRESHOLD * 2 * 24 * 60 * 60); // Time in seconds

        // New timestamp VERIFICATION_DAY_THRESHOLD / 2 days from now (which should match the current blockchain time)
        const newTimestamp = Math.floor(
          (new Date().getTime() + VERIFY_DAY_THRESHOLD * 2 * 24 * 60 * 60 * 1000) / 1000
        );

        const { signature: newSignature } = await createSignature(
          newTimestamp,
          alice,
          ownerPrivKey
        );

        // Alice's second verification (more than half the verifyDayThreshold after the first) -> this should succeed
        // Because we allow reverifications after half the verifyDayThreshold (which is VERIFICATION_DAY_THRESHOLD / 2 days)
        await contractInstance.verifyAddress(
          alice,
          userHash,
          newTimestamp,
          "github",
          newSignature
        );

        // Check if reverification successfully updated the timestamp on Alice's GitHub stamp
        stamps = await contractInstance.getStamps(alice);
        assert(stamps.length === 1, "Length of stamps array is not equal to 1");
        assert(stamps[0][0] === "github", "Provider id should be github");
        assert(stamps[0][1] === userHash, "Userhashes not equal");
        assert(stamps[0][2][0] == timestamp, "Old timestamps not equal");
        assert(stamps[0][2][1] == newTimestamp, "New timestamps not equal");

        stamps = await contractInstance.getStampsAt(alice, timestamp + 60);

        assert(stamps.length === 1, "Length of stamps array is not equal to 1");
        assert(stamps[0][0] === "github", "Provider id should be github");
        assert(stamps[0][1] === userHash, "Userhashes not equal");
        assert(stamps[0][2][0] == timestamp, "Old timestamps not equal");
        assert(stamps[0][2][1] == newTimestamp, "New timestamps not equal");
          
        stamps = await contractInstance.getStampsAt(alice, timestamp + VERIFY_DAY_THRESHOLD*24*60*60 + 60);

        assert(stamps.length === 0, "Length of stamps array is not equal to 0");

        stamps = await contractInstance.getStampsAt(alice, newTimestamp + 60);

        assert(stamps.length === 1, "Length of stamps array is not equal to 1");
        assert(stamps[0][0] === "github", "Provider id should be github");
        assert(stamps[0][1] === userHash, "Userhashes not equal");
        assert(stamps[0][2][0] == timestamp, "Old timestamps not equal");
        assert(stamps[0][2][1] == newTimestamp, "New timestamps not equal");
          
        await snapshotA.restore();
      } catch (error) {
        console.log(error);
        await snapshotA.restore();
        assert(false, "This should not have thrown an error");
      }
    });

  });
});
