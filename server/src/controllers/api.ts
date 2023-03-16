import { Request, Response } from "express";
import config from "../config/config";
import Web3 from "web3";
import * as abiObj from "./GithubVerification.json";
import fetch from "node-fetch";
import { Octokit } from "@octokit/core";
import { Joi } from "celebrate";
import crypto from "crypto";
import createKeccakHash from "keccak";

const web3provider = new Web3(
    new Web3.providers.HttpProvider(
        config.NODE_ENV === "development" ? "http://localhost:65534" : "...",
    ),
);

const account = config.PUBLIC_KEY;
const key = config.PRIVATE_KEY;

const abi = abiObj.abi;
const contractAddress = config.CONTRACT_ADDRESS;
const contract = new web3provider.eth.Contract(abi as any, contractAddress);

export const index = async (req: Request, res: Response): Promise<void> => {
    res.redirect("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
};

type ProviderID = "github" | "kyc";

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
    id: number,
    providerId: ProviderID,
): Promise<VerificationData> => {
    return new Promise(async (resolve, reject) => {
        try {
            const hash = createKeccakHash("keccak256")
                .update(id + providerId + config.HASH_SECRET)
                .digest("hex");

            const proof = generateProof(address, hash);

            resolve(proof);
        } catch (error) {
            reject(error);
        }
    });
};

const generateProof = (address: string, hash: string): VerificationData => {
    const timestamp = Date.now();
    const packed = createKeccakHash("keccak256")
        .update(
            web3provider.eth.abi.encodeParameters(
                ["address", "string", "uint256"],
                [address, hash, timestamp],
            ),
        )
        .digest("hex");

    const signedData = web3provider.eth.accounts.sign(packed, key);

    const sig = signedData.signature;

    return {
        address,
        hash,
        timestamp,
        sig,
    };
};

// export const isVerified = async (
//     req: Request,
//     res: Response,
// ): Promise<void> => {
//     // console.log(contractAddress);
//     try {
//         const { address } = req.query;

//         const isVerified = await contract.methods
//             .addressIsVerified(address)
//             .call();

//         res.json({
//             ok: true,
//             isVerified,
//         });
//     } catch (error) {
//         console.log(error);
//         res.json({
//             ok: false,
//             message: error,
//         });
//     }
// };

export const getStamps = async (req: Request, res: Response): Promise<void> => {
    try {
        const { address } = req.query;

        const stamps = await contract.methods
            .getStamps(address)
            .call()
            .then((stamps: any) => {
                console.log(stamps);
                return stamps;
            });

        res.json({
            ok: true,
            stamps,
        });
    } catch (error) {
        console.log(error);
        res.json({
            ok: false,
            message: error.message,
        });
    }
};

/// GITHUB OAUTH
const REDIRECT_URI =
    "https://securesecoverification.loca.lt/api/github_callback";

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

            default:
                throw new Error("Invalid providerId");
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
            data.id,
            "github",
        );

        // res.json({
        //     ok: true,
        //     verificationData,
        // });

        res.redirect(
            `${config.FRONTEND_URL}/verify?address=${state}` +
                `&hash=${verificationData.hash}&timestamp=${verificationData.timestamp}` +
                `&sig=${verificationData.sig}`,
        );
    } catch (error) {
        console.log(error);
        res.json({
            ok: false,
            message: error.message,
        });
    }
};
