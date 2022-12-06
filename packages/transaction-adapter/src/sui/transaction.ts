import { Types } from "@nixjs23n6/types";
import {
  TransactionTypes,
  ProviderEnums,
  SUIUtil,
  AssetTypes,
  VaultTypes,
  Helper,
} from "@nixjs23n6/utilities-adapter";
import {
  JsonRpcProvider,
  SuiExecuteTransactionResponse,
  CertifiedTransaction,
  SuiCertifiedTransactionEffects,
} from "@mysten/sui.js";
import { BaseProvider } from "../base";
import { Provider, executeTransaction } from "./api";

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
    gasLimit?: string | undefined,
    gasPrice?: string | undefined
  ): Promise<Types.Nullable<TransactionTypes.RawTransferTransaction>> {
    try {
      let result: Types.Nullable<TransactionTypes.RawTransferTransaction> =
        null;
      const provider = new Provider(SUIUtil.BaseNodeByChainInfo[chainId]);
      if (from && from.publicKeyHex) {
        const ourAmount = Helper.Decimal.toDecimal(amount, asset.decimals);
        const rawData = await provider.transferCoin(
          asset.symbol,
          Number(ourAmount),
          from,
          to
        );
        // const vault = new SUI.SUIVault()
        // const rawTxn = await provider.transferCoin(asset.assetId, amount, to)
        if (rawData)
          result = {
            amount,
            asset,
            from,
            to,
            chainId,
            gasLimit: rawData.gasLimit,
            gasPrice,
            transactionFee: rawData.transactionFee,
            rawData: rawData.rawData,
          };
      }
      return result;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async estimateGasUnitPrice(
    chainId: string | number
  ): Promise<Types.Nullable<string>> {
    try {
      if (!SUIUtil.BaseNodeByChainInfo[chainId])
        throw new Error("The chain id not found.");
      return "0";
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async executeTransaction(
    chainId: string,
    rawTxn: any,
    owner: VaultTypes.AccountObject
  ): Promise<Types.Nullable<string>> {
    try {
      const provider = new JsonRpcProvider(
        SUIUtil.BaseNodeByChainInfo[chainId],
        {
          skipDataValidation: true,
        }
      );
      const signedTxn: Types.Nullable<SuiExecuteTransactionResponse> =
        await executeTransaction(
          provider,
          owner,
          rawTxn,
          "WaitForLocalExecution"
        );
      if (!signedTxn) return null;
      if (
        Helper.Validation.hasProperty(signedTxn, "ImmediateReturn") &&
        (signedTxn as any)?.ImmediateReturn
      ) {
        return (
          signedTxn as {
            ImmediateReturn: {
              tx_digest: string;
            };
          }
        ).ImmediateReturn.tx_digest;
      } else if (
        Helper.Validation.hasProperty(signedTxn, "TxCert") &&
        (signedTxn as any)?.TxCert
      ) {
        return (
          signedTxn as {
            TxCert: {
              certificate: CertifiedTransaction;
            };
          }
        ).TxCert.certificate.transactionDigest;
      } else if (
        Helper.Validation.hasProperty(signedTxn, "EffectsCert") &&
        (signedTxn as any)?.EffectsCert
      ) {
        return (
          signedTxn as {
            EffectsCert: {
              certificate: CertifiedTransaction;
              effects: SuiCertifiedTransactionEffects;
            };
          }
        ).EffectsCert.certificate.transactionDigest;
      }
      return null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}
