import { AssetTypes, EthereumUtil } from '@nixjs23n6/utilities-adapter'

export const DefaultAsset = (chainId: string) =>
    ({
        assetId: EthereumUtil.AssetIdByChainId[chainId],
        name: 'ETH',
        symbol: 'ETH Coin',
        decimals: EthereumUtil.BaseDecimals,
        logoUrl: EthereumUtil.BaseIconURL,
        isNative: true,
    } as AssetTypes.Asset)

export const DefaultAssetBalance = (chainId: string) =>
    ({
        assetId: EthereumUtil.AssetIdByChainId[chainId],
        amount: '0',
    } as AssetTypes.AssetAmount)
