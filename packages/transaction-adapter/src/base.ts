import { BaseTypes } from "./types";

export abstract class BaseProvider {
  abstract getTransactions(
    nodeURL: string,
    address: string,
    offset?: number,
    size?: number
  ): Promise<BaseTypes.Transaction[]>;
}
