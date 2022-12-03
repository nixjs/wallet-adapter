import { AssetTypes } from "@nixjs23n6/utilities-adapter";

export abstract class BaseProvider {
  abstract getAssets(
    nodeURL: string,
    address: string
  ): Promise<AssetTypes.Asset[]>;
  abstract getAssetBalances(
    nodeURL: string,
    address: string
  ): Promise<AssetTypes.AssetAmount[]>;
  abstract getNFTs(nodeURL: string, address: string): Promise<AssetTypes.NFT[]>;
  abstract getNativeCoinInfo(): AssetTypes.NativeCoin;
}
