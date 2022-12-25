import { Types } from '@nixjs23n6/types'
import { ProviderEnums, EthereumUtil, AssetTypes } from '@nixjs23n6/utilities-adapter'
import { getDefaultProvider, providers } from 'ethers'
import { DefaultAsset, DefaultAssetBalance } from './const'
import { BaseProvider } from '../base'
import { AssetAdapterTypes } from '../types'
import { EthereumApiRequest } from './api'

export class EthereumAsset extends BaseProvider {
    public get type(): ProviderEnums.Provider {
        return ProviderEnums.Provider.ETHEREUM
    }

    getProvider(chainId: string): providers.BaseProvider {
        const nodeURL = EthereumUtil.BaseNodeByChainInfo[chainId]
        const provider =
            chainId === 'ETH' ? getDefaultProvider(nodeURL) : new providers.JsonRpcProvider('https://www.ethercluster.com/etc', 'classic')
        return provider
    }

    async getAssets(chainId: string, request: AssetAdapterTypes.EthereumAsset): Promise<AssetTypes.Asset[]> {
        try {
            const assets: AssetTypes.Asset[] = []
            const { contractAddress, address } = request.data
            let list: string[] = contractAddress
            if (contractAddress.length === 0) {
                const erc20 = await EthereumApiRequest.getAllERC20TokensBalance(address)
                list = Object.keys(erc20)
            }

            if (list.length === 0) return [DefaultAsset(chainId)]

            assets.push(DefaultAsset(chainId))
            for (let i = 0; i < list.length; i++) {
                const address = list[i]
                const token = EthereumApiRequest.getTokenInfo(address)
                if (!token) return [DefaultAsset(chainId)]
                const { decimals, logoURI, name, symbol } = token
                assets.push({
                    assetId: address,
                    decimals,
                    isNative: false,
                    logoUrl: logoURI,
                    name,
                    symbol,
                } as AssetTypes.Asset)
            }
            return assets
        } catch (error) {
            console.log('[getAssets]', error)
            return [DefaultAsset(chainId)]
        }
    }

    async getNativeAssetBalance(chainId: string, address: string): Promise<AssetTypes.AssetAmount> {
        try {
            const amount = await EthereumApiRequest.getBalance(chainId, address)
            return {
                assetId: '',
                amount,
            }
        } catch (error) {
            return DefaultAssetBalance(chainId)
        }
    }

    async getAssetBalances(chainId: string, request: AssetAdapterTypes.EthereumAsset): Promise<AssetTypes.AssetAmount[]> {
        try {
            const { contractAddress, address } = request.data
            const balances: AssetTypes.AssetAmount[] = []

            let list: Types.Object<string> = {}
            if (contractAddress.length === 0) {
                list = await EthereumApiRequest.getAllERC20TokensBalance(address)
            } else {
                list = await EthereumApiRequest.getERC20TokenBalanceList(chainId, request.data.address, request.data.contractAddress)
            }
            if (!list || Object.keys(list).length === 0) return [DefaultAssetBalance(chainId)]
            for (let i = 0; i < Object.keys(list).length; i++) {
                const target = Object.keys(list)[i]
                balances.push({
                    amount: list[target],
                    assetId: target,
                })
            }
            return balances
        } catch (error) {
            console.log('[getAssetBalances]', error)
            return [DefaultAssetBalance(chainId)]
        }
    }

    async getNFTs(chainId: string, address: string): Promise<AssetTypes.NFT[]> {
        try {
            return []
        } catch (error) {
            console.log('[getNFTs]', error)
            return []
        }
    }

    getNativeCoinInfo(): AssetTypes.NativeCoin {
        return {
            assetId: EthereumUtil.CoinSymbol,
            decimals: EthereumUtil.BaseDecimals,
            url: EthereumUtil.BaseIconURL,
            name: 'Ether',
            symbol: EthereumUtil.CoinSymbol,
            coingeckoId: 'ethereum',
        }
    }

    async getAssetVerified(chainId: string): Promise<AssetTypes.Asset[]> {
        try {
            return EthereumApiRequest.getTokens()
                .filter((t) => t.chainId === Number(chainId))
                .map((m) => {
                    const { address, chainId, decimals, logoURI, name, symbol } = m
                    const chainIdHex = `0x${chainId.toString(16)}`
                    return {
                        assetId: address,
                        decimals: decimals,
                        isNative: EthereumUtil.AssetIdByChainId[chainIdHex] ? true : false,
                        logoUrl: logoURI,
                        name,
                        symbol,
                    } as AssetTypes.Asset
                })
        } catch (error) {
            return []
        }
    }
}
