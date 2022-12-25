import { AssetTypes } from '@nixjs23n6/utilities-adapter'
import { AssetAdapterTypes } from './types'

export abstract class BaseProvider {
    abstract getAssets(chainId: string, request: AssetAdapterTypes.AssetRequest): Promise<AssetTypes.Asset[]>
    abstract getNativeAssetBalance(chainId: string, address: string): Promise<AssetTypes.AssetAmount>
    abstract getAssetBalances(chainId: string, request: AssetAdapterTypes.AssetRequest): Promise<AssetTypes.AssetAmount[]>
    abstract getNFTs(chainId: string, address: string): Promise<AssetTypes.NFT[]>
    abstract getNativeCoinInfo(): AssetTypes.NativeCoin
    abstract getAssetVerified(chainId: string): Promise<AssetTypes.Asset[]>
}
