import { Interfaces, Types } from '@nixjs23n6/types'
import produce from 'immer'
import {
    VaultTypes,
    IError,
    EvmUtil,
    TransactionTypes,
    TransactionEnums,
    AssetTypes,
    Helper,
    NftEnums,
    PrimitiveHexString,
} from '@nixjs23n6/utilities-adapter'
import { Contract, providers, utils, Wallet, BigNumber, PopulatedTransaction } from 'ethers'
import BigNumberJs from 'bignumber.js'
import { EmvGasUtil } from '../gas'
import { EvmNativeConfig } from '../evmNativeConfig'
import { EvmTypes } from '../types'
import { ERC721_ABI, ERC1155_ABI } from '../abis'
import { createEndpoint } from '../utils'

export class EvmTransaction {
    #chainId: PrimitiveHexString
    #config: EvmTypes.Config
    #provider: providers.BaseProvider

    constructor(chainId: PrimitiveHexString, config: EvmTypes.Config) {
        this.#chainId = chainId
        this.#config = config
        this.#provider = new providers.JsonRpcProvider(createEndpoint(this.#config[this.#chainId]))
    }

    public get chainId(): string {
        return this.#chainId
    }

    public get getFeeDescription() {
        return EmvGasUtil.FeeDescriptions
    }

    public get networkCongestion() {
        return EmvGasUtil.NetworkCongestionThresholds
    }

    public get assets(): AssetTypes.Asset[] {
        const assets = EvmUtil.Erc20Tokens.filter((t) => t.chainId === Number(this.#chainId)).map(
            ({ address, chainId, decimals, logoURI, name, symbol }) =>
                ({
                    assetId: address,
                    decimals,
                    isNative: EvmNativeConfig[chainId].native.assetId.toLowerCase() === name.toLowerCase(),
                    logoUrl: logoURI,
                    name,
                    symbol,
                } as AssetTypes.Asset)
        )
        if (!assets) return []
        return assets
    }

    #getWallet(owner: VaultTypes.AccountObject): Wallet {
        if (!owner.publicKeyHex || !owner.privateKeyHex)
            throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                owner: 'Invalid information',
            })
        return new Wallet(owner.privateKeyHex, this.#provider)
    }

    async #estimateFee(speed: TransactionEnums.GasPriceTypes = TransactionEnums.GasPriceTypes.AVERAGE) {
        const { gasPrice, lastBaseFeePerGas, maxFeePerGas, maxPriorityFeePerGas } = await this.#provider.getFeeData()
        const params: { gasFee: string; gasPrice?: string; maxFeePerGas?: string; maxPriorityFeePerGas?: string; eip1559?: boolean } = {
            gasFee: '0',
            eip1559: true,
        }

        let baseFee: BigNumber

        if (maxFeePerGas && maxPriorityFeePerGas) {
            if (!lastBaseFeePerGas) {
                baseFee = maxFeePerGas.sub(maxPriorityFeePerGas)
            } else {
                baseFee = lastBaseFeePerGas
            }

            let _maxFeePerGas = EmvGasUtil.getBaseFeeBasedOnType(baseFee.toString(), speed)
            const _maxPriorityFeePerGas = EmvGasUtil.getPriorityFeeBasedOnType(
                baseFee?.toString() as string,
                gasPrice!?.toString(),
                speed
            ).toString()
            if (_maxPriorityFeePerGas && BigNumberJs(_maxPriorityFeePerGas).gt(_maxFeePerGas)) {
                _maxFeePerGas = _maxPriorityFeePerGas
            }

            params.eip1559 = true
            params.maxFeePerGas = _maxFeePerGas
            params.maxPriorityFeePerGas = _maxPriorityFeePerGas
            params.gasPrice = _maxFeePerGas
            params.gasFee = EmvGasUtil.getBaseFeeBasedOnType(baseFee.toString()!, speed)
        } else {
            params.eip1559 = false
            params.gasPrice = EmvGasUtil.getGasBasedOnType(gasPrice!.toString(), speed) // wei
            params.gasFee = params.gasPrice.toString()
        }
        return params
    }

    getGasCostBySpeed(gasLimit: string, speed: TransactionEnums.GasPriceTypes, gasPrice: BigNumber, baseFee: Types.Nullable<BigNumber>) {
        const params: EvmTypes.GasCost = {
            gasLimit: Helper.Decimal.toDecimal(utils.formatUnits(gasLimit, 'gwei'), EvmUtil.BaseDecimals),
            eip1559: false,
            estimateFee: '0',
        }

        if (baseFee) {
            const _baseFee = baseFee!.toString()
            params.maxFeePerGas = EmvGasUtil.getBaseFeeBasedOnType(_baseFee, speed).toString()
            params.maxPriorityFeePerGas = EmvGasUtil.getPriorityFeeBasedOnType(_baseFee, gasPrice.toString(), speed).toString()
            params.estimateFee = EmvGasUtil.calculateFee(EmvGasUtil.getBaseFeeBasedOnType(_baseFee, speed), gasLimit.toString(), true)
            params.gasPrice = Helper.Decimal.toDecimal(utils.formatUnits(params.maxFeePerGas), EvmUtil.BaseDecimals)
        } else {
            params.gasPrice = Helper.Decimal.toDecimal(utils.formatUnits(gasPrice), EvmUtil.BaseDecimals)
            params.estimateFee = EmvGasUtil.calculateFee(
                EmvGasUtil.getBaseFeeBasedOnType(gasPrice.toString(), speed),
                gasLimit.toString(),
                true
            )
        }
        return params
    }

    async getGasCosts(gasLimit: string): Promise<Record<TransactionEnums.GasPriceTypes, EvmTypes.GasCost>> {
        const { gasPrice, lastBaseFeePerGas, maxFeePerGas, maxPriorityFeePerGas } = await this.#provider.getFeeData()
        let _baseFee: Types.Nullable<BigNumber> = null
        if (maxFeePerGas && maxPriorityFeePerGas) {
            // EIP 1559
            if (!lastBaseFeePerGas) {
                _baseFee = maxFeePerGas.sub(maxPriorityFeePerGas)
            } else {
                _baseFee = lastBaseFeePerGas
            }
        }

        const low = this.getGasCostBySpeed(gasLimit, TransactionEnums.GasPriceTypes.SLOW, gasPrice!, _baseFee)
        const average = this.getGasCostBySpeed(gasLimit, TransactionEnums.GasPriceTypes.AVERAGE, gasPrice!, _baseFee)
        const fast = this.getGasCostBySpeed(gasLimit, TransactionEnums.GasPriceTypes.FAST, gasPrice!, _baseFee)

        return {
            [TransactionEnums.GasPriceTypes.SLOW]: low,
            [TransactionEnums.GasPriceTypes.AVERAGE]: average,
            [TransactionEnums.GasPriceTypes.FAST]: fast,
            // [TransactionEnums.GasPriceTypes.FAST]: BigNumberJs(EmvGasUtil.getBaseFeeBasedOnType(lastBaseFeePerGas.toString()!, TransactionEnums.GasPriceTypes.FAST))
            //     .times(gasLimit)
            //     .toFixed(),
        }
    }

    async getFeeData(): Promise<providers.FeeData> {
        return await this.#provider.getFeeData()
    }

    async getBalance(address: PrimitiveHexString): Promise<number> {
        if (!address)
            throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                owner: 'Invalid information',
            })

        return parseFloat(utils.formatEther(await this.#provider.getBalance(address)))
    }

    async send(
        asset: AssetTypes.Asset,
        from: VaultTypes.AccountObject,
        to: PrimitiveHexString,
        amount: string,
        speed: TransactionEnums.GasPriceTypes = TransactionEnums.GasPriceTypes.AVERAGE
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction & TransactionTypes.RawTransferTransaction>> {
        try {
            if (!from.address || !from.publicKeyHex)
                throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                    owner: 'Invalid information',
                })

            const balance = await this.getBalance(from.address)

            if (parseFloat(amount) > balance) {
                throw IError.ErrorConfigs[IError.ERROR_TYPE.AN_ERROR_OCCURRED].format({
                    assetId: `Insufficient balance, quantity ${amount} is greater than balance ${balance}`,
                })
            }

            const ourWallet = this.#getWallet(from)

            const nonce = await ourWallet.getTransactionCount()
            const transaction: providers.TransactionRequest = {
                nonce,
                to,
                value: utils.parseEther(amount),
                data: '0x',
            }

            const { gasFee, eip1559, gasPrice, maxFeePerGas, maxPriorityFeePerGas } = await this.#estimateFee(speed)

            if (eip1559) {
                transaction.maxFeePerGas = maxFeePerGas
                transaction.maxPriorityFeePerGas = maxPriorityFeePerGas
            } else {
                transaction.gasPrice = gasPrice
            }

            const estimatedGasLimit = await this.#provider.estimateGas(transaction)
            if (typeof estimatedGasLimit !== 'undefined' && typeof transaction.gasLimit === 'undefined') {
                transaction.gasLimit = estimatedGasLimit.lt(EmvGasUtil.BaseGasNativeLimit)
                    ? BigNumber.from(EmvGasUtil.BaseGasNativeLimit)
                    : estimatedGasLimit
            }

            const rawTxn = await ourWallet.populateTransaction(transaction)

            const limit = transaction.gasLimit ? utils.formatUnits(transaction.gasLimit, 'gwei') : '0' // gwei -> tether
            const price = gasPrice ? Helper.Decimal.toDecimal(utils.formatUnits(gasPrice), EvmUtil.BaseDecimals) : undefined // wei -> tether
            const transactionFee = EmvGasUtil.calculateFee(gasFee, limit, true)
            return {
                data: {
                    amount,
                    asset,
                    from,
                    to,
                    chainId: this.#chainId,
                    gasLimit: Helper.Decimal.toDecimal(limit, EvmUtil.BaseDecimals),
                    gasPrice: price,
                    transactionFee,
                    rawData: rawTxn,
                    transactionType: 'transfer',
                },
                status: 'SUCCESS',
            }
        } catch (error) {
            return { error, status: 'ERROR' }
        }
    }

    async sendERC20Token(
        asset: AssetTypes.Asset,
        from: VaultTypes.AccountObject,
        to: PrimitiveHexString,
        amount: string,
        speed: TransactionEnums.GasPriceTypes = TransactionEnums.GasPriceTypes.AVERAGE
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction & TransactionTypes.RawTransferTransaction>> {
        try {
            if (!from.address || !from.publicKeyHex)
                throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                    owner: 'Invalid information',
                })

            const contractAbiFragment = [
                {
                    name: 'transfer',
                    type: 'function',
                    inputs: [
                        {
                            name: '_to',
                            type: 'address',
                        },
                        {
                            type: 'uint256',
                            name: '_value',
                        },
                    ],
                    outputs: [
                        {
                            name: 'success',
                            type: 'bool',
                        },
                    ],
                    constant: false,
                    payable: false,
                },
            ]
            const ourWallet = this.#getWallet(from)

            const numberOfTokens = utils.parseUnits(amount, asset.decimals)
            const args: Array<any> = [to, numberOfTokens]
            const contract = new Contract(asset.assetId, contractAbiFragment, ourWallet)

            const populatedTransaction: PopulatedTransaction = {}

            const { gasFee, eip1559, gasPrice, maxFeePerGas, maxPriorityFeePerGas } = await this.#estimateFee(speed)

            if (eip1559) {
                populatedTransaction.maxFeePerGas = BigNumber.from(maxFeePerGas)
                populatedTransaction.maxPriorityFeePerGas = BigNumber.from(maxPriorityFeePerGas)
            } else {
                populatedTransaction.gasPrice = BigNumber.from(gasPrice)
            }

            const estimatedGasLimit = await this.#provider.estimateGas(populatedTransaction)
            if (typeof estimatedGasLimit !== 'undefined' && typeof populatedTransaction.gasLimit === 'undefined') {
                populatedTransaction.gasLimit = estimatedGasLimit.lt(BigNumber.from(EmvGasUtil.BaseGasNativeLimit))
                    ? BigNumber.from(EmvGasUtil.BaseGasERC20Limit)
                    : estimatedGasLimit
            }
            const rawTxn = await contract.populateTransaction.transfer(...args, populatedTransaction)
            const limit = populatedTransaction.gasLimit ? utils.formatUnits(populatedTransaction.gasLimit, 'gwei') : '0' // gwei -> tether
            const price = gasPrice ? Helper.Decimal.toDecimal(utils.formatUnits(gasPrice), EvmUtil.BaseDecimals) : undefined // wei -> tether
            const transactionFee = EmvGasUtil.calculateFee(gasFee, limit, true)

            return {
                data: {
                    amount,
                    asset,
                    from,
                    to,
                    chainId: this.#chainId,
                    gasLimit: limit ? Helper.Decimal.toDecimal(limit, EvmUtil.BaseDecimals) : undefined,
                    gasPrice: price,
                    transactionFee,
                    rawData: rawTxn,
                    transactionType: 'transfer',
                },
                status: 'SUCCESS',
            }
        } catch (error) {
            return { error, status: 'ERROR' }
        }
    }

    async transferNFT(
        Nft: AssetTypes.Nft,
        from: VaultTypes.AccountObject,
        to: PrimitiveHexString,
        amount: string,
        speed: TransactionEnums.GasPriceTypes = TransactionEnums.GasPriceTypes.AVERAGE
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction<any> & TransactionTypes.RawTransferNFTTransaction>> {
        try {
            if (!from.address || !from.publicKeyHex)
                throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                    owner: 'Invalid information',
                })

            const ourWallet = this.#getWallet(from)

            let contract: Contract
            const transferABIMethod = 'safeTransferFrom(address,address,uint256)'

            const nftId = Nft.id.split('__')
            if (nftId.length > 1) {
                const tokenAddress = nftId[0]
                const tokenId = nftId[1]
                const args: Array<any> = [from.address, to, tokenId]
                if (Nft.type === NftEnums.NftTokenType.ERC721) {
                    contract = new Contract(tokenAddress, ERC721_ABI, ourWallet)
                } else {
                    contract = new Contract(tokenAddress, ERC1155_ABI, ourWallet)
                    args.push(amount)
                }

                const populatedTransaction: PopulatedTransaction = {}

                const { gasFee, eip1559, gasPrice, maxFeePerGas, maxPriorityFeePerGas } = await this.#estimateFee(speed)

                if (eip1559) {
                    populatedTransaction.maxFeePerGas = BigNumber.from(maxFeePerGas)
                    populatedTransaction.maxPriorityFeePerGas = BigNumber.from(maxPriorityFeePerGas)
                } else {
                    populatedTransaction.gasPrice = BigNumber.from(gasPrice)
                }

                const estimatedGasLimit = await contract.estimateGas[transferABIMethod](...args, {
                    gasPrice: populatedTransaction.gasPrice,
                })

                if (estimatedGasLimit.lt(BigNumber.from(EmvGasUtil.BaseGasNativeLimit))) {
                    populatedTransaction.gasLimit = BigNumber.from(EmvGasUtil.BaseGasERC721TransferringLimit)
                } else {
                    populatedTransaction.gasLimit = estimatedGasLimit
                }

                const rawTxn = await contract.populateTransaction[transferABIMethod](...args, populatedTransaction)

                const limit = utils.formatUnits(populatedTransaction.gasLimit, 'gwei') // gwei -> tether
                const price = gasPrice ? Helper.Decimal.toDecimal(utils.formatUnits(gasPrice), EvmUtil.BaseDecimals) : undefined // wei -> tether
                const transactionFee = EmvGasUtil.calculateFee(gasFee, limit, true)

                return {
                    data: {
                        amount,
                        asset: Nft,
                        from,
                        to,
                        chainId: this.#chainId,
                        gasLimit: limit ? Helper.Decimal.toDecimal(limit, EvmUtil.BaseDecimals) : undefined,
                        gasPrice: price,
                        transactionFee,
                        rawData: rawTxn,
                        transactionType: 'transfer-nft',
                    },
                    status: 'SUCCESS',
                }
            }
            throw new Error('Failed to transfer NFT')
        } catch (error) {
            return { error, status: 'ERROR' }
        }
    }

    async simulateTransaction(
        owner: VaultTypes.AccountObject,
        type: 'transfer' | 'script',
        data: EvmTypes.SimulateTransactionNative | EvmTypes.SimulateTransactionContract
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction<any>>> {
        try {
            if (!owner.address || !owner.publicKeyHex)
                throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                    owner: 'Invalid information',
                })
            const ourWallet = this.#getWallet(owner)
            if (data.kind === 'native') {
                const { raw, speed } = data.params
                const { gasFee, eip1559, gasPrice, maxFeePerGas, maxPriorityFeePerGas } = await this.#estimateFee(speed)

                const ourTxnRequest = produce(raw, (draft) => {
                    if (eip1559) {
                        draft.maxFeePerGas = maxFeePerGas
                        draft.maxPriorityFeePerGas = maxPriorityFeePerGas
                    } else {
                        draft.gasPrice = gasPrice
                    }
                })

                const pTnx = await ourWallet.populateTransaction(ourTxnRequest)
                const estimatedGasLimit = await this.#provider.estimateGas(pTnx)
                if (typeof estimatedGasLimit !== 'undefined' && typeof pTnx.gasLimit === 'undefined') {
                    pTnx.gasLimit = estimatedGasLimit.lt(EmvGasUtil.BaseGasNativeLimit)
                        ? BigNumber.from(EmvGasUtil.BaseGasNativeLimit)
                        : estimatedGasLimit
                }

                const limit = pTnx.gasLimit ? utils.formatUnits(pTnx.gasLimit, 'gwei') : '0' // gwei -> tether
                const price = gasPrice ? Helper.Decimal.toDecimal(utils.formatUnits(gasPrice), EvmUtil.BaseDecimals) : undefined // wei -> tether
                const transactionFee = EmvGasUtil.calculateFee(gasFee, limit, true)

                return {
                    data: {
                        chainId: this.#chainId,
                        from: owner,
                        transactionFee,
                        to: '',
                        gasLimit: limit ? Helper.Decimal.toDecimal(limit, EvmUtil.BaseDecimals) : undefined,
                        gasPrice: price,
                        rawData: pTnx,
                        transactionType: type,
                    },
                    status: 'SUCCESS',
                }
            } else if (data.kind === 'contract') {
                const populatedTransaction: PopulatedTransaction = {}
                const { abi, args, contractAddress, method, speed } = data.params

                const contract = new Contract(contractAddress, abi, ourWallet)

                const { gasFee, eip1559, gasPrice, maxFeePerGas, maxPriorityFeePerGas } = await this.#estimateFee(speed)
                if (eip1559) {
                    populatedTransaction.maxFeePerGas = BigNumber.from(maxFeePerGas)
                    populatedTransaction.maxPriorityFeePerGas = BigNumber.from(maxPriorityFeePerGas)
                } else {
                    populatedTransaction.gasPrice = BigNumber.from(gasPrice)
                }

                const cTnx = await contract.populateTransaction[method](...args, populatedTransaction)
                const estimatedGasLimit = await this.#provider.estimateGas(cTnx)
                if (typeof estimatedGasLimit !== 'undefined' && typeof cTnx.gasLimit === 'undefined') {
                    cTnx.gasLimit = estimatedGasLimit.lt(EmvGasUtil.BaseGasNativeLimit)
                        ? BigNumber.from(EmvGasUtil.BaseGasNativeLimit)
                        : estimatedGasLimit
                }

                const limit = cTnx.gasLimit ? utils.formatUnits(cTnx.gasLimit, 'gwei') : '0' // gwei -> tether
                const price = gasPrice ? Helper.Decimal.toDecimal(utils.formatUnits(gasPrice), EvmUtil.BaseDecimals) : undefined // wei -> tether
                const transactionFee = EmvGasUtil.calculateFee(gasFee, limit!, true)

                return {
                    data: {
                        chainId: this.#chainId,
                        from: owner,
                        transactionFee,
                        to: '',
                        gasLimit: limit ? Helper.Decimal.toDecimal(limit, EvmUtil.BaseDecimals) : undefined,
                        gasPrice: price,
                        rawData: cTnx,
                        transactionType: type,
                    },
                    status: 'SUCCESS',
                }
            }
            throw IError.ErrorConfigs[IError.ERROR_TYPE.DATA_NOT_FOUND].format()
        } catch (error) {
            console.log('[SimulateTransaction]', error)
            return { error, status: 'ERROR' }
        }
    }

    async executeTransaction(rawTxn: any, owner: VaultTypes.AccountObject): Promise<Interfaces.ResponseData<string>> {
        try {
            const ourWallet = this.#getWallet(owner)
            const signedTxn = await ourWallet.sendTransaction(rawTxn)
            return { data: signedTxn.hash, status: 'SUCCESS' }
            // eslint-disable-next-line no-unreachable
        } catch (error) {
            console.log('[executeTransaction]', error)
            return { error, status: 'ERROR' }
        }
    }
}
