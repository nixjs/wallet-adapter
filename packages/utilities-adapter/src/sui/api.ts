import { JsonRpcProvider, Connection } from '@mysten/sui.js'
import { TransactionTypes } from '../types'
import { PrimitiveHexString } from '../HexString'
import { TransactionEnums } from '../enums'

const dedupe = (arr: string[]) => Array.from(new Set(arr))

export namespace SUIApiRequest {
    export async function getTransactionsForAddress(nodeURL: string, address: PrimitiveHexString): Promise<TransactionTypes.Transaction[]> {
        const connection = new Connection({ fullnode: nodeURL })
        const query = new JsonRpcProvider(connection)
        const [txnIds, fromTxnIds] = await Promise.all([
            query.queryTransactionBlocks({
                filter: {
                    ToAddress: address!,
                },
            }),
            query.queryTransactionBlocks({
                filter: {
                    FromAddress: address!,
                },
            }),
        ])
        const resp = await query.multiGetTransactionBlocks({
            digests: dedupe([...txnIds.data, ...fromTxnIds.data].map((x) => x.digest)),
            options: {
                showInput: true,
                showEffects: true,
                showEvents: true,
            },
        })

        const results = []

        const respSorted = resp.sort(
            // timestamp could be null, so we need to handle
            (a, b) => Number(b.timestampMs || 0) - Number(a.timestampMs || 0)
        )

        for (let i = 0; i < respSorted.length; i++) {
            const { digest, transaction, timestampMs, effects } = respSorted[i]
            if (transaction) {
                const {
                    data: { sender },
                } = transaction
                let ourStatus = TransactionEnums.TransactionStatus.NONE
                let ourGasFee = 0
                if (effects) {
                    const {
                        status,
                        gasUsed: { computationCost, storageCost, storageRebate },
                    } = effects
                    ourStatus =
                        status.status === 'success' ? TransactionEnums.TransactionStatus.SUCCESS : TransactionEnums.TransactionStatus.FAILED
                    ourGasFee = Number(computationCost) + Number(storageCost) - Number(storageRebate)
                }
                results.push({
                    timestamp: timestampMs ? Math.floor(Number(timestampMs) / 1000) : null,
                    status: ourStatus,
                    hash: digest,
                    gasFee: ourGasFee,
                    from: sender,
                    to: '',
                    data: {
                        overview: digest,
                        transaction,
                    } as TransactionTypes.ScriptObject,
                    type: address === sender ? TransactionEnums.TransactionType.SEND : TransactionEnums.TransactionType.RECEIVE,
                })
            }
        }

        return results
    }
}
