import { Types } from '@nixjs23n6/types'
import * as ethers from 'ethers'
import { PrimitiveHexString, TransactionEnums } from '@nixjs23n6/utilities-adapter'

export namespace EvmTypes {
    export interface ConfigData {
        apiKey: string
        endpoint: string
        prefix?: string
    }

    export interface Config {
        [chainId: PrimitiveHexString]: ConfigData
    }

    export interface ERC20 {
        chainId: PrimitiveHexString | number
        address: PrimitiveHexString
        name: string
        symbol: string
        decimals: number | string
        logoURI: string
        extensions?: Types.Object<string>
    }

    export interface LogDescription {
        name: string
        args: Record<string, any>
        original: ethers.utils.LogDescription
    }

    export interface InputData {
        name: string
        args: Record<string, any>
        original: ethers.ethers.utils.TransactionDescription
    }
    export interface TransactionRequest extends ethers.providers.TransactionRequest {}
    export interface SimulateTransactionNative {
        kind: 'native'
        params: { raw: ethers.providers.TransactionRequest; speed: TransactionEnums.GasPriceTypes }
    }
    export interface SimulateTransactionContract {
        kind: 'contract'
        params: {
            abi: ethers.ContractInterface
            contractAddress: PrimitiveHexString
            method: string
            args: any[]
            speed: TransactionEnums.GasPriceTypes
        }
    }

    export interface GasCost {
        gasPrice?: string
        maxFeePerGas?: string
        maxPriorityFeePerGas?: string
        eip1559?: boolean
        gasLimit: string
        estimateFee: string
    }
}
