import { AssetTypes } from '@nixjs23n6/utilities-adapter'

export abstract class BaseProvider {
    abstract getAssets(chainId: string, address: string): Promise<AssetTypes.Asset[]>
    abstract getNativeAssetBalance(chainId: string, address: string): Promise<AssetTypes.AssetAmount>
    abstract getAssetBalances(chainId: string, address: string): Promise<AssetTypes.AssetAmount[]>
    abstract getNFTs(chainId: string, address: string): Promise<AssetTypes.NFT[]>
    abstract getNativeCoinInfo(): AssetTypes.NativeCoin
    abstract getAssetVerified(chainId: string): Promise<AssetTypes.Asset[]>
}
