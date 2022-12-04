import { TransactionTypes, ProviderEnums } from "@nixjs23n6/utilities-adapter";

export abstract class BaseProvider {
  abstract getTransactions(
    nodeURL: string,
    address: string,
    offset?: number,
    size?: number
  ): Promise<TransactionTypes.Transaction[]>;
  abstract getAddressExplorer(
    explorerURL: string,
    address: string,
    type: ProviderEnums.Network
  ): string;
  abstract getTransactionExplorer(
    explorerURL: string,
    address: string,
    type: ProviderEnums.Network
  ): string;
}
