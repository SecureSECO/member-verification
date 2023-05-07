/**
 * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
 * © Copyright Utrecht University (Department of Information and Computing Sciences)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Request, Response } from "express";
import config from "../config/config";
import Web3 from "web3";
import * as abiObj from "./ProofOfHumanity.json";
import fetch from "node-fetch";
import { Octokit } from "@octokit/core";
import { Joi } from "celebrate";
import crypto from "crypto";
import createKeccakHash from "keccak";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { mnemonicToSeed } from "bip39";
import hdkey from "hdkey";

const client = createPublicClient({
    chain: mainnet,
    transport: http(),
});

const web3provider = new Web3(
    new Web3.providers.HttpProvider(
        config.NODE_ENV === "development" ? "http://127.0.0.1:65534" : "...",
    ),
);

export const index = async (req: Request, res: Response): Promise<void> => {
    res.json({
        message: "OK",
    });
};

const getPrivateKey = async () => {
    if (config.NODE_ENV === "production") {
        return config.PRIVATE_KEY;
    } else {
        const hdkDerivePath = "m/44'/60'/0'/0/0";
        const seed = await mnemonicToSeed(config.DEV_MNEMONIC);
        const hdk = hdkey.fromMasterSeed(seed);
        const addr_node = hdk.derive(hdkDerivePath); // gets first account
        const private_key = addr_node.privateKey;

        return private_key.toString("hex");
    }
};

type ProviderID = "github" | "proofofhumanity";

type VerificationData = {
    address: string;
    hash: string;
    timestamp: number;
    sig: string;
};

/**
 * Gets proof, etc. for the user to send to the contract
 */
const getVerificationData = async (
    address: string,
    id: string,
    providerId: ProviderID,
): Promise<VerificationData> => {
    return new Promise(async (resolve, reject) => {
        try {
            const hash = createKeccakHash("keccak256")
                .update(id + providerId + config.HASH_SECRET)
                .digest("hex");

            const proof = await generateProof(address, hash);

            resolve(proof);
        } catch (error) {
            reject(error);
        }
    });
};

const generateProof = async (
    address: string,
    hash: string,
): Promise<VerificationData> => {
    const timestamp = Math.floor(Date.now() / 1000);
    const hashedMessage = web3provider.utils.soliditySha3(
        web3provider.utils.encodePacked(
            {
                type: "address",
                value: address,
            },
            {
                type: "string",
                value: hash,
            },
            {
                type: "uint256",
                value: timestamp.toString(),
            },
        ),
    );

    const key = await getPrivateKey();
    const signedData = web3provider.eth.accounts.sign(hashedMessage, key);

    const sig = signedData.signature;

    // const messageHash = signedData.messageHash;
    // console.log(signedData);

    return {
        address,
        hash,
        timestamp,
        sig,
    };
};

/// GITHUB OAUTH
const REDIRECT_URI = "http://localhost:43210/api/github_callback";

export const authorize = async (req: Request, res: Response): Promise<void> => {
    try {
        const { address, signature, nonce, providerId } = req.body;

        // Verify signature
        const _address = web3provider.eth.accounts.recover(
            `SecureSECO DAO Verification \nN:${nonce}`,
            signature,
        );

        if (_address !== address) {
            res.json({
                ok: false,
                message: "Invalid signature",
            });
            return;
        }

        let url = "";

        switch (providerId) {
            case "github":
                url =
                    `https://github.com/login/oauth/authorize` +
                    `?client_id=${config.GITHUB_CLIENT_ID}` +
                    `&scope=read:user` +
                    `&redirect_uri=${REDIRECT_URI}` +
                    `&state=${address}` +
                    `&allow_signup=false`;

                break;

            case "proofofhumanity":
                url = await proofOfHumanityUrl(address);
                break;

            default:
                throw new Error("Invalid provider");
        }

        res.json({
            ok: true,
            url,
        });
    } catch (error) {
        console.log(error);
        res.json({
            ok: false,
            message: error.message,
        });
    }
};

export const githubCallback = async (
    req: Request,
    res: Response,
): Promise<void> => {
    try {
        const { code, state } = req.query;

        if (typeof state !== "string") {
            throw new Error("state is not a string");
        }

        // Use Joi to validate state as 0x... address
        const schema = Joi.string()
            .pattern(/^0x[a-fA-F0-9]{40}$/)
            .required();

        const { error } = schema.validate(state);

        if (error) {
            throw new Error("state is not a valid address");
        }

        const _res = await fetch(
            `https://github.com/login/oauth/access_token`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    client_id: config.GITHUB_CLIENT_ID,
                    client_secret: config.GITHUB_CLIENT_SECRET,
                    code,
                    redirect_uri: REDIRECT_URI,
                }),
            },
        );

        const { access_token, scope, token_type } = await _res.json();

        const octokit = new Octokit({ auth: access_token });

        const { data } = await octokit.request("GET /user");

        // Should be at least 1 year old
        const createdAt = new Date(data.created_at);
        const now = new Date();
        const diff = now.getTime() - createdAt.getTime();
        const diffDays = Math.ceil(diff / (1000 * 3600 * 24));

        if (diffDays < 365) {
            throw new Error("Account must be at least 1 year old");
        } else {
            console.log(`Account is ${diffDays} days old`);
        }

        const verificationData = await getVerificationData(
            state,
            data.id.toString(),
            "github",
        );

        // res.json({
        //     ok: true,
        //     verificationData,
        // });

        res.redirect(
            `${config.FRONTEND_URL}/verification?new=true&address=${state}` +
                `&hash=${verificationData.hash}&timestamp=${verificationData.timestamp}` +
                `&sig=${verificationData.sig}&providerId=github`,
        );
    } catch (error) {
        console.log(error);
        res.json({
            ok: false,
            message: error.message,
        });
    }
};

export const proofOfHumanityUrl = async (address: string): Promise<string> => {
    const r: any = await client.readContract({
        address: "0xc5e9ddebb09cd64dfacab4011a0d5cedaf7c9bdb", // ProofOfHumanity
        abi: abiObj.abi,
        functionName: "isRegistered",
        args: [address],
    });

    if (r === true) {
        const verificationData = await getVerificationData(
            address,
            address,
            "proofofhumanity",
        );

        return (
            `${config.FRONTEND_URL}/verification?new=true&address=${address}` +
            `&hash=${verificationData.hash}&timestamp=${verificationData.timestamp}` +
            `&sig=${verificationData.sig}&providerId=proofofhumanity`
        );
    } else {
        throw new Error("Not registered on Proof of Humanity");
    }
};
