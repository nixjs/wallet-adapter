import { Interfaces, Types } from '@nixjs23n6/types'
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
    IError,
    PrimitiveHexString,
} from '@nixjs23n6/utilities-adapter'
import { Aptos as AptosAsset } from '@nixjs23n6/move-asset'
import { Crypto } from '@nixjs23n6/hd-wallet-adapter'
import {
    AptosClient,
    AptosAccount,
    TxnBuilderTypes,
    Types as AptosTypes,
    TransactionBuilderABI,
    HexString as AptosHexString,
    FaucetClient,
} from 'aptos'
import { RateLimit } from '@nixjs23n6/async-sema'
import uniqBy from 'lodash-es/uniqBy'
import { BaseProvider } from '../base'

export class AptosTransaction extends BaseProvider {
    public get type(): ProviderEnums.Provider {
        return ProviderEnums.Provider.APTOS
    }

    getCoinAddress(resource: string): string | undefined {
        try {
            const coinPart = /<.*>/g.exec(resource)
            if (coinPart) {
                const addressPart = /[0-9]x[a-z0-9A-Z]{1,}/g.exec(coinPart[0])
                if (addressPart) {
                    return addressPart[0]
                }
            }
            throw Error('Failed to get coin type.')
        } catch (_e) {
            return undefined
        }
    }

    getCoinExactName(resource: string | undefined): string | undefined {
        if (resource) {
            const coinPart = /<.*>/g.exec(resource)
            if (coinPart) {
                return coinPart[0].replace('<', '').replace('>', '')
            }
        }
        return undefined
    }

    async getTransactions(
        chainId: string,
        address: PrimitiveHexString,
        offset = BaseConst.BaseQuery.offset,
        _size = BaseConst.BaseQuery.size
    ): Promise<Interfaces.ResponseData<TransactionTypes.Transaction[]>> {
        try {
            const nodeURL = AptosUtil.BaseNodeByChainInfo[chainId]
            let accounts: TransactionTypes.Transaction[] = []
            let deposits: TransactionTypes.Transaction[] = []
            let withdraws: TransactionTypes.Transaction[] = []
            if (!nodeURL || !address)
                throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                    nodeURL,
                    address,
                })
            const resources = await AptosUtil.AptosApiRequest.fetchAccountResourcesApi(nodeURL, address)
            if (resources.status === 'SUCCESS' && resources.data && resources.data.length > 0) {
                const ourResources = resources.data
                    .map((d) => ({
                        ...d,
                        address: this.getCoinAddress(d.type) || '',
                    }))
                    .filter((n) => n.type.includes(AptosUtil.BaseCoinStore) || n.type.includes(AptosUtil.AptosTokenStore))
                const limit = RateLimit(8) // rps
                if (ourResources.length > 0) {
                    for (let r = 0; r < ourResources.length; r++) {
                        const target = ourResources[r]
                        const { deposit_events, withdraw_events } = target.data as any
                        const coinType = target.type
                        if (coinType) {
                            await limit()
                            if (Number(withdraw_events?.counter) > 0) {
                                const withdrawEvents: Interfaces.ResponseData<(AptosTypes.Event & { version: string })[]> =
                                    await AptosUtil.AptosApiRequest.fetchEventsByEventHandleApi(
                                        nodeURL,
                                        address,
                                        AptosUtil.AptosCoinStore,
                                        AptosUtil.AptosEnums.TxEvent.WITHDRAW_EVENT,
                                        200,
                                        offset
                                    )
                                if (withdrawEvents.status === 'SUCCESS' && withdrawEvents.data) {
                                    const withdrawsTnx = await this.getTransactionByVersion(
                                        withdrawEvents.data,
                                        AptosUtil.AptosEnums.TxEvent.WITHDRAW_EVENT,
                                        nodeURL
                                    )
                                    withdraws = withdraws.concat(withdrawsTnx)
                                }
                            }
                            if (Number(deposit_events?.counter) > 0) {
                                const depositEvents: Interfaces.ResponseData<(AptosTypes.Event & { version: string })[]> =
                                    await AptosUtil.AptosApiRequest.fetchEventsByEventHandleApi(
                                        nodeURL,
                                        address,
                                        coinType,
                                        AptosUtil.AptosEnums.TxEvent.DEPOSIT_EVENT,
                                        200,
                                        offset
                                    )
                                if (depositEvents.status === 'SUCCESS' && depositEvents.data) {
                                    const depositTxn = await this.getTransactionByVersion(
                                        depositEvents.data,
                                        AptosUtil.AptosEnums.TxEvent.DEPOSIT_EVENT,
                                        nodeURL
                                    )
                                    deposits = deposits.concat(depositTxn)
                                }
                            }
                        }
                    }
                }
            }
            const accountTxesResponse: Interfaces.ResponseData<AptosTypes.Transaction[]> =
                await AptosUtil.AptosApiRequest.fetchAccountTransactionsApi(nodeURL, address, 200, offset)
            if (accountTxesResponse.status === 'SUCCESS' && accountTxesResponse.data)
                accounts = this.getTransactionByAccount(accountTxesResponse.data, address)
            const txns = uniqBy(
                [...accounts, ...deposits, ...withdraws].sort((o1, o2) => Number(o2.timestamp) - Number(o1.timestamp)),
                'version'
            )
            return {
                data: txns,
                status: 'SUCCESS',
            }
        } catch (error) {
            return {
                error,
                status: 'ERROR',
            }
        }
    }

    getTransactionByAccount(accounts: AptosTypes.Transaction[], address: PrimitiveHexString): TransactionTypes.Transaction[] {
        return accounts.map((mTxn: any) => {
            let txObj: Types.Undefined<TransactionTypes.TransactionObject>
            let txType: TransactionEnums.TransactionType = TransactionEnums.TransactionType.SCRIPT
            let to = ''
            if (
                String(mTxn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.TRANSFER) ||
                String(mTxn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.APTOS_ACCOUNT_TRANSFER)
            ) {
                txType = mTxn.sender === address ? TransactionEnums.TransactionType.SEND : TransactionEnums.TransactionType.SCRIPT
                to = mTxn.payload.arguments?.[0]
                if (String(mTxn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.TRANSFER)) {
                    let symbol = ''
                    if (mTxn.payload?.type_arguments.length > 0) {
                        if (mTxn.payload?.type_arguments?.[0].includes(AptosUtil.BaseCoinType)) {
                            symbol = AptosUtil.AptosCoinSymbol
                        } else symbol = mTxn.payload?.type_arguments[0].split('::')?.[2]
                    }
                    txObj = {
                        balance: mTxn.payload.arguments?.[1],
                        type: 'coin',
                        symbol: symbol,
                    } as TransactionTypes.CoinObject
                } else if (String(mTxn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.APTOS_ACCOUNT_TRANSFER)) {
                    txObj = {
                        balance: mTxn.payload.arguments?.[1],
                        type: 'coin',
                        symbol: AptosUtil.AptosCoinSymbol,
                    } as TransactionTypes.CoinObject
                }
            } else if (
                String(mTxn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.MINT_TOKEN) ||
                String(mTxn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.MINT_COLLECTION)
            ) {
                txType = mTxn.sender === address ? TransactionEnums.TransactionType.MINT : TransactionEnums.TransactionType.SCRIPT
                to = mTxn.sender
                if (String(mTxn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.MINT_TOKEN)) {
                    txObj = {
                        type: 'nft',
                        name: mTxn.payload.arguments?.[1],
                        description: mTxn.payload.arguments?.[2],
                        url: mTxn.payload.arguments?.[5],
                    } as TransactionTypes.NftObject
                } else if (String(mTxn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.MINT_COLLECTION)) {
                    txObj = {
                        type: 'collection',
                        name: mTxn.payload.arguments?.[0],
                        description: mTxn.payload.arguments?.[1],
                        url: mTxn.payload.arguments?.[2],
                    } as TransactionTypes.NftObject
                }
            } else if (String(mTxn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.CLAIM)) {
                txType = mTxn.sender === address ? TransactionEnums.TransactionType.CLAIM : TransactionEnums.TransactionType.SCRIPT
                to = mTxn.sender
                txObj = {
                    balance: mTxn.payload.arguments?.[2],
                    symbol: AptosUtil.AptosCoinSymbol,
                    type: 'coin',
                } as TransactionTypes.CoinObject
            } else if (String(mTxn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.REGISTER)) {
                txType = TransactionEnums.TransactionType.REGISTER_ASSET
                to = mTxn.sender
                let v = ''
                if (mTxn.payload.type_arguments?.[0]) {
                    const t = mTxn.payload.type_arguments?.[0]
                    v = AptosAsset.AptosApiRequest.getCoinAddressType(t) || ''
                }
                txObj = {
                    assetId: v.length > 0 ? v.split('::')?.[2] : 'Unknown',
                } as TransactionTypes.RegisterAssetObject
            } else {
                txType = TransactionEnums.TransactionType.SCRIPT
                to = mTxn.sender
                txObj = {
                    ...mTxn.payload,
                    overview: mTxn.payload?.function || 'Unknown',
                } as TransactionTypes.ScriptObject
            }
            return {
                from: mTxn.sender,
                to: to,
                gasFee: mTxn.gas_used,
                hash: mTxn.hash,
                timestamp: Math.floor(mTxn.timestamp / 1000000),
                status: mTxn.success ? TransactionEnums.TransactionStatus.SUCCESS : TransactionEnums.TransactionStatus.FAILED,
                type: txType,
                data: txObj,
                version: mTxn.version,
            } as TransactionTypes.Transaction
        })
    }

    async getTransactionByVersion(
        events: (AptosTypes.Event & { version: string })[],
        event: AptosUtil.AptosEnums.TxEvent,
        nodeURL: string
    ): Promise<TransactionTypes.Transaction[]> {
        const txns: AptosTypes.Transaction[] = []
        for (let i = 0; i < events.length; i++) {
            const element = events[i]
            const txnResponse: Interfaces.ResponseData<AptosTypes.Transaction> =
                await AptosUtil.AptosApiRequest.fetchTransactionsByVersionApi(nodeURL, element.version)
            if (txnResponse.status === 'SUCCESS' && txnResponse.data) {
                txns.push(txnResponse.data)
            }
        }

        return txns.map((txn: any) => {
            let txObj: Types.Undefined<TransactionTypes.TransactionObject>
            let txType: TransactionEnums.TransactionType = TransactionEnums.TransactionType.SCRIPT
            let to = ''
            if (
                String(txn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.TRANSFER) ||
                String(txn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.APTOS_ACCOUNT_TRANSFER)
            ) {
                txType =
                    event === AptosUtil.AptosEnums.TxEvent.DEPOSIT_EVENT
                        ? TransactionEnums.TransactionType.RECEIVE
                        : TransactionEnums.TransactionType.SEND
                to = txn.payload.arguments?.[0]
                if (String(txn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.TRANSFER)) {
                    let symbol = ''
                    if (txn.payload?.type_arguments.length > 0) {
                        if (txn.payload?.type_arguments[0].includes(AptosUtil.BaseCoinType)) {
                            symbol = AptosUtil.AptosCoinSymbol
                        } else symbol = txn.payload?.type_arguments[0].split('::')?.[2]
                    }
                    txObj = {
                        balance: txn.payload.arguments?.[1],
                        type: 'coin',
                        symbol: symbol,
                    } as TransactionTypes.CoinObject
                } else if (String(txn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.APTOS_ACCOUNT_TRANSFER)) {
                    txObj = {
                        balance: txn.payload.arguments?.[1],
                        type: 'coin',
                        symbol: AptosUtil.AptosCoinSymbol,
                    } as TransactionTypes.CoinObject
                }
            } else if (String(txn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.CLAIM)) {
                txType = TransactionEnums.TransactionType.CLAIM
                txObj = {
                    balance: txn.payload.arguments?.[2],
                    symbol: AptosUtil.AptosCoinSymbol,
                    type: 'coin',
                } as TransactionTypes.CoinObject
            } else if (String(txn.payload.function).includes(AptosUtil.AptosEnums.PayloadFunctionType.REGISTER)) {
                txType = TransactionEnums.TransactionType.REGISTER_ASSET
                to = txn.sender
                let v = ''
                if (txn.payload.type_arguments?.[0]) {
                    const t = txn.payload.type_arguments?.[0]
                    v = AptosAsset.AptosApiRequest.getCoinAddressType(t) || ''
                }

                txObj = {
                    assetId: v.length > 0 ? v.split('::')?.[2] : 'Unknown',
                } as TransactionTypes.RegisterAssetObject
            } else {
                txType = TransactionEnums.TransactionType.SCRIPT
                txObj = {
                    ...txn.payload,
                    overview: txn.payload?.function || 'Unknown',
                } as TransactionTypes.ScriptObject
            }
            return {
                from: txn.sender,
                to: to,
                gasFee: txn.gas_used,
                hash: txn.hash,
                timestamp: Math.floor(txn.timestamp / 1000000),
                status: txn.success ? TransactionEnums.TransactionStatus.SUCCESS : TransactionEnums.TransactionStatus.FAILED,
                type: txType,
                data: txObj,
                version: txn.version,
            } as TransactionTypes.Transaction
        })
    }

    getAddressExplorer(explorerURL: string, address: PrimitiveHexString, type: ProviderEnums.Network): string {
        return `${explorerURL}/account/${address}?network=${type}`
    }

    getTransactionExplorer(explorerURL: string, hash: string, type: ProviderEnums.Network): string {
        return `${explorerURL}/txn/${hash}?network=${type}`
    }

    async transferCoin(
        amount: string,
        asset: AssetTypes.Asset,
        from: VaultTypes.AccountObject,
        to: string,
        chainId: string,
        gasLimit?: string,
        gasPrice?: string
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction & TransactionTypes.RawTransferTransaction>> {
        try {
            if (!from.address || !from.publicKeyHex)
                throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                    owner: 'Invalid information',
                })
            const nodeURL = AptosUtil.BaseNodeByChainInfo[chainId]
            const client = new AptosClient(nodeURL)
            const { assetId, decimals } = asset

            const fromPrivateKey = new HexString(Crypto.mergePrivateKey(from.publicKeyHex, from.privateKeyHex))
            const owner = new AptosAccount(fromPrivateKey.toUint8Array())

            const exactTokenName = this.getCoinExactName(assetId)

            if (!exactTokenName)
                throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                    assetId: 'Asset not found',
                })

            let transferPayload: Types.Nullable<TxnBuilderTypes.TransactionPayloadEntryFunction> = null

            const ourAmount = Number(Helper.Decimal.toDecimal(String(amount), decimals))

            const receiverResourcesResponse: Interfaces.ResponseData<AptosTypes.MoveResource[]> =
                await AptosUtil.AptosApiRequest.fetchAccountResourcesApi(nodeURL, to)
            if (receiverResourcesResponse.status === 'SUCCESS') {
                transferPayload = await AptosUtil.AptosApiRequest.transferCoinPayload(to, ourAmount, exactTokenName)
            } else if (
                receiverResourcesResponse.status === 'ERROR' &&
                (receiverResourcesResponse.error as any)?.data?.error_code === 'account_not_found'
            ) {
                transferPayload = await AptosUtil.AptosApiRequest.AptosAccountTransferPayload(to, ourAmount)
            }

            let ourGasPrice: string | number = AptosUtil.BaseGasPrice
            if (gasPrice) {
                ourGasPrice = gasPrice
            } else {
                const estimateGas = await this.estimateGasUnitPrice(chainId)
                if (estimateGas) {
                    ourGasPrice = estimateGas
                }
            }

            let ourGasLimit: string | number = AptosUtil.BaseMaxGasAmount
            if (gasLimit) {
                ourGasLimit = gasLimit
            }
            if (transferPayload) {
                const rawTxn: TxnBuilderTypes.RawTransaction = await AptosUtil.AptosApiRequest.createRawTransaction(
                    client,
                    owner,
                    transferPayload,
                    BigInt(ourGasPrice),
                    BigInt(ourGasLimit),
                    AptosUtil.BaseExpireTimestamp
                )
                const simulateTxn: AptosTypes.UserTransaction[] = await AptosUtil.AptosApiRequest.simulateTransaction(client, owner, rawTxn)
                if (simulateTxn && simulateTxn.length > 0) {
                    const { gas_used, expiration_timestamp_secs } = simulateTxn[0]
                    return {
                        data: {
                            amount,
                            asset,
                            from,
                            to,
                            chainId,
                            gasLimit: String(ourGasLimit),
                            gasPrice: String(ourGasPrice),
                            transactionFee: gas_used,
                            expirationTimestamp: expiration_timestamp_secs,
                            rawData: rawTxn,
                            transactionType: 'transfer',
                        },
                        status: 'SUCCESS',
                    }
                }
            }
            throw IError.ErrorConfigs[IError.ERROR_TYPE.DATA_NOT_FOUND].format()
        } catch (error) {
            console.log('[transferCoin]', error)
            return { error, status: 'ERROR' }
        }
    }

    async estimateGasUnitPrice(chainId: string): Promise<Types.Nullable<string>> {
        try {
            if (!AptosUtil.BaseNodeByChainInfo[chainId]) throw new Error('The chain id not found.')
            const res = await AptosUtil.AptosApiRequest.fetchEstimateApi(AptosUtil.BaseNodeByChainInfo[chainId])
            if (res.status === 'SUCCESS' && res.data?.gas_estimate) {
                return String(res.data.gas_estimate)
            } else {
                throw new Error('The gas price not found')
            }
        } catch (error) {
            console.log('[estimateGasUnitPrice]', error)
            return null
        }
    }

    async registerAsset(
        chainId: string,
        asset: AssetTypes.Asset,
        owner: VaultTypes.AccountObject,
        gasLimit?: string,
        gasPrice?: string
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction & TransactionTypes.RegisterAssetTransaction>> {
        try {
            if (!owner.address || !owner.publicKeyHex)
                throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                    owner: 'Invalid information',
                })
            const nodeURL = AptosUtil.BaseNodeByChainInfo[chainId]
            const client = new AptosClient(nodeURL)

            const fromPrivateKey = new HexString(Crypto.mergePrivateKey(owner.publicKeyHex, owner.privateKeyHex))
            const ourOwner = new AptosAccount(fromPrivateKey.toUint8Array())

            const params = {
                arguments: [],
                function: AptosUtil.AptosEnums.PayloadFunctionType.REGISTER,
                type: 'entry_function_payload',
                type_arguments: [`${AptosAsset.AptosApiRequest.getCoinAddressType(asset.assetId)}`],
            }

            let ourGasPrice: string | number = AptosUtil.BaseGasPrice
            if (gasPrice) {
                ourGasPrice = gasPrice
            } else {
                const estimateGas = await this.estimateGasUnitPrice(chainId)
                if (estimateGas) {
                    ourGasPrice = estimateGas
                }
            }

            let ourGasLimit: string | number = AptosUtil.BaseMaxGasAmount
            if (gasLimit) {
                ourGasLimit = gasLimit
            }
            const rawTxn: TxnBuilderTypes.RawTransaction = await client.generateTransaction(owner.address, params, {
                expiration_timestamp_secs: String(Math.floor(Date.now() / 1e3) + AptosUtil.BaseExpireTimestamp),
                gas_unit_price: String(ourGasPrice),
                max_gas_amount: String(ourGasLimit),
            })

            const simulateTxn: AptosTypes.UserTransaction[] = await AptosUtil.AptosApiRequest.simulateTransaction(client, ourOwner, rawTxn)
            return {
                data: {
                    type: 'gas',
                    rawData: rawTxn,
                    asset,
                    expirationTimestamp: simulateTxn?.[0].expiration_timestamp_secs,
                    gasLimit: simulateTxn?.[0].max_gas_amount,
                    gasPrice: simulateTxn?.[0].gas_unit_price,
                    transactionFee: simulateTxn?.[0].gas_used,
                    chainId,
                    from: owner,
                    to: '',
                    transactionType: 'script',
                } as TransactionTypes.SimulateTransaction & TransactionTypes.RegisterAssetTransaction,
                status: 'SUCCESS',
            }
        } catch (error) {
            console.log('[registerAsset]', error)
            return { error, status: 'ERROR' }
        }
    }

    async simulateTransaction(
        chainId: string,
        rawTxn: TxnBuilderTypes.RawTransaction,
        owner: VaultTypes.AccountObject,
        type: 'transfer' | 'script',
        gasLimit?: string,
        gasPrice?: string
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction<any>>> {
        try {
            if (!owner.address || !owner.publicKeyHex)
                throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                    owner: 'Invalid information',
                })
            const nodeURL = AptosUtil.BaseNodeByChainInfo[chainId]
            const client = new AptosClient(nodeURL)

            const fromPrivateKey = new HexString(Crypto.mergePrivateKey(owner.publicKeyHex, owner.privateKeyHex))
            const ourOwner = new AptosAccount(fromPrivateKey.toUint8Array())

            const simulateTxn: AptosTypes.UserTransaction[] = await AptosUtil.AptosApiRequest.simulateTransaction(client, ourOwner, rawTxn)
            if (simulateTxn.length > 0) {
                return {
                    status: 'SUCCESS',
                    data: {
                        chainId,
                        from: owner,
                        to: '',
                        transactionFee: simulateTxn[0].gas_used,
                        gasPrice: simulateTxn[0].gas_unit_price,
                        gasLimit: simulateTxn[0].max_gas_amount,
                        rawData: rawTxn,
                        expirationTimestamp: simulateTxn[0].expiration_timestamp_secs,
                        transactionType: type,
                    },
                }
            }
            throw IError.ErrorConfigs[IError.ERROR_TYPE.DATA_NOT_FOUND].format()
        } catch (error) {
            console.log('[SimulateTransaction]', error)
            return { error, status: 'ERROR' }
        }
    }

    async executeTransaction(chainId: string, rawTxn: any, owner: VaultTypes.AccountObject): Promise<Interfaces.ResponseData<string>> {
        try {
            const client = new AptosClient(AptosUtil.BaseNodeByChainInfo[chainId])
            const account = AptosAccount.fromAptosAccountObject(owner)
            const bcsTxn: Uint8Array = await AptosUtil.AptosApiRequest.generateBCSTransaction(account, rawTxn)
            const signedTxn: string = await AptosUtil.AptosApiRequest.submitSignedBCSTransaction(client, bcsTxn)
            return { data: signedTxn, status: 'SUCCESS' }
        } catch (error) {
            console.log('[simulateTransaction]', error)
            return { error, status: 'ERROR' }
        }
    }

    async checkReceiveNFTStatus(chainId: string, address: PrimitiveHexString): Promise<boolean> {
        try {
            const nodeURL = AptosUtil.BaseNodeByChainInfo[chainId]
            let status = false
            if (!nodeURL || !address)
                throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                    nodeURL,
                    address,
                })

            const resources = await AptosUtil.AptosApiRequest.fetchAccountResourcesApi(nodeURL, address)
            if (resources.status === 'SUCCESS' && resources.data && resources.data.length > 0) {
                status = (resources.data.find((n) => n.type === AptosUtil.AptosTokenStore)?.data as any)?.direct_transfer
            }
            return status
        } catch (error) {
            console.log('[checkReceiveNFTStatus]', error)
            return false
        }
    }
    async allowReceiveNFT(
        chainId: string,
        owner: VaultTypes.AccountObject,
        allow: boolean
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction<any>>> {
        try {
            if (!owner.address || !owner.publicKeyHex)
                throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                    owner: 'Invalid information',
                })

            const client = new AptosClient(AptosUtil.BaseNodeByChainInfo[chainId])
            const transactionBuilder = new TransactionBuilderABI(AptosUtil.TOKEN_ABIS.map((abi) => new HexString(abi).toUint8Array()))
            const payload = transactionBuilder.buildTransactionPayload('0x3::token::opt_in_direct_transfer', [], [allow])
            const rawTxn: TxnBuilderTypes.RawTransaction = await client.generateRawTransaction(new AptosHexString(owner.address), payload, {
                expireTimestamp: BigInt(100),
            })

            const fromPrivateKey = new HexString(Crypto.mergePrivateKey(owner.publicKeyHex, owner.privateKeyHex))
            const ourOwner = new AptosAccount(fromPrivateKey.toUint8Array())
            const simulateTxn: AptosTypes.UserTransaction[] = await AptosUtil.AptosApiRequest.simulateTransaction(client, ourOwner, rawTxn)
            return {
                data: {
                    rawData: rawTxn,
                    gasLimit: simulateTxn?.[0].max_gas_amount,
                    gasPrice: simulateTxn?.[0].gas_unit_price,
                    transactionFee: simulateTxn?.[0].gas_used,
                    from: owner,
                    to: '',
                    chainId,
                    transactionType: 'script',
                } as TransactionTypes.SimulateTransaction,
                status: 'SUCCESS',
            }
        } catch (error) {
            console.log('[allowReceiveNFT]', error)
            return { error, status: 'ERROR' }
        }
    }
    async transferNFT(
        chainId: string,
        Nft: AssetTypes.Nft,
        amount: string,
        from: VaultTypes.AccountObject,
        to: string,
        gasLimit?: string | undefined,
        gasPrice?: string | undefined
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction<any> & TransactionTypes.RawTransferNFTTransaction>> {
        try {
            if (!from.address || !from.publicKeyHex)
                throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                    from: 'Invalid information',
                })

            if (Nft.creator.length === 0)
                throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                    NFTCreator: 'Invalid information',
                })

            const client = new AptosClient(AptosUtil.BaseNodeByChainInfo[chainId])

            const transactionBuilder = new TransactionBuilderABI(AptosUtil.TOKEN_ABIS.map((abi) => new HexString(abi).toUint8Array()))

            const { name, collection } = Nft
            const payload = transactionBuilder.buildTransactionPayload(
                '0x3::token_transfers::offer_script',
                [],
                [to, Nft.creator, collection, name, 0, amount]
            )

            let ourGasPrice: string | number = AptosUtil.BaseGasPrice
            if (gasPrice) {
                ourGasPrice = gasPrice
            } else {
                const estimateGas = await this.estimateGasUnitPrice(chainId)
                if (estimateGas) {
                    ourGasPrice = estimateGas
                }
            }

            let ourGasLimit: string | number = AptosUtil.BaseMaxGasAmount
            if (gasLimit) {
                ourGasLimit = gasLimit
            }

            const rawTxn: TxnBuilderTypes.RawTransaction = await client.generateRawTransaction(new AptosHexString(from.address), payload, {
                gasUnitPrice: BigInt(ourGasPrice),
                maxGasAmount: BigInt(ourGasLimit),
                expireTimestamp: BigInt(Math.floor(Date.now() / 1e3) + AptosUtil.BaseExpireTimestamp),
            })

            const fromPrivateKey = new HexString(Crypto.mergePrivateKey(from.publicKeyHex, from.privateKeyHex))
            const ourOwner = new AptosAccount(fromPrivateKey.toUint8Array())
            const simulateTxn: AptosTypes.UserTransaction[] = await AptosUtil.AptosApiRequest.simulateTransaction(client, ourOwner, rawTxn)
            if (simulateTxn.length > 0) {
                return {
                    data: {
                        amount,
                        asset: Nft,
                        from,
                        to,
                        chainId,
                        gasLimit: simulateTxn[0].max_gas_amount,
                        gasPrice: simulateTxn[0].gas_unit_price,
                        transactionFee: simulateTxn[0].gas_used,
                        rawData: rawTxn,
                        expirationTimestamp: simulateTxn[0].expiration_timestamp_secs,
                        transactionType: 'transfer-nft',
                    },
                    status: 'SUCCESS',
                }
            }
            return {
                error: simulateTxn,
                status: 'ERROR',
            }
        } catch (error) {
            console.log('[transferNFT]', error)
            return { error, status: 'ERROR' }
        }
    }
    async fundAccount(chainId: string, to: string, faucetURL: string): Promise<boolean> {
        try {
            if (!faucetURL) throw new Error('Faucet URL not found')
            const nodeURL = AptosUtil.BaseNodeByChainInfo[chainId]
            const faucetClient = new FaucetClient(nodeURL, faucetURL) // <:!:section_1
            const result = await faucetClient.fundAccount(to, 1_000_000_000)
            if (result.length > 0) return true
            return false
        } catch (error) {
            console.log('[fundAccount]', error)
            return false
        }
    }
}
