/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  */

import React, { useEffect, useState } from "react";
import "viem/window";
import {
  Account,
  Chain,
  createPublicClient,
  createWalletClient,
  custom,
  CustomTransport,
  getAccount,
  http,
  parseEther,
  WalletClient,
} from "viem";
import { mainnet } from "viem/chains";
import { toast, Toaster } from "react-hot-toast";
import { GithubVerification } from "../GithubVerification";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import StampCard from "../components/StampCard";
import { Routes, Route } from "react-router-dom";
import { Stamp } from "../types/Stamp";
import {
  apiUrl,
  availableStamps,
  contractAddress,
  publicClient,
  walletClient,
} from "../App";

const Main = () => {
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

      // Check if the account has already verified
      const stamp = stamps.find(([id]) => id === providerId);
      if (stamp) {
        const [, , verifiedAt] = stamp;
        // Check if it has been more than 30 days
        if (verifiedAt * 1000 + 30 * 24 * 60 * 60 * 1000 > Date.now()) {
          throw new Error(
            "You have already verified with this provider, please wait at least 30 days after the initial verification to verify again."
          );
        }
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
        const r: any = await publicClient.readContract({
          address: contractAddress as any,
          abi: GithubVerification.abi,
          functionName: "getStamps",
          args: [account.address],
        });

        const stamps: Stamp[] = r.map((stamp: any) => [
          stamp.id,
          stamp._hash,
          Number(stamp.verifiedAt),
        ]);

        setStamps(stamps);

        console.log(stamps);
      };

      checkStamps();
    }
  }, [account]);

  return (
    <div>
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
    </div>
  );
};

export default Main;