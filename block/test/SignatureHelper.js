const SignatureHelper = artifacts.require("SignatureHelper");
const createKeccakHash = require("keccak");
const Web3 = require("web3");
var utils = require("web3-utils");
var ethereumjsUtil = require("ethereumjs-util");

const keccak256 = (data) => {
  return createKeccakHash("keccak256").update(data).digest("hex");
};

function hashMessage(data) {
  var messageHex = utils.isHexStrict(data) ? data : utils.utf8ToHex(data);
  var messageBytes = utils.hexToBytes(messageHex);
  var messageBuffer = Buffer.from(messageBytes);
  var preamble = "\x19Ethereum Signed Message:\n" + messageBytes.length;
  var preambleBuffer = Buffer.from(preamble);
  var ethMessage = Buffer.concat([preambleBuffer, messageBuffer]);
  return ethereumjsUtil.bufferToHex(ethereumjsUtil.keccak256(ethMessage));
}

contract("SignatureHelper", (accounts) => {
  let [alice, bob] = accounts;

  console.log("alice=" + alice);

  let contractInstance;
  let web3;
  beforeEach(async () => {
    contractInstance = await SignatureHelper.new();
    web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:65534"));
  });

  it("should be able to create a message hash from the address, string, and uint256 just like on the back-end server", async () => {
    const address = "0x181bC4c7ffB851D83ce9266A659FAA4BC207b90A";
    const userHash =
      "090d4910f4b4038000f6ea86644d55cb5261a1dc1f006d928dcc049b157daff8";
    const timestamp = 1678979236;

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

    const packedMessageSolidity = await contractInstance.getPackedMessage(
      address,
      userHash,
      timestamp,
      { from: alice }
    );

    assert(
      packedMessageWeb3 == packedMessageSolidity,
      `packedMessages are not the same, web3: ${packedMessageWeb3}, sol: ${packedMessageSolidity}`
    );

    const hashPackedMessageWeb3 = web3.utils.soliditySha3(packedMessageWeb3);

    const hashPackedMessageSolidity = await contractInstance.getMessageHash(
      address,
      userHash,
      timestamp,
      { from: alice }
    );

    assert(
      hashPackedMessageWeb3 == hashPackedMessageSolidity,
      `hashPackedMessages are not the same, web3: ${hashPackedMessageWeb3}, sol: ${hashPackedMessageSolidity}`
    );

    const { messageHash: signedHashPackedMessageWeb3, signature } =
      web3.eth.accounts.sign(
        hashPackedMessageWeb3,
        "0xc83cc90eee28770847d8604c0439ffdcc9048eecc56823104a760bba952d92ca"
      );

    const signedHashPackedMessageSolidity =
      await contractInstance.getEthSignedMessageHash(
        hashPackedMessageSolidity,
        { from: alice }
      );

    assert(
      signedHashPackedMessageWeb3 == signedHashPackedMessageSolidity,
      `signedHashPackedMessages are not the same, web3: ${signedHashPackedMessageWeb3}, sol: ${signedHashPackedMessageSolidity}`
    );

    const recoveredSigner = await contractInstance.recoverSigner(
      signedHashPackedMessageSolidity,
      signature
    );

    assert(
      recoveredSigner == alice,
      `Recovered signer and original signer are not the same, ${recoveredSigner} and ${alice}`
    );

    const verifyResult = await contractInstance.verify(
      alice,
      address,
      userHash,
      timestamp,
      signature
    );

    assert(verifyResult, "Verification failed");
  });
});
