import { Types } from "@nixjs23n6/types";
import {
  JsonRpcProvider,
  getTransactionData,
  getExecutionStatusType,
  getTransferObjectTransaction,
  getTransferSuiTransaction,
  getMoveCallTransaction,
  getPaySuiTransaction,
  getMoveObject,
} from "@mysten/sui.js";
import { Coin, Nft } from "./object";
import { BaseTypes } from "../types";
import { BaseEnums } from "../enums";

export namespace SUIApiRequest {
  export async function getTransactionsForAddress(
    nodeURL: string,
    address: string
  ): Promise<BaseTypes.Transaction[]> {
    const query = new JsonRpcProvider(nodeURL, {
      skipDataValidation: false,
    });
    const txs = await query.getTransactionsForAddress(address);
    if (txs.length === 0 || !txs[0]) {
      return [];
    }
    const digests = txs.filter(
      (value, index, self) => self.indexOf(value) === index
    );

    const effects = await query.getTransactionWithEffectsBatch(digests);
    const results = [];
    for (const effect of effects) {
      const data = getTransactionData(effect.certificate);

      for (const tx of data.transactions) {
        const transferSui = getTransferSuiTransaction(tx);
        const transferObject = getTransferObjectTransaction(tx);
        const moveCall = getMoveCallTransaction(tx);
        const paySui = getPaySuiTransaction(tx);
        if (transferSui) {
          results.push({
            timestamp: effect.timestamp_ms,
            status:
              getExecutionStatusType(effect) === "success"
                ? BaseEnums.TransactionStatus.SUCCESS
                : BaseEnums.TransactionStatus.FAILED,
            hash: effect.certificate.transactionDigest,
            gasFee:
              effect.effects.gasUsed.computationCost +
              effect.effects.gasUsed.storageCost -
              effect.effects.gasUsed.storageRebate,
            from: data.sender,
            to: transferSui.recipient,
            data: {
              type: "coin",
              balance: String(
                transferSui.amount ? BigInt(transferSui.amount) : BigInt(0)
              ),
              symbol: "SUI",
            } as BaseTypes.CoinObject,
            type:
              address === data.sender
                ? BaseEnums.TransactionType.SEND
                : BaseEnums.TransactionType.RECEIVE,
          });
        } else if (paySui) {
          const coin = paySui.coins[0];
          const resp = await query.getObject(coin.objectId);
          const obj = getMoveObject(resp);
          let txObj: Types.Undefined<BaseTypes.TransactionObject>;
          if (obj && Coin.isCoin(obj)) {
            const coinObj = Coin.getCoinObject(obj);
            txObj = {
              type: "coin",
              symbol: coinObj.symbol,
              balance: String(coinObj.balance),
            } as BaseTypes.CoinObject;
          } else if (obj && Nft.isNft(obj)) {
            const nftObject = Nft.getNftObject(obj, undefined);
            txObj = {
              type: "nft",
              name: nftObject.name,
              description: nftObject.description,
              url: nftObject.url,
            } as BaseTypes.NFTObject;
          }
          if (txObj) {
            results.push({
              timestamp: effect.timestamp_ms,
              status:
                getExecutionStatusType(effect) === "success"
                  ? BaseEnums.TransactionStatus.SUCCESS
                  : BaseEnums.TransactionStatus.FAILED,
              hash: effect.certificate.transactionDigest,
              gasFee:
                effect.effects.gasUsed.computationCost +
                effect.effects.gasUsed.storageCost -
                effect.effects.gasUsed.storageRebate,
              from: data.sender,
              to: paySui.recipients[0],
              data: txObj,
              type:
                address === data.sender
                  ? BaseEnums.TransactionType.SEND
                  : BaseEnums.TransactionType.RECEIVE,
            });
          }
        } else if (transferObject) {
          const resp = await query.getObject(transferObject.objectRef.objectId);
          const obj = getMoveObject(resp);
          let txObj: Types.Undefined<BaseTypes.TransactionObject>;
          // TODO: for now provider does not support to get histrorical object data,
          // so the record here may not be accurate.
          if (obj && Coin.isCoin(obj)) {
            const coinObj = Coin.getCoinObject(obj);
            txObj = {
              type: "coin",
              symbol: coinObj.symbol,
              balance: String(coinObj.balance),
            };
          } else if (obj && Nft.isNft(obj)) {
            const nftObject = Nft.getNftObject(obj, undefined);
            txObj = {
              type: "nft",
              name: nftObject.name,
              description: nftObject.description,
              url: nftObject.url,
            } as BaseTypes.NFTObject;
          }
          // TODO: handle more object types
          if (txObj) {
            results.push({
              timestamp: effect.timestamp_ms,
              status:
                getExecutionStatusType(effect) === "success"
                  ? BaseEnums.TransactionStatus.SUCCESS
                  : BaseEnums.TransactionStatus.FAILED,
              hash: effect.certificate.transactionDigest,
              gasFee:
                effect.effects.gasUsed.computationCost +
                effect.effects.gasUsed.storageCost -
                effect.effects.gasUsed.storageRebate,
              from: data.sender,
              to: transferObject.recipient,
              data: txObj,
              type:
                address === data.sender
                  ? BaseEnums.TransactionType.SEND
                  : BaseEnums.TransactionType.RECEIVE,
            });
          }
        } else if (moveCall) {
          let txObj: Types.Undefined<BaseTypes.TransactionObject>;
          if (
            moveCall.function === "mint" &&
            moveCall.arguments &&
            moveCall.arguments?.length > 0
          ) {
            txObj = {
              type: "nft",
              name: moveCall.arguments[0],
              description: moveCall.arguments[1],
              url: moveCall.arguments[2],
            } as BaseTypes.NFTObject;
          } else
            txObj = {
              type: "move_call",
              packageObjectId: moveCall.package.objectId,
              module: moveCall.module,
              function: moveCall.function,
              arguments: moveCall.arguments?.map((arg) => JSON.stringify(arg)),
              created: [],
              mutated: [],
            } as BaseTypes.ScriptObject;
          results.push({
            timestamp: effect.timestamp_ms,
            status:
              getExecutionStatusType(effect) === "success"
                ? BaseEnums.TransactionStatus.SUCCESS
                : BaseEnums.TransactionStatus.FAILED,
            hash: effect.certificate.transactionDigest,
            gasFee:
              effect.effects.gasUsed.computationCost +
              effect.effects.gasUsed.storageCost -
              effect.effects.gasUsed.storageRebate,
            from: data.sender,
            to: moveCall.package.objectId,
            data: txObj,
            type:
              moveCall.function === "mint"
                ? BaseEnums.TransactionType.MINT
                : BaseEnums.TransactionType.SCRIPT,
          });
        }
      }
    }
    return results;
  }
}
