import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import React from "react";
import { Stamp } from "../App";

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

export default StampCard;
