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

export const EvmDecimal = {
    WEI: 0,
    K_WEI: 3,
    M_WEI: 6,
    G_WEI: 9,
    T_WEI: 12,
    P_WEI: 15,
    ETHER: 18,
}
