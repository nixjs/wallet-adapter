import { Interfaces } from '@nixjs23n6/types'
import { AssetTypes, Helper } from '@nixjs23n6/utilities-adapter'
import { OwnedNftsResponse, TokenBalancesResponse, TokenMetadataResponse } from 'alchemy-sdk'
import axios from 'axios'
import { BaseProvider, Config } from '../base'
import { decodeInputDataFromABIs } from '../utils'
import { Erc20TokenBalance, NFT } from './types'
import { EvmTypes } from '../types'
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

    async getTransactions(address: string, size?: number | undefined): Promise<Interfaces.ResponseData<TransactionTypes.Transaction[]>> {}

    async getERC20MetaData(address: string): Promise<Interfaces.ResponseData<EvmTypes.ERC20>> {
        try {
            const response = await axios.post<AlchemyResponse<TokenMetadataResponse>>(
                `${this.config.endpoint}/${this.config.apiKey}`,
                {
                    id: new Date().getTime(),
                    jsonrpc: '2.0',
                    method: 'alchemy_getTokenMetadata',
                    params: [address],
                },
                {
                    headers: this.contentType,
                }
            )

            if (response.data && response.data.result) {
                const { decimals, logo, name, symbol } = response.data.result
                return {
                    status: 'SUCCESS',
                    data: {
                        address,
                        chainId: this.chainId,
                        decimals: decimals || 18,
                        logoURI: logo || '',
                        name: name || '',
                        symbol: symbol || '',
                    },
                }
            }
            throw new Error('Data not found')
        } catch (error) {
            return { error, status: 'ERROR' }
        }
    }
}
