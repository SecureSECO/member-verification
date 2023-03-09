import { Request, Response } from "express";
import config from "../config/config";
import Web3 from "web3";
import * as abiObj from "./GithubVerification.json";
import fetch from "node-fetch";
import { Octokit } from "@octokit/core";
import { Joi } from "celebrate";

const web3provider = new Web3(
    new Web3.providers.HttpProvider(
        config.NODE_ENV === "development" ? "http://localhost:12346" : "...",
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

/**
 * Verifies a given address on the blockchain
 */
const verify = async (address: string): Promise<any> => {
    return new Promise(async (resolve, reject) => {
        try {
            const tx = {
                from: account,
                to: contractAddress,
                gas: 3000000,
                data: contract.methods.verifyAddress(address).encodeABI(),
            };

            // signTransaction is async so we need to use a promise
            const signPromise = web3provider.eth.accounts.signTransaction(
                tx,
                key,
            );

            const signedTx = await signPromise;
            const sentTx = web3provider.eth.sendSignedTransaction(
                signedTx.rawTransaction,
            );

            sentTx.on("receipt", receipt => {
                // console.log(receipt);
                resolve(receipt);
            });
            sentTx.on("error", error => {
                console.log(error);
                reject(error);
            });
        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
};

export const isVerified = async (
    req: Request,
    res: Response,
): Promise<void> => {
    console.log(contractAddress);
    try {
        const { address } = req.query;

        const isVerified = await contract.methods
            .addressIsVerified(address)
            .call();

        console.log(isVerified);

        res.json({
            ok: true,
            isVerified,
        });
    } catch (error) {
        console.log(error);
        res.json({
            ok: false,
            message: error,
        });
    }
};

/// GITHUB OAUTH
const REDIRECT_URI =
    "https://48a2-145-107-72-9.eu.ngrok.io/api/github_callback";

export const authorize = async (req: Request, res: Response): Promise<void> => {
    const { address } = req.query;

    try {
        const url =
            `https://github.com/login/oauth/authorize` +
            `?client_id=${config.GITHUB_CLIENT_ID}` +
            `&scope=read:user` +
            `&redirect_uri=${REDIRECT_URI}` +
            `&state=${address}` +
            `&allow_signup=false`;

        res.redirect(url);
    } catch (error) {
        console.log(error);
        res.json({
            ok: false,
            message: error,
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

        console.log(data);

        console.log(`Verifying ${state} on blockchain...`);
        const receipt = await verify(state);

        console.log(`Successfully verified ${state} on blockchain!`);

        res.json({
            ok: true,
            message: "verified",
        });
    } catch (error) {
        console.log(error);
        res.json({
            ok: false,
            message: error,
        });
    }
};
