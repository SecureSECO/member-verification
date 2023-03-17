const SignatureHelper = artifacts.require("SignatureHelper");
const createKeccakHash = require("keccak");
const Web3 = require("web3");
var utils = require("web3-utils");
var ethereumjsUtil = require("ethereumjs-util");

// Test suite for the SignatureHelper contract
contract("SignatureHelper", (accounts) => {
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

  // Gets run before every test (it)
  beforeEach(async () => {
    contractInstance = await SignatureHelper.new();
  });

  // To test the abi.encodePacked and keccak256 hash of the parameters
  // TODO: can remove the encodePacked function from the contract
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

  it("recover the signer from a signature and the signed hash of the message, recovered signer is equal to owner's address", async () => {
    const recoveredSigner = await contractInstance.recoverSigner(
      signedHashPackedMessageWeb3,
      signature
    );

    assert(
      recoveredSigner == owner.address,
      `Recovered signer and original signer are not the same, ${recoveredSigner} and ${owner.address}`
    );
  });

  it("verify that a signature is from the owner's address, given the address to verify, the userhash, and the timestamp", async () => {
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
