import { Types, Interfaces } from '@nixjs23n6/types'
import { AssetTypes } from '@nixjs23n6/utilities-adapter'
import { TokenDateTypes } from './types'
import * as TokenList from './erc20-list.json'

export abstract class BaseProvider {
    APIKey: Types.Object<string>
    url: string

    constructor(APIKey: Types.Object<string>, url: string) {
        this.APIKey = APIKey
        this.url = url
    }

    getUrl(chainId: string) {
        if (!chainId.startsWith('0x')) return new Error('ChainId must be hex string')
        if (!this.APIKey || !this.url) return new Error('Invalid parameters')

        const ourUrl = this.APIKey[chainId]
        if (!ourUrl) return new Error('Invalid parameters')

        return `${ourUrl}/${this.APIKey}`
    }

    public get tokens(): TokenDateTypes.Token[] {
        return TokenList.tokens
    }

    public get contentType(): Types.Object<string> {
        return {
            'Content-Type': 'application/json',
        }
    }

    getTokenInfo(address: string): Types.Undefined<{
        chainId: number
        address: string
        name: string
        symbol: string
        decimals: number
        logoURI: string
        extensions: {
            optimismBridgeAddress: string
        }
    }> {
        return (TokenList.tokens as Array<any>).find((t) => t.address === address)
    }

    abstract getAssets(chainId: string, address: string): Promise<Interfaces.ResponseData<AssetTypes.Asset[]>>
    abstract getAssetBalances(chainId: string, address: string): Promise<Interfaces.ResponseData<AssetTypes.AssetAmount[]>>
    abstract getNFTs(chainId: string, address: string): Promise<Interfaces.ResponseData<AssetTypes.NFT[]>>
}
