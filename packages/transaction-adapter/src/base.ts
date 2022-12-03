import { TransactionTypes } from "@nixjs23n6/utilities-adapter";

export abstract class BaseProvider {
  abstract getTransactions(
    nodeURL: string,
    address: string,
    offset?: number,
    size?: number
  ): Promise<TransactionTypes.Transaction[]>;
}
