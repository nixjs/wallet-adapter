import { HexString } from '../HexString'
import { TransactionEnums } from '../enums'
import { VaultTypes } from './vault'
import { AssetTypes } from './asset'

export namespace TransactionTypes {
    export type RawTxSigning = {
        data: any
    }

    export type UnsignedTransaction = {
        data: HexString
    }

    export type SignedTransaction = {
        signature: HexString
        data: HexString
    }

    export type SignedMessage = {
        signature: HexString
        publicKey: HexString
    }

    export interface Transaction {
        from: string
        to: string
        gasFee: number
        hash: string
        timestamp: number | null
        status: TransactionEnums.TransactionStatus
        type: TransactionEnums.TransactionType
        data: TransactionObject
        version?: number
    }
    export type TransactionObject = CoinObject | NftObject | ScriptObject | RegisterAssetObject
    export type CoinObject = {
        type: 'coin' | 'token'
        symbol: string
        balance: string
    }
    export type NftObject = {
        type: 'nft' | 'collection'
        name: string
        description: string
        url: string
    }
    export type ScriptObject = {
        overview: string
        [data: string]: any
    }
    export type RegisterAssetObject = {
        assetId: string
    }

    export interface TransferRequest {
        amount: string
        assetId: string
        from: VaultTypes.AccountObject
        to: string
        chainId: string
        gasLimit?: string
        gasPrice?: string
    }
    export interface SimulateTransaction<T = any> {
        from: VaultTypes.AccountObject
        to: string
        chainId: string
        transactionFee: string
        rawData?: T
        gasLimit?: string
        gasPrice?: string
        expirationTimestamp?: string
        transactionType: 'transfer' | 'script' | 'transfer-nft'
    }
    export interface RawTransferTransaction {
        amount: string
        asset: AssetTypes.Asset
    }
    export interface RawTransferNFTTransaction {
        amount: string
        asset: AssetTypes.Nft
    }
    export interface RegisterAssetTransaction {
        asset: AssetTypes.Asset
        type: 'gas' | 'none'
    }
    export interface GasFeeInfo {
        title: string
        description: string
        eta: string
    }
}
