export namespace AssetAdapterTypes {
    export type MoveAssetData = { address: string }
    export type MoveAsset = {
        kind: 'move'
        data: MoveAssetData
    }

    export type EVMAssetData = { address: string; contractAddress: Array<string> }
    export type EVMAsset = {
        kind: 'eth'
        data: EVMAssetData
    }

    export type AssetRequest = MoveAsset | EVMAsset
}
