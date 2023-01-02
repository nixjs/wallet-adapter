import { Interfaces, Types } from '@nixjs23n6/types'
import { AssetTypes, TransactionEnums, TransactionTypes, EvmUtil, Helper } from '@nixjs23n6/utilities-adapter'
import {
    OwnedNftsResponse,
    TokenBalancesResponse,
    TokenMetadataResponse,
    AssetTransfersWithMetadataResult,
    AssetTransfersCategory,
    Nft,
} from 'alchemy-sdk'
import axios, { AxiosResponse } from 'axios'
import { BaseProvider } from '../base'
import { EvmTypes } from '../types'
import { AlchemyResponse } from './types'

export class AlchemyProvider extends BaseProvider {
    async getAssets(address: string): Promise<Interfaces.ResponseData<AssetTypes.Asset[]>> {
        try {
            const assets: AssetTypes.Asset[] = []

            const response = await axios.post<AlchemyResponse<TokenBalancesResponse>>(
                `${this.config.endpoint}/v2/${this.config.apiKey}`,
                {
                    jsonrpc: '2.0',
                    id: new Date().getTime(),
                    method: 'alchemy_getTokenBalances',
                    params: [`${address}`, 'erc20'],
                },
                {
                    headers: this.contentType,
                }
            )

            if (response.data && response.data.result) {
                const { tokenBalances } = response.data.result
                const nonZeroBalances = tokenBalances.filter((token) => {
                    return token.tokenBalance !== '0'
                })

                const assetHasInfo = nonZeroBalances.filter((i) => this.getTokenInfo(i.contractAddress))
                const assetNoInfo = nonZeroBalances.filter((i) => !this.getTokenInfo(i.contractAddress))

                assetHasInfo.forEach((x) => {
                    const token = this.getTokenInfo(x.contractAddress)
                    if (token) {
                        const { decimals, logoURI, name, symbol } = token

                        assets.push({
                            assetId: x.contractAddress,
                            decimals,
                            logoUrl: logoURI,
                            name,
                            symbol,
                            isNative: false,
                        } as AssetTypes.Asset)
                    }
                })

                const requestTasks: Promise<Interfaces.ResponseData<EvmTypes.ERC20>>[] = []
                assetNoInfo.forEach((x) => {
                    const erc20 = this.getERC20MetaData(x.contractAddress)
                    requestTasks.push(erc20)
                })
                const results = await Promise.all(requestTasks)
                results.forEach((r) => {
                    if (r.data && r.status === 'SUCCESS') {
                        const { address, decimals, logoURI, name, symbol } = r.data
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
                {
                    jsonrpc: '2.0',
                    id: new Date().getTime(),
                    method: 'alchemy_getTokenBalances',
                    params: [`${address}`, 'erc20'],
                },
                {
                    headers: this.contentType,
                }
            )

            if (response.data && response.data.result) {
                const { tokenBalances } = response.data.result
                tokenBalances.forEach((x) => {
                    amounts.push({
                        assetId: x.contractAddress,
                        amount: x.tokenBalance || '0',
                    } as AssetTypes.AssetAmount)
                })
            }
            return { status: 'SUCCESS', data: amounts }
        } catch (error) {
            return { error, status: 'ERROR' }
        }
    }

    async getNativeAssetBalance(address: string): Promise<Interfaces.ResponseData<AssetTypes.AssetAmount>> {
        try {
            const response = await axios.post<AlchemyResponse<string>>(
                `${this.config.endpoint}/v2/${this.config.apiKey}`,
                {
                    jsonrpc: '2.0',
                    id: new Date().getTime(),
                    method: 'eth_getBalance',
                    params: [address, 'latest'],
                },
                {
                    headers: this.contentType,
                }
            )

            if (response.data && response.data.result) {
                return {
                    status: 'SUCCESS',
                    data: {
                        assetId: EvmUtil.CoinSymbol,
                        amount: String(Number(response.data.result || 0)),
                    } as AssetTypes.AssetAmount,
                }
            }
            throw new Error('Data not found')
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
                    const { contract, description, title, tokenUri, id } = x as any
                    nfts.push({
                        collection: '',
                        creator: contract.address,
                        description,
                        id: `${contract.address}_${Number(id?.tokenId || new Date().getTime())}`,
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
            const defaultParams = {
                toBlock: 'latest',
                excludeZeroValue: true,
                maxCount: `0x${(size || 100).toString(16)}`,
                order: 'desc',
                withMetadata: true,
                category: ['external', 'internal', 'erc20', 'erc721', 'erc1155'],
            }

            const [responses1, responses2] = await Promise.all([
                axios.post<AlchemyResponse<{ transfers: AssetTransfersWithMetadataResult[] }>>(
                    `${this.config.endpoint}/v2/${this.config.apiKey}`,
                    {
                        jsonrpc: '2.0',
                        id: new Date().getTime(),
                        method: 'alchemy_getAssetTransfers',
                        params: [
                            {
                                fromAddress: address,
                                ...defaultParams,
                            },
                        ],
                    },
                    {
                        headers: this.contentType,
                    }
                ),
                axios.post<AlchemyResponse<{ transfers: AssetTransfersWithMetadataResult[] }>>(
                    `${this.config.endpoint}/v2/${this.config.apiKey}`,
                    {
                        jsonrpc: '2.0',
                        id: new Date().getTime(),
                        method: 'alchemy_getAssetTransfers',
                        params: [
                            {
                                toAddress: address,
                                ...defaultParams,
                            },
                        ],
                    },
                    {
                        headers: this.contentType,
                    }
                ),
            ])
            const responseOne = this.#getTransactionResponse(address, responses1)
            const responseTwo = this.#getTransactionResponse(address, responses2)

            const ourTxns = [...responseOne, ...responseTwo].sort((o1, o2) => Number(o2.timestamp) - Number(o1.timestamp))
            return { status: 'SUCCESS', data: ourTxns }
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

    #getTransactionResponse(
        address: string,
        data: AxiosResponse<
            AlchemyResponse<{
                transfers: AssetTransfersWithMetadataResult[]
            }>,
            any
        >
    ): TransactionTypes.Transaction[] {
        const txns: TransactionTypes.Transaction[] = []
        if (data.data && data.data.result && data.data.result.transfers.length > 0) {
            const { transfers } = data.data.result
            transfers.forEach(async (x) => {
                const { asset, blockNum, category, from, hash, rawContract, to, tokenId, value, metadata } = x
                let type = TransactionEnums.TransactionType.SCRIPT
                let txObj: Types.Undefined<TransactionTypes.TransactionObject>
                if (category === AssetTransfersCategory.EXTERNAL || category === AssetTransfersCategory.INTERNAL) {
                    type = address === to ? TransactionEnums.TransactionType.RECEIVE : TransactionEnums.TransactionType.SEND
                    txObj = {
                        balance: Helper.Decimal.toDecimal(
                            String(value),
                            rawContract.decimal ? Number(rawContract.decimal) : EvmUtil.BaseDecimals
                        ),
                        symbol: asset,
                        type: asset === EvmUtil.CoinSymbol ? 'coin' : 'token',
                    } as TransactionTypes.CoinObject
                } else if (category === AssetTransfersCategory.ERC20) {
                    if (asset) {
                        type = address === to ? TransactionEnums.TransactionType.RECEIVE : TransactionEnums.TransactionType.SEND
                        txObj = {
                            balance: Helper.Decimal.toDecimal(
                                String(value),
                                rawContract.decimal ? Number(rawContract.decimal) : EvmUtil.BaseDecimals
                            ),
                            symbol: asset,
                            type: 'token',
                        } as TransactionTypes.CoinObject
                    }
                } else if (category === AssetTransfersCategory.ERC1155 || category === AssetTransfersCategory.ERC721) {
                    if (rawContract && rawContract.address && tokenId) {
                        // const nftResult = await this.getNFTMetaData(rawContract.address, Number(tokenId))
                        // if (nftResult.status === 'SUCCESS' && nftResult.data) {
                        //     const { description, title, tokenUri } = nftResult.data
                        //     txObj = {
                        //         name: title,
                        //         url: tokenUri?.raw || tokenUri?.gateway || '',
                        //         description,
                        //         type: 'nft',
                        //     } as TransactionTypes.NFTObject
                        // }
                        txObj = {
                            name: 'tokenId',
                            url: '',
                            type: 'nft',
                        } as TransactionTypes.NFTObject
                    }
                } else {
                    txObj = {
                        ...x,
                        overview: hash || 'Unknown',
                    } as TransactionTypes.ScriptObject
                }
                if (txObj) {
                    txns.push({
                        hash,
                        data: txObj,
                        from,
                        to,
                        gasFee: 0,
                        status: TransactionEnums.TransactionStatus.SUCCESS,
                        timestamp: Math.floor(new Date(metadata.blockTimestamp).getTime() / 1000),
                        type,
                        version: Number(blockNum),
                    } as TransactionTypes.Transaction)
                }
            })
        }
        return txns
    }
}