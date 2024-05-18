import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-verify';
import '@solidstate/hardhat-accounts';
import '@solidstate/hardhat-txn-dot-xyz';
import '@typechain/hardhat';
import 'hardhat-contract-sizer';
import 'hardhat-docgen';
import 'hardhat-gas-reporter';
import 'hardhat-spdx-license-identifier';
import 'solidity-coverage';
import { HardhatUserConfig } from 'hardhat/types';
import Dotenv from 'dotenv';
import './tasks/facet_cut_add';
import './tasks/facet_cut_remove';
import './tasks/facet_deploy';
import './tasks/repair';
import './tasks/storage_calculate_diff';
import './tasks/storage_rewrite';

Dotenv.config();

const { API_KEY_ETHERSCAN, NODE_URL_MAINNET, REPORT_GAS } = process.env;

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.21',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    hardhat: {
      forking: {
        url: `${NODE_URL_MAINNET}`,
      },
    },
    mainnet: {
      url: NODE_URL_MAINNET,
    },
  },

  contractSizer: {
    runOnCompile: true,
  },

  docgen: {
    clear: true,
    runOnCompile: false,
  },

  etherscan: {
    apiKey: API_KEY_ETHERSCAN,
  },

  gasReporter: {
    enabled: REPORT_GAS === 'true',
  },

  spdxLicenseIdentifier: {
    overwrite: false,
    runOnCompile: true,
  },
};

export default config;
