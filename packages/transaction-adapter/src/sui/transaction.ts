import { Types } from '@nixjs23n6/types'
import { TransactionTypes, ProviderEnums, SUIUtil, AssetTypes, VaultTypes, Helper } from '@nixjs23n6/utilities-adapter'
import {
    JsonRpcProvider,
    SuiExecuteTransactionResponse,
    CertifiedTransaction,
    SuiCertifiedTransactionEffects,
    TransactionEffects,
} from '@mysten/sui.js'
import { BaseProvider } from '../base'
import { Provider, executeTransaction } from './api'

export class SUITransaction extends BaseProvider {
    public get type(): ProviderEnums.Provider {
        return ProviderEnums.Provider.SUI
    }
    async getTransactions(chainId: string, address: string): Promise<TransactionTypes.Transaction[]> {
        try {
            const nodeURL = SUIUtil.BaseNodeByChainInfo[chainId]
            const txns = await SUIUtil.SUIApiRequest.getTransactionsForAddress(nodeURL, address)
            return txns.sort((o1, o2) => Number(o2.timestamp) - Number(o1.timestamp))
        } catch (_error) {
            return []
        }
    }

    getAddressExplorer(explorerURL: string, address: string, type: ProviderEnums.Network): string {
        return `${explorerURL}/addresses/${address}?network=${type.toLowerCase()}`
    }

    getTransactionExplorer(explorerURL: string, hash: string, type: ProviderEnums.Network): string {
        return `${explorerURL}/transactions/${hash}?network=${type.toLowerCase()}`
    }

    async registerAsset(
        chainId: string,
        asset: AssetTypes.Asset,
        owner: VaultTypes.AccountObject
    ): Promise<Types.Nullable<TransactionTypes.SimulateTransaction & TransactionTypes.RegisterAssetTransaction<any>>> {
        try {
            let result: Types.Nullable<TransactionTypes.SimulateTransaction & TransactionTypes.RegisterAssetTransaction> = null
            const t = await 1
            result = {
                type: 'none',
                rawData: null,
                asset: asset,
                chainId,
                from: owner,
                to: '',
                transactionFee: '',
            }
            return result
        } catch (error) {
            console.log('[registerAsset]', error)
            return null
        }
    }

    async transferCoin(
        amount: string,
        asset: AssetTypes.Asset,
        from: VaultTypes.AccountObject,
        to: string,
        chainId: string,
        gasLimit?: string | undefined,
        gasPrice?: string | undefined
    ): Promise<Types.Nullable<TransactionTypes.SimulateTransaction & TransactionTypes.RawTransferTransaction>> {
        try {
            let result: Types.Nullable<TransactionTypes.SimulateTransaction & TransactionTypes.RawTransferTransaction> = null
            const provider = new Provider(SUIUtil.BaseNodeByChainInfo[chainId])
            if (from && from.publicKeyHex) {
                const ourAmount = Helper.Decimal.toDecimal(amount, asset.decimals)
                const rawData = await provider.transferCoin(asset.symbol, Number(ourAmount), from, to)
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
                    }
            }
            return result
        } catch (error) {
            console.log(error)
            return null
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
        rawTxn: any,
        owner: VaultTypes.AccountObject,
        gasLimit?: string,
        gasPrice?: string
    ): Promise<Types.Nullable<TransactionTypes.SimulateTransaction<any>>> {
        try {
            const provider = new JsonRpcProvider(SUIUtil.BaseNodeByChainInfo[chainId], {
                skipDataValidation: true,
            })
            const simulateTxn: TransactionEffects = await provider.dryRunTransaction(rawTxn.toString())
            if (simulateTxn && simulateTxn.status.status === 'success') {
                return {
                    chainId,
                    from: owner,
                    transactionFee: String(
                        simulateTxn.gasUsed.computationCost + simulateTxn.gasUsed.storageCost - simulateTxn.gasUsed.storageRebate
                    ),
                    to: '',
                    gasPrice,
                    gasLimit,
                    rawData: rawTxn,
                }
            }
            return null
        } catch (error) {
            console.log('[simulateTransaction', error)
            return null
        }
    }

    async executeTransaction(chainId: string, rawTxn: any, owner: VaultTypes.AccountObject): Promise<Types.Nullable<string>> {
        try {
            const provider = new JsonRpcProvider(SUIUtil.BaseNodeByChainInfo[chainId], {
                skipDataValidation: true,
            })
            const signedTxn: Types.Nullable<SuiExecuteTransactionResponse> = await executeTransaction(
                provider,
                owner,
                rawTxn,
                'WaitForLocalExecution'
            )
            if (!signedTxn) return null
            if (Helper.Validation.hasProperty(signedTxn, 'ImmediateReturn') && (signedTxn as any)?.ImmediateReturn) {
                return (
                    signedTxn as {
                        ImmediateReturn: {
                            tx_digest: string
                        }
                    }
                ).ImmediateReturn.tx_digest
            } else if (Helper.Validation.hasProperty(signedTxn, 'TxCert') && (signedTxn as any)?.TxCert) {
                return (
                    signedTxn as {
                        TxCert: {
                            certificate: CertifiedTransaction
                        }
                    }
                ).TxCert.certificate.transactionDigest
            } else if (Helper.Validation.hasProperty(signedTxn, 'EffectsCert') && (signedTxn as any)?.EffectsCert) {
                return (
                    signedTxn as {
                        EffectsCert: {
                            certificate: CertifiedTransaction
                            effects: SuiCertifiedTransactionEffects
                        }
                    }
                ).EffectsCert.certificate.transactionDigest
            }
            return null
        } catch (error) {
            console.log('[executeTransaction]', error)
            return null
        }
    }

    async checkReceiveNFTStatus(chainId: string, address: string): Promise<boolean> {
        return true
    }
    async allowReceiveNFT(chainId: string, owner: VaultTypes.AccountObject): Promise<boolean> {
        return true
    }
}
