import { BaseEnums as HdWalletEnums } from "@nixjs23n6/hd-wallet-adapter";
import { BaseProvider } from "../base";
import { BaseTypes } from "../types";
import { SUIApiRequest } from "./api";

export class SUITransaction extends BaseProvider {
  public get type(): HdWalletEnums.Provider {
    return HdWalletEnums.Provider.SUI;
  }
  async getTransactions(
    nodeURL: string,
    address: string
  ): Promise<BaseTypes.Transaction[]> {
    try {
      const txns = await SUIApiRequest.getTransactionsForAddress(
        nodeURL,
        address
      );
      return txns.sort((o1, o2) => Number(o2.timestamp) - Number(o1.timestamp));
    } catch (_error) {
      return [];
    }
  }
}
