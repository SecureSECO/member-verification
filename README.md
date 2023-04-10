# SecureSECO Verification Suite

This repository contains the source code for the SecureSECO Verification Suite, a tool to verify the identity of users and have that data be available on-chain.

## Components
This project consists of three components:

### Block
...

### Server
...

### Web
...

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
npm start
```

7. Start the web application

```bash
cd web
npm start
```

### License

This repository is [MIT licensed](./LICENSE).
