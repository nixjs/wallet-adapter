import { AssetTypes, SUIUtil } from '@nixjs23n6/utilities-adapter'

export const DefaultAsset: AssetTypes.Asset = {
    assetId: SUIUtil.SUICoinStore,
    name: 'SUI',
    symbol: 'SUI Coin',
    decimals: 9,
    logoUrl: SUIUtil.BaseIconURL,
    isNative: true,
}
export const DefaultAssetBalance: AssetTypes.AssetAmount = {
    assetId: SUIUtil.SUICoinStore,
    amount: '0',
}
