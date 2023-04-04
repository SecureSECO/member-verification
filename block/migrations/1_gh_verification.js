var Verification = artifacts.require("./GithubVerification.sol");

module.exports = function (deployer) {
  deployer.deploy(Verification, 60, 30);
};
