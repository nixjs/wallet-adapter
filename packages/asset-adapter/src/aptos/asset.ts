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
      const assets: AssetTypes.Asset[] = [DefaultAsset];
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
          const limit = RateLimit(5);
          for (let i = 0; i < newResourceByAddress.length; i++) {
            const address = newResourceByAddress[i];
            await limit;
            if (address && address.length > 0) {
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
                const ourResourcesFromGroup = groupAddress[address];
                for (let j = 0; j < ourResourcesFromGroup.length; j++) {
                  const resource = ourResourcesFromGroup[j];
                  const coinAddress: Types.Undefined<string> =
                    await AptosApiRequest.getCoinAddress(resource.type);
                  const coinAddressType: Types.Undefined<string> =
                    await AptosApiRequest.getCoinAddressType(resource.type);
                  if (coinAddress && coinAddressType) {
                    const coinInfo = coinResourcesResponse.data.find((e) =>
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
                        rawCoinInfo[resource.type] &&
                        Object.keys(rawCoinInfo[resource.type]).length > 0
                      ) {
                        const { coingecko_id, logo_url } =
                          rawCoinInfo[resource.type];
                        coingeckoId = coingecko_id;
                        logoUrl = logo_url;
                      }
                      const asset: AssetTypes.Asset = {
                        assetId: resource.type,
                        name: coinInfo.name,
                        symbol: coinInfo.symbol,
                        decimals: coinInfo.decimals,
                        logoUrl,
                        coingeckoId,
                      };
                      assets.push(asset);
                    }
                  }
                }
              }
            }
          }
        }
      }
      return Helper.reduceNativeCoin(assets, DefaultAsset.assetId);
    } catch (error) {
      return [DefaultAsset];
    }
  }

  async getAssetBalances(
    nodeURL: string,
    address: string
  ): Promise<AssetTypes.AssetAmount[]> {
    try {
      const balances: AssetTypes.AssetAmount[] = [DefaultAssetBalance];
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
      }
      return balances;
    } catch (error) {
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
              for (let i = 0; i < events.length; i++) {
                const element = events[i];
                const data = element.data.id.token_data_id;
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
      return [];
    }
  }
  getNativeCoinInfo(): AssetTypes.NativeCoin {
    return {
      decimals: AptosUtil.BaseDecimals,
      url: AptosUtil.BaseIconURL,
      name: "Aptos",
      symbol: "APT",
    };
  }
}
