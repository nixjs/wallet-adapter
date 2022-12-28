export namespace AssetAdapterTypes {
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
}
