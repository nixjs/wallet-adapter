import { Interfaces, Types } from "@nixjs23n6/types";
import {
  TransactionTypes,
  TransactionEnums,
  AptosUtil,
  ProviderEnums,
  BaseConst,
  AssetTypes,
  VaultTypes,
  Helper,
  HexString,
} from "@nixjs23n6/utilities-adapter";
import {
  AptosClient,
  AptosAccount,
  TxnBuilderTypes,
  Types as AptosTypes,
} from "aptos";
import { RateLimit } from "async-sema";
import { uniqBy } from "lodash-es";
import { BaseProvider } from "../base";

export class AptosTransaction extends BaseProvider {
  public get type(): ProviderEnums.Provider {
    return ProviderEnums.Provider.APTOS;
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

  getCoinExactName(resource: string | undefined): string | undefined {
    if (resource) {
      const coinPart = /<.*>/g.exec(resource);
      if (coinPart) {
        return coinPart[0].replace("<", "").replace(">", "");
      }
    }
    return undefined;
  }

  async getTransactions(
    nodeURL: string,
    address: string,
    offset = BaseConst.BaseQuery.offset,
    size = BaseConst.BaseQuery.size
  ): Promise<TransactionTypes.Transaction[]> {
    try {
      let accounts: TransactionTypes.Transaction[] = [];
      let deposits: TransactionTypes.Transaction[] = [];
      let withdraws: TransactionTypes.Transaction[] = [];

      if (nodeURL && address) {
        const resources =
          await AptosUtil.AptosApiRequest.fetchAccountResourcesApi(
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
                n.type.includes(AptosUtil.BaseCoinStore) ||
                n.type.includes(AptosUtil.AptosTokenStore)
            );
          const limit = RateLimit(8); // rps
          if (ourResources.length > 0) {
            for (let r = 0; r < ourResources.length; r++) {
              const target = ourResources[r];
              const { deposit_events, withdraw_events } = target.data as any;
              const coinType = target.type;
              if (coinType) {
                await limit();
                if (Number(withdraw_events?.counter) > 0) {
                  const withdrawEvents: Interfaces.ResponseData<
                    (AptosTypes.Event & { version: string })[]
                  > =
                    await AptosUtil.AptosApiRequest.fetchEventsByEventHandleApi(
                      nodeURL,
                      address,
                      AptosUtil.AptosCoinStore,
                      AptosUtil.AptosEnums.TxEvent.WITHDRAW_EVENT,
                      200,
                      offset
                    );
                  if (
                    withdrawEvents.status === "SUCCESS" &&
                    withdrawEvents.data
                  ) {
                    const withdrawsTnx = await this.getTransactionByVersion(
                      withdrawEvents.data,
                      AptosUtil.AptosEnums.TxEvent.WITHDRAW_EVENT,
                      nodeURL
                    );
                    withdraws = withdraws.concat(withdrawsTnx);
                  }
                }
                if (Number(deposit_events?.counter) > 0) {
                  const depositEvents: Interfaces.ResponseData<
                    (AptosTypes.Event & { version: string })[]
                  > =
                    await AptosUtil.AptosApiRequest.fetchEventsByEventHandleApi(
                      nodeURL,
                      address,
                      coinType,
                      AptosUtil.AptosEnums.TxEvent.DEPOSIT_EVENT,
                      200,
                      offset
                    );
                  if (
                    depositEvents.status === "SUCCESS" &&
                    depositEvents.data
                  ) {
                    const depositTxn = await this.getTransactionByVersion(
                      depositEvents.data,
                      AptosUtil.AptosEnums.TxEvent.DEPOSIT_EVENT,
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
        > = await AptosUtil.AptosApiRequest.fetchAccountTransactionsApi(
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
  ): TransactionTypes.Transaction[] {
    return accounts.map((mTxn: any) => {
      let txObj: Types.Undefined<TransactionTypes.TransactionObject>;
      let txType: TransactionEnums.TransactionType =
        TransactionEnums.TransactionType.UNKNOWN;
      let to = "";
      if (
        String(mTxn.payload.function).includes(
          AptosUtil.AptosEnums.PayloadFunctionType.TRANSFER
        ) ||
        String(mTxn.payload.function).includes(
          AptosUtil.AptosEnums.PayloadFunctionType.APTOS_ACCOUNT_TRANSFER
        )
      ) {
        txType =
          mTxn.sender === address
            ? TransactionEnums.TransactionType.SEND
            : TransactionEnums.TransactionType.UNKNOWN;
        to = mTxn.payload.arguments?.[0];
        if (
          String(mTxn.payload.function).includes(
            AptosUtil.AptosEnums.PayloadFunctionType.TRANSFER
          )
        ) {
          let symbol = "";
          if (mTxn.payload?.type_arguments.length > 0) {
            if (
              mTxn.payload?.type_arguments?.[0].includes(AptosUtil.BaseCoinType)
            ) {
              symbol = AptosUtil.AptosCoinSymbol;
            } else symbol = mTxn.payload?.type_arguments[0].split("::")?.[2];
          }
          txObj = {
            balance: mTxn.payload.arguments?.[1],
            type: "coin",
            symbol: symbol,
          } as TransactionTypes.CoinObject;
        } else if (
          String(mTxn.payload.function).includes(
            AptosUtil.AptosEnums.PayloadFunctionType.APTOS_ACCOUNT_TRANSFER
          )
        ) {
          txObj = {
            balance: mTxn.payload.arguments?.[1],
            type: "coin",
            symbol: AptosUtil.AptosCoinSymbol,
          } as TransactionTypes.CoinObject;
        }
      } else if (
        String(mTxn.payload.function).includes(
          AptosUtil.AptosEnums.PayloadFunctionType.MINT_TOKEN
        ) ||
        String(mTxn.payload.function).includes(
          AptosUtil.AptosEnums.PayloadFunctionType.MINT_COLLECTION
        )
      ) {
        txType =
          mTxn.sender === address
            ? TransactionEnums.TransactionType.MINT
            : TransactionEnums.TransactionType.UNKNOWN;
        to = mTxn.sender;
        if (
          String(mTxn.payload.function).includes(
            AptosUtil.AptosEnums.PayloadFunctionType.MINT_TOKEN
          )
        ) {
          txObj = {
            type: "nft",
            name: mTxn.payload.arguments?.[1],
            description: mTxn.payload.arguments?.[2],
            url: mTxn.payload.arguments?.[5],
          } as TransactionTypes.NFTObject;
        } else if (
          String(mTxn.payload.function).includes(
            AptosUtil.AptosEnums.PayloadFunctionType.MINT_COLLECTION
          )
        ) {
          txObj = {
            type: "collection",
            name: mTxn.payload.arguments?.[0],
            description: mTxn.payload.arguments?.[1],
            url: mTxn.payload.arguments?.[2],
          } as TransactionTypes.NFTObject;
        }
      } else if (
        String(mTxn.payload.function).includes(
          AptosUtil.AptosEnums.PayloadFunctionType.CLAIM
        )
      ) {
        txType =
          mTxn.sender === address
            ? TransactionEnums.TransactionType.CLAIM
            : TransactionEnums.TransactionType.UNKNOWN;
        to = mTxn.sender;
        txObj = {
          balance: mTxn.payload.arguments?.[2],
          symbol: AptosUtil.AptosCoinSymbol,
          type: "coin",
        } as TransactionTypes.CoinObject;
      } else if (
        !mTxn.payload.function &&
        mTxn.payload.type === "script_payload"
      ) {
        txType =
          mTxn.sender === address
            ? TransactionEnums.TransactionType.SCRIPT
            : TransactionEnums.TransactionType.UNKNOWN;
        to = mTxn.sender;
        txObj = {
          ...mTxn.payload,
        } as TransactionTypes.ScriptObject;
      } else {
        txType = TransactionEnums.TransactionType.UNKNOWN;
        to = mTxn.sender;
        txObj = {
          ...mTxn.payload,
        } as TransactionTypes.ScriptObject;
      }
      return {
        from: mTxn.sender,
        to: to,
        gasFee: mTxn.gas_used,
        hash: mTxn.hash,
        timestamp: mTxn.timestamp,
        status: mTxn.success
          ? TransactionEnums.TransactionStatus.SUCCESS
          : TransactionEnums.TransactionStatus.FAILED,
        type: txType,
        data: txObj,
        version: mTxn.version,
      } as TransactionTypes.Transaction;
    });
  }

  async getTransactionByVersion(
    events: (AptosTypes.Event & { version: string })[],
    event: AptosUtil.AptosEnums.TxEvent,
    nodeURL: string
  ): Promise<TransactionTypes.Transaction[]> {
    const txns: AptosTypes.Transaction[] = [];
    for (let i = 0; i < events.length; i++) {
      const element = events[i];
      const txnResponse: Interfaces.ResponseData<AptosTypes.Transaction> =
        await AptosUtil.AptosApiRequest.fetchTransactionsByVersionApi(
          nodeURL,
          element.version
        );
      if (txnResponse.status === "SUCCESS" && txnResponse.data) {
        txns.push(txnResponse.data);
      }
    }

    return txns.map((txn: any) => {
      let txObj: Types.Undefined<TransactionTypes.TransactionObject>;
      let txType: TransactionEnums.TransactionType =
        TransactionEnums.TransactionType.UNKNOWN;
      let to = "";
      if (
        String(txn.payload.function).includes(
          AptosUtil.AptosEnums.PayloadFunctionType.TRANSFER
        ) ||
        String(txn.payload.function).includes(
          AptosUtil.AptosEnums.PayloadFunctionType.APTOS_ACCOUNT_TRANSFER
        )
      ) {
        txType =
          event === AptosUtil.AptosEnums.TxEvent.DEPOSIT_EVENT
            ? TransactionEnums.TransactionType.RECEIVE
            : TransactionEnums.TransactionType.SEND;
        to = txn.payload.arguments?.[0];
        if (
          String(txn.payload.function).includes(
            AptosUtil.AptosEnums.PayloadFunctionType.TRANSFER
          )
        ) {
          let symbol = "";
          if (txn.payload?.type_arguments.length > 0) {
            if (
              txn.payload?.type_arguments[0].includes(AptosUtil.BaseCoinType)
            ) {
              symbol = AptosUtil.AptosCoinSymbol;
            } else symbol = txn.payload?.type_arguments[0].split("::")?.[2];
          }
          txObj = {
            balance: txn.payload.arguments?.[1],
            type: "coin",
            symbol: symbol,
          } as TransactionTypes.CoinObject;
        } else if (
          String(txn.payload.function).includes(
            AptosUtil.AptosEnums.PayloadFunctionType.APTOS_ACCOUNT_TRANSFER
          )
        ) {
          txObj = {
            balance: txn.payload.arguments?.[1],
            type: "coin",
            symbol: AptosUtil.AptosCoinSymbol,
          } as TransactionTypes.CoinObject;
        }
      } else if (
        String(txn.payload.function).includes(
          AptosUtil.AptosEnums.PayloadFunctionType.CLAIM
        )
      ) {
        txType = TransactionEnums.TransactionType.CLAIM;
        txObj = {
          balance: txn.payload.arguments?.[2],
          symbol: AptosUtil.AptosCoinSymbol,
          type: "coin",
        } as TransactionTypes.CoinObject;
      }
      // else if (String(txn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.MINT)) {
      //     console.log('AptosUtil.AptosEnums.PayloadFunctionType.MINT')
      //     console.log(txn)
      //     txType = TransactionEnums.TransactionType.MINT
      //     // to = ''
      //     amount = txn.payload.arguments?.[0]
      // }
      else if (
        (!txn.payload.function && txn.payload.type === "script_payload") ||
        String(txn.payload.function).includes(
          AptosUtil.AptosEnums.PayloadFunctionType.ACCEPT_OFFER_COLLECTION
        )
      ) {
        txType = TransactionEnums.TransactionType.SCRIPT;
        txObj = {
          ...txn.payload,
        } as TransactionTypes.ScriptObject;
      } else {
        txType = TransactionEnums.TransactionType.UNKNOWN;
        to = txn.sender;
        txObj = {
          ...txn.payload,
        } as TransactionTypes.ScriptObject;
      }
      return {
        from: txn.sender,
        to: to,
        gasFee: txn.gas_used,
        hash: txn.hash,
        timestamp: txn.timestamp,
        status: txn.success
          ? TransactionEnums.TransactionStatus.SUCCESS
          : TransactionEnums.TransactionStatus.FAILED,
        type: txType,
        data: txObj,
        version: txn.version,
      } as TransactionTypes.Transaction;
    });
  }

  getAddressExplorer(
    explorerURL: string,
    address: string,
    type: ProviderEnums.Network
  ): string {
    return `${explorerURL}/account/${address}?network=${type}`;
  }

  getTransactionExplorer(
    explorerURL: string,
    hash: string,
    type: ProviderEnums.Network
  ): string {
    return `${explorerURL}/txn/${hash}?network=${type}`;
  }

  async transferCoin(
    amount: string,
    asset: AssetTypes.Asset,
    from: VaultTypes.AccountObject,
    to: string,
    chainId: string,
    gasLimit?: string,
    gasPrice?: string
  ): Promise<
    Types.Nullable<
      TransactionTypes.SimulateTransaction &
        TransactionTypes.RawTransferTransaction
    >
  > {
    try {
      let result: Types.Nullable<
        TransactionTypes.SimulateTransaction &
          TransactionTypes.RawTransferTransaction
      > = null;
      const nodeURL = AptosUtil.BaseNodeByChainInfo[chainId];
      const client = new AptosClient(nodeURL);
      const { assetId, decimals } = asset;

      const fromPrivateKey = new HexString(from.privateKeyHex);
      const owner = new AptosAccount(fromPrivateKey.toUint8Array());

      const exactTokenName = this.getCoinExactName(assetId);

      if (!exactTokenName) throw new Error("Coin exact name undefined");

      let transferPayload: Types.Nullable<TxnBuilderTypes.TransactionPayloadEntryFunction> =
        null;

      const ourAmount = Number(
        Helper.Decimal.toDecimal(String(amount), decimals)
      );

      const receiverResourcesResponse: Interfaces.ResponseData<
        AptosTypes.MoveResource[]
      > = await AptosUtil.AptosApiRequest.fetchAccountResourcesApi(nodeURL, to);
      if (receiverResourcesResponse.status === "SUCCESS") {
        transferPayload = await AptosUtil.AptosApiRequest.transferCoinPayload(
          to,
          ourAmount,
          exactTokenName
        );
      } else if (
        receiverResourcesResponse.status === "ERROR" &&
        (receiverResourcesResponse.error as any)?.data?.error_code ===
          "account_not_found"
      ) {
        transferPayload =
          await AptosUtil.AptosApiRequest.AptosAccountTransferPayload(
            to,
            ourAmount
          );
      }

      if (transferPayload) {
        const rawTxn: TxnBuilderTypes.RawTransaction =
          await AptosUtil.AptosApiRequest.createRawTransaction(
            client,
            owner,
            transferPayload,
            BigInt(gasPrice || AptosUtil.BaseGasPrice),
            BigInt(gasLimit || AptosUtil.BaseMaxGasAmount),
            AptosUtil.BaseExpireTimestamp
          );
        const simulateTxn: AptosTypes.UserTransaction[] =
          await AptosUtil.AptosApiRequest.simulateTransaction(
            client,
            owner,
            rawTxn
          );
        if (simulateTxn && simulateTxn.length > 0) {
          const { gas_used, expiration_timestamp_secs } = simulateTxn[0];
          result = {
            amount,
            asset,
            from,
            to,
            chainId,
            gasLimit,
            gasPrice,
            transactionFee: gas_used,
            expirationTimestamp: expiration_timestamp_secs,
            rawData: rawTxn,
          };
        }
      }
      return result;
    } catch (error) {
      console.log("[transferCoin]", error);
      return null;
    }
  }

  async estimateGasUnitPrice(chainId: string): Promise<Types.Nullable<string>> {
    try {
      if (!AptosUtil.BaseNodeByChainInfo[chainId])
        throw new Error("The chain id not found.");
      const res = await AptosUtil.AptosApiRequest.fetchEstimateApi(
        AptosUtil.BaseNodeByChainInfo[chainId]
      );
      if (res.status === "SUCCESS" && res.data?.gas_estimate) {
        return String(res.data.gas_estimate);
      } else {
        throw new Error("The gas price not found");
      }
    } catch (error) {
      console.log("[estimateGasUnitPrice]", error);
      return null;
    }
  }

  async registerAsset(
    chainId: string,
    asset: AssetTypes.Asset,
    owner: VaultTypes.AccountObject
  ): Promise<
    Types.Nullable<
      TransactionTypes.SimulateTransaction &
        TransactionTypes.RegisterAssetTransaction<any>
    >
  > {
    try {
      if (!owner.address || !owner.publicKeyHex)
        throw new Error("Owner not found");
      const nodeURL = AptosUtil.BaseNodeByChainInfo[chainId];
      const client = new AptosClient(nodeURL);

      const fromPrivateKey = new HexString(owner.privateKeyHex);
      const ourOwner = new AptosAccount(fromPrivateKey.toUint8Array());

      const params = {
        arguments: [],
        function: AptosUtil.AptosEnums.PayloadFunctionType.REGISTER,
        type: "entry_function_payload",
        type_arguments: [asset.assetId],
      };

      const rawTxn: TxnBuilderTypes.RawTransaction =
        await client.generateTransaction(owner.address, params);
      const simulateTxn: AptosTypes.UserTransaction[] =
        await AptosUtil.AptosApiRequest.simulateTransaction(
          client,
          ourOwner,
          rawTxn
        );
      return {
        type: "gas",
        rawData: rawTxn,
        asset,
        expirationTimestamp: simulateTxn?.[0].expiration_timestamp_secs,
        gasLimit: simulateTxn?.[0].max_gas_amount,
        gasPrice: simulateTxn?.[0].gas_unit_price,
        transactionFee: simulateTxn?.[0].gas_used,
        chainId,
        from: owner,
        to: "",
      } as Types.Nullable<
        TransactionTypes.SimulateTransaction &
          TransactionTypes.RegisterAssetTransaction
      >;
    } catch (error) {
      console.log("[registerAsset]", error);
      return null;
    }
  }

  async simulateTransaction(
    chainId: string,
    rawTxn: any,
    owner: VaultTypes.AccountObject,
    gasLimit?: string,
    gasPrice?: string
  ): Promise<Types.Nullable<TransactionTypes.SimulateTransaction<any>>> {
    try {
      const nodeURL = AptosUtil.BaseNodeByChainInfo[chainId];
      const client = new AptosClient(nodeURL);

      const fromPrivateKey = new HexString(owner.privateKeyHex);
      const ourOwner = new AptosAccount(fromPrivateKey.toUint8Array());

      const simulateTxn: AptosTypes.UserTransaction[] =
        await AptosUtil.AptosApiRequest.simulateTransaction(
          client,
          ourOwner,
          rawTxn
        );
      if (simulateTxn.length > 0) {
        return {
          chainId,
          from: owner,
          to: "",
          transactionFee: simulateTxn[0].gas_used,
          gasPrice: simulateTxn[0].gas_unit_price,
          gasLimit: simulateTxn[0].max_gas_amount,
          rawData: rawTxn,
          expirationTimestamp: simulateTxn[0].expiration_timestamp_secs,
        };
      }
      return null;
    } catch (error) {
      console.log("[SimulateTransaction]", error);
      return null;
    }
  }

  async executeTransaction(
    chainId: string,
    rawTxn: any,
    owner: VaultTypes.AccountObject
  ): Promise<Types.Nullable<string>> {
    try {
      const client = new AptosClient(AptosUtil.BaseNodeByChainInfo[chainId]);
      const account = AptosAccount.fromAptosAccountObject(owner);
      const bcsTxn: Uint8Array =
        await AptosUtil.AptosApiRequest.generateBCSTransaction(account, rawTxn);
      const signedTxn: string =
        await AptosUtil.AptosApiRequest.submitSignedBCSTransaction(
          client,
          bcsTxn
        );
      return signedTxn;
    } catch (error) {
      console.log("[simulateTransaction]", error);
      return null;
    }
  }
}
