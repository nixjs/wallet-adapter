import { BaseEnums } from './enums'

export namespace BaseTypes {
    export interface Transaction {
        from: string
        to: string
        gasFee: number
        hash: string
        timestamp: number | null
        status: BaseEnums.TransactionStatus
        type: BaseEnums.TransactionType
        data: TransactionObject
        version?: number
    }
    export type TransactionObject = CoinObject | NFTObject | ScriptObject
    export type CoinObject = {
        type: 'coin' | 'token'
        symbol: string
        balance: string
    }

    export type NFTObject = {
        type: 'nft' | 'collection'
        name: string
        description: string
        url: string
    }

    export type ScriptObject = {
        [data: string]: any
    }
}
