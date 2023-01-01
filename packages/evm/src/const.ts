import { AssetTypes, EvmUtil } from '@nixjs23n6/utilities-adapter'

export const DefaultAsset: AssetTypes.Asset = {
    assetId: EvmUtil.CoinSymbol,
    name: 'ETH',
    symbol: 'ETH',
    decimals: EvmUtil.BaseDecimals,
    logoUrl: EvmUtil.BaseIconURL,
    isNative: true,
}
export const DefaultAssetBalance: AssetTypes.AssetAmount = {
    assetId: EvmUtil.CoinSymbol,
    amount: '0',
}
