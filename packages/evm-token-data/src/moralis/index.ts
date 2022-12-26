import { Interfaces } from '@nixjs23n6/types'
import { AssetTypes, Helper } from '@nixjs23n6/utilities-adapter'
import axios from 'axios'
import { BaseProvider, Config } from '../base'
import { Erc20TokenBalance, NFT } from './types'

export class MoralisProvider extends BaseProvider {
    constructor(config: Config, chainId: string) {
        super(config, chainId)
    }

    public get contentType(): Record<string, string> {
        return {
            accept: 'application/json',
            'X-API-Key': this.config.apiKey,
        }
    }

    async getAssets(address: string): Promise<Interfaces.ResponseData<AssetTypes.Asset[]>> {
        try {
            const assets: AssetTypes.Asset[] = []

            const response = await axios.get<Erc20TokenBalance[]>(`${this.config.apiKey}/${address}/erc20`, {
                headers: this.contentType,
                params: {
                    chain: this.chainId,
                },
            })

            if (response.data && response.data) {
                response.data.forEach(({ decimals, logo, name, symbol, token_address }) => {
                    assets.push({
                        assetId: token_address,
                        decimals,
                        logoUrl: (logo ? logo : this.getTokenInfo(token_address)?.logoURI) || '',
                        name,
                        symbol,
                        isNative: false,
                    } as AssetTypes.Asset)
                })
            }
            return { status: 'SUCCESS', data: assets }
        } catch (error) {
            return { error, status: 'ERROR' }
        }
    }

    async getAssetBalances(address: string): Promise<Interfaces.ResponseData<AssetTypes.AssetAmount[]>> {
        try {
            const amounts: AssetTypes.AssetAmount[] = []

            const response = await axios.get<Erc20TokenBalance[]>(`${this.config.apiKey}/${address}/erc20`, {
                headers: this.contentType,
                params: {
                    chain: this.chainId,
                },
            })

            if (response.data && response.data) {
                response.data.forEach(({ decimals, token_address, balance }) => {
                    amounts.push({
                        assetId: token_address,
                        amount: balance ? Helper.Decimal.fromDecimal(balance, decimals) : '0',
                    } as AssetTypes.AssetAmount)
                })
            }
            return { status: 'SUCCESS', data: amounts }
        } catch (error) {
            return { error, status: 'ERROR' }
        }
    }

    async getNFTs(address: string): Promise<Interfaces.ResponseData<AssetTypes.NFT[]>> {
        try {
            const nfts: AssetTypes.NFT[] = []

            const response = await axios.get<{ total: number; page: number; page_size: number; cursor: null; result: NFT[] }>(
                `${this.config.apiKey}/${address}/nft`,
                {
                    headers: this.contentType,
                    params: { chain: this.chainId, format: 'decimal', normalizeMetadata: 'false' },
                }
            )

            if (response.data && response.data.result.length > 0) {
                const { result } = response.data
                result.forEach((x) => {
                    const { name, token_address, owner_of, token_uri, metadata } = x
                    const ourMetadata = metadata ? JSON.parse(metadata) : null
                    nfts.push({
                        collection: '',
                        creator: owner_of,
                        description: ourMetadata && ourMetadata.description ? ourMetadata.description : '',
                        id: token_address,
                        name: name,
                        uri: token_uri,
                        metadata: x,
                    } as AssetTypes.NFT)
                })
            }
            return { status: 'SUCCESS', data: nfts }
        } catch (error) {
            return { error, status: 'ERROR' }
        }
    }
}
