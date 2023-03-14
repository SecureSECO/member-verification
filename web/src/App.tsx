import React, { useEffect, useState } from "react";
import 'viem/window'
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

const walletClient = createWalletClient({
  transport: custom(window.ethereum!),
})

export const apiUrl = process.env.REACT_APP_API_URL;
console.log(apiUrl);

type Stamp = [id: string, _hash: string, verifiedAt: number];

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
        const { ok, stamps } = await res.json();

        if (ok) {
          setStamps(stamps);
        } else {
          toast.error("Can't retrieve verification status");
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

const StampCard = ({
  providerId,
  stamp,
  verify,
}: {
  providerId: string;
  stamp: Stamp | null;
  verify: (providerId: string) => void;
}) => {
  const verified: boolean =
    stamp != null && stamp[2] > Date.now() / 1000 - 60 * 24 * 60 * 60; // 60 days

  return (
    <div className="card">
      <div className="flex gap-x-2 items-center">
        {verified && <CheckBadgeIcon className="text-green-500 max-w-[24px]" />}
        <h2 className="capitalize">{providerId}</h2>
      </div>
      <p className="mt-2">
        Last verified at:{" "}
        {stamp ? new Date(stamp[2] * 1000).toDateString() : "never"}
      </p>
      <button className="bg-black/80 mt-4" onClick={() => verify(providerId)}>
        {verified ? "Reverify" : "Verify"}
      </button>
    </div>
  );
};

export default App;
