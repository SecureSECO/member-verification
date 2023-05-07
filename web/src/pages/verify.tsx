/**
 * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
 * © Copyright Utrecht University (Department of Information and Computing Sciences)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { useState } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { Account, getAccount } from "viem";
import { walletClient, publicClient, contractAddress } from "../App";
import { GithubVerificationAbi } from "../GithubVerification";

const Verify = () => {
  const [searchParams] = useSearchParams();
  const address = searchParams.get("address");
  const hash = searchParams.get("hash");
  const timestamp = searchParams.get("timestamp");
  const providerId = searchParams.get("providerId");
  const sig = searchParams.get("sig");

  const [disabled, setDisabled] = useState(false);
  const [success, setSuccess] = useState(false);

  /*
        address _toVerify,
        string calldata _userHash,
        uint _timestamp,
        string calldata _providerId,
        bytes calldata _proofSignature
  */

  const makeTransaction = async () => {
    setDisabled(true);

    toast.promise(writeToContract(), {
      loading: "Verifying, please wait...",
      success: "Successfully verified!",
      error: (err) => err.message.split("\n")[0].substring(0, 100),
    });

    setDisabled(false);
  };

  const writeToContract = async () => {
    const { request } = await publicClient.simulateContract({
      address: contractAddress as any,
      abi: GithubVerificationAbi,
      functionName: "verifyAddress",
      args: [address, hash, timestamp, providerId, sig],
      account,
    });

    const txhash = await walletClient.writeContract(request);

    const transaction = await publicClient.waitForTransactionReceipt({
      hash: txhash,
    });

    if (transaction.status === "reverted") {
      console.log("reverted", transaction);

      throw new Error("Transaction reverted");
    }

    console.log("success", transaction);
    setSuccess(true);
  };

  const [account, setAccount] = useState<Account>();

  const connect = async () => {
    try {
      const [address] = await walletClient.requestAddresses();
      setAccount(getAccount(address));
    } catch (error: any) {
      toast.error(error.message.split("\n")[0].substring(0, 100));
    }
  };

  return (
    <div className="container mx-auto">
      <p>
        You are about to verify your address {address} with the following
        information:
        <ul className="mt-4">
          <li>Hash: {hash}</li>
          <li>Timestamp: {timestamp}</li>
          <li>Provider ID: {providerId}</li>
          <li>Sig: {sig?.substring(0, 10)}...</li>
        </ul>
      </p>
      <br />
      {account ? (
        <div>
          <p className="mb-6">Connected to {account.address}</p>
          {success ? (
            <div className="space-y-4">
              <h2>Successfully verified!</h2>
              <a href="/" className="underline">
                Go back
              </a>
            </div>
          ) : (
            <button onClick={makeTransaction} disabled={disabled}>
              Click here to verify
            </button>
          )}
        </div>
      ) : (
        <button onClick={connect}>Connect</button>
      )}
    </div>
  );
};

export default Verify;
