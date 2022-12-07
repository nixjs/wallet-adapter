import { Interfaces, Types } from "@nixjs23n6/types";
import {
  ProviderEnums,
  AptosUtil,
  Helper,
  AssetTypes,
} from "@nixjs23n6/utilities-adapter";
import { RateLimit } from "async-sema";
import {
  AptosClient,
  TokenClient,
  Types as AptosTypes,
  TokenTypes,
} from "aptos";
import { AptosApiRequest } from "./api";
import { DefaultAsset, DefaultAssetBalance } from "./const";
import { RawCoinInfo } from "./types";
import { BaseProvider } from "../base";

export class AptosAsset extends BaseProvider {
  public get type(): ProviderEnums.Provider {
    return ProviderEnums.Provider.APTOS;
  }

  async getAssets(
    nodeURL: string,
    address: string
  ): Promise<AssetTypes.Asset[]> {
    try {
      let assets: AssetTypes.Asset[] = [];
      if (nodeURL && address) {
        const rawAssetRes = await AptosApiRequest.getAssetListVerified(nodeURL);
        const rawCoinInfo: Record<string, RawCoinInfo> = {};
        if ([200, 201].includes(rawAssetRes.status) && rawAssetRes.data) {
          for (let i = 0; i < rawAssetRes.data.length; i += 1) {
            Object.assign(rawCoinInfo, {
              [`0x1::coin::CoinStore<${rawAssetRes.data[i].token_type.type}>`]:
                rawAssetRes.data[i],
            });
          }
        }
        const resources =
          await AptosUtil.AptosApiRequest.fetchAccountResourcesApi(
            nodeURL,
            address
          );

        if (
          resources.status === "SUCCESS" &&
          resources.data &&
          resources.data.length > 0
        ) {
          const ourResources = resources.data
            .map((d) => ({
              ...d,
              address: AptosApiRequest.getCoinAddress(d.type) || "",
            }))
            .filter(
              (n) =>
                n.type.includes(AptosUtil.BaseCoinStore) ||
                n.type.includes(AptosUtil.AptosTokenStore)
            );
          const groupAddress = Helper.groupBy(ourResources, (d) => d.address);
          const newResourceByAddress = Object.keys(groupAddress);
          const limit = RateLimit(8);
          const addressInfo: Types.Object<AptosTypes.MoveResource[]> = {};
          for (let i = 0; i < newResourceByAddress.length; i++) {
            const address = newResourceByAddress[i];
            if (address && address.length > 0) {
              await limit();
              const coinResourcesResponse: Interfaces.ResponseData<
                AptosTypes.MoveResource[]
              > = await AptosUtil.AptosApiRequest.fetchAccountResourcesApi(
                nodeURL,
                address
              );
              if (
                coinResourcesResponse.status === "SUCCESS" &&
                coinResourcesResponse.data
              ) {
                Object.assign(addressInfo, {
                  [address]: coinResourcesResponse.data,
                });
              }
            }
          }
          if (Object.keys(addressInfo).length > 0) {
            const limit2 = RateLimit(8);
            for (let j = 0; j < ourResources.length; j++) {
              const target = ourResources[j];
              await limit2();
              const coinAddress: Types.Undefined<string> =
                await AptosApiRequest.getCoinAddress(target.type);
              const coinAddressType: Types.Undefined<string> =
                await AptosApiRequest.getCoinAddressType(target.type);
              if (
                coinAddress &&
                coinAddressType &&
                addressInfo[target.address]
              ) {
                const coinInfo = addressInfo[target.address].find((e) =>
                  e.type.includes(coinAddressType)
                )?.data as {
                  decimals: number;
                  name: string;
                  symbol: string;
                };
                if (coinInfo) {
                  let coingeckoId = "";
                  let logoUrl = "";
                  if (
                    Object.keys(rawCoinInfo).length > 0 &&
                    rawCoinInfo[target.type] &&
                    Object.keys(rawCoinInfo[target.type]).length > 0
                  ) {
                    const { coingecko_id, logo_url } = rawCoinInfo[target.type];
                    coingeckoId = coingecko_id;
                    logoUrl = logo_url;
                  }
                  const asset: AssetTypes.Asset = {
                    assetId: target.type,
                    name: coinInfo.name,
                    symbol: coinInfo.symbol,
                    decimals: coinInfo.decimals,
                    logoUrl,
                    coingeckoId,
                    isNative: target.type === AptosUtil.AptosCoinStore,
                  };
                  assets.push(asset);
                }
              }
            }
          }
        }
      } else assets = [DefaultAsset];
      return Helper.reduceNativeCoin(assets, AptosUtil.AptosCoinStore);
    } catch (error) {
      console.log("[getAssets]", error);
      return [DefaultAsset];
    }
  }

  async getAssetBalances(
    nodeURL: string,
    address: string
  ): Promise<AssetTypes.AssetAmount[]> {
    try {
      let balances: AssetTypes.AssetAmount[] = [];
      if (nodeURL && address) {
        const resources =
          await AptosUtil.AptosApiRequest.fetchAccountResourcesApi(
            nodeURL,
            address
          );
        if (
          resources.status === "SUCCESS" &&
          resources.data &&
          resources.data.length > 0
        ) {
          const ourResources = resources.data.filter((n) =>
            n.type.includes(AptosUtil.BaseCoinStore)
          );
          for (let index = 0; index < ourResources.length; index++) {
            const resource = ourResources[index];
            balances.push({
              amount: String(
                parseFloat(
                  (resource.data as { coin: { value: string } }).coin.value
                )
              ),
              assetId: resource.type,
            } as AssetTypes.AssetAmount);
          }
        }
      } else balances = [DefaultAssetBalance];
      return balances;
    } catch (error) {
      console.log("[getAssetBalances]", error);
      return [DefaultAssetBalance];
    }
  }

  async getNFTs(nodeURL: string, address: string): Promise<AssetTypes.NFT[]> {
    try {
      const NFTs: AssetTypes.NFT[] = [];
      if (nodeURL && address) {
        const resources =
          await AptosUtil.AptosApiRequest.fetchAccountResourcesApi(
            nodeURL,
            address
          );
        if (
          resources.status === "SUCCESS" &&
          resources.data &&
          resources.data.length > 0
        ) {
          const resource = resources.data.find((n) =>
            n.type.includes(AptosUtil.AptosTokenStore)
          );
          if (
            resource?.data &&
            (resource.data as any)?.deposit_events &&
            Number((resource.data as any)?.deposit_events.counter) > 0
          ) {
            const depEvents: Interfaces.ResponseData<
              (AptosTypes.Event & { version: string })[]
            > = await AptosUtil.AptosApiRequest.fetchEventsByEventHandleApi(
              nodeURL,
              address,
              AptosUtil.AptosTokenStore,
              AptosUtil.AptosEnums.TxEvent.DEPOSIT_EVENT,
              1000,
              0
            );
            const withdEvents: Interfaces.ResponseData<
              (AptosTypes.Event & { version: string })[]
            > = await AptosUtil.AptosApiRequest.fetchEventsByEventHandleApi(
              nodeURL,
              address,
              AptosUtil.AptosTokenStore,
              AptosUtil.AptosEnums.TxEvent.WITHDRAW_EVENT,
              1000,
              0
            );
            const aptosClient = new AptosClient(nodeURL);
            const tokenClient = new TokenClient(aptosClient);
            if (
              depEvents.status === "SUCCESS" &&
              depEvents.data &&
              withdEvents.status === "SUCCESS" &&
              withdEvents.data
            ) {
              const events = AptosApiRequest.getNFTsFromEvent(
                depEvents.data,
                withdEvents.data
              );
              const limit = RateLimit(8);
              for (let i = 0; i < events.length; i++) {
                const element = events[i];
                const data = element.data.id.token_data_id;
                await limit();
                const tokenData: TokenTypes.TokenData =
                  await tokenClient.getTokenData(
                    data.creator,
                    data.collection,
                    data.name
                  );
                if (tokenData) {
                  const { description, name, uri } = tokenData;
                  NFTs.push({
                    id: Helper.stringToSlug(data.name),
                    collection: data.collection,
                    name,
                    description,
                    uri,
                  } as AssetTypes.NFT);
                }
              }
            }
          }
        }
      }
      return NFTs;
    } catch (error) {
      console.log("[getNFTs]", error);
      return [];
    }
  }
  getNativeCoinInfo(): AssetTypes.NativeCoin {
    return {
      assetId: AptosUtil.AptosCoinStore,
      decimals: AptosUtil.BaseDecimals,
      url: AptosUtil.BaseIconURL,
      name: "Aptos",
      symbol: "APT",
    };
  }
  async getAssetVerified(nodeURL: string): Promise<AssetTypes.Asset[]> {
    const rawAssetRes = await AptosApiRequest.getAssetListVerified(nodeURL);
    if ([200, 201].includes(rawAssetRes.status) && rawAssetRes.data) {
      const assets = rawAssetRes.data;
      return assets.map(
        (a) =>
          ({
            assetId: `0x1::coin::CoinStore<${a.token_type.type}>`,
            decimals: a.decimals,
            name: a.name,
            symbol: a.symbol,
            logoUrl: a.logo_url,
            isNative:
              `0x1::coin::CoinStore<${a.token_type.type}>` ===
              AptosUtil.AptosCoinStore,
            coingeckoId: a.coingecko_id,
          } as AssetTypes.Asset)
      );
    }
    return [];
  }
}
