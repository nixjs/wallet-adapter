import { Types, Interfaces } from '@nixjs23n6/types'
import { AssetTypes, EvmUtil, PrimitiveHexString, TransactionTypes } from '@nixjs23n6/utilities-adapter'
import { EvmTypes } from './types'

export abstract class BaseProvider {
    #config: EvmTypes.Config
    #chainId: PrimitiveHexString
    #configData: EvmTypes.ConfigData

    constructor(config: EvmTypes.Config, chainId: PrimitiveHexString) {
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

    public get chainId(): PrimitiveHexString {
        return this.#chainId
    }

    public get contentType(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
        }
    }

    public get config(): EvmTypes.ConfigData {
        return this.#configData
    }

    public get tokensByChain(): EvmTypes.ERC20[] {
        return EvmUtil.Erc20Tokens.filter((t) => t.chainId === Number(this.#chainId))
    }

    public getTokenInfo(address: PrimitiveHexString): Types.Undefined<EvmTypes.ERC20> {
        return this.tokensByChain.find((t) => t.address.toLowerCase() === address.toLowerCase())
    }

    abstract getAssets(address: PrimitiveHexString): Promise<Interfaces.ResponseData<AssetTypes.Asset[]>>
    abstract getAssetBalances(address: PrimitiveHexString): Promise<Interfaces.ResponseData<AssetTypes.AssetAmount[]>>
    abstract getNativeAssetBalance(address: PrimitiveHexString): Promise<Interfaces.ResponseData<AssetTypes.AssetAmount>>
    abstract getNfts(address: PrimitiveHexString): Promise<Interfaces.ResponseData<AssetTypes.Nft[]>>
    abstract getTransactions(address: PrimitiveHexString, size?: number): Promise<Interfaces.ResponseData<TransactionTypes.Transaction[]>>
    abstract getTokenMetaData(address: PrimitiveHexString): Promise<Interfaces.ResponseData<EvmTypes.ERC20>>
}
