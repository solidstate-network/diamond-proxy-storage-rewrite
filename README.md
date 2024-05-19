# Diamond Proxy Storage Rewrite Tool

This repository exists to correct the effects a known issue in multiple EIP-2535 Diamond proxy implementations.

## Issue

The issue in question manifests when a [zero-selector](https://www.4byte.directory/signatures/?bytes4_signature=0x00000000) is added to a diamond proxy at position `8n + 1`. If it is later removed, the `diamondCut` function treats it as an empty slot rather than a function signature and ignores it, corrupting the storage of the proxy.

## Usage

Follow the Development insructions below to setup the Hardhat environment.

Use the included Hardhat tasks to correct the storage of an affected diamond proxy. It is recommended to use the high-level `repair` task.

```bash
yarn run hardhat repair TODO
```

The `repair` task consists of multiple component tasks which can be run individually. See the Hardhat help menu for more information.

All tasks make use of the Solidstate [hardhat-txn-dot-xyz](https://github.com/solidstate-network/hardhat-txn-dot-xyz) plugin, which delegates transaction signing to a web browser. This is intended to make it easier for multisig account users to update their diamond proxies.

The following is a description of each of the arguments accepted by the tasks.

| Argument              | Description                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `diamond`             | Address of the diamond proxy with corrupted storage.                                                                                                                                                                                                                                                                                                                                                                                  |
| `proxy`               | Address of the `StorageRewrite` contract.                                                                                                                                                                                                                                                                                                                                                                                             |
| `deployer`            | Address of the account used to deploy the `StorageRewrite` contract.                                                                                                                                                                                                                                                                                                                                                                  |
| `authorizedSender`    | Address of the account permitted to call the `rewrite` function on the `StorageRewrite` contract. Defaults to the EIP-173 `owner` of the `diamond` proxy.                                                                                                                                                                                                                                                                             |
| `selectorMappingSlot` | Index of the storage slot where the `diamond` proxy's "selectorSlots" `mapping` is located. For Solidstate diamonds, use the value `10609044750049383608397494242324024633293263241157009129719067088929364376725n`. For reference diamonds ("diamond-2"), use the value `90909012999857140622417080374671856515688564136957639390032885430481714942749n`. For any other third party diamonds, the value must be calculated manually. |
| `facetsMappingSlot`   | Index of the storage slot where the `diamond` proxy's "facets" `mapping` is located. For Solidstate diamonds, use the value `10609044750049383608397494242324024633293263241157009129719067088929364376723n`. For reference diamonds ("diamond-2"), use the value `90909012999857140622417080374671856515688564136957639390032885430481714942748n`. For any other third party diamonds, the value must be calculated manually.        |
| `selectorCountSlot`   | Index of the storage slot where the `diamond` proxy's total selector count is stored. For Solidstate diamonds, use the value `10609044750049383608397494242324024633293263241157009129719067088929364376724n`. For reference diamonds ("diamond-2"), use the value `90909012999857140622417080374671856515688564136957639390032885430481714942750n`. For any other third party diamonds, the value must be calculated manually.       |
| `slots`               | JSON array of the data to be written to storage, generated by the `storage-calculate-diff` task.                                                                                                                                                                                                                                                                                                                                      |

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
