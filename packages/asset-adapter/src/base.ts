import { BaseTypes } from './types'

export abstract class BaseProvider {
    abstract getAssets(nodeURL: string, address: string): Promise<BaseTypes.Asset[]>
    abstract getAssetBalances(nodeURL: string, address: string): Promise<BaseTypes.AssetAmount[]>
    abstract getNFTs(nodeURL: string, address: string): Promise<BaseTypes.NFT[]>
}
