import { Helper } from "@nixjs23n6/utilities-adapter";
import { Types as AptosTypes } from "aptos";

export namespace AptosApiRequest {
  export function getCoinAddress(resource: string): string | undefined {
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

  export function getCoinAddressType(resource: string): string | undefined {
    try {
      const coinPart = /<.*>/g.exec(resource);
      if (coinPart) return coinPart[0].substring(1).slice(0, -1);
      throw Error("Failed to get coin type.");
    } catch (_e) {
      return undefined;
    }
  }

  export function getNFTsFromEvent(
    depositEvents: (AptosTypes.Event & { version: string })[],
    withdrawEvents: (AptosTypes.Event & { version: string })[]
  ) {
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
  }
}
