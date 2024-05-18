# Diamond Proxy Storage Rewrite Tool

This repository exists to correct the effects a known issue in multiple EIP-2535 Diamond proxy implementations.

## Issue

The issue in question manifests when a [zero-selector](https://www.4byte.directory/signatures/?bytes4_signature=0x00000000) is added to a diamond proxy at position `8n + 1`. If it is later removed, the `diamondCut` function treats it as an empty slot rather than a function signature and ignores it, corrupting the storage of the proxy.

## Usage

Follow the Development insructions below to setup the Hardhat environment.

Use the included Hardhat tasks to correct the storage of an affected diamond proxy. It is recommended to use the high-level `repair` task, which itself runs various lower level

```bash
yarn run hardhat repair TODO
```

Each of the component tasks can be run individually. See the Hardhat help menu for more information.

## Development

Install dependencies via Yarn:

```bash
yarn install
```

Setup Husky to format code on commit:

```bash
yarn prepare
```

Compile contracts via Hardhat:

```bash
yarn run hardhat compile
```

The Hardhat environment relies on the following environment variables. The `dotenv` package will attempt to read them from the `.env` and `.env.secret` files, if they are present.

| Key                 | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| `API_KEY_ETHERSCAN` | [Etherscan](https://etherscan.io//) API key for source code verification |
| `NODE_URL_MAINNET`  | JSON-RPC node URL for `mainnet` network                                  |
| `REPORT_GAS`        | if `true`, a gas report will be generated after running tests            |

### Networks

By default, Hardhat uses the Hardhat Network in-process. An additional network, `mainnet`, is available, and its behavior is determined by the configuration of environment variables.

### Testing

Test contracts via Hardhat:

```bash
yarn run hardhat test
```

Activate gas usage reporting by setting the `REPORT_GAS` environment variable to `"true"`:

```bash
REPORT_GAS=true yarn run hardhat test
```

Generate a code coverage report using `solidity-coverage`:

```bash
yarn run hardhat coverage
```

### Documentation

A static documentation site can be generated using `hardhat-docgen`:

```bash
yarn run hardhat docgen
```
