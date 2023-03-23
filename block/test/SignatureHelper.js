const SignatureHelper = artifacts.require("SignatureHelper");
const Web3 = require("web3");

/**
 * Test suite for the SignatureHelper contract
 */
contract("SignatureHelper", () => {
  // One time setup for the web3 constants
  const web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:65534"));

  // Create new account
  const account = web3.eth.accounts.create();
  const owner = web3.eth.accounts.create();

  // Constants
  const address = account.address;
  
  const userHash =
    "090d4910f4b4038000f6ea86644d55cb5261a1dc1f006d928dcc049b157daff8";
  const timestamp = new Date().getTime();

  let contractInstance;

  const packedMessageWeb3 = web3.utils.encodePacked(
    {
      type: "address",
      value: address,
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
      owner.privateKey
    );

  /**
   * This gets run before each test. A new contract instance is created before each test.
   */
  beforeEach(async () => {
    contractInstance = await SignatureHelper.new();
  });

  /**
   * The abi.encodePacked of the parameters (address, userhash, and timestamp) of the smart contract 
   * should match the packed message in JavaScript (back-end).
   */
  it("Packed data in contract should be equal to web3.utils.encodePacked(...)", async () => {
    const packedMessageSolidity = await contractInstance.getPackedMessage(
      address,
      userHash,
      timestamp,
      { from: address }
    );

    assert(
      packedMessageWeb3 == packedMessageSolidity,
      `packedMessages are not the same, web3: ${packedMessageWeb3}, sol: ${packedMessageSolidity}`
    );
  })

  /**
   * The keccak hash of the packed message (a.k.a. messageHash) on the smart contract should match the hash of the packed 
   * message (a.k.a. messageHash) in JavaScript (back-end).
   */
  it("messageHash from contract should be equal to soliditySha3(packed)", async () => {
    const hashPackedMessageSolidity = await contractInstance.getMessageHash(
      address,
      userHash,
      timestamp,
      { from: address }
    );

    assert(
      hashPackedMessageWeb3 == hashPackedMessageSolidity,
      `hashPackedMessages are not the same, web3: ${hashPackedMessageWeb3}, sol: ${hashPackedMessageSolidity}`
    );
  });

  /**
   * The signed messageHash on the smart contract should match the signed messageHash in JavaScript (back-end)
   */
  it("the signed messageHash from contract should be equal to signedHashPackedMessageWeb3", async () => {
    const signedHashPackedMessageSolidity =
      await contractInstance.getEthSignedMessageHash(
        hashPackedMessageWeb3,
        { from: address }
      );

    assert(
      signedHashPackedMessageWeb3 == signedHashPackedMessageSolidity,
      `signedHashPackedMessages are not the same, web3: ${signedHashPackedMessageWeb3}, sol: ${signedHashPackedMessageSolidity}`
    );
  });

  /**
   * The recovered signer from the signature and the signed messageHash (recovery using ecrecover on
   * the smart contract) and the original signer should match.
   */
  it("should be able to successfully recover the signer from the signature and the signed messageHash", async () => {
    const recoveredSigner = await contractInstance.recoverSigner(
      signedHashPackedMessageWeb3,
      signature
    );

    assert(
      recoveredSigner == owner.address,
      `Recovered signer and original signer are not the same, ${recoveredSigner} and ${owner.address}`
    );
  });

  /**
   * Given the address to verify, userHash, and the timestamp, the smart contract should be able to recreate 
   * the signed messageHash and verify the validity of a signature.
   */
  it("should be able verify the validity of a signature given the address to verify, the userhash, and the timestamp", async () => {
    const verifyResult = await contractInstance.verify(
      owner.address,
      address,
      userHash,
      timestamp,
      signature
    );

    assert(verifyResult, "Verification failed");
  });
});
