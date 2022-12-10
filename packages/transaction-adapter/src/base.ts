import { Types } from '@nixjs23n6/types'
import { TransactionTypes, ProviderEnums, AssetTypes, VaultTypes } from '@nixjs23n6/utilities-adapter'

export abstract class BaseProvider {
    abstract getTransactions(chainId: string, address: string, offset?: number, size?: number): Promise<TransactionTypes.Transaction[]>
    abstract getAddressExplorer(explorerURL: string, address: string, type: ProviderEnums.Network): string
    abstract getTransactionExplorer(explorerURL: string, address: string, type: ProviderEnums.Network): string
    abstract estimateGasUnitPrice(chainId: string): Promise<Types.Nullable<string>>
    abstract transferCoin(
        amount: string,
        asset: AssetTypes.Asset,
        from: VaultTypes.AccountObject,
        to: string,
        chainId: string,
        gasLimit?: string,
        gasPrice?: string
    ): Promise<Types.Nullable<TransactionTypes.SimulateTransaction & TransactionTypes.RawTransferTransaction>>
    abstract registerAsset(
        chainId: string,
        asset: AssetTypes.Asset,
        owner: VaultTypes.AccountObject
    ): Promise<Types.Nullable<TransactionTypes.SimulateTransaction & TransactionTypes.RegisterAssetTransaction<any>>>

    abstract simulateTransaction(
        chainId: string,
        rawTxn: any,
        owner: VaultTypes.AccountObject,
        gasLimit?: string,
        gasPrice?: string
    ): Promise<Types.Nullable<TransactionTypes.SimulateTransaction>>
    abstract executeTransaction(chainId: string, rawTxn: any, owner: VaultTypes.AccountObject): Promise<Types.Nullable<string>>
    abstract checkReceiveNFTStatus(chainId: string, address: string): Promise<boolean>
    abstract allowReceiveNFT(chainId: string, owner: VaultTypes.AccountObject): Promise<boolean>
}
