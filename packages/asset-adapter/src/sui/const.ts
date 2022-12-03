import { AssetTypes, SUIUtil } from "@nixjs23n6/utilities-adapter";

export const DefaultAsset: AssetTypes.Asset = {
  assetId: "0x2::coin::Coin<0x2::sui::SUI>",
  name: "SUI",
  symbol: "SUI",
  decimals: 10,
  logoUrl: SUIUtil.BaseIconURL,
};
export const DefaultAssetBalance: AssetTypes.AssetAmount = {
  assetId: "0x2::coin::Coin<0x2::sui::SUI>",
  amount: "0",
};
