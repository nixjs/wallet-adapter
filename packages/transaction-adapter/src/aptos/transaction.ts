import { Interfaces, Types } from "@nixjs23n6/types";
import { BaseEnums as HdWalletEnums } from "@nixjs23n6/hd-wallet-adapter";
import { Types as AptosTypes } from "aptos";
import { uniqBy } from "lodash-es";
import { BaseProvider } from "../base";
import { BaseTypes } from "../types";
import { BaseEnums } from "../enums";
import { BaseConst } from "../const";
import { AptosEnums } from "./enums";
import { AptosApiRequest } from "./api";
import {
  AptosCoinStore,
  AptosTokenStore,
  AptosCoinSymbol,
  BaseCoinType,
  BaseCoinStore,
} from "./const";

export class AptosTransaction extends BaseProvider {
  public get type(): HdWalletEnums.Provider {
    return HdWalletEnums.Provider.APTOS;
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

  async getTransactions(
    nodeURL: string,
    address: string,
    offset = BaseConst.BaseQuery.offset,
    size = BaseConst.BaseQuery.size
  ): Promise<BaseTypes.Transaction[]> {
    try {
      let accounts: BaseTypes.Transaction[] = [];
      let deposits: BaseTypes.Transaction[] = [];
      let withdraws: BaseTypes.Transaction[] = [];
      if (nodeURL && address) {
        const resources = await AptosApiRequest.fetchAccountResourcesApi(
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
                n.type.includes(BaseCoinStore) ||
                n.type.includes(AptosTokenStore)
            );

          if (ourResources.length > 0) {
            for (let r = 0; r < ourResources.length; r++) {
              const target = ourResources[r];
              const { deposit_events, withdraw_events } = target.data as any;
              const coinType = target.type;
              if (coinType) {
                if (Number(withdraw_events?.counter) > 0) {
                  const withdrawEvents: Interfaces.ResponseData<
                    (AptosTypes.Event & { version: string })[]
                  > = await AptosApiRequest.fetchEventsByEventHandleApi(
                    nodeURL,
                    address,
                    AptosCoinStore,
                    AptosEnums.TxEvent.WITHDRAW_EVENT,
                    200,
                    offset
                  );
                  if (
                    withdrawEvents.status === "SUCCESS" &&
                    withdrawEvents.data
                  ) {
                    const withdrawsTnx = await this.getTransactionByVersion(
                      withdrawEvents.data,
                      AptosEnums.TxEvent.WITHDRAW_EVENT,
                      nodeURL
                    );
                    withdraws = withdraws.concat(withdrawsTnx);
                  }
                }
                if (Number(deposit_events?.counter) > 0) {
                  const depositEvents: Interfaces.ResponseData<
                    (AptosTypes.Event & { version: string })[]
                  > = await AptosApiRequest.fetchEventsByEventHandleApi(
                    nodeURL,
                    address,
                    coinType,
                    AptosEnums.TxEvent.DEPOSIT_EVENT,
                    200,
                    offset
                  );
                  if (
                    depositEvents.status === "SUCCESS" &&
                    depositEvents.data
                  ) {
                    const depositTxn = await this.getTransactionByVersion(
                      depositEvents.data,
                      AptosEnums.TxEvent.DEPOSIT_EVENT,
                      nodeURL
                    );
                    deposits = deposits.concat(depositTxn);
                  }
                }
              }
            }
          }
        }
        const accountTxesResponse: Interfaces.ResponseData<
          AptosTypes.Transaction[]
        > = await AptosApiRequest.fetchAccountTransactionsApi(
          nodeURL,
          address,
          200,
          offset
        );
        if (
          accountTxesResponse.status === "SUCCESS" &&
          accountTxesResponse.data
        )
          accounts = this.getTransactionByAccount(
            accountTxesResponse.data,
            address
          );
        const txns = uniqBy(
          [...accounts, ...deposits, ...withdraws].sort(
            (o1, o2) => Number(o2.timestamp) - Number(o1.timestamp)
          ),
          "version"
        );
        return txns;
      }
      return [];
    } catch (_error) {
      return [];
    }
  }

  getTransactionByAccount(
    accounts: AptosTypes.Transaction[],
    address: string
  ): BaseTypes.Transaction[] {
    return accounts.map((mTxn: any) => {
      let txObj: Types.Undefined<BaseTypes.TransactionObject>;
      let txType: BaseEnums.TransactionType = BaseEnums.TransactionType.UNKNOWN;
      let to = "";
      if (
        String(mTxn.payload.function).includes(
          AptosEnums.PayloadFunctionType.TRANSFER
        ) ||
        String(mTxn.payload.function).includes(
          AptosEnums.PayloadFunctionType.APTOS_ACCOUNT_TRANSFER
        )
      ) {
        txType =
          mTxn.sender === address
            ? BaseEnums.TransactionType.SEND
            : BaseEnums.TransactionType.UNKNOWN;
        to = mTxn.payload.arguments?.[0];
        txObj = {
          balance: mTxn.payload.arguments?.[1],
          symbol: AptosCoinSymbol,
          type: "coin",
        } as BaseTypes.CoinObject;
      } else if (
        String(mTxn.payload.function).includes(
          AptosEnums.PayloadFunctionType.MINT_TOKEN
        ) ||
        String(mTxn.payload.function).includes(
          AptosEnums.PayloadFunctionType.MINT_COLLECTION
        )
      ) {
        txType =
          mTxn.sender === address
            ? BaseEnums.TransactionType.MINT
            : BaseEnums.TransactionType.UNKNOWN;
        to = mTxn.sender;
        if (
          String(mTxn.payload.function).includes(
            AptosEnums.PayloadFunctionType.MINT_TOKEN
          )
        ) {
          txObj = {
            type: "nft",
            name: mTxn.payload.arguments?.[1],
            description: mTxn.payload.arguments?.[2],
            url: mTxn.payload.arguments?.[5],
          } as BaseTypes.NFTObject;
        } else if (
          String(mTxn.payload.function).includes(
            AptosEnums.PayloadFunctionType.MINT_COLLECTION
          )
        ) {
          txObj = {
            type: "collection",
            name: mTxn.payload.arguments?.[0],
            description: mTxn.payload.arguments?.[1],
            url: mTxn.payload.arguments?.[2],
          } as BaseTypes.NFTObject;
        }
      } else if (
        String(mTxn.payload.function).includes(
          AptosEnums.PayloadFunctionType.CLAIM
        )
      ) {
        txType =
          mTxn.sender === address
            ? BaseEnums.TransactionType.CLAIM
            : BaseEnums.TransactionType.UNKNOWN;
        to = mTxn.sender;
        txObj = {
          balance: mTxn.payload.arguments?.[2],
          symbol: AptosCoinSymbol,
          type: "coin",
        } as BaseTypes.CoinObject;
      } else if (
        !mTxn.payload.function &&
        mTxn.payload.type === "script_payload"
      ) {
        txType =
          mTxn.sender === address
            ? BaseEnums.TransactionType.SCRIPT
            : BaseEnums.TransactionType.UNKNOWN;
        to = mTxn.sender;
        txObj = {
          ...mTxn.payload,
        } as BaseTypes.ScriptObject;
      } else {
        txType = BaseEnums.TransactionType.UNKNOWN;
        to = mTxn.sender;
        txObj = {
          ...mTxn.payload,
        } as BaseTypes.ScriptObject;
      }
      return {
        from: mTxn.sender,
        to: to,
        gasFee: mTxn.gas_used,
        hash: mTxn.hash,
        timestamp: mTxn.timestamp,
        status: mTxn.success
          ? BaseEnums.TransactionStatus.SUCCESS
          : BaseEnums.TransactionStatus.FAILED,
        type: txType,
        data: txObj,
        version: mTxn.version,
      } as BaseTypes.Transaction;
    });
  }

  async getTransactionByVersion(
    events: (AptosTypes.Event & { version: string })[],
    event: AptosEnums.TxEvent,
    nodeURL: string
  ): Promise<BaseTypes.Transaction[]> {
    const txns: AptosTypes.Transaction[] = [];
    for (let i = 0; i < events.length; i++) {
      const element = events[i];
      const txnResponse: Interfaces.ResponseData<AptosTypes.Transaction> =
        await AptosApiRequest.fetchTransactionsByVersionApi(
          nodeURL,
          element.version
        );
      if (txnResponse.status === "SUCCESS" && txnResponse.data) {
        txns.push(txnResponse.data);
      }
    }

    return txns.map((txn: any) => {
      let txObj: Types.Undefined<BaseTypes.TransactionObject>;
      let txType: BaseEnums.TransactionType = BaseEnums.TransactionType.UNKNOWN;
      let to = "";
      if (
        String(txn.payload.function).includes(
          AptosEnums.PayloadFunctionType.TRANSFER
        ) ||
        String(txn.payload.function).includes(
          AptosEnums.PayloadFunctionType.APTOS_ACCOUNT_TRANSFER
        )
      ) {
        txType =
          event === AptosEnums.TxEvent.DEPOSIT_EVENT
            ? BaseEnums.TransactionType.RECEIVE
            : BaseEnums.TransactionType.SEND;
        to = txn.payload.arguments?.[0];
        if (
          String(txn.payload.function).includes(
            AptosEnums.PayloadFunctionType.TRANSFER
          )
        ) {
          let symbol = "";
          if (txn.payload?.type_arguments[0].includes(BaseCoinType)) {
            symbol = AptosCoinSymbol;
          } else symbol = txn.payload?.type_arguments[0].split("::")?.[2];
          txObj = {
            balance: txn.payload.arguments?.[1],
            type: "coin",
            symbol: symbol,
          } as BaseTypes.CoinObject;
        } else if (
          String(txn.payload.function).includes(
            AptosEnums.PayloadFunctionType.APTOS_ACCOUNT_TRANSFER
          )
        ) {
          txObj = {
            balance: txn.payload.arguments?.[1],
            type: "coin",
            symbol: AptosCoinSymbol,
          } as BaseTypes.CoinObject;
        }
      } else if (
        String(txn.payload.function).includes(
          AptosEnums.PayloadFunctionType.CLAIM
        )
      ) {
        txType = BaseEnums.TransactionType.CLAIM;
        txObj = {
          balance: txn.payload.arguments?.[2],
          symbol: AptosCoinSymbol,
          type: "coin",
        } as BaseTypes.CoinObject;
      }
      // else if (String(txn.payload.function).includes(AptosEnums.PayloadFunctionType.MINT)) {
      //     console.log('AptosEnums.PayloadFunctionType.MINT')
      //     console.log(txn)
      //     txType = BaseEnums.TransactionType.MINT
      //     // to = ''
      //     amount = txn.payload.arguments?.[0]
      // }
      else if (
        (!txn.payload.function && txn.payload.type === "script_payload") ||
        String(txn.payload.function).includes(
          AptosEnums.PayloadFunctionType.ACCEPT_OFFER_COLLECTION
        )
      ) {
        txType = BaseEnums.TransactionType.SCRIPT;
        txObj = {
          ...txn.payload,
        } as BaseTypes.ScriptObject;
      } else {
        txType = BaseEnums.TransactionType.UNKNOWN;
        to = txn.sender;
        txObj = {
          ...txn.payload,
        } as BaseTypes.ScriptObject;
      }
      return {
        from: txn.sender,
        to: to,
        gasFee: txn.gas_used,
        hash: txn.hash,
        timestamp: txn.timestamp,
        status: txn.success
          ? BaseEnums.TransactionStatus.SUCCESS
          : BaseEnums.TransactionStatus.FAILED,
        type: txType,
        data: txObj,
        version: txn.version,
      } as BaseTypes.Transaction;
    });
  }
}
