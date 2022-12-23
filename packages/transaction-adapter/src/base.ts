import { Types, Interfaces } from '@nixjs23n6/types'
import { TransactionTypes, ProviderEnums, AssetTypes, VaultTypes } from '@nixjs23n6/utilities-adapter'

export abstract class BaseProvider {
    abstract getTransactions(
        chainId: string,
        address: string,
        offset?: number,
        size?: number
    ): Promise<Interfaces.ResponseData<TransactionTypes.Transaction[]>>
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
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction & TransactionTypes.RawTransferTransaction>>
    abstract registerAsset(
        chainId: string,
        asset: AssetTypes.Asset,
        owner: VaultTypes.AccountObject
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction & TransactionTypes.RegisterAssetTransaction>>

    abstract simulateTransaction(
        chainId: string,
        rawTxn: any,
        owner: VaultTypes.AccountObject,
        type: 'transfer' | 'script',
        gasLimit?: string,
        gasPrice?: string
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction>>
    abstract executeTransaction(chainId: string, rawTxn: any, owner: VaultTypes.AccountObject): Promise<Interfaces.ResponseData<string>>
    abstract checkReceiveNFTStatus(chainId: string, address: string): Promise<boolean>
    abstract allowReceiveNFT(
        chainId: string,
        owner: VaultTypes.AccountObject,
        allow: boolean
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction>>
    abstract transferNFT(
        chainId: string,
        NFT: AssetTypes.NFT,
        amount: string,
        from: VaultTypes.AccountObject,
        to: string,
        gasLimit?: string | undefined,
        gasPrice?: string | undefined
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction & TransactionTypes.RawTransferNFTTransaction>>
    abstract fundAccount(chainId: string, to: string, faucetURL: string): Promise<boolean>
}
