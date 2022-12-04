import { ProviderEnums } from "../enums";

export const AptosCoinStore =
  "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>";
export const AptosCoinSymbol = "APT";
export const BaseCoinStore = "0x1::coin::CoinStore";
export const AptosTokenStore = "0x3::token::TokenStore";
export const BaseCoinType = "0x1::aptos_coin::AptosCoin";
export const CoinType = 637;
export const BaseFundingAirdrop = 1000000000;
export const BaseMaxDigitFixed = 9;
export const BaseGasPrice = 100;
export const BaseMaxGasAmount = 2000;
export const BaseExpireTimestamp = 40; // second
export const BaseDecimals = 8;
export const BaseIconURL =
  "https://raw.githubusercontent.com/nixjs/aptos-wallet-icon/main/icons/aptos-logo.svg";
export const BaseNodeInfo: Record<ProviderEnums.Network, string> = {
  [ProviderEnums.Network.MAIN_NET]: "https://fullnode.mainnet.aptoslabs.com",
  [ProviderEnums.Network.TEST_NET]: "https://fullnode.testnet.aptoslabs.com",
  [ProviderEnums.Network.DEV_NET]: "https://fullnode.devnet.aptoslabs.com",
};
export const BaseNodeByChainInfo: Record<number, string> = {
  1: "https://fullnode.mainnet.aptoslabs.com",
  2: "https://fullnode.testnet.aptoslabs.com",
  38: "https://fullnode.devnet.aptoslabs.com",
};
