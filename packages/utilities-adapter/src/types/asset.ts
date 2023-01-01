export namespace AssetTypes {
    export interface NativeCoin {
        assetId: string
        decimals: number
        url: string
        symbol: string
        name: string
        coingeckoId?: string
    }
    export interface Asset {
        // 0x1::coin::CoinStore<0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::AnimeCoin::ANI> or smart contract address
        assetId: string
        name: string
        symbol: string
        decimals: number
        logoUrl: string
        coingeckoId?: string
        isNative: boolean
    }
    export interface AssetAmount {
        amount: string
        assetId: string
    }

    export interface NFT {
        id: string
        collection: string
        creator: string
        name: string
        description: string
        uri: string
        metadata?: NFTMetadata
    }
    export interface NFTMetadata {
        [key: string]: any
    }
}
