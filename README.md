# SecureSECO Verification Suite

This repository contains the source code for the SecureSECO Verification Suite, a tool to verify the identity of users and have that data be available on-chain.

## Components

This project consists of three components:

### Block

The block component contains the smart contracts that are used to verify the identity of users and store the data on-chain.

The package contains two smart contracts:

1. GithubVerification.sol: Contains various functions that the user can call to verify their identity using a proof (more on that later).
2. SignatureHelper.sol: Helper functions to verify signatures.

### Server

The server contains code which makes verification possible without us (the server) writing to the contract, made with Node.js, Express and TypeScript.

### Web

Simple verification front-end made using React. Not actually used in production.

## How it works

The user goes to the verification website, and needs to connect their wallet (for example, via Metamask). They then need to choose one of the providers to verify with. Currently, only Github and Proof of Humanity are supported.

Once they pick a provider, they will be redirected to the provider's website, where they need to verify their identity. For GitHub this happens using OAuth.

After they do this, they are redirected to the server, which receives a token. The server can now verify the identity of the user using this token. Once that is done, the server creates a proof that the user can use to verify their identity on-chain.

The proof is constructed as follows:

- The following data is concatenated:
  - Address of the user
  - Hash of the following data, concatenated:
    - Some unique user data (for example, the user's Github username)
    - The provider id (for example, "github")
    - Some secret
  - The current timestamp
- This data is then signed using a private key. This private key needs to be from the same wallet as the one that deployed the smart contract from /block.

The user can use this proof to verify themselves using the smart contract by calling the `verifyAddress` function. This is easily done by pressing a button.
When the function is called, the smart contract will verify the proof and if it is valid, it will store the data on-chain.

### Stamps

The way that a verification is represented on-chain is by using a stamp. A stamp is a struct that contains the following data:

```c# but actually solidity
struct Stamp {
    string providerId; // Unique id for the provider (github, proofofhumanity, etc.)
    string userHash; // Hash of some unique user data of the provider (username, email, etc.)
    uint64[] verifiedAt; // Timestamps at which the user has verified
}
```

Each user can have multiple stamps.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/en/download/)
- [Ganache](https://www.trufflesuite.com/ganache): A personal blockchain for Ethereum development you can use to deploy contracts, develop your applications, and run tests.
- [Truffle](https://www.trufflesuite.com/truffle): A development environment, testing framework and asset pipeline for blockchains.

### Setup

1. Clone the repository

```bash
git clone https://github.com/SecureSECODAO/SecureSECOVerification.git
```

2. Install dependencies for all packages

```bash
cd block
npm install

cd ..
cd server
npm install

cd ..
cd web
npm install
```

3. Start Ganache:

- Open Ganache and create a new workspace.
- Import the `block/truffle-config.js` file by pressing the "Add Project" button (Workspace tab)
- Change the port number to 65534 (Server tab)
- Optionally: Set the mnemonic
- Start the workspace

4. Migrate the contracts

```bash
cd block
truffle migrate
```

5. Create .env files

- Create a `.env` file in the `server/src/config` folder and add the required fields (see the example.env file)
- Create a `.env` file in the `web` folder and add the required fields (see the example.env file)

6. Start the server

```bash
cd server
npm run build
npm start
```

7. Start the web application

```bash
cd web
npm start
```

## Testing

### Block

```bash
cd block
truffle test
```

### Server

```bash
cd server
npm run test
```

### License

This repository is [MIT licensed](./LICENSE).
