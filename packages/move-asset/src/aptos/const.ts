import { AssetTypes, AptosUtil } from '@nixjs23n6/utilities-adapter'

export const DefaultAsset: AssetTypes.Asset = {
    assetId: AptosUtil.AptosCoinStore,
    name: 'Aptos Coin',
    symbol: 'APT',
    decimals: 8,
    logoUrl: AptosUtil.BaseIconURL,
    coingeckoId: 'aptos',
    isNative: true,
}
export const DefaultAssetBalance: AssetTypes.AssetAmount = {
    assetId: AptosUtil.AptosCoinStore,
    amount: '0',
}
