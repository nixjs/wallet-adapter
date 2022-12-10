import { ProviderEnums, AssetTypes, SUIUtil, Helper } from '@nixjs23n6/utilities-adapter'
import { JsonRpcProvider, SuiMoveObject } from '@mysten/sui.js'
import uniqBy from 'lodash-es/uniqBy'
import { SUIApiRequest } from './api'
import { DefaultAsset, DefaultAssetBalance } from './const'
import { BaseProvider } from '../base'

export type CoinObject = {
    objectId: string
    symbol: string
    balance: bigint
    object: SuiMoveObject
}

export type GetOwnedObjParams = { network: any; address: string }

export class SUIAsset extends BaseProvider {
    public get type(): ProviderEnums.Provider {
        return ProviderEnums.Provider.SUI
    }

    async getAssets(chainId: string, address: string): Promise<AssetTypes.Asset[]> {
        try {
            const nodeURL = SUIUtil.BaseNodeByChainInfo[chainId]
            const assets: AssetTypes.Asset[] = [DefaultAsset]
            const query = new JsonRpcProvider(nodeURL, {
                skipDataValidation: false,
            })
            if (nodeURL && address) {
                const coins = await SUIApiRequest.getOwnedCoins(query, address)
                const result = uniqBy(coins, 'symbol').map(
                    (c) =>
                        ({
                            assetId: c.object.type,
                            name: c.symbol,
                            symbol: c.symbol,
                            decimals: SUIUtil.BaseDecimals,
                            logoUrl: SUIUtil.BaseIconURL,
                            isNative: c.object.type === SUIUtil.SUICoinStore,
                        } as AssetTypes.Asset)
                )
                if (result.length > 0) return Helper.reduceNativeCoin(result, SUIUtil.SUICoinStore)
            }
            return assets
        } catch (error) {
            return [DefaultAsset]
        }
    }

    async getAssetBalances(chainId: string, address: string): Promise<AssetTypes.AssetAmount[]> {
        try {
            const nodeURL = SUIUtil.BaseNodeByChainInfo[chainId]
            let balances: AssetTypes.AssetAmount[] = []
            if (nodeURL && address) {
                balances = await SUIApiRequest.getCoinsBalance(nodeURL, address)
            } else balances = [DefaultAssetBalance]
            return balances
        } catch (error) {
            return [DefaultAssetBalance]
        }
    }

    async getNFTs(chainId: string, address: string): Promise<AssetTypes.NFT[]> {
        try {
            const nodeURL = SUIUtil.BaseNodeByChainInfo[chainId]
            let NFTs: AssetTypes.NFT[] = []
            if (nodeURL && address) {
                NFTs = await SUIApiRequest.getOwnedNfts(nodeURL, address)
            }
            return NFTs
        } catch (error) {
            return []
        }
    }
    getNativeCoinInfo(): AssetTypes.NativeCoin {
        return {
            assetId: SUIUtil.SUICoinStore,
            decimals: SUIUtil.BaseDecimals,
            url: SUIUtil.BaseIconURL,
            name: 'SUI',
            symbol: 'SUI',
        }
    }
    async getAssetVerified(nodeURL: string): Promise<AssetTypes.Asset[]> {
        return []
    }
}
