import { Types } from '@nixjs23n6/types'

export namespace TokenDateTypes {
    export type MoveAssetData = { address: string }
    export type MoveAsset = {
        kind: 'move'
        data: MoveAssetData
    }

    export type EthereumAssetData = { address: string; contractAddress: Array<string> }
    export type EthereumAsset = {
        kind: 'eth'
        data: EthereumAssetData
    }

    export type AssetRequest = MoveAsset | EthereumAsset

    export interface Token {
        chainId: number
        address: string
        name: string
        symbol: string
        decimals: number
        logoURI: string
        extensions?: Types.Object<string>
    }
}
