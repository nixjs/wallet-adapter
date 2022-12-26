import { Types } from '@nixjs23n6/types'
import { ProviderEnums, EVMUtil, AssetTypes } from '@nixjs23n6/utilities-adapter'
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
        const nodeURL = EVMUtil.BaseNodeByChainInfo[chainId]
        const provider =
            chainId === 'ETH' ? getDefaultProvider(nodeURL) : new providers.JsonRpcProvider('https://www.ethercluster.com/etc', 'classic')
        return provider
    }

    async getAssets(chainId: string, request: AssetAdapterTypes.EthereumAsset): Promise<AssetTypes.Asset[]> {
        try {
            console.warn(
                'This method only support has contract address list. If you want to fetch get ERC20 token by wallet, you can use the @nixjs23n6/evm-token-data package'
            )
            const assets: AssetTypes.Asset[] = []
            const { contractAddress } = request.data
            if (contractAddress.length > 0) {
                assets.push(DefaultAsset)
                for (let i = 0; i < contractAddress.length; i++) {
                    const address = contractAddress[i]
                    const token = EthereumApiRequest.getTokenInfo(address)
                    if (!token) return [DefaultAsset]
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
            }
            return assets
        } catch (error) {
            console.log('[getAssets]', error)
            return [DefaultAsset]
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
            return DefaultAssetBalance
        }
    }

    async getAssetBalances(chainId: string, request: AssetAdapterTypes.EthereumAsset): Promise<AssetTypes.AssetAmount[]> {
        try {
            console.warn(
                'This method only support has contract address list. If you want to get ERC20 token balance by wallet, you can use the @nixjs23n6/evm-token-data package'
            )
            const { contractAddress } = request.data
            const balances: AssetTypes.AssetAmount[] = []

            let list: Types.Object<string> = {}
            if (contractAddress.length > 0) {
                list = await EthereumApiRequest.getERC20TokenBalanceList(chainId, request.data.address, request.data.contractAddress)

                if (!list || Object.keys(list).length === 0) return [DefaultAssetBalance]
                for (let i = 0; i < Object.keys(list).length; i++) {
                    const target = Object.keys(list)[i]
                    balances.push({
                        amount: list[target],
                        assetId: target,
                    })
                }
            }
            return balances
        } catch (error) {
            console.log('[getAssetBalances]', error)
            return [DefaultAssetBalance]
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getNFTs(_chainId: string, _address: string): Promise<AssetTypes.NFT[]> {
        try {
            console.warn('Use the @nixjs23n6/evm-token-data package to get NFTs by wallet')
            return []
        } catch (error) {
            console.log('[getNFTs]', error)
            return []
        }
    }

    getNativeCoinInfo(): AssetTypes.NativeCoin {
        return {
            assetId: EVMUtil.CoinSymbol,
            decimals: EVMUtil.BaseDecimals,
            url: EVMUtil.BaseIconURL,
            name: 'Ether',
            symbol: EVMUtil.CoinSymbol,
            coingeckoId: 'ethereum',
        }
    }

    async getAssetVerified(chainId: string): Promise<AssetTypes.Asset[]> {
        try {
            return EVMUtil.Erc20Tokens.filter((t) => t.chainId === Number(chainId)).map((m) => {
                const { address, decimals, logoURI, name, symbol } = m
                return {
                    assetId: address,
                    decimals: decimals,
                    isNative: EVMUtil.CoinSymbol === symbol,
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
