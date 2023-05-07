/**
 * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
 * © Copyright Utrecht University (Department of Information and Computing Sciences)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import React from "react";
import { Stamp } from "../types/Stamp";

const StampCard = ({
  providerId,
  stamp,
  verify,
  unverify,
}: {
  providerId: string;
  stamp: Stamp | null;
  verify: (providerId: string) => void;
  unverify: (providerId: string) => void;
}) => {
  const lastVerifiedAt = stamp ? Number(stamp[2][stamp[2].length - 1]) : 0;
  const verified: boolean =
    stamp != null && lastVerifiedAt > Date.now() / 1000 - 60 * 24 * 60 * 60; // 60 days

  return (
    <div className="card">
      <div className="flex gap-x-2 items-center">
        {verified && <CheckBadgeIcon className="text-green-500 max-w-[24px]" />}
        <h2 className="capitalize">{providerId}</h2>
      </div>
      <p className="mt-2">
        Last verified at:{" "}
        {stamp ? new Date(lastVerifiedAt * 1000).toDateString() : "never"}
      </p>
      <div className="flex items-center gap-x-2">
        <button className="bg-black/80 mt-4" onClick={() => verify(providerId)}>
          {verified ? "Reverify" : "Verify"}
        </button>
        {verified && (
          <button
            className="bg-red-500/80 mt-4"
            onClick={() => unverify(providerId)}
          >
            Unverify
          </button>
        )}
      </div>
    </div>
  );
};

export default StampCard;
