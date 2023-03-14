const GithubVerification = artifacts.require("GithubVerification");
const utils = require("./helper/utils");

// while(true);
contract("GithubVerification", (accounts) => {
  let [alice, bob] = accounts;

  let contractInstance;
  beforeEach(async () => {
    contractInstance = await GithubVerification.new();
  });

  it("should be able to verify a user with gh", async () => {
    await utils.shouldThrow(
      contractInstance.verifyAddress("0x0", "github", "0x1234", { from: alice })
    );
  });
});
