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
  createPublicClient,
  createWalletClient,
  custom,
  CustomTransport,
  getAccount,
  http,
  parseEther,
} from "viem";
import { mainnet } from "viem/chains";
import { toast, Toaster } from "react-hot-toast";

import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import StampCard from "./components/StampCard";
import { Routes, Route, Router, BrowserRouter } from "react-router-dom";
import Main from "./pages/main";
import Verify from "./pages/verify";

const transport = http(
  process.env.NODE_ENV === "development" ? "http://127.0.0.1:65534" : "..."
);

export const walletClient = createWalletClient({
  transport: custom(window.ethereum!),
  // chain: mainnet,
});

export const publicClient = createPublicClient({
  transport: custom(window.ethereum!),
  // chain: mainnet,
});

export const apiUrl = process.env.REACT_APP_API_URL;
export const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;

export const availableStamps = ["proofofhumanity", "github", "twitter"];

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <header className="container mx-auto py-10">
        <h1>Verification</h1>
      </header>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/verification" element={<Verify />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
