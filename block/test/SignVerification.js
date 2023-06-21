/**
 * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
 * © Copyright Utrecht University (Department of Information and Computing Sciences)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// TODO: write separate getStamps function to avoid duplicate code
const SignVerification = artifacts.require("SignVerification");

const Web3 = require("web3");
const { time } = require("@openzeppelin/test-helpers");
const {
  getPrivateKeyFromFirstAddress,
  createSignature,
  days,
  snapshotHelper,
  shouldFail,
} = require("./utils/helper");

const dotenv = require("dotenv");
dotenv.config();

const VERIFY_DAY_THRESHOLD = 60;
const REVERIFY_DAY_THRESHOLD = 30;

const PROVIDER_ID = "github";

/**
 * Test suite for the main contract of the Sign Verification
 */
contract("SignVerification", async (accounts) => {
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
    },
    {
      type: "string",
      value: PROVIDER_ID,
    }
  );

  const hashPackedMessageWeb3 = web3.utils.soliditySha3(packedMessageWeb3);

  const { messageHash: signedHashPackedMessageWeb3, signature } =
    web3.eth.accounts.sign(hashPackedMessageWeb3, ownerPrivKey);

  /**
   * This gets run before each test. A new contract instance is created before each test.
   */
  beforeEach(async () => {
    contractInstance = await SignVerification.new(
      VERIFY_DAY_THRESHOLD,
      REVERIFY_DAY_THRESHOLD,
      {
        from: owner,
      }
    );
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
        PROVIDER_ID,
        signature
      );

      // Check if verification got added in the form of a GitHub stamp
      const stamps = await contractInstance.getStamps(alice);
      assert(stamps.length === 1, "Length of stamps array is not equal to 1");
      assert(stamps[0][0] === PROVIDER_ID, "Provider id should be github");
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
      await shouldFail(async () => {
        // Alice's verification with userhash (this should succeed)
        const aliceResult = await contractInstance.verifyAddress(
          alice,
          userHash,
          timestamp,
          PROVIDER_ID,
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
          PROVIDER_ID,
          signature // This is not the signature for Bob
        );
      }, "ID already affiliated with another address");
    });

    /**
     * The null address should not be able to be verified
     */
    it("Fail GitHub Verification: 0x0", async () => {
      await shouldFail(async () => {
        // Try to verify the 0x0 address.
        // The signature is irrelevant as the check for the 0x0 address should happen before any signature verification.
        // This should throw an error.
        await contractInstance.verifyAddress(
          "0x0000000000000000000000000000000000000000",
          userHash,
          timestamp,
          PROVIDER_ID,
          signature // This is not the signature for 0x0
        );
      }, "Address cannot be 0x0");
    });

    /**
     * Users can only verify within an hour of signing the proof. Any attempt after this will return an error for expired proof.
     */
    it("Can't verify if proof has expired; timestamp is older than 1 hour", async () => {
      await shouldFail(async () => {
        // Create new timestamp of 61 minutes before now.
        const newTimestamp = Math.floor(
          (new Date().getTime() - 61 * 60 * 1000) / 1000
        );

        // Create new signature for the new timestamp (61 minutes ago).
        const value = await createSignature(newTimestamp, alice, ownerPrivKey);

        // Try to verify with a proof older than 1 hour.
        // The signature is irrelevant as the check for the timestamp should happen before any signature verification.
        // If the timestamp is spoofed in the parameters the signature recovery will fail.
        // This should throw an error.
        await contractInstance.verifyAddress(
          alice,
          userHash,
          newTimestamp,
          PROVIDER_ID,
          value.signature
        );
      }, "Proof expired, try verifying again");
    });

    /**
     * A signature not signed by us should obviously fail to recover.
     */
    it("Can't verify if signature recovered address does not match owner's address", async () => {
      await shouldFail(async () => {
        // Suppose alice tries to sign the proof instead of us (the owner).
        const alicePrivKey = await getPrivateKeyFromFirstAddress(
          "m/44'/60'/0'/0/1"
        );

        // Create new signature with alice as signer and bob as the address to verify.
        // The address to verify could also be alice themselves, but that's not relevant for our purpose.
        const value = await createSignature(timestamp, bob, alicePrivKey);

        // This should fail.
        await contractInstance.verifyAddress(
          bob,
          userHash,
          timestamp,
          PROVIDER_ID,
          value.signature
        );
      }, "Proof is not valid");
    });
  });

  context("Reverification threshold testing", async function () {
    this.timeout(10000);

    beforeEach(async () => {
      // Alice's verification with userhash (this should succeed)
      await contractInstance.verifyAddress(
        alice,
        userHash,
        timestamp,
        PROVIDER_ID,
        signature
      );
    });

    /**
     * Reverification should only be possible after some time has passed (30 days in our case).
     */
    it("Can't verify if address has already been verified not too long ago (half verifyDayThreshold)", async () => {
      try {
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
          PROVIDER_ID,
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
      await snapshotHelper(async () => {
        // Manually increase the time on the blockchain by VERIFICATION_DAY_THRESHOLD / 2 days
        await time.increase((VERIFY_DAY_THRESHOLD / 2) * 24 * 60 * 60); // Time in seconds

        // New timestamp VERIFICATION_DAY_THRESHOLD / 2 days from now (which should match the current blockchain time)
        const newTimestamp = Math.floor(
          (new Date().getTime() +
            (VERIFY_DAY_THRESHOLD / 2) * 24 * 60 * 60 * 1000) /
            1000
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
          PROVIDER_ID,
          newSignature
        );

        // Check if reverification successfully updated the timestamp on Alice's GitHub stamp
        stamps = await contractInstance.getStamps(alice);
        assert(stamps.length === 1, "Length of stamps array is not equal to 1");
        assert(stamps[0][0] === PROVIDER_ID, "Provider id should be github");
        assert(stamps[0][1] === userHash, "Userhashes not equal");
        assert(stamps[0][2][0] == timestamp, "Old timestamps not equal");
        assert(stamps[0][2][1] == newTimestamp, "New timestamps not equal");
      });
    });

    // TODO: fix comments later
    it("Should be able to correctly retrieve the stamps at any given timestamp", async () => {
      await snapshotHelper(async () => {
        // Manually increase the time on the blockchain by VERIFICATION_DAY_THRESHOLD * 2 days
        await time.increase(VERIFY_DAY_THRESHOLD * 2 * 24 * 60 * 60); // Time in seconds

        // New timestamp VERIFICATION_DAY_THRESHOLD / 2 days from now (which should match the current blockchain time)
        const newTimestamp = Math.floor(
          (new Date().getTime() +
            VERIFY_DAY_THRESHOLD * 2 * 24 * 60 * 60 * 1000) /
            1000
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
          PROVIDER_ID,
          newSignature
        );

        stamps = await contractInstance.getStampsAt(alice, timestamp + 60);
        assert(stamps.length === 1, "Length of stamps array is not equal to 1");
        assert(stamps[0][0] === PROVIDER_ID, "Provider id should be github");
        assert(stamps[0][1] === userHash, "Userhashes not equal");
        assert(stamps[0][2][0] == timestamp, "Old timestamps not equal");
        assert(stamps[0][2][1] == newTimestamp, "New timestamps not equal");

        stamps = await contractInstance.getStampsAt(
          alice,
          timestamp + days(VERIFY_DAY_THRESHOLD) + 60
        );
        assert(stamps.length === 0, "Length of stamps array is not equal to 0");

        stamps = await contractInstance.getStampsAt(alice, newTimestamp + 60);
        assert(stamps.length === 1, "Length of stamps array is not equal to 1");
        assert(stamps[0][0] === PROVIDER_ID, "Provider id should be github");
        assert(stamps[0][1] === userHash, "Userhashes not equal");
        assert(stamps[0][2][0] == timestamp, "New timestamps not equal");
        assert(stamps[0][2][1] == newTimestamp, "New timestamps not equal");
      });
    });

    /*
     * This test checks if the contract correctly returns the validity of a user at a given timestamp
     * even after the verifyDayThreshold has been changed
     * The timeline for the test will be as follows:
     *
     * OOOOOO_____OOO_____
     *
     * where all O's are timestamps where the user is valid and all _'s are timestamps where the user is invalid
     * Tests for validity will be done at the following timestamps (marked with X):
     *
     *    X  X    X  X
     * OOOOOO_____OOO_____
     *
     */
    it("Should give correct validity at given timestamp even after verifyDayThreshold change", async () => {
      await snapshotHelper(async () => {
        // Manually increase the time on the blockchain by VERIFICATION_DAY_THRESHOLD * 2 days
        await time.increase(VERIFY_DAY_THRESHOLD * 2 * 24 * 60 * 60); // Time in seconds

        /*
         * Change the verifyDayThreshold to be half of what it was before
         */
        await contractInstance.setVerifyDayThreshold(
          Math.floor(VERIFY_DAY_THRESHOLD / 2),
          {
            from: owner,
          }
        );

        // New timestamp VERIFICATION_DAY_THRESHOLD * 2 days from now (which should match the current blockchain time)
        const newTimestamp = Math.floor(
          (new Date().getTime() +
            VERIFY_DAY_THRESHOLD * 2 * 24 * 60 * 60 * 1000) /
            1000
        );

        const { signature: newSignature } = await createSignature(
          newTimestamp,
          alice,
          ownerPrivKey
        );

        /*
         * Alice's second verification after verificationDayThreshold was halved, this should succeed
         */
        await contractInstance.verifyAddress(
          alice,
          userHash,
          newTimestamp,
          PROVIDER_ID,
          newSignature
        );

        /*
         * Check if Alice is valid at the aforementioned timestamps
         */
        // Assert validity
        stamps = await contractInstance.getStampsAt(
          alice,
          timestamp + days(VERIFY_DAY_THRESHOLD / 2)
        );
        assert(stamps.length === 1, "Length of stamps array is not equal to 1");
        assert(stamps[0][0] === PROVIDER_ID, "Provider id should be github");
        assert(stamps[0][1] === userHash, "Userhashes not equal");
        assert(stamps[0][2][0] == timestamp, "Old timestamps not equal");
        assert(stamps[0][2][1] == newTimestamp, "New timestamps not equal");

        // Assert invalidity
        stamps = await contractInstance.getStampsAt(
          alice,
          timestamp + days(VERIFY_DAY_THRESHOLD)
        );
        assert(
          stamps.length === 0,
          "Expected address to be invalid at this timestamp; length of stamps array is not equal to 0"
        );

        // Assert validity
        stamps = await contractInstance.getStampsAt(alice, newTimestamp + 60);
        assert(stamps.length === 1, "Length of stamps array is not equal to 1");
        assert(stamps[0][0] === PROVIDER_ID, "Provider id should be github");
        assert(stamps[0][1] === userHash, "Userhashes not equal");
        assert(stamps[0][2][0] == timestamp, "Old timestamps not equal");
        assert(stamps[0][2][1] == newTimestamp, "New timestamps not equal");

        // Assert invalidity
        stamps = await contractInstance.getStampsAt(
          alice,
          newTimestamp + days(VERIFY_DAY_THRESHOLD / 2)
        );
        assert(
          stamps.length === 0,
          "Expected address to be invalid at this timestamp; length of stamps array is not equal to 0"
        );
      });
    });

    it("Should be able to change the reverification time", async () => {
      await snapshotHelper(async () => {
        // Set reverify day threshold to half of what it was before
        await contractInstance.setReverifyThreshold(
          REVERIFY_DAY_THRESHOLD / 2,
          {
            from: owner,
          }
        );

        // Manually increase the time on the blockchain by REVERIFICATION_DAY_THRESHOLD / 2 days
        await time.increase((REVERIFY_DAY_THRESHOLD / 2) * 24 * 60 * 60); // Time in seconds

        // New timestamp REVERIFICATION_DAY_THRESHOLD * 2 days from now (which should match the current blockchain time)
        const newTimestamp = Math.floor(
          (new Date().getTime() +
            (REVERIFY_DAY_THRESHOLD / 2) * 24 * 60 * 60 * 1000) /
            1000
        );

        const { signature: newSignature } = await createSignature(
          newTimestamp,
          alice,
          ownerPrivKey
        );

        /*
         * Alice's second verification after verificationDayThreshold was halved, this should succeed
         */
        await contractInstance.verifyAddress(
          alice,
          userHash,
          newTimestamp,
          PROVIDER_ID,
          newSignature
        );

        // Check if reverification successfully updated the timestamp on Alice's GitHub stamp
        stamps = await contractInstance.getStamps(alice);
        assert(stamps.length === 1, "Length of stamps array is not equal to 1");
        assert(stamps[0][0] === PROVIDER_ID, "Provider id should be github");
        assert(stamps[0][1] === userHash, "Userhashes not equal");
        assert(stamps[0][2][0] == timestamp, "Old timestamps not equal");
        assert(stamps[0][2][1] == newTimestamp, "New timestamps not equal");
      });
    });
  });

  context("Unverification tests", async () => {
    it("should provide the utility to unverify yourself with a certain provider", async () => {
      try {
        // Alice's verification with userhash (this should succeed)
        await contractInstance.verifyAddress(
          alice,
          userHash,
          timestamp,
          PROVIDER_ID,
          signature
        );

        await contractInstance.unverify(PROVIDER_ID, {
          from: alice,
        });

        const stamps = await contractInstance.getStamps(alice);
        assert(
          stamps.length === 0,
          "Expected address to be invalid at this timestamp; length of stamps array is not equal to 0"
        );
      } catch (error) {
        console.log(error);
        assert(false, "Something went wrong while unverifying");
      }
    });

    it("should not be able to unverify a non-existing stamp", async () => {
      await shouldFail(async () => {
        // This shouldn't do anything
        await contractInstance.unverify(PROVIDER_ID, {
          from: alice,
        });
      }, "Could not find this provider among your stamps; are you sure you're verified with this provider?");
    });

    it("should not be able to unverify for an unknown/unowned provider", async () => {
      await shouldFail(async () => {
        // Alice's verification with userhash (this should succeed)
        await contractInstance.verifyAddress(
          alice,
          userHash,
          timestamp,
          PROVIDER_ID,
          signature
        );

        await contractInstance.unverify("notARealProvider", {
          from: alice,
        });
      }, "Could not find this provider among your stamps; are you sure you're verified with this provider?");
    });
  });

  context("List of all members test", async () => {
    it("should add an account to list of all members after verification", async () => {
      // Alice's verification with userhash (this should succeed)
      await contractInstance.verifyAddress(
        alice,
        userHash,
        timestamp,
        PROVIDER_ID,
        signature
      );

      const allMembers = await contractInstance.getAllMembers();
      assert(allMembers.length == 1 && allMembers[0] == alice);
    });

    it("is or was member works correctly", async () => {
      // Alice's verification with userhash (this should succeed)
      await contractInstance.verifyAddress(
        alice,
        userHash,
        timestamp,
        PROVIDER_ID,
        signature
      );

      // Alice should be a member
      let isOrWasMember = await contractInstance.isOrWasMember(alice);
      assert(isOrWasMember, "Alice should be a member");

      // Alice should still be a member after unverification
      await contractInstance.unverify(PROVIDER_ID, {
        from: alice,
      });
      isOrWasMember = await contractInstance.isOrWasMember(alice);
      assert(isOrWasMember, "Alice should still be a member after unverification");

      // Alice's verification with userhash (this should succeed)
      await contractInstance.verifyAddress(
        alice,
        userHash,
        timestamp,
        PROVIDER_ID,
        signature
      );
      isOrWasMember = await contractInstance.isOrWasMember(alice);
      assert(isOrWasMember, "Alice should be a member after \"re-verification\"");

      const allMembers = await contractInstance.getAllMembers();
      assert(allMembers.length == 1 && allMembers[0] == alice, "No duplicate members should be added");
    });
  });
});
