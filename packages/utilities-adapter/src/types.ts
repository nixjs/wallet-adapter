import { Types } from "@nixjs23n6/types";
import { HexString } from "./HexString";
import { TransactionEnums, ProviderEnums } from "./enums";

export namespace AssetTypes {
  export interface NativeCoin {
    assetId: string;
    decimals: number;
    url: string;
    symbol: string;
    name: string;
  }
  export interface Asset {
    // 0x1::coin::CoinStore<0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::AnimeCoin::ANI> or smart contract address
    assetId: string;
    name: string;
    symbol: string;
    decimals: number;
    logoUrl: string;
    coingeckoId?: string;
    isNative: boolean;
  }
  export interface AssetAmount {
    amount: string;
    assetId: string;
  }

  export interface NFT {
    id: string;
    collection: string;
    name: string;
    description: string;
    uri: string;
    metadata?: NFTMetadata;
  }
  export interface NFTMetadata {
    [key: string]: any;
  }
}
export namespace TransactionTypes {
  export type RawTxSigning = {
    data: any;
  };

  export type UnsignedTransaction = {
    data: HexString;
  };

  export type SignedTransaction = {
    signature: HexString;
    publicKey: HexString;
    data: HexString;
  };

  export type SignedMessage = {
    signature: HexString;
    publicKey: HexString;
  };

  export interface Transaction {
    from: string;
    to: string;
    gasFee: number;
    hash: string;
    timestamp: number | null;
    status: TransactionEnums.TransactionStatus;
    type: TransactionEnums.TransactionType;
    data: TransactionObject;
    version?: number;
  }
  export type TransactionObject = CoinObject | NFTObject | ScriptObject;
  export type CoinObject = {
    type: "coin" | "token";
    symbol: string;
    balance: string;
  };

  export type NFTObject = {
    type: "nft" | "collection";
    name: string;
    description: string;
    url: string;
  };

  export type ScriptObject = {
    [data: string]: any;
  };

  export interface TransferRequest {
    amount: string;
    assetId: string;
    from: VaultTypes.AccountObject;
    to: string;
    chainId: string;
    gasLimit?: string;
    gasPrice?: string;
  }
  export interface RawTransferTransaction<T = any> {
    amount: string;
    asset: AssetTypes.Asset;
    from: VaultTypes.AccountObject;
    to: string;
    chainId: string;
    transactionFee: string;
    rawData?: T;
    gasLimit?: string;
    gasPrice?: string;
    expirationTimestamp?: string;
  }
}
export namespace VaultTypes {
  export interface AccountObject {
    address?: string;
    publicKeyHex?: string;
    privateKeyHex: string;
  }
  export interface AccountInfo {
    index: number;
    name: string;
    address: string;
    derivationPath: string;
    publicKey?: string;
    display: boolean;
  }

  export type AccountProviders = Types.Object<{
    accountActivated: string;
    accounts: Types.Object<AccountInfo>;
  }>;
}

export namespace NetworkTypes {
  export interface Network {
    chainId: string;
    name: string;
    nodeURL: string;
    faucetURL: string;
    explorerURL: string;
    nativeToken: string;
    type: "testnet" | "mainnet" | "devnet";
  }
  export type NetworkData = {
    data: Types.Object<Network>;
    name: string;
    url: string;
  };
  export type NetworkByProviders = Record<ProviderEnums.Provider, NetworkData>;
}
