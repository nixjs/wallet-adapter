import { Types, Interfaces } from '@nixjs23n6/types'
import { AssetTypes, EvmUtil, TransactionTypes } from '@nixjs23n6/utilities-adapter'
import { EvmTypes } from './types'

export interface ConfigData {
    apiKey: string
    endpoint: string
    prefix?: string
}

export interface Config {
    [chainId: string]: ConfigData
}

export abstract class BaseProvider {
    #config: Config
    #chainId: string
    #configData: ConfigData

    constructor(config: Config, chainId: string) {
        this.#config = config
        this.#chainId = chainId
        if (!this.#config) throw new Error('Invalid parameters')
        if (!this.#chainId.startsWith('0x')) throw new Error('ChainId must be hex string')
        if (!this.#config[this.#chainId]) throw new Error('Chain unsupported')

        this.#configData = this.#config[this.#chainId]
    }

    public get tokens(): EvmTypes.ERC20[] {
        return EvmUtil.Erc20Tokens
    }

    public get chainId(): string {
        return this.#chainId
    }

    public get contentType(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
        }
    }

    public get config(): ConfigData {
        return this.#configData
    }

    public get tokensByChain(): EvmTypes.ERC20[] {
        return EvmUtil.Erc20Tokens.filter((t) => t.chainId === Number(this.#chainId))
    }

    public getTokenInfo(address: string): Types.Undefined<EvmTypes.ERC20> {
        return this.tokensByChain.find((t) => t.address.toLowerCase() === address.toLowerCase())
    }

    abstract getAssets(address: string): Promise<Interfaces.ResponseData<AssetTypes.Asset[]>>
    abstract getAssetBalances(address: string): Promise<Interfaces.ResponseData<AssetTypes.AssetAmount[]>>
    abstract getNativeAssetBalance(address: string): Promise<Interfaces.ResponseData<AssetTypes.AssetAmount>>
    abstract getNfts(address: string): Promise<Interfaces.ResponseData<AssetTypes.Nft[]>>
    abstract getTransactions(address: string, size?: number): Promise<Interfaces.ResponseData<TransactionTypes.Transaction[]>>
    abstract getERC20MetaData(address: string): Promise<Interfaces.ResponseData<EvmTypes.ERC20>>
}
