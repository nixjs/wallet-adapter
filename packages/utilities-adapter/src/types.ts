import { Types } from "@nixjs23n6/types";
import { TransactionEnums } from "./enums";

export namespace AssetTypes {
  export interface Asset {
    // 0x1::coin::CoinStore<0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::AnimeCoin::ANI> or smart contract address
    assetId: string;
    name: string;
    symbol: string;
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
    amount: string;
    metadata?: NFTMetadata;
  }
  export interface NFTMetadata {
    [key: string]: any;
  }
}
export namespace TransactionTypes {
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
