import { Interfaces, Types } from '@nixjs23n6/types'
import { AssetTypes, TransactionEnums, TransactionTypes, EvmUtil, Helper, PrimitiveHexString } from '@nixjs23n6/utilities-adapter'
import * as alchemySdk from 'alchemy-sdk'
import axios, { AxiosResponse } from 'axios'
import BigNumber from 'bignumber.js'
import { BaseProvider } from '../base'
import { EvmTypes } from '../types'
import { AlchemyResponse } from './types'

export class AlchemyProvider extends BaseProvider {
    async getAssets(address: PrimitiveHexString): Promise<Interfaces.ResponseData<AssetTypes.Asset[]>> {
        try {
            const assets: AssetTypes.Asset[] = []

            const response = await axios.post<AlchemyResponse<alchemySdk.TokenBalancesResponse>>(
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
                    const erc20 = this.getTokenMetaData(x.contractAddress)
                    requestTasks.push(erc20)
                })
                const results = await Promise.all(requestTasks)
                results.forEach((r) => {
                    if (r.data && r.status === 'SUCCESS' && r.data.decimals && r.data.symbol) {
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

    async getAssetBalances(address: PrimitiveHexString): Promise<Interfaces.ResponseData<AssetTypes.AssetAmount[]>> {
        try {
            const amounts: AssetTypes.AssetAmount[] = []

            const response = await axios.post<AlchemyResponse<alchemySdk.TokenBalancesResponse>>(
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

    async getNativeAssetBalance(address: PrimitiveHexString): Promise<Interfaces.ResponseData<AssetTypes.AssetAmount>> {
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

    async getNfts(address: PrimitiveHexString): Promise<Interfaces.ResponseData<AssetTypes.Nft[]>> {
        try {
            const nfts: AssetTypes.Nft[] = []

            const response = await axios.get<alchemySdk.OwnedNftsResponse>(
                `${this.config.endpoint}/v2/${this.config.apiKey}/getNfts?owner=${address}`,
                {
                    headers: this.contentType,
                }
            )

            if (response.data && response.data.ownedNfts.length > 0) {
                const { ownedNfts } = response.data
                ownedNfts.forEach((x) => {
                    const { contract, description, title, tokenUri, id } = x as any
                    if (id?.tokenId) {
                        nfts.push({
                            collection: '',
                            creator: contract.address,
                            description,
                            id: `${contract.address}__${BigNumber(id.tokenId).toString()}`,
                            name: title,
                            uri: tokenUri?.raw || tokenUri?.gateway || '',
                            metadata: x,
                            type: contract.tokenType,
                        } as AssetTypes.Nft)
                    }
                })
            }
            return { status: 'SUCCESS', data: nfts }
        } catch (error) {
            return { error, status: 'ERROR' }
        }
    }

    async getTransactions(
        address: PrimitiveHexString,
        size?: number | undefined
    ): Promise<Interfaces.ResponseData<TransactionTypes.Transaction[]>> {
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
                axios.post<AlchemyResponse<{ transfers: alchemySdk.AssetTransfersWithMetadataResult[] }>>(
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
                axios.post<AlchemyResponse<{ transfers: alchemySdk.AssetTransfersWithMetadataResult[] }>>(
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

    async getTokenMetaData(address: PrimitiveHexString): Promise<Interfaces.ResponseData<EvmTypes.ERC20>> {
        try {
            const response = await axios.post<AlchemyResponse<alchemySdk.TokenMetadataResponse>>(
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

    async getNFTMetaData(
        address: PrimitiveHexString,
        tokenId: number,
        refreshCache = false
    ): Promise<Interfaces.ResponseData<alchemySdk.Nft>> {
        try {
            const response = await axios.get<alchemySdk.Nft>(`${this.config.endpoint}/nft/v2/${this.config.apiKey}`, {
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
        address: PrimitiveHexString,
        data: AxiosResponse<
            AlchemyResponse<{
                transfers: alchemySdk.AssetTransfersWithMetadataResult[]
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
                if (category === alchemySdk.AssetTransfersCategory.EXTERNAL || category === alchemySdk.AssetTransfersCategory.INTERNAL) {
                    type = address === to ? TransactionEnums.TransactionType.RECEIVE : TransactionEnums.TransactionType.SEND
                    txObj = {
                        balance: Helper.Decimal.toDecimal(
                            String(value),
                            rawContract.decimal ? Number(rawContract.decimal) : EvmUtil.BaseDecimals
                        ),
                        symbol: asset,
                        type: asset === EvmUtil.CoinSymbol ? 'coin' : 'token',
                    } as TransactionTypes.CoinObject
                } else if (category === alchemySdk.AssetTransfersCategory.ERC20) {
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
                } else if (
                    category === alchemySdk.AssetTransfersCategory.ERC1155 ||
                    category === alchemySdk.AssetTransfersCategory.ERC721
                ) {
                    if (rawContract && rawContract.address && tokenId) {
                        // const nftResult = await this.getNFTMetaData(rawContract.address, Number(tokenId))
                        // if (nftResult.status === 'SUCCESS' && nftResult.data) {
                        //     const { description, title, tokenUri } = nftResult.data
                        //     txObj = {
                        //         name: title,
                        //         url: tokenUri?.raw || tokenUri?.gateway || '',
                        //         description,
                        //         type: 'nft',
                        //     } as TransactionTypes.NftObject
                        // }
                        txObj = {
                            name: 'tokenId',
                            url: '',
                            type: 'nft',
                        } as TransactionTypes.NftObject
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
