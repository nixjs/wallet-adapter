import { Types } from "@nixjs23n6/types";
import {
  TransactionTypes,
  ProviderEnums,
  SUIUtil,
  AssetTypes,
  VaultTypes,
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

  getAddressExplorer(
    explorerURL: string,
    address: string,
    type: ProviderEnums.Network
  ): string {
    return `${explorerURL}/addresses/${address}?network=${type.toLowerCase()}`;
  }

  getTransactionExplorer(
    explorerURL: string,
    hash: string,
    type: ProviderEnums.Network
  ): string {
    return `${explorerURL}/transactions/${hash}?network=${type.toLowerCase()}`;
  }

  async transferCoin(
    amount: string,
    asset: AssetTypes.Asset,
    from: VaultTypes.AccountObject,
    to: string,
    chainId: string,
    gasLimit?: string,
    gasPrice?: string
  ): Promise<Types.Nullable<TransactionTypes.RawTransferTransaction>> {
    try {
      let result: Types.Nullable<TransactionTypes.RawTransferTransaction> =
        null;
      const t = await 5;
      result = {
        amount,
        asset,
        from,
        to,
        chainId,
        gasLimit,
        gasPrice,
        gasUsed: "1",
        expirationTimestamp: "1000000",
      };
      return result;
    } catch (error) {
      return null;
    }
  }

  async estimateGasUnitPrice(
    chainId: string | number
  ): Promise<Types.Undefined<string>> {
    try {
      if (!SUIUtil.BaseNodeByChainInfo[Number(chainId)])
        throw new Error("The chain id not found.");
      return "0";
    } catch (error) {
      console.log(error);
    }
  }
}
