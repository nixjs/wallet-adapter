import {
  TransactionTypes,
  ProviderEnums,
  SUIUtil,
} from "@nixjs23n6/utilities-adapter";
import { BaseProvider } from "../base";

export class SUITransaction extends BaseProvider {
  public get type(): ProviderEnums.Provider {
    return ProviderEnums.Provider.SUI;
  }
  async getTransactions(
    nodeURL: string,
    address: string
  ): Promise<TransactionTypes.Transaction[]> {
    try {
      const txns = await SUIUtil.SUIApiRequest.getTransactionsForAddress(
        nodeURL,
        address
      );
      return txns.sort((o1, o2) => Number(o2.timestamp) - Number(o1.timestamp));
    } catch (_error) {
      return [];
    }
  }
}
