import { Types, Interfaces } from '@nixjs23n6/types'
import { VaultTypes, IError, EvmUtil, TransactionTypes, AssetTypes, Helper } from '@nixjs23n6/utilities-adapter'
import { Contract, providers, utils, Wallet, BigNumber } from 'ethers'
import { EvmTypes } from '../types'
import { DefaultAsset } from '../const'
import { BaseGasLimit, BaseGasPriceMap } from './gas'

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

    #getTokenInfo(assetId: string) {
        return EvmUtil.Erc20Tokens.find((t) => t.address.toLowerCase() === assetId.toLowerCase())
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

    public get assets(): EvmTypes.ERC20[] {
        const assets = EvmUtil.Erc20Tokens.filter((t) => t.chainId === Number(this.#chainId))
        if (!assets) return []
        return assets
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
        speed: 'Slow' | 'Average' | 'Fast' = 'Average'
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
                gasLimit: BigNumber.from(BaseGasLimit),
                gasPrice: BigNumber.from(BaseGasPriceMap[speed]), // wei
                to,
                value: utils.parseEther(amount),
                data: '0x',
            }

            const rawTxn = await ourWallet.populateTransaction(transaction)
            let fee = '0'
            if (transaction.gasPrice && rawTxn.gasLimit) {
                fee = utils.formatUnits(BigNumber.from(transaction.gasPrice).mul(rawTxn.gasLimit))
            }
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
                    transactionFee: fee ? Helper.Decimal.toDecimal(fee, EvmUtil.BaseDecimals) : '',
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
        speed: 'Slow' | 'Average' | 'Fast' = 'Average'
    ): Promise<Interfaces.ResponseData<TransactionTypes.SimulateTransaction & TransactionTypes.RawTransferTransaction>> {
        try {
            if (!from.address || !from.publicKeyHex)
                throw IError.ErrorConfigs[IError.ERROR_TYPE.INVALID_PARAMETERS].format({
                    owner: 'Invalid information',
                })

            const tokenInfo = this.#getTokenInfo(asset.assetId)
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

            const rawTxn = await contract.populateTransaction.transfer(to, numberOfTokens, {
                gasLimit: BigNumber.from(BaseGasLimit),
                gasPrice: BigNumber.from(BaseGasPriceMap[speed]),
            })

            let fee = '0'
            if (BigNumber.from(BaseGasPriceMap[speed]) && rawTxn.gasLimit) {
                fee = utils.formatUnits(BigNumber.from(BigNumber.from(BaseGasPriceMap[speed])).mul(rawTxn.gasLimit))
            }
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
                    transactionFee: fee ? Helper.Decimal.toDecimal(fee, EvmUtil.BaseDecimals) : '',
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
}
