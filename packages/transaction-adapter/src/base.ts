import { Types } from "@nixjs23n6/types";
import {
  TransactionTypes,
  ProviderEnums,
  AssetTypes,
  VaultTypes,
} from "@nixjs23n6/utilities-adapter";

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
  abstract estimateGasUnitPrice(
    chainId: string | number
  ): Promise<Types.Nullable<string>>;
  abstract transferCoin(
    amount: string,
    asset: AssetTypes.Asset,
    from: VaultTypes.AccountObject,
    to: string,
    chainId: string,
    gasLimit?: string,
    gasPrice?: string
  ): Promise<Types.Nullable<TransactionTypes.RawTransferTransaction>>;
  // abstract executeTransaction(): Promise<Types.>
}
