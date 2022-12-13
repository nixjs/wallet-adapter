import {
    getObjectExistsResponse,
    JsonRpcProvider,
    SuiMoveObject,
    SuiObject,
    getTransferObjectTransaction,
    getTransferSuiTransaction,
    getTransactionData,
    getExecutionStatusType,
    getPaySuiTransaction,
    getMoveObject,
    getMoveCallTransaction,
    SuiExecuteTransactionResponse,
    getObjectId,
    OwnedObjectRef,
    LocalTxnDataSerializer,
    ExecuteTransactionRequestType,
    Coin as CoinAPI,
    SUI_TYPE_ARG,
    Ed25519Keypair,
    RawSigner,
    Base64DataBuffer,
    TransactionEffects,
} from '@mysten/sui.js'
import { Types } from '@nixjs23n6/types'
import { SUI, Crypto } from '@nixjs23n6/hd-wallet-adapter'
import { SUIUtil, TransactionTypes, TransactionEnums, HexString, VaultTypes, Helper } from '@nixjs23n6/utilities-adapter'
import { RateLimit } from 'async-sema'

export const SUI_SYSTEM_STATE_OBJECT_ID = '0x0000000000000000000000000000000000000005'
export class Provider {
    query: QueryProvider
    tx: TxProvider

    constructor(nodeURL: string, faucetURL?: string) {
        this.query = new QueryProvider(nodeURL, faucetURL)
        this.tx = new TxProvider(nodeURL, faucetURL)
    }

    async transferCoin(
        symbol: string,
        amount: number,
        from: VaultTypes.AccountObject,
        to: string
    ): Promise<
        Types.Nullable<{
            rawData: Base64DataBuffer
            gasLimit: string
            transactionFee: string
        }>
    > {
        if (from.address) {
            const coins = (await this.query.getOwnedCoins(from.address)).filter((coin) => coin.symbol === symbol)
            if (coins.length === 0) {
                throw new Error('No coin to transfer')
            }

            if (symbol === GAS_SYMBOL) {
                return await this.tx.transferSui(coins, amount, from, to)
            } else {
                return await this.tx.transferCoin(coins, amount, from, to)
            }
        }
        return null
    }

    async transferObject(objectId: string, recipient: string, vault: SUI.SUIVault) {
        const object = (await this.query.getOwnedObjects(vault.address())).find((object) => object.reference.objectId === objectId)
        if (!object) {
            throw new Error('No object to transfer')
        }
        await this.tx.transferObject(objectId, recipient, vault)
    }

    // async mintExampleNft(vault: SUI.SUIVault) {
    //     const gasObject = await this.query.getGasObject(vault.address(), MINT_EXAMPLE_NFT_MOVE_CALL.gasBudget)
    //     await this.tx.mintExampleNft(vault, gasObject ? gasObject.objectId : undefined)
    // }

    // async executeMoveCall(tx: MoveCallTransaction, vault: SUI.SUIVault) {
    //     const gasObject = await this.query.getGasObject(vault.address(), MINT_EXAMPLE_NFT_MOVE_CALL.gasBudget)
    //     return await this.tx.executeMoveCall(tx, vault, gasObject ? gasObject.objectId : undefined)
    // }
}

export class QueryProvider {
    provider: JsonRpcProvider

    constructor(queryEndpoint: string, faucetURL?: string) {
        this.provider = new JsonRpcProvider(queryEndpoint, {
            skipDataValidation: true,
            faucetURL: faucetURL,
        })
    }

    public async getActiveValidators(): Promise<SuiMoveObject[]> {
        const contents = await this.provider.getObject(SUI_SYSTEM_STATE_OBJECT_ID)
        const data = (contents.details as SuiObject).data
        const validators = (data as SuiMoveObject).fields.validators
        const activeValidators = (validators as SuiMoveObject).fields.active_validators
        return activeValidators as SuiMoveObject[]
    }

    public async getOwnedObjects(address: string): Promise<SuiObject[]> {
        const objectInfos = await this.provider.getObjectsOwnedByAddress(address)
        const objectIds = objectInfos.map((obj) => obj.objectId)
        const resps = await this.provider.getObjectBatch(objectIds)
        return resps.filter((resp) => resp.status === 'Exists').map((resp) => getObjectExistsResponse(resp) as SuiObject)
    }

    public async getOwnedCoins(address: string): Promise<SUIUtil.CoinObject[]> {
        const objects = await this.getOwnedObjects(address)
        const res = objects
            .map((item) => ({
                id: item.reference.objectId,
                object: getMoveObject(item),
            }))
            .filter((item) => item.object && SUIUtil.Coin.isCoin(item.object))
            .map((item) => SUIUtil.Coin.getCoinObject(item.object as SuiMoveObject))
        return res
    }

    public async getGasObject(address: string, gasBudget: number): Promise<SUIUtil.CoinObject | undefined> {
        // TODO: Try to merge coins in this case if gas object is undefined.
        const coins = await this.getOwnedCoins(address)
        return coins.filter((coin) => coin.symbol === GAS_SYMBOL).find((coin) => coin.balance >= gasBudget)
    }

    public async getOwnedNfts(address: string): Promise<SUIUtil.NftObject[]> {
        const objects = await this.getOwnedObjects(address)
        const res = objects
            .map((item) => ({
                id: item.reference.objectId,
                object: getMoveObject(item),
                previousTransaction: item.previousTransaction,
            }))
            .filter((item) => item.object && SUIUtil.Nft.isNft(item.object))
            .map((item) => {
                const obj = item.object as SuiMoveObject
                return SUIUtil.Nft.getNftObject(obj, item.previousTransaction)
            })
        return res
    }

    public async getTransactionsForAddress(address: string): Promise<TransactionTypes.Transaction[]> {
        const txs = await this.provider.getTransactionsForAddress(address)
        if (txs.length === 0 || !txs[0]) {
            return []
        }
        const digests = txs.filter((value, index, self) => self.indexOf(value) === index)

        const effects = await this.provider.getTransactionWithEffectsBatch(digests)
        const results = []

        const limit = RateLimit(50) // rps
        for (const effect of effects) {
            const data = getTransactionData(effect.certificate)
            await limit()
            for (const tx of data.transactions) {
                const transferSui = getTransferSuiTransaction(tx)
                const transferObject = getTransferObjectTransaction(tx)
                const moveCall = getMoveCallTransaction(tx)
                const paySui = getPaySuiTransaction(tx)
                if (transferSui) {
                    results.push({
                        timestamp: effect.timestamp_ms,
                        status:
                            getExecutionStatusType(effect) === 'success'
                                ? TransactionEnums.TransactionStatus.SUCCESS
                                : TransactionEnums.TransactionStatus.FAILED,
                        hash: effect.certificate.transactionDigest,
                        gasFee:
                            effect.effects.gasUsed.computationCost +
                            effect.effects.gasUsed.storageCost -
                            effect.effects.gasUsed.storageRebate,
                        from: data.sender,
                        to: transferSui.recipient,
                        data: {
                            type: 'coin',
                            balance: String(transferSui.amount ? BigInt(transferSui.amount) : BigInt(0)),
                            symbol: 'SUI',
                        } as TransactionTypes.CoinObject,
                        type: address === data.sender ? TransactionEnums.TransactionType.SEND : TransactionEnums.TransactionType.RECEIVE,
                    })
                } else if (paySui) {
                    const coin = paySui.coins[0]
                    const resp = await this.provider.getObject(coin.objectId)
                    const obj = getMoveObject(resp)
                    let txObj: Types.Undefined<TransactionTypes.TransactionObject>
                    if (obj && SUIUtil.Coin.isCoin(obj)) {
                        const coinObj = SUIUtil.Coin.getCoinObject(obj)
                        txObj = {
                            type: 'coin',
                            symbol: coinObj.symbol,
                            balance: String(coinObj.balance),
                        } as TransactionTypes.CoinObject
                    } else if (obj && SUIUtil.Nft.isNft(obj)) {
                        const nftObject = SUIUtil.Nft.getNftObject(obj, undefined)
                        txObj = {
                            type: 'nft',
                            name: nftObject.name,
                            description: nftObject.description,
                            url: nftObject.url,
                        } as TransactionTypes.NFTObject
                    }
                    if (txObj) {
                        results.push({
                            timestamp: effect.timestamp_ms,
                            status:
                                getExecutionStatusType(effect) === 'success'
                                    ? TransactionEnums.TransactionStatus.SUCCESS
                                    : TransactionEnums.TransactionStatus.FAILED,
                            hash: effect.certificate.transactionDigest,
                            gasFee:
                                effect.effects.gasUsed.computationCost +
                                effect.effects.gasUsed.storageCost -
                                effect.effects.gasUsed.storageRebate,
                            from: data.sender,
                            to: paySui.recipients[0],
                            data: txObj,
                            type:
                                address === data.sender ? TransactionEnums.TransactionType.SEND : TransactionEnums.TransactionType.RECEIVE,
                        })
                    }
                } else if (transferObject) {
                    const resp = await this.provider.getObject(transferObject.objectRef.objectId)
                    const obj = getMoveObject(resp)
                    let txObj: Types.Undefined<TransactionTypes.TransactionObject>
                    // TODO: for now provider does not support to get histrorical object data,
                    // so the record here may not be accurate.
                    if (obj && SUIUtil.Coin.isCoin(obj)) {
                        const coinObj = SUIUtil.Coin.getCoinObject(obj)
                        txObj = {
                            type: 'coin',
                            symbol: coinObj.symbol,
                            balance: String(coinObj.balance),
                        }
                    } else if (obj && SUIUtil.Nft.isNft(obj)) {
                        const nftObject = SUIUtil.Nft.getNftObject(obj, undefined)
                        txObj = {
                            type: 'nft',
                            name: nftObject.name,
                            description: nftObject.description,
                            url: nftObject.url,
                        } as TransactionTypes.NFTObject
                    }
                    // TODO: handle more object types
                    if (txObj) {
                        results.push({
                            timestamp: effect.timestamp_ms,
                            status:
                                getExecutionStatusType(effect) === 'success'
                                    ? TransactionEnums.TransactionStatus.SUCCESS
                                    : TransactionEnums.TransactionStatus.FAILED,
                            hash: effect.certificate.transactionDigest,
                            gasFee:
                                effect.effects.gasUsed.computationCost +
                                effect.effects.gasUsed.storageCost -
                                effect.effects.gasUsed.storageRebate,
                            from: data.sender,
                            to: transferObject.recipient,
                            data: txObj,
                            type:
                                address === data.sender ? TransactionEnums.TransactionType.SEND : TransactionEnums.TransactionType.RECEIVE,
                        })
                    }
                } else if (moveCall) {
                    let txObj: Types.Undefined<TransactionTypes.TransactionObject>
                    if (moveCall.function === 'mint' && moveCall.arguments && moveCall.arguments?.length > 0) {
                        txObj = {
                            type: 'nft',
                            name: moveCall.arguments[0],
                            description: moveCall.arguments[1],
                            url: moveCall.arguments[2],
                        } as TransactionTypes.NFTObject
                    } else
                        txObj = {
                            type: 'move_call',
                            packageObjectId: moveCall.package.objectId,
                            module: moveCall.module,
                            function: moveCall.function,
                            arguments: moveCall.arguments?.map((arg) => JSON.stringify(arg)),
                            created: [],
                            mutated: [],
                            overview: moveCall.function || 'Unknown',
                        } as TransactionTypes.ScriptObject
                    results.push({
                        timestamp: effect.timestamp_ms,
                        status:
                            getExecutionStatusType(effect) === 'success'
                                ? TransactionEnums.TransactionStatus.SUCCESS
                                : TransactionEnums.TransactionStatus.FAILED,
                        hash: effect.certificate.transactionDigest,
                        gasFee:
                            effect.effects.gasUsed.computationCost +
                            effect.effects.gasUsed.storageCost -
                            effect.effects.gasUsed.storageRebate,
                        from: data.sender,
                        to: moveCall.package.objectId,
                        data: txObj,
                        type:
                            moveCall.function === 'mint' ? TransactionEnums.TransactionType.MINT : TransactionEnums.TransactionType.SCRIPT,
                    })
                }
            }
        }
        return results
    }

    public async getTxObjects(objectRefs: OwnedObjectRef[] | undefined): Promise<TransactionTypes.TransactionObject[]> {
        if (!objectRefs) {
            return []
        }
        const objectIds = objectRefs.map((obj) => obj.reference.objectId)
        const resps = await this.provider.getObjectBatch(objectIds)
        const objects = resps.map((resp) => {
            const existResp = getObjectExistsResponse(resp)
            if (existResp) {
                const obj = getMoveObject(existResp)
                if (obj) {
                    if (SUIUtil.Coin.isCoin(obj)) {
                        const coinObj = SUIUtil.Coin.getCoinObject(obj)
                        return {
                            type: 'coin',
                            symbol: coinObj.symbol,
                            balance: String(coinObj.balance),
                        } as TransactionTypes.CoinObject
                        //  type: 'coin',
                        //     symbol: coinObj.symbol,
                        //     balance: String(coinObj.balance),
                        // }
                    } else if (SUIUtil.Nft.isNft(obj)) {
                        return {
                            type: 'nft',
                            ...SUIUtil.Nft.getNftObject(obj),
                        } as TransactionTypes.NFTObject
                    }
                }
            }
            return {
                type: 'object_id',
                id: getObjectId(resp),
                overview: getObjectId(resp),
            } as TransactionTypes.ScriptObject
        })
        return objects
    }

    public async getNormalizedMoveFunction(objectId: string, moduleName: string, functionName: string) {
        return await this.provider.getNormalizedMoveFunction(objectId, moduleName, functionName)
    }
}

export const DEFAULT_GAS_BUDGET_FOR_SPLIT = 2000
export const DEFAULT_GAS_BUDGET_FOR_MERGE = 1000
export const DEFAULT_GAS_BUDGET_FOR_TRANSFER = 100
export const DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI = 100
export const DEFAULT_GAS_BUDGET_FOR_STAKE = 1000
export const GAS_SYMBOL = 'SUI'
export const DEFAULT_NFT_TRANSFER_GAS_FEE = 450
export const MINT_EXAMPLE_NFT_MOVE_CALL = {
    packageObjectId: '0x2',
    module: 'devnet_nft',
    function: 'mint',
    typeArguments: [],
    arguments: [
        'Suiet NFT',
        'An NFT created by Suiet',
        'https://xc6fbqjny4wfkgukliockypoutzhcqwjmlw2gigombpp2ynufaxa.arweave.net/uLxQwS3HLFUailocJWHupPJxQsli7aMgzmBe_WG0KC4',
    ],
    gasBudget: 10000,
}

export class TxProvider {
    provider: JsonRpcProvider
    serializer: LocalTxnDataSerializer

    constructor(nodeURL: string, faucetURL?: string) {
        this.provider = new JsonRpcProvider(nodeURL, {
            skipDataValidation: true,
            faucetURL: faucetURL,
        })
        this.serializer = new LocalTxnDataSerializer(this.provider)
    }

    async transferObject(objectId: string, recipient: string, vault: SUI.SUIVault) {
        const data = await this.serializer.serializeToBytes(vault.address(), {
            kind: 'transferObject',
            data: {
                gasBudget: DEFAULT_GAS_BUDGET_FOR_TRANSFER,
                objectId,
                recipient,
            },
        })
        const signedTx = await vault.signTransaction({
            data: HexString.fromUint8Array(data.getData()),
        })
        // TODO: handle response
        // await executeTransaction(this.provider, signedTx)
    }

    public async transferCoin(
        coins: SUIUtil.CoinObject[],
        amount: number,
        from: VaultTypes.AccountObject,
        to: string
    ): Promise<
        Types.Nullable<{
            rawData: Base64DataBuffer
            gasLimit: string
            transactionFee: string
        }>
    > {
        try {
            if (!from.address || !from.publicKeyHex) throw new Error('Sender info not found')
            const objects = coins.map((coin) => coin.object)
            const inputCoins = await CoinAPI.selectCoinSetWithCombinedBalanceGreaterThanOrEqual(objects, BigInt(amount))
            if (inputCoins.length === 0) {
                const totalBalance = CoinAPI.totalBalance(objects)
                throw new Error(
                    `Coin balance ${totalBalance.toString()} is not sufficient to cover the transfer amount ` +
                        `${amount.toString()}. Try reducing the transfer amount to ${totalBalance}.`
                )
            }
            const inputCoinIDs = inputCoins.map((c) => CoinAPI.getID(c))
            const gasBudget = SUIUtil.Coin.estimatedGasCostForPay(inputCoins.length)
            const data = await this.serializer.serializeToBytes(from.address, {
                data: {
                    inputCoins: inputCoinIDs,
                    recipients: [to],
                    amounts: [Number(amount)],
                    gasBudget,
                },
                kind: 'pay',
            })
            return {
                rawData: data,
                gasLimit: String(gasBudget),
                transactionFee: '',
            }
        } catch (error) {
            return null
        }
    }

    // public async transferSui(coins: SUIUtil.CoinObject[], amount: number, recipient: string, vault: SUI.SUIVault) {
    //     const address = vault.address()
    //     const actualAmount = BigInt(amount + DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI)
    //     const objects = coins.map((coin) => coin.object)
    //     const coinsWithSufficientAmount = await CoinAPI.selectCoinsWithBalanceGreaterThanOrEqual(objects, actualAmount)
    //     if (coinsWithSufficientAmount.length > 0) {
    //         const data = await this.serializer.newTransferSui(address, {
    //             suiObjectId: CoinAPI.getID(coinsWithSufficientAmount[0]),
    //             gasBudget: DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI,
    //             recipient,
    //             amount: Number(amount),
    //         })
    //         const signedTx = await vault.signTransaction({ data: HexString.fromUint8Array(data.getData()) })
    //         // TODO: handle response
    //         await executeTransaction(this.provider, signedTx)
    //         return
    //     }
    //     // If there is not a coin with sufficient balance, use the pay API
    //     const gasCostForPay = SUIUtil.Coin.estimatedGasCostForPay(coins.length)
    //     let inputCoins = await SUIUtil.Coin.assertAndGetSufficientCoins(objects, BigInt(amount), gasCostForPay)

    //     if (inputCoins.length === coins.length) {
    //         // We need to pay for an additional `transferSui` transaction now, assert that we have sufficient balance
    //         // to cover the additional cost
    //         await SUIUtil.Coin.assertAndGetSufficientCoins(objects, BigInt(amount), gasCostForPay + DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI)

    //         // Split the gas budget from the coin with largest balance for simplicity. We can also use any coin
    //         // that has amount greater than or equal to `DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI * 2`
    //         const coinWithLargestBalance = inputCoins[inputCoins.length - 1]

    //         if (
    //             // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    //             CoinAPI.getBalance(coinWithLargestBalance)! <
    //             gasCostForPay + DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI
    //         ) {
    //             throw new Error(`None of the coins has sufficient balance to cover gas fee`)
    //         }

    //         const data = await this.serializer.newTransferSui(address, {
    //             suiObjectId: CoinAPI.getID(coinWithLargestBalance),
    //             gasBudget: DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI,
    //             recipient,
    //             amount: gasCostForPay,
    //         })
    //         const signedTx = await vault.signTransaction({ data: HexString.fromUint8Array(data.getData()) })
    //         // TODO: handle response
    //         await executeTransaction(this.provider, signedTx)

    //         inputCoins = await this.provider.selectCoinSetWithCombinedBalanceGreaterThanOrEqual(address, BigInt(amount), SUI_TYPE_ARG, [])
    //     }
    //     const data = await this.serializer.newPay(address, {
    //         inputCoins: inputCoins.map((c) => CoinAPI.getID(c)),
    //         recipients: [recipient],
    //         amounts: [Number(amount)],
    //         gasBudget: gasCostForPay,
    //     })
    //     const signedTx = await vault.signTransaction({ data: HexString.fromUint8Array(data.getData()) })
    //     // TODO: handle response
    //     await executeTransaction(this.provider, signedTx)
    // }

    public async transferSui(
        coins: SUIUtil.CoinObject[],
        amount: number,
        from: VaultTypes.AccountObject,
        to: string
    ): Promise<
        Types.Nullable<{
            rawData: Base64DataBuffer
            gasLimit: string
            transactionFee: string
        }>
    > {
        try {
            if (!from.address || !from.publicKeyHex) throw new Error('Owner info not found')
            const actualAmount = BigInt(amount + DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI)
            const objects = coins.map((coin) => coin.object)
            const coinsWithSufficientAmount = await CoinAPI.selectCoinsWithBalanceGreaterThanOrEqual(objects, actualAmount)
            if (coinsWithSufficientAmount.length > 0) {
                const data = await this.serializer.serializeToBytes(from.address, {
                    kind: 'transferSui',
                    data: {
                        amount: amount,
                        gasBudget: DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI,
                        recipient: to,
                        suiObjectId: CoinAPI.getID(coinsWithSufficientAmount[0]),
                    },
                })

                const simulateTxn: TransactionEffects = await this.provider.dryRunTransaction(data.toString())
                console.log(simulateTxn && simulateTxn.status.status === 'success')
                if (simulateTxn && simulateTxn.status.status === 'success') {
                    return {
                        rawData: data,
                        gasLimit: String(DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI),
                        transactionFee: String(
                            simulateTxn.gasUsed.computationCost + simulateTxn.gasUsed.storageCost - simulateTxn.gasUsed.storageRebate
                        ),
                    }
                }
                return {
                    rawData: data,
                    gasLimit: String(DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI),
                    transactionFee: '',
                }
            }
            const gasCostForPay = SUIUtil.Coin.estimatedGasCostForPay(coins.length)
            let inputCoins = await SUIUtil.Coin.assertAndGetSufficientCoins(objects, BigInt(amount), gasCostForPay)

            if (inputCoins.length === coins.length) {
                // We need to pay for an additional `transferSui` transaction now, assert that we have sufficient balance
                // to cover the additional cost
                await SUIUtil.Coin.assertAndGetSufficientCoins(objects, BigInt(amount), gasCostForPay + DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI)

                // Split the gas budget from the coin with largest balance for simplicity. We can also use any coin
                // that has amount greater than or equal to `DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI * 2`
                const coinWithLargestBalance = inputCoins[inputCoins.length - 1]

                if (
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    CoinAPI.getBalance(coinWithLargestBalance)! <
                    gasCostForPay + DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI
                ) {
                    throw new Error(`None of the coins has sufficient balance to cover gas fee`)
                }

                const data = await this.serializer.serializeToBytes(from.address, {
                    kind: 'transferSui',
                    data: {
                        suiObjectId: CoinAPI.getID(coinWithLargestBalance),
                        gasBudget: DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI,
                        recipient: to,
                        amount: gasCostForPay,
                    },
                })
                const keypair = new Ed25519Keypair({
                    publicKey: new HexString(from.publicKeyHex).toUint8Array(),
                    secretKey: new HexString(Crypto.mergePrivateKey(from.publicKeyHex, from.privateKeyHex)).toUint8Array(),
                })
                const signer = new RawSigner(keypair, this.provider)
                await signer.signAndExecuteTransaction(data)
                inputCoins = await this.provider.selectCoinSetWithCombinedBalanceGreaterThanOrEqual(
                    from.address,
                    BigInt(amount),
                    SUI_TYPE_ARG,
                    []
                )
            }
            const data = await this.serializer.serializeToBytes(from.address, {
                kind: 'pay',
                data: {
                    inputCoins: inputCoins.map((c) => CoinAPI.getID(c)),
                    recipients: [to],
                    amounts: [Number(amount)],
                    gasBudget: gasCostForPay,
                },
            })
            const simulateTxn: TransactionEffects = await this.provider.dryRunTransaction(data.toString())
            if (simulateTxn && simulateTxn.status.status === 'success') {
                return {
                    rawData: data,
                    gasLimit: String(gasCostForPay),
                    transactionFee: String(
                        simulateTxn.gasUsed.computationCost + simulateTxn.gasUsed.storageCost - simulateTxn.gasUsed.storageRebate
                    ),
                }
            }
            return {
                rawData: data,
                gasLimit: String(gasCostForPay),
                transactionFee: '',
            }
        } catch (error) {
            return null
        }
    }

    // public async executeMoveCall(tx: MoveCallTransaction, vault: SUI.SUIVault, gasObjectId: string | undefined) {
    //     const address = vault.address()
    //     if (!tx.gasPayment) {
    //         tx.gasPayment = gasObjectId
    //     }
    //     const data = await this.serializer.newMoveCall(address, tx)
    //     const signedTx = await vault.signTransaction({ data: HexString.fromUint8Array(data.getData()) })
    //     // TODO: handle response
    //     return await executeTransaction(this.provider, signedTx)
    // }

    // public async executeSerializedMoveCall(txBytes: Uint8Array, vault: SUI.SUIVault) {
    //     const signedTx = await vault.signTransaction({
    //         data: HexString.fromUint8Array(txBytes),
    //     })
    //     // TODO: handle response
    //     await executeTransaction(this.provider, signedTx)
    // }

    // public async mintExampleNft(vault: SUI.SUIVault, gasObjectId: string | undefined) {
    //     await this.executeMoveCall(MINT_EXAMPLE_NFT_MOVE_CALL, vault, gasObjectId)
    // }
}

export async function executeTransaction(
    provider: JsonRpcProvider,
    owner: VaultTypes.AccountObject,
    data: Base64DataBuffer,
    requestType: ExecuteTransactionRequestType = 'WaitForLocalExecution'
): Promise<Types.Nullable<SuiExecuteTransactionResponse>> {
    try {
        if (!owner.address || !owner.publicKeyHex) throw new Error('Owner info not found')
        const keypair = new Ed25519Keypair({
            publicKey: new HexString(owner.publicKeyHex).toUint8Array(),
            secretKey: new HexString(Crypto.mergePrivateKey(owner.publicKeyHex, owner.privateKeyHex)).toUint8Array(),
        })
        const signer = new RawSigner(keypair, provider)
        const txn = await signer.signAndExecuteTransaction(data, requestType)
        return txn
    } catch (error) {
        console.log('[executeTransaction]', error)
        return null
    }
}
