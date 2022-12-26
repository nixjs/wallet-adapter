import { Interfaces } from '@nixjs23n6/types'
import { AssetTypes, Helper } from '@nixjs23n6/utilities-adapter'
import { OwnedNftsResponse, TokenBalancesResponse } from 'alchemy-sdk'
import axios from 'axios'
import { BaseProvider, Config } from '../base'
import { AlchemyResponse } from './types'

export class AlchemyProvider extends BaseProvider {
    constructor(config: Config, chainId: string) {
        super(config, chainId)
    }

    async getAssets(address: string): Promise<Interfaces.ResponseData<AssetTypes.Asset[]>> {
        try {
            const assets: AssetTypes.Asset[] = []

            const response = await axios.post<AlchemyResponse<TokenBalancesResponse>>(
                `${this.config.endpoint}/${this.config.apiKey}`,
                [`${address}`, 'erc20'],
                {
                    headers: this.contentType,
                }
            )

            if (response.data && response.data.result) {
                const { tokenBalances } = response.data.result
                tokenBalances.forEach((x) => {
                    const token = this.getTokenInfo(x.contractAddress)
                    if (token) {
                        const { address, decimals, logoURI, name, symbol } = token
                        assets.push({
                            assetId: address,
                            decimals,
                            logoUrl: logoURI,
                            name,
                            symbol,
                            isNative: false,
                        } as AssetTypes.Asset)
                    }
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

            const response = await axios.post<AlchemyResponse<TokenBalancesResponse>>(
                `${this.config.endpoint}/${this.config.apiKey}`,
                [`${address}`, 'erc20'],
                {
                    headers: this.contentType,
                }
            )

            if (response.data && response.data.result) {
                const { tokenBalances } = response.data.result
                tokenBalances.forEach((x) => {
                    const token = this.getTokenInfo(x.contractAddress)
                    if (token) {
                        const { address, decimals } = token
                        amounts.push({
                            assetId: address,
                            amount: x.tokenBalance ? Helper.Decimal.fromDecimal(x.tokenBalance, decimals) : '0',
                        } as AssetTypes.AssetAmount)
                    }
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

            const response = await axios.get<OwnedNftsResponse>(`${this.config.endpoint}/${this.config.apiKey}/getNFTs?owner=${address}`, {
                headers: this.contentType,
            })

            if (response.data && response.data.ownedNfts.length > 0) {
                const { ownedNfts } = response.data
                ownedNfts.forEach((x) => {
                    const { title, tokenUri, tokenId, description, contract } = x
                    nfts.push({
                        collection: '',
                        creator: contract.address,
                        description,
                        id: tokenId,
                        name: title,
                        uri: tokenUri?.raw || tokenUri?.gateway || '',
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
