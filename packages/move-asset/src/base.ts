import { AssetTypes, PrimitiveHexString } from '@nixjs23n6/utilities-adapter'

export abstract class BaseProvider {
    abstract getAssets(chainId: string, address: PrimitiveHexString): Promise<AssetTypes.Asset[]>
    abstract getNativeAssetBalance(chainId: string, address: PrimitiveHexString): Promise<AssetTypes.AssetAmount>
    abstract getAssetBalances(chainId: string, address: PrimitiveHexString): Promise<AssetTypes.AssetAmount[]>
    abstract getNfts(chainId: string, address: PrimitiveHexString): Promise<AssetTypes.Nft[]>
    abstract getNativeCoinInfo(): AssetTypes.NativeCoin
    abstract getAssetVerified(chainId: string): Promise<AssetTypes.Asset[]>
}
