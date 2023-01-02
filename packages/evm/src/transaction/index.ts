import { Types, Interfaces } from '@nixjs23n6/types'
import { VaultTypes, IError, EvmUtil, TransactionTypes, AssetTypes, Helper, PrimitiveHexString } from '@nixjs23n6/utilities-adapter'
import { Contract, providers, utils, Wallet, BigNumber, PopulatedTransaction } from 'ethers'
import BigNumberJs from 'bignumber.js'
import { DefaultAsset } from '../const'
import { EmvGasUtil, GasPriceTypes } from '../gas'
import { EvmNativeConfig } from '../evmNativeConfig'
import { EvmAsset } from '../asset'

export class EvmTransaction {
    #chainId: string
    #config: Types.Object<string>
    #provider: providers.BaseProvider

    constructor(chainId: string, config: Types.Object<string>) {
        this.#chainId = chainId
        this.#config = config
        console.log('this.#config[this.#chainId]', this.#config[this.#chainId])
        this.#provider = new providers.JsonRpcProvider(this.#config[this.#chainId])
    }

    #getWallet(owner: VaultTypes.AccountObject): Wallet {
        if (!owner.publicKeyHex || !owner.privateKeyHex)
            throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                owner: 'Invalid information',
            })
        return new Wallet(owner.privateKeyHex, this.#provider)
    }

    #getNativeAsset(assetId: string): AssetTypes.Asset {
        return DefaultAsset
    }

    public get chainId(): string {
        return this.#chainId
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

    async estimateGasUnitPrice(chainId: PrimitiveHexString): Promise<Types.Nullable<string>> {
        try {
            if (!chainId) throw new Error('The chain id not found.')
            // const res = await this.#provide.
            // if (res.status === 'SUCCESS' && res.data?.gas_estimate) {
            //     return String(res.data.gas_estimate)
            // } else {
            throw new Error('The gas price not found')
            // }
        } catch (error) {
            console.log('[estimateGasUnitPrice]', error)
            return null
        }
    }

    async getBalance(address: string): Promise<number> {
        if (!address)
            throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                owner: 'Invalid information',
            })

        return parseFloat(utils.formatEther(await this.#provider.getBalance(address)))
    }

    async send(
        asset: AssetTypes.Asset,
        from: VaultTypes.AccountObject,
        to: string,
        amount: string,
        speed: GasPriceTypes = GasPriceTypes.AVERAGE
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
                gasLimit: BigNumber.from(EmvGasUtil.BaseGasNativeLimit),
                // gasPrice: EmvGasUtil.getGasBasedOnType(gasPrice.toString(), speed), // wei
                to,
                value: utils.parseEther(amount),
                data: '0x',
            }

            const gasPrice = await this.#provider.getGasPrice()
            const { lastBaseFeePerGas, maxFeePerGas, maxPriorityFeePerGas } = await this.#provider.getFeeData()
            let estimateFee = '0'

            if (maxFeePerGas && maxPriorityFeePerGas) {
                let _maxFeePerGas = EmvGasUtil.getBaseFeeBasedOnType(maxFeePerGas?.toString() as string, speed)
                const _maxPriorityFeePerGas = EmvGasUtil.getPriorityFeeBasedOnType(
                    lastBaseFeePerGas?.toString() as string,
                    gasPrice?.toString(),
                    speed
                ).toString()
                if (_maxPriorityFeePerGas && BigNumberJs(_maxFeePerGas).gt(_maxFeePerGas)) {
                    _maxFeePerGas = _maxPriorityFeePerGas
                }

                transaction.maxFeePerGas = _maxFeePerGas
                transaction.maxPriorityFeePerGas = _maxPriorityFeePerGas
                estimateFee = EmvGasUtil.calculateFee(_maxPriorityFeePerGas, EmvGasUtil.BaseGasNativeLimit.toString(), false)
            } else {
                transaction.gasPrice = EmvGasUtil.getGasBasedOnType(gasPrice.toString(), speed) // wei
                estimateFee = EmvGasUtil.calculateFee(transaction.gasPrice.toString(), EmvGasUtil.BaseGasNativeLimit.toString(), false)
            }

            const rawTxn = await ourWallet.populateTransaction(transaction)
            const limit = rawTxn.gasLimit ? utils.formatUnits(rawTxn.gasLimit, 'gwei') : '' // gwei -> tether
            const price = rawTxn.gasPrice ? utils.formatEther(rawTxn.gasPrice) : '' // wei -> tether
            return {
                data: {
                    amount,
                    asset,
                    from,
                    to,
                    chainId: this.#chainId,
                    gasLimit: limit ? Helper.Decimal.toDecimal(limit, EvmUtil.BaseDecimals) : '',
                    gasPrice: price ? Helper.Decimal.toDecimal(price, EvmUtil.BaseDecimals) : '',
                    transactionFee: estimateFee ? Helper.Decimal.toDecimal(estimateFee, EvmUtil.BaseDecimals) : '',
                    rawData: rawTxn,
                    transactionType: 'transfer',
                },
                status: 'SUCCESS',
            }
        } catch (error) {
            console.log(error)
            return { error, status: 'ERROR' }
        }
    }

    async sendERC20Token(
        asset: AssetTypes.Asset,
        from: VaultTypes.AccountObject,
        to: string,
        amount: string,
        speed: GasPriceTypes = GasPriceTypes.AVERAGE
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction & TransactionTypes.RawTransferTransaction>> {
        try {
            if (!from.address || !from.publicKeyHex)
                throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                    owner: 'Invalid information',
                })

            const tokenInfo = EvmAsset.getTokenInfo(asset.assetId, this.#chainId)
            if (!tokenInfo) {
                throw new Error(`Can NOT find ERC20 info of the ${asset.assetId} contract address`)
            }

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
            const contract = new Contract(tokenInfo.address, contractAbiFragment, ourWallet)

            const numberOfTokens = utils.parseUnits(amount, tokenInfo.decimals)

            const populatedTransaction: PopulatedTransaction = { gasLimit: BigNumber.from(EmvGasUtil.BaseGasERC20Limit) }

            const gasPrice = await this.#provider.getGasPrice()
            const { lastBaseFeePerGas, maxFeePerGas, maxPriorityFeePerGas } = await this.#provider.getFeeData()
            let estimateFee = '0'

            if (maxFeePerGas && maxPriorityFeePerGas) {
                let _maxFeePerGas = EmvGasUtil.getBaseFeeBasedOnType(maxFeePerGas?.toString() as string, speed)
                const _maxPriorityFeePerGas = EmvGasUtil.getPriorityFeeBasedOnType(
                    lastBaseFeePerGas?.toString() as string,
                    gasPrice?.toString(),
                    speed
                ).toString()
                if (_maxPriorityFeePerGas && BigNumberJs(_maxFeePerGas).gt(_maxFeePerGas)) {
                    _maxFeePerGas = _maxPriorityFeePerGas
                }
                populatedTransaction.maxFeePerGas = BigNumber.from(_maxFeePerGas)
                populatedTransaction.maxPriorityFeePerGas = BigNumber.from(_maxPriorityFeePerGas)
                estimateFee = EmvGasUtil.calculateFee(_maxPriorityFeePerGas, EmvGasUtil.BaseGasERC20Limit.toString(), false)
            } else {
                populatedTransaction.gasPrice = BigNumber.from(EmvGasUtil.getGasBasedOnType(gasPrice.toString(), speed)) // wei
                estimateFee = EmvGasUtil.calculateFee(gasPrice.toString(), EmvGasUtil.BaseGasERC20Limit.toString(), false)
            }

            const rawTxn = await contract.populateTransaction.transfer(to, numberOfTokens, populatedTransaction)

            const limit = rawTxn.gasLimit ? utils.formatUnits(rawTxn.gasLimit, 'gwei') : '' // gwei -> tether
            const price = rawTxn.gasPrice ? utils.formatEther(rawTxn.gasPrice) : '' // wei -> tether

            return {
                data: {
                    amount,
                    asset,
                    from,
                    to,
                    chainId: this.#chainId,
                    gasLimit: limit ? Helper.Decimal.toDecimal(limit, EvmUtil.BaseDecimals) : '',
                    gasPrice: price ? Helper.Decimal.toDecimal(price, EvmUtil.BaseDecimals) : '',
                    transactionFee: estimateFee ? Helper.Decimal.toDecimal(estimateFee, EvmUtil.BaseDecimals) : '',
                    rawData: rawTxn,
                    transactionType: 'transfer',
                },
                status: 'SUCCESS',
            }
        } catch (error) {
            console.log(error)
            return { error, status: 'ERROR' }
        }
    }

    async simulateTransaction(
        chainId: string,
        rawTxn: any,
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

    getFeeDescription() {
        return EmvGasUtil.FeeDescriptions
    }
}
