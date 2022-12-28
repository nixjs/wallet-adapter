import { Interfaces, Types } from '@nixjs23n6/types'
import { AssetTypes, Helper, TransactionEnums, TransactionTypes, EVMUtil } from '@nixjs23n6/utilities-adapter'
import {
    OwnedNftsResponse,
    TokenBalancesResponse,
    TokenMetadataResponse,
    AssetTransfersWithMetadataResult,
    AssetTransfersCategory,
    Nft,
} from 'alchemy-sdk'
import axios from 'axios'
import { BaseProvider, Config } from '../base'
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
                `${this.config.endpoint}/v2/${this.config.apiKey}`,
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
                `${this.config.endpoint}/v2/${this.config.apiKey}`,
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

            const response = await axios.get<OwnedNftsResponse>(
                `${this.config.endpoint}/v2/${this.config.apiKey}/getNFTs?owner=${address}`,
                {
                    headers: this.contentType,
                }
            )

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

    async getTransactions(address: string, size?: number | undefined): Promise<Interfaces.ResponseData<TransactionTypes.Transaction[]>> {
        try {
            const txns: TransactionTypes.Transaction[] = []

            const response = await axios.post<AlchemyResponse<AssetTransfersWithMetadataResult[]>>(
                `${this.config.endpoint}/v2/${this.config.apiKey}`,
                {
                    jsonrpc: '2.0',
                    id: new Date().getTime(),
                    method: 'alchemy_getAssetTransfers',
                    params: [
                        {
                            fromAddress: '0x42Ca93Bf644dc646409637883bfcc58f24cB19e2',
                            category: ['external', 'internal', 'erc20', 'erc721', 'erc1155'],
                            toBlock: 'latest',
                            excludeZeroValue: false,
                            maxCount: `0x${(size || 100).toString(16)}`,
                            order: 'desc',
                            withMetadata: true,
                        },
                    ],
                },
                {
                    headers: this.contentType,
                }
            )

            if (response.data && response.data.result && response.data.result.length > 0) {
                const { result } = response.data
                result.forEach(async (x) => {
                    const { asset, blockNum, category, from, hash, rawContract, to, tokenId, value, metadata } = x
                    let balance = '0'
                    let type = TransactionEnums.TransactionType.SCRIPT
                    let txObj: Types.Undefined<TransactionTypes.TransactionObject>

                    if (
                        (category === AssetTransfersCategory.EXTERNAL ||
                            category === AssetTransfersCategory.INTERNAL ||
                            category === AssetTransfersCategory.ERC20) &&
                        value &&
                        value > 0 &&
                        rawContract.decimal
                    ) {
                        balance = Helper.Decimal.fromDecimal(String(value), Number(rawContract.decimal))
                    }

                    if (category === AssetTransfersCategory.EXTERNAL || category === AssetTransfersCategory.INTERNAL) {
                        type = address === to ? TransactionEnums.TransactionType.RECEIVE : TransactionEnums.TransactionType.SEND
                        txObj = {
                            balance,
                            symbol: asset,
                            type: asset === EVMUtil.CoinSymbol ? 'coin' : 'token',
                        } as TransactionTypes.CoinObject
                    } else if (category === AssetTransfersCategory.ERC20) {
                        type = address === to ? TransactionEnums.TransactionType.RECEIVE : TransactionEnums.TransactionType.SEND
                        txObj = {
                            balance,
                            symbol: asset,
                            type: 'token',
                        } as TransactionTypes.CoinObject
                    } else if (category === AssetTransfersCategory.ERC1155 || category === AssetTransfersCategory.ERC721) {
                        if (rawContract && rawContract.address && tokenId) {
                            const nftResult = await this.getNFTMetaData(rawContract.address, Number(tokenId))
                            if (nftResult.status === 'SUCCESS' && nftResult.data) {
                                const { description, title, tokenUri } = nftResult.data
                                txObj = {
                                    name: title,
                                    url: tokenUri?.raw || tokenUri?.gateway || '',
                                    description,
                                    type: 'nft',
                                } as TransactionTypes.NFTObject
                            }
                        }
                    } else {
                        txObj = {
                            ...x,
                            overview: hash || 'Unknown',
                        } as TransactionTypes.ScriptObject
                    }
                    txns.push({
                        hash,
                        data: txObj,
                        from,
                        to,
                        gasFee: 0,
                        status: TransactionEnums.TransactionStatus.SUCCESS,
                        timestamp: new Date(metadata.blockTimestamp).getTime(),
                        type,
                        version: Number(blockNum),
                    } as TransactionTypes.Transaction)
                })
            }

            return { status: 'SUCCESS', data: txns }
        } catch (error) {
            return { error, status: 'ERROR' }
        }
    }

    async getERC20MetaData(address: string): Promise<Interfaces.ResponseData<EvmTypes.ERC20>> {
        try {
            const response = await axios.post<AlchemyResponse<TokenMetadataResponse>>(
                `${this.config.endpoint}/v2/${this.config.apiKey}`,
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

    async getNFTMetaData(address: string, tokenId: number, refreshCache = false): Promise<Interfaces.ResponseData<Nft>> {
        try {
            const response = await axios.get<Nft>(`${this.config.endpoint}/nft/v2/${this.config.apiKey}`, {
                headers: this.contentType,
                params: {
                    contractAddress: address,
                    tokenId,
                    refreshCache,
                },
            })

            if (response.data && response.data) {
                return {
                    status: 'SUCCESS',
                    data: response.data,
                }
            }
            throw new Error('Data not found')
        } catch (error) {
            return { error, status: 'ERROR' }
        }
    }
}
