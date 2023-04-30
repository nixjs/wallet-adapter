import { ProviderEnums, AssetTypes, SUIUtil, Helper, PrimitiveHexString, NftEnums } from '@nixjs23n6/utilities-adapter'
import { Connection, JsonRpcProvider, SuiMoveObject, SUI_TYPE_ARG, Coin, getObjectDisplay } from '@mysten/sui.js'
import uniqBy from 'lodash-es/uniqBy'
import { DefaultAsset, DefaultAssetBalance } from './const'
import { BaseProvider } from '../base'

export type CoinObject = {
    objectId: string
    symbol: string
    balance: bigint
    object: SuiMoveObject
}

export type GetOwnedObjParams = { network: any; address: PrimitiveHexString }

export class SUIAsset extends BaseProvider {
    public get type(): ProviderEnums.Provider {
        return ProviderEnums.Provider.SUI
    }

    async getAssets(chainId: string, address: PrimitiveHexString): Promise<AssetTypes.Asset[]> {
        try {
            const nodeURL = SUIUtil.BaseNodeByChainInfo[chainId]
            const assets: AssetTypes.Asset[] = [DefaultAsset]
            const provider = new JsonRpcProvider(
                new Connection({
                    fullnode: nodeURL,
                })
            )
            if (nodeURL && address) {
                const coinsResp = await provider.getAllCoins({
                    owner: address,
                })
                if (!coinsResp || coinsResp?.data.length === 0) throw new Error('Asset not found')

                const result = uniqBy(coinsResp.data, 'coinType').map(({ coinType }) => {
                    const symbol = Coin.getCoinSymbol(coinType)
                    const isSui = coinType === SUI_TYPE_ARG
                    return {
                        assetId: coinType,
                        name: symbol.toUpperCase(),
                        symbol,
                        decimals: 0,
                        logoUrl: SUIUtil.BaseIconURL,
                        isNative: isSui,
                    } as AssetTypes.Asset
                })
                const resultWithDecimals = await Promise.all(
                    result.map(async (e) => ({
                        ...e,
                        decimals: await this.getDecimals(e.assetId, provider),
                    }))
                )
                if (result.length > 0) return Helper.reduceNativeCoin(resultWithDecimals as any, SUIUtil.SUICoinStore)
            }
            return assets
        } catch (error) {
            return [DefaultAsset]
        }
    }

    async getDecimals(coinType: string, provider: JsonRpcProvider) {
        const isSui = coinType === SUI_TYPE_ARG
        let ourDecimals = 0
        if (isSui) {
            ourDecimals = SUIUtil.BaseDecimals
        } else
            ourDecimals =
                (
                    await provider.getCoinMetadata({
                        coinType: coinType,
                    })
                )?.decimals || 0
        return ourDecimals
    }

    async getNativeAssetBalance(chainId: string, address: PrimitiveHexString): Promise<AssetTypes.AssetAmount> {
        try {
            const nodeURL = SUIUtil.BaseNodeByChainInfo[chainId]
            if (nodeURL && address) {
                const provider = new JsonRpcProvider(
                    new Connection({
                        fullnode: nodeURL,
                    })
                )
                const balance = await provider.getBalance({
                    owner: address,
                    coinType: SUI_TYPE_ARG,
                })
                return {
                    amount: balance.totalBalance,
                    assetId: SUI_TYPE_ARG,
                }
            }
            return DefaultAssetBalance
        } catch (error) {
            return DefaultAssetBalance
        }
    }

    async getAssetBalances(chainId: string, address: PrimitiveHexString): Promise<AssetTypes.AssetAmount[]> {
        try {
            const nodeURL = SUIUtil.BaseNodeByChainInfo[chainId]
            if (nodeURL && address) {
                const provider = new JsonRpcProvider(
                    new Connection({
                        fullnode: nodeURL,
                    })
                )
                const balances = await provider.getAllBalances({
                    owner: address,
                })
                return balances.map((b) => ({
                    amount: b.totalBalance,
                    assetId: b.coinType,
                }))
            }
            return [DefaultAssetBalance]
        } catch (error) {
            return [DefaultAssetBalance]
        }
    }

    async getNfts(chainId: string, address: PrimitiveHexString): Promise<AssetTypes.Nft[]> {
        try {
            const nodeURL = SUIUtil.BaseNodeByChainInfo[chainId]
            const nfts: AssetTypes.Nft[] = []
            if (nodeURL && address) {
                const provider = new JsonRpcProvider(
                    new Connection({
                        fullnode: nodeURL,
                    })
                )
                const objects = await provider.getOwnedObjects({
                    owner: address,
                    options: { showType: true, showDisplay: true },
                })
                if (!objects || !objects.data || objects.data.length === 0) return []
                for (let i = 0; i < objects.data.length; i++) {
                    const target = objects.data[i]
                    if (target.data) {
                        const display = getObjectDisplay(target)
                        if (display && display.data) {
                            const {
                                data: { name, description, creator, image_url, link, project_url },
                            } = display
                            nfts.push({
                                id: target.data?.objectId,
                                name,
                                collection: '',
                                creator,
                                description,
                                type: NftEnums.NftTokenType.UNKNOWN,
                                uri: image_url || link || project_url,
                                metadata: target.data,
                            })
                        }
                    }
                }
            }
            return nfts
        } catch (error) {
            return []
        }
    }

    async getObject(objectId: string, provider: JsonRpcProvider) {
        return provider.getObject({
            id: objectId,
            options: {
                showType: true,
                showContent: true,
                showOwner: true,
                showDisplay: true,
            },
        })
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
