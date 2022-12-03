import {
  ProviderEnums,
  AssetTypes,
  SUIUtil,
} from "@nixjs23n6/utilities-adapter";
import { JsonRpcProvider, SuiMoveObject } from "@mysten/sui.js";
import uniqBy from "lodash-es/uniqBy";
import { SUIApiRequest } from "./api";
import { BaseProvider } from "../base";

export type CoinObject = {
  objectId: string;
  symbol: string;
  balance: bigint;
  object: SuiMoveObject;
};

export type GetOwnedObjParams = { network: any; address: string };

export class SUIAsset extends BaseProvider {
  public get type(): ProviderEnums.Provider {
    return ProviderEnums.Provider.SUI;
  }

  async getAssets(
    nodeURL: string,
    address: string
  ): Promise<AssetTypes.Asset[]> {
    try {
      let assets: AssetTypes.Asset[] = [];
      const query = new JsonRpcProvider(nodeURL, {
        skipDataValidation: false,
      });
      if (nodeURL && address) {
        const coins = await SUIApiRequest.getOwnedCoins(query, address);
        assets = uniqBy(coins, "symbol").map(
          (c) =>
            ({
              assetId: c.object.type,
              name: c.symbol,
              symbol: c.symbol,
            } as AssetTypes.Asset)
        );
      }
      return assets;
    } catch (error) {
      return [];
    }
  }

  async getAssetBalances(
    nodeURL: string,
    address: string
  ): Promise<AssetTypes.AssetAmount[]> {
    try {
      const balances: AssetTypes.AssetAmount[] = [];
      if (nodeURL && address) {
        const balances = await SUIApiRequest.getCoinsBalance(nodeURL, address);
        return balances;
      }
      return balances;
    } catch (error) {
      return [];
    }
  }

  async getNFTs(nodeURL: string, address: string): Promise<AssetTypes.NFT[]> {
    try {
      let NFTs: AssetTypes.NFT[] = [];
      if (nodeURL && address) {
        NFTs = await SUIApiRequest.getOwnedNfts(nodeURL, address);
      }
      return NFTs;
    } catch (error) {
      return [];
    }
  }
  getNativeCoinInfo(): AssetTypes.NativeCoin {
    return {
      decimals: SUIUtil.BaseDecimals,
      url: SUIUtil.BaseIconURL,
      name: "SUI",
      symbol: "SUI",
    };
  }
}
