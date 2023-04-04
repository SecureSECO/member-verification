// SOURCE: https://dev.to/asjadanis/parsing-env-with-typescript-3jjm

import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../config/.env") });
console.log(`dirname: ${__dirname}`);
interface ENV {
    NODE_ENV: string | undefined;
    GITHUB_CLIENT_ID: string | undefined;
    GITHUB_CLIENT_SECRET: string | undefined;
    PUBLIC_KEY: string | undefined;
    PRIVATE_KEY: string | undefined;
    CONTRACT_ADDRESS: string | undefined;
    HASH_SECRET: string | undefined;
    FRONTEND_URL: string | undefined;
    DEV_MNEMONIC: string | undefined;
}

interface Config {
    NODE_ENV: string;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    PUBLIC_KEY: string;
    PRIVATE_KEY: string;
    CONTRACT_ADDRESS: string;
    HASH_SECRET: string;
    FRONTEND_URL: string;
    DEV_MNEMONIC: string;
}

const getConfig = (): ENV => {
    return {
        NODE_ENV: process.env.NODE_ENV,
        GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
        GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
        PUBLIC_KEY: process.env.PUBLIC_KEY,
        PRIVATE_KEY: process.env.PRIVATE_KEY,
        CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
        HASH_SECRET: process.env.HASH_SECRET,
        FRONTEND_URL: process.env.FRONTEND_URL,
        DEV_MNEMONIC: process.env.DEV_MNEMONIC,
    };
};

// Throwing an Error if any field was undefined we don't
// want our app to run if it can't connect to DB and ensure
// that these fields are accessible. If all is good return
// it as Config which just removes the undefined from our type
// definition.

const getSanitzedConfig = (config: ENV): Config => {
    for (const [key, value] of Object.entries(config)) {
        if (value === undefined) {
            throw new Error(`Missing key ${key} in .env`);
        }
    }
    return config as Config;
};

const config = getConfig();

const sanitizedConfig = getSanitzedConfig(config);

export default sanitizedConfig;
