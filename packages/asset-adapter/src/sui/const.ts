import { AssetTypes, SUIUtil } from "@nixjs23n6/utilities-adapter";

export const DefaultAsset: AssetTypes.Asset = {
  assetId: SUIUtil.SUICoinStore,
  name: "SUI",
  symbol: "SUI",
  decimals: 10,
  logoUrl: SUIUtil.BaseIconURL,
  isNative: true,
};
export const DefaultAssetBalance: AssetTypes.AssetAmount = {
  assetId: SUIUtil.SUICoinStore,
  amount: "0",
};
