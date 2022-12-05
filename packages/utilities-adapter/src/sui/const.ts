import { ProviderEnums } from "../enums";

export const SUICoinStore = "0x2::coin::Coin<0x2::sui::SUI>";
export const BaseCoinType = "0x2::coin::Coin";
export const BaseCoinTypeRegex = /^0x2::coin::Coin<(.+)>$/;
export const BaseMaxGasAmount = 150;
export const CoinType = 784;
export const BaseDecimals = 10;
export const BaseIconURL =
  "https://raw.githubusercontent.com/nixjs/aptos-wallet-icon/main/icons/sui-logo.svg";

export const BaseNodeInfo: Record<ProviderEnums.Network, string> = {
  [ProviderEnums.Network.MAIN_NET]: "https://fullnode.mainnet.sui.io",
  [ProviderEnums.Network.TEST_NET]: "https://fullnode.testnet.sui.io",
  [ProviderEnums.Network.DEV_NET]: "https://fullnode.devnet.sui.io",
};
export const BaseNodeByChainInfo: Record<number | string, string> = {
  1: "https://fullnode.mainnet.sui.io",
  2: "https://fullnode.testnet.sui.io",
  38: "https://fullnode.devnet.sui.io",
};
