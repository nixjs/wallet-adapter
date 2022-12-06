import { Types } from "@nixjs23n6/types";
import { HexString } from "../HexString";
import { ProviderEnums } from "../enums";
import { TransactionTypes, NetworkTypes } from "../types";

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

export const MainNet_NodeURL = "https://fullnode.mainnet.aptoslabs.com";
export const TestNet_NodeURL = "https://fullnode.testnet.aptoslabs.com";
export const DevNet_NodeURL = "https://fullnode.devnet.aptoslabs.com";

export const MainnetChain = "0x1";
export const TestnetChain = "0x2";
export const DevnetChain = "0x26";

export const BaseNodeInfo: Record<ProviderEnums.Network, string> = {
  [ProviderEnums.Network.MAIN_NET]: MainNet_NodeURL,
  [ProviderEnums.Network.TEST_NET]: TestNet_NodeURL,
  [ProviderEnums.Network.DEV_NET]: DevNet_NodeURL,
};

export const BaseNodeByChainInfo: Record<string, string> = {
  MainnetChain: MainNet_NodeURL,
  TestnetChain: TestNet_NodeURL,
  DevnetChain: DevNet_NodeURL,
};

export const Networks: Types.Object<NetworkTypes.Network> = {
  [MainnetChain]: {
    chainId: MainnetChain,
    name: "Aptos Mainnet",
    faucetURL: "",
    nodeURL: MainNet_NodeURL,
    explorerURL: "https://explorer.aptoslabs.com",
    nativeToken: "APT",
    type: "mainnet",
  },
  [TestnetChain]: {
    chainId: TestnetChain,
    name: "Aptos Testnet",
    faucetURL: "https://faucet.testnet.aptoslabs.com",
    nodeURL: TestNet_NodeURL,
    explorerURL: "https://explorer.aptoslabs.com",
    nativeToken: "APT",
    type: "testnet",
  },
  [DevnetChain]: {
    chainId: DevnetChain,
    name: "Aptos Devnet",
    faucetURL: DevNet_NodeURL,
    nodeURL: "https://fullnode.devnet.aptoslabs.com",
    explorerURL: "https://explorer.aptoslabs.com",
    nativeToken: "APT",
    type: "devnet",
  },
};
