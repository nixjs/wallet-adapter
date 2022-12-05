import { Types } from "@nixjs23n6/types";
import { ProviderEnums } from "../enums";
import { TransactionTypes } from "../types";

export const SUICoinStore = "0x2::coin::Coin<0x2::sui::SUI>";
export const BaseCoinType = "0x2::coin::Coin";
export const BaseCoinTypeRegex = /^0x2::coin::Coin<(.+)>$/;
export const BaseMaxGasAmount = 150;
export const CoinType = 784;
export const BaseDecimals = 10;
export const BaseIconURL =
  "https://raw.githubusercontent.com/nixjs/aptos-wallet-icon/main/icons/sui-logo.svg";

export const MainNet_NodeURL = "https://fullnode.mainnet.sui.io";
export const TestNet_NodeURL = "https://fullnode.testnet.sui.io";
export const DevNet_NodeURL = "https://fullnode.devnet.sui.io";

export const BaseNodeInfo: Record<ProviderEnums.Network, string> = {
  [ProviderEnums.Network.MAIN_NET]: MainNet_NodeURL,
  [ProviderEnums.Network.TEST_NET]: TestNet_NodeURL,
  [ProviderEnums.Network.DEV_NET]: DevNet_NodeURL,
};
export const BaseNodeByChainInfo: Record<number | string, string> = {
  mainnet: MainNet_NodeURL,
  testnet: TestNet_NodeURL,
  devnet: DevNet_NodeURL,
};

export const Networks: Types.Object<TransactionTypes.Network> = {
  testnet: {
    chainID: "testnet",
    name: "SUI Testnet",
    faucetURL: "https://faucet.testnet.sui.io/gas",
    nodeURL: TestNet_NodeURL,
    explorerURL: "https://explorer.sui.io",
    nativeToken: "SUI",
    type: "testnet",
  },
  devnet: {
    chainID: "devnet",
    name: "SUI Devnet",
    faucetURL: "https://faucet.devnet.sui.io/gas",
    nodeURL: DevNet_NodeURL,
    explorerURL: "https://explorer.sui.io",
    nativeToken: "SUI",
    type: "devnet",
  },
};
