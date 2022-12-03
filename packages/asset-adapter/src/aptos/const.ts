import { AssetTypes, AptosUtil } from "@nixjs23n6/utilities-adapter";

export const DefaultAsset: AssetTypes.Asset = {
  assetId: "0x1::aptos_coin::AptosCoin",
  name: "Aptos",
  symbol: "APT",
  decimals: 8,
  logoUrl: AptosUtil.BaseIconURL,
  coingeckoId: "aptos",
};
export const DefaultAssetBalance: AssetTypes.AssetAmount = {
  assetId: "0x1::aptos_coin::AptosCoin",
  amount: "0",
};
