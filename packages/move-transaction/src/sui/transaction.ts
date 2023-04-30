import { Types, Interfaces } from '@nixjs23n6/types'
import { TransactionTypes, ProviderEnums, SUIUtil, AssetTypes, VaultTypes, IError, PrimitiveHexString } from '@nixjs23n6/utilities-adapter'
import { Connection, JsonRpcProvider, TransactionBlock } from '@mysten/sui.js'
import { BaseProvider } from '../base'
import { Provider, executeTransaction } from './api'

export class SUITransaction extends BaseProvider {
    public get type(): ProviderEnums.Provider {
        return ProviderEnums.Provider.SUI
    }
    async getTransactions(chainId: string, address: PrimitiveHexString): Promise<Interfaces.ResponseData<TransactionTypes.Transaction[]>> {
        try {
            const nodeURL = SUIUtil.BaseNodeByChainInfo[chainId]
            const txns = await SUIUtil.SUIApiRequest.getTransactionsForAddress(nodeURL, address)
            return {
                data: txns.sort((o1, o2) => Number(o2.timestamp) - Number(o1.timestamp)),
                status: 'SUCCESS',
            }
        } catch (error) {
            return {
                error,
                status: 'ERROR',
            }
        }
    }

    getAddressExplorer(explorerURL: string, address: PrimitiveHexString, type: ProviderEnums.Network): string {
        return `${explorerURL}/addresses/${address}?network=${type.toLowerCase()}`
    }

    getTransactionExplorer(explorerURL: string, hash: string, type: ProviderEnums.Network): string {
        return `${explorerURL}/transactions/${hash}?network=${type.toLowerCase()}`
    }

    async registerAsset(
        chainId: string,
        asset: AssetTypes.Asset,
        owner: VaultTypes.AccountObject
    ): Promise<
        Interfaces.ResponseData<TransactionTypes.SimulateTransaction & TransactionTypes.RegisterAssetTransaction & { message: string }>
    > {
        return {
            data: {
                type: 'none',
                transactionType: 'script',
                rawData: null,
                asset: asset,
                chainId,
                from: owner,
                to: '',
                transactionFee: '',
                message: 'The method is unavailable',
            },
            status: 'SUCCESS',
        }
    }

    async transferCoin(
        amount: string,
        asset: AssetTypes.Asset,
        from: VaultTypes.AccountObject,
        to: string,
        chainId: string
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction & TransactionTypes.RawTransferTransaction>> {
        try {
            const provider = new Provider(SUIUtil.BaseNodeByChainInfo[chainId])
            if (from && from.publicKeyHex) {
                const result = await provider.transferCoin(asset.assetId, Number(amount), from, to, asset.decimals)
                const gasPrice = await provider.provider.getReferenceGasPrice()
                if (result.status === 'SUCCESS' && result.data) {
                    const { gasLimit, rawData, transactionFee } = result.data
                    return {
                        data: {
                            amount,
                            asset,
                            from,
                            to,
                            chainId,
                            gasLimit,
                            gasPrice: gasPrice.toString(),
                            transactionFee,
                            rawData,
                            transactionType: 'transfer',
                        },
                        status: 'SUCCESS',
                    }
                } else throw result.error
            }
            throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format()
        } catch (error) {
            console.log('[transferCoin]', error)
            return {
                error,
                status: 'ERROR',
            }
        }
    }

    async estimateGasUnitPrice(chainId: string): Promise<Types.Nullable<string>> {
        try {
            if (!SUIUtil.BaseNodeByChainInfo[chainId]) throw new Error('The chain id not found.')
            return '0'
        } catch (error) {
            console.log('[transferCoin]', error)
            return null
        }
    }

    async simulateTransaction(
        chainId: string,
        rawTxn: string | Uint8Array,
        owner: VaultTypes.AccountObject,
        type: 'transfer' | 'script'
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction<any>>> {
        try {
            const provider = new JsonRpcProvider(
                new Connection({
                    fullnode: SUIUtil.BaseNodeByChainInfo[chainId],
                })
            )
            const tx = new TransactionBlock(TransactionBlock.from(rawTxn))
            const simulateTxn = await provider.dryRunTransactionBlock({
                transactionBlock: await tx.build({ provider }),
            })
            const gasPrice = await provider.getReferenceGasPrice()
            if (simulateTxn && simulateTxn.effects && simulateTxn.effects.status.status === 'success') {
                const {
                    effects: {
                        gasUsed: { computationCost, storageCost, storageRebate },
                    },
                } = simulateTxn
                return {
                    data: {
                        chainId,
                        from: owner,
                        transactionFee: String(Number(computationCost) + Number(storageCost) - Number(storageRebate)),
                        to: '',
                        gasPrice: gasPrice.toString(),
                        gasLimit: tx.blockData.gasConfig.budget || '0',
                        rawData: rawTxn,
                        transactionType: type,
                    },
                    status: 'SUCCESS',
                }
            }
            return {
                error: simulateTxn,
                status: 'ERROR',
            }
        } catch (error) {
            console.log('[simulateTransaction', error)
            return {
                error,
                status: 'ERROR',
            }
        }
    }

    async executeTransaction(
        chainId: string,
        rawTxn: string | Uint8Array,
        owner: VaultTypes.AccountObject
    ): Promise<Interfaces.ResponseData<string>> {
        try {
            const provider = new JsonRpcProvider(
                new Connection({
                    fullnode: SUIUtil.BaseNodeByChainInfo[chainId],
                })
            )
            const tx = new TransactionBlock(TransactionBlock.from(rawTxn))
            const signedTxnResult = await executeTransaction(provider, owner, tx, 'WaitForLocalExecution')
            if (signedTxnResult.status === 'ERROR' || !signedTxnResult.data) throw signedTxnResult.error
            const {
                data: { digest },
            } = signedTxnResult
            return {
                data: digest,
                status: 'SUCCESS',
            }
        } catch (error) {
            return {
                error,
                status: 'ERROR',
            }
        }
    }

    async checkReceiveNFTStatus(): Promise<boolean> {
        return true
    }
    async allowReceiveNFT(): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction<any>>> {
        return {
            status: 'SUCCESS',
        }
    }
    async transferNFT(
        chainId: string,
        Nft: AssetTypes.Nft,
        amount: string,
        from: VaultTypes.AccountObject,
        to: string
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction<any> & TransactionTypes.RawTransferNFTTransaction>> {
        try {
            const provider = new Provider(SUIUtil.BaseNodeByChainInfo[chainId])
            if (!from || !from.publicKeyHex) throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format()

            const result = await provider.transferObject(Nft.id, from, to)
            const gasPrice = await provider.provider.getReferenceGasPrice()
            if (result.status === 'SUCCESS' && result.data) {
                const { gasLimit, rawData, transactionFee } = result.data
                return {
                    data: {
                        amount,
                        asset: Nft,
                        from,
                        to,
                        chainId,
                        gasLimit,
                        gasPrice: gasPrice.toString(),
                        transactionFee,
                        rawData,
                        transactionType: 'transfer-nft',
                    },
                    status: 'SUCCESS',
                }
            }
            throw result.error
        } catch (error) {
            return {
                error,
                status: 'ERROR',
            }
        }
    }
    async fundAccount(chainId: string, to: string, faucetURL: string): Promise<boolean> {
        try {
            const provider = new JsonRpcProvider(
                new Connection({
                    fullnode: SUIUtil.BaseNodeByChainInfo[chainId],
                    faucet: faucetURL,
                })
            )
            const result = await provider.requestSuiFromFaucet(to)
            if (result.error) return false
            return true
        } catch (error) {
            console.log('[fundAccount]', error)
            return false
        }
    }
}
