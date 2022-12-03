import { Interfaces, Types } from "@nixjs23n6/types";
import { ProviderEnums, AptosUtil, Helper } from "@nixjs23n6/utilities-adapter";
import { RateLimit } from "async-sema";
import {
  AptosClient,
  TokenClient,
  Types as AptosTypes,
  TokenTypes,
} from "aptos";
import { BaseProvider } from "../base";
import { BaseTypes } from "../types";

export class AptosAsset extends BaseProvider {
  public get type(): ProviderEnums.Provider {
    return ProviderEnums.Provider.APTOS;
  }

  getCoinAddress(resource: string): string | undefined {
    try {
      const coinPart = /<.*>/g.exec(resource);
      if (coinPart) {
        const addressPart = /[0-9]x[a-z0-9A-Z]{1,}/g.exec(coinPart[0]);
        if (addressPart) {
          return addressPart[0];
        }
      }
      throw Error("Failed to get coin type.");
    } catch (_e) {
      return undefined;
    }
  }

  getCoinAddressType(resource: string): string | undefined {
    try {
      const coinPart = /<.*>/g.exec(resource);
      if (coinPart) return coinPart[0].substring(1).slice(0, -1);
      throw Error("Failed to get coin type.");
    } catch (_e) {
      return undefined;
    }
  }

  getNFTsFromEvent = (
    depositEvents: (AptosTypes.Event & { version: string })[],
    withdrawEvents: (AptosTypes.Event & { version: string })[]
  ) => {
    const b1 = depositEvents.map((a) => ({
      ...a,
      creator: a.data?.id?.token_data_id?.name,
    }));
    const b2 = withdrawEvents.map((a) => ({
      ...a,
      creator: a.data?.id?.token_data_id?.name,
    }));

    // group events by creator
    const ourMapping = Helper.groupBy([...b1, ...b2], (e) => e.creator);
    // delete event has even data
    const items: any[] = [];
    Object.keys(ourMapping).forEach((key) => {
      const el = ourMapping[key];
      if (el.length % 2 !== 0) {
        items.push(
          el.sort(
            (o1: any, o2: any) => Number(o2.version) - Number(o1.version)
          )[0]
        );
      }
    });

    return items;
  };

  async getAssets(
    nodeURL: string,
    address: string
  ): Promise<BaseTypes.Asset[]> {
    try {
      const assets: BaseTypes.Asset[] = [];
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
          const ourResources = resources.data
            .map((d) => ({
              ...d,
              address: this.getCoinAddress(d.type) || "",
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
                    await this.getCoinAddress(resource.type);
                  const coinAddressType: Types.Undefined<string> =
                    await this.getCoinAddressType(resource.type);
                  if (coinAddress && coinAddressType) {
                    const coinInfo = coinResourcesResponse.data.find((e) =>
                      e.type.includes(coinAddressType)
                    )?.data as {
                      decimal: string;
                      name: string;
                      symbol: string;
                    };
                    if (coinInfo) {
                      const asset: BaseTypes.Asset = {
                        assetId: resource.type,
                        name: coinInfo.name,
                        symbol: coinInfo.symbol,
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
      return assets;
    } catch (error) {
      return [];
    }
  }

  async getAssetBalances(
    nodeURL: string,
    address: string
  ): Promise<BaseTypes.AssetAmount[]> {
    try {
      const balances: BaseTypes.AssetAmount[] = [];
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
            } as BaseTypes.AssetAmount);
          }
        }
      }
      return balances;
    } catch (error) {
      return [];
    }
  }

  async getNFTs(nodeURL: string, address: string): Promise<BaseTypes.NFT[]> {
    try {
      const NFTs: BaseTypes.NFT[] = [];
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
              200,
              0
            );
            const withdEvents: Interfaces.ResponseData<
              (AptosTypes.Event & { version: string })[]
            > = await AptosUtil.AptosApiRequest.fetchEventsByEventHandleApi(
              nodeURL,
              address,
              AptosUtil.AptosTokenStore,
              AptosUtil.AptosEnums.TxEvent.WITHDRAW_EVENT,
              200,
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
              const events = this.getNFTsFromEvent(
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
                  const { description, name, supply, uri } = tokenData;
                  NFTs.push({
                    amount: String(supply),
                    id: Helper.stringToSlug(data.name),
                    collection: data.collection,
                    name,
                    description,
                    uri,
                  } as BaseTypes.NFT);
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
}
