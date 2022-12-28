import { Types } from '@nixjs23n6/types'
import * as ethers from 'ethers'

export namespace EvmTypes {
    export interface ERC20 {
        chainId: string | number
        address: string
        name: string
        symbol: string
        decimals: number
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
}
