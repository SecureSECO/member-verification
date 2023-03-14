import React, { useEffect, useState } from "react";
import "viem/window";
import {
  Account,
  createPublicClient,
  createWalletClient,
  custom,
  getAccount,
  parseEther,
} from "viem";
import { toast, Toaster } from "react-hot-toast";
import { GithubVerification } from "./GithubVerification";

const walletClient = createWalletClient({
  transport: custom(window.ethereum!),
});

export const apiUrl = process.env.REACT_APP_API_URL;
console.log(apiUrl);

function App() {
  const [account, setAccount] = useState<Account>();
  const [isVerified, setIsVerified] = useState(false);

  const connect = async () => {
    try {
      const [address] = await walletClient.requestAddresses();
      setAccount(getAccount(address));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const verify = async () => {
    try {
      if (!account) {
        throw new Error("No account connected");
      }

      const nonce = Math.floor(Math.random() * 1000000);

      // Sign a message with the account
      const signature = await walletClient.signMessage({
        account,
        data: `SecureSECO DAO Verification \nN:${nonce}`,
      });

      // Send the signature to the API
      const response = await fetch(`${apiUrl}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: account.address,
          signature,
          nonce: nonce.toString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Verification failed");
      }

      const { ok, message, url } = await response.json();

      if (ok) {
        window.location.href = url;
      } else {
        throw new Error("Verification failed: " + message);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (account) {
      setIsVerified(false);
      const checkIfVerified = async () => {
        const res = await fetch(
          `${apiUrl}/isVerified?address=${account.address}`
        );
        const { ok, isVerified } = await res.json();

        if (ok) {
          setIsVerified(isVerified);
        } else {
          toast.error("Can't retrieve verification status");
        }
      };

      checkIfVerified();
    }
  }, [account]);

  return (
    <>
      <Toaster />
      <header className="container mx-auto py-10">
        <h1>SecureSECO Verification</h1>
      </header>
      <section className="container mx-auto">
        {account ? (
          <div>
            <p>Connected to {account.address}</p>
            {!isVerified ? (
              <button className="bg-black/80 mt-2" onClick={verify}>
                Verify GitHub
              </button>
            ) : (
              <p className="text-green-600 mt-2 font-semibold">
                You have been verified!
              </p>
            )}
          </div>
        ) : (
          <div>
            <button onClick={connect}>Connect</button>
          </div>
        )}
      </section>
    </>
  );
}

export default App;
