import { AssetTypes, EVMUtil } from '@nixjs23n6/utilities-adapter'

export const DefaultAsset: AssetTypes.Asset = {
    assetId: 'ETH',
    name: 'ETH',
    symbol: 'ETH Coin',
    decimals: EVMUtil.BaseDecimals,
    logoUrl: EVMUtil.BaseIconURL,
    isNative: true,
}

export const DefaultAssetBalance: AssetTypes.AssetAmount = {
    assetId: 'ETH',
    amount: '0',
}
