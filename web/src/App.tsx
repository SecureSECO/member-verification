import React, { useEffect, useState } from "react";
import "viem/window";
import {
  Account,
  createPublicClient,
  createWalletClient,
  custom,
  CustomTransport,
  getAccount,
  parseEther,
} from "viem";
import { toast, Toaster } from "react-hot-toast";
import { GithubVerification } from "./GithubVerification";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import StampCard from "./components/StampCard";

const walletClient = createWalletClient({
  transport: custom(window.ethereum!),
});

export const apiUrl = process.env.REACT_APP_API_URL;
console.log(apiUrl);

export type Stamp = [id: string, _hash: string, verifiedAt: number];

// TODO: Move to a db or something
const availableStamps = ["KYC", "github", "onlyfans", "the hub", "google plus"];

function App() {
  const [account, setAccount] = useState<Account>();
  const [stamps, setStamps] = useState<Stamp[]>([]);

  const connect = async () => {
    try {
      const [address] = await walletClient.requestAddresses();
      setAccount(getAccount(address));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const verify = async (providerId: string) => {
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
          providerId,
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
      setStamps([]);
      const checkStamps = async () => {
        const res = await fetch(
          `${apiUrl}/getStamps?address=${account.address}`
        );
        const _res = await res.json();
        const { ok, stamps } = _res;

        if (ok) {
          setStamps(stamps);
        } else {
          toast.error("Can't retrieve verification status");
          console.log(_res);
        }
      };

      checkStamps();
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
            <p className="mb-6">Connected to {account.address}</p>

            <div className="flex flex-wrap gap-6">
              {availableStamps.map((providerId) => (
                <StampCard
                  key={providerId}
                  providerId={providerId}
                  stamp={stamps.find(([id]) => id === providerId) || null}
                  verify={verify}
                />
              ))}
            </div>
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
