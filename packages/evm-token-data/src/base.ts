import { Types, Interfaces } from '@nixjs23n6/types'
import { AssetTypes, EVMUtil } from '@nixjs23n6/utilities-adapter'
import { TokenDateTypes } from './types'

export interface ConfigData {
    apiKey: string
    endpoint: string
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

    public get tokens(): TokenDateTypes.Token[] {
        return EVMUtil.Erc20Tokens
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

    public get tokensByChain(): TokenDateTypes.Token[] {
        return EVMUtil.Erc20Tokens.filter((t) => t.chainId === Number(this.#chainId))
    }

    getTokenInfo(address: string): Types.Undefined<TokenDateTypes.Token> {
        return this.tokensByChain.find((t) => t.address === address)
    }

    abstract getAssets(address: string): Promise<Interfaces.ResponseData<AssetTypes.Asset[]>>
    abstract getAssetBalances(address: string): Promise<Interfaces.ResponseData<AssetTypes.AssetAmount[]>>
    abstract getNFTs(address: string): Promise<Interfaces.ResponseData<AssetTypes.NFT[]>>
}
