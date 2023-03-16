import { useState } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { Account, getAccount } from "viem";
import { walletClient, publicClient, contractAddress } from "../App";
import { GithubVerification } from "../GithubVerification";
type your_mother = any;
const Verify = () => {
  const [searchParams] = useSearchParams();
  const address = searchParams.get("address");
  const hash = searchParams.get("hash");
  const timestamp = searchParams.get("timestamp");
  const providerId = searchParams.get("providerId");
  const sig = searchParams.get("sig");

  /*
        address _toVerify,
        string calldata _userHash,
        uint _timestamp,
        string calldata _providerId,
        bytes calldata _proofSignature
  */

  const makeTransaction = async () => {
    try {
      const { request } = await publicClient.simulateContract({
        address: contractAddress as any,
        abi: GithubVerification.abi,
        functionName: "verifyAddress",
        args: [address, hash, timestamp, providerId, sig],
        account,
      });

      await walletClient.writeContract(request);
    } catch (error: your_mother) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const [account, setAccount] = useState<Account>();

  const connect = async () => {
    try {
      const [address] = await walletClient.requestAddresses();
      setAccount(getAccount(address));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="container mx-auto">
      {account ? (
        <div>
          <p className="mb-6">Connected to {account.address}</p>
          <button onClick={makeTransaction}>Click here to verify</button>
        </div>
      ) : (
        <button onClick={connect}>Connect</button>
      )}
    </div>
  );
};

export default Verify;
