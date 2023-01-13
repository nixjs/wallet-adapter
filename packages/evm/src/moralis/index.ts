import { Interfaces, Types } from '@nixjs23n6/types'
import { AssetTypes, TransactionTypes, TransactionEnums, EvmUtil, NftEnums, PrimitiveHexString } from '@nixjs23n6/utilities-adapter'
import Bignumber from 'bignumber.js'
import { GetTransactionJSONResponse } from 'moralis/common-evm-utils'
import axios from 'axios'
import { BaseProvider } from '../base'
import { decodeInputDataFromABIs } from '../utils'
import { Erc20TokenBalance, Nft } from './types'
import { EvmTypes } from '../types'

export class MoralisProvider extends BaseProvider {
    public get contentType(): Record<string, string> {
        return {
            accept: 'application/json',
            'X-API-Key': this.config.apiKey,
        }
    }

    async getAssets(address: PrimitiveHexString): Promise<Interfaces.ResponseData<AssetTypes.Asset[]>> {
        try {
            const assets: AssetTypes.Asset[] = []
            const response = await axios.get<Erc20TokenBalance[]>(`${this.config.endpoint}/${this.config.prefix}/${address}/erc20`, {
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

    async getAssetBalances(address: PrimitiveHexString): Promise<Interfaces.ResponseData<AssetTypes.AssetAmount[]>> {
        try {
            const amounts: AssetTypes.AssetAmount[] = []

            const response = await axios.get<Erc20TokenBalance[]>(`${this.config.endpoint}/${this.config.prefix}/${address}/erc20`, {
                headers: this.contentType,
                params: {
                    chain: this.chainId,
                },
            })

            if (response.data && response.data) {
                response.data.forEach(({ token_address, balance }) => {
                    amounts.push({
                        assetId: token_address,
                        amount: balance || '0',
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
            const response = await axios.get<{ balance: string }>(`${this.config.endpoint}/${this.config.prefix}/${address}/balance`, {
                headers: this.contentType,
                params: {
                    chain: this.chainId,
                },
            })

            if (response.data && response.data) {
                return {
                    status: 'SUCCESS',
                    data: {
                        assetId: EvmUtil.CoinSymbol,
                        amount: response.data.balance || '0',
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

            const response = await axios.get<{ total: number; page: number; page_size: number; cursor: null; result: Nft[] }>(
                `${this.config.endpoint}/${this.config.prefix}/${address}/nft`,
                {
                    headers: this.contentType,
                    params: { chain: this.chainId, format: 'decimal', normalizeMetadata: 'false' },
                }
            )

            if (response.data && response.data.result.length > 0) {
                const { result } = response.data
                result.forEach((x) => {
                    const { name, token_address, owner_of, token_uri, metadata, token_id, contract_type } = x
                    const ourMetadata = metadata ? JSON.parse(metadata) : null
                    let type = NftEnums.NftTokenType.UNKNOWN
                    if (contract_type === 'ERC721') type = NftEnums.NftTokenType.ERC721
                    if (contract_type === 'ERC1155') type = NftEnums.NftTokenType.ERC1155
                    nfts.push({
                        collection: '',
                        creator: owner_of,
                        description: ourMetadata && ourMetadata.description ? ourMetadata.description : '',
                        id: `${token_address}__${token_id}`,
                        name: ourMetadata && ourMetadata.name ? ourMetadata.name : name || '',
                        uri: token_uri,
                        metadata: x,
                        type,
                    } as AssetTypes.Nft)
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
            const txns: TransactionTypes.Transaction[] = []

            const response = await axios.get<{ page: number; page_size: number; cursor: null; result: GetTransactionJSONResponse[] }>(
                `${this.config.endpoint}/${this.config.prefix}/${address}`,
                {
                    headers: this.contentType,
                    params: { chain: this.chainId, limit: size },
                }
            )

            if (response.data && response.data.result && response.data.result.length > 0) {
                const { result } = response.data
                result.forEach(async (x) => {
                    const {
                        block_number,
                        block_timestamp,
                        from_address: from,
                        gas_price,
                        hash,
                        input,
                        receipt_gas_used,
                        receipt_status,
                        to_address,
                        value,
                    } = x
                    let to = to_address
                    let type = TransactionEnums.TransactionType.SCRIPT
                    let txObj: Types.Undefined<TransactionTypes.TransactionObject>
                    // let logDesc: EvmTypes.LogDescription[] = []
                    const inputData: Types.Undefined<EvmTypes.InputData> = decodeInputDataFromABIs(input)
                    // if (logs && logs.length > 0) {
                    //     const ourInputData: { topics: Array<string>; data: string }[] = []
                    //     for (let l = 0; l < logs.length; l++) {
                    //         const target = logs[l]

                    //         const topics: string[] = [target.topic0]
                    //         if (target.topic1) topics.push(target.topic1 as string)
                    //         if (target.topic2) topics.push(target.topic2 as string)
                    //         if (target.topic3) topics.push(target.topic3 as string)

                    //         ourInputData.push({
                    //             data: target.data,
                    //             topics,
                    //         })
                    //     }
                    //     logDesc = decodeTransactionLog(ERC20, ourInputData)
                    // }

                    if (input === '0x') {
                        type = address === to ? TransactionEnums.TransactionType.RECEIVE : TransactionEnums.TransactionType.SEND
                        txObj = {
                            balance: value,
                            symbol: EvmUtil.CoinSymbol,
                            type: 'coin',
                        } as TransactionTypes.CoinObject
                    } else {
                        if (inputData) {
                            const { args, name } = inputData
                            if (name.toLowerCase().includes('transfer')) {
                                to = args.to
                                type = address === to ? TransactionEnums.TransactionType.RECEIVE : TransactionEnums.TransactionType.SEND

                                const erc20: Types.Undefined<EvmTypes.ERC20> = this.getTokenInfo(String(to_address))
                                // if (!erc20) {
                                //     const erc20s = await this.getTokenMetaData(String(to_address))
                                //     if (erc20s.status === 'SUCCESS' && erc20s.data) {
                                //         erc20 = Object.assign({}, { ...erc20s.data })
                                //     }
                                // }
                                if (erc20) {
                                    txObj = {
                                        balance: args.value || 'Unknown',
                                        symbol: erc20.symbol || 'Unknown',
                                        type: 'token',
                                    } as TransactionTypes.CoinObject
                                }
                            } else if (name.toLowerCase().includes('claim')) {
                                type = TransactionEnums.TransactionType.CLAIM
                                to = args.receiver
                                txObj = {
                                    ...inputData,
                                    overview: name || 'Unknown',
                                } as TransactionTypes.ScriptObject
                            } else if (name.toLowerCase().includes('mint')) {
                                type = TransactionEnums.TransactionType.MINT
                                to = args.to
                                if (args.tokenId || args.uri) {
                                    txObj = {
                                        name: args.tokenId,
                                        url: args.uri,
                                        type: 'nft',
                                    } as TransactionTypes.NftObject
                                }
                            } else {
                                type = TransactionEnums.TransactionType.SCRIPT
                                txObj = {
                                    ...inputData,
                                    overview: name || 'Unknown',
                                } as TransactionTypes.ScriptObject
                            }
                        } else {
                            type = TransactionEnums.TransactionType.SCRIPT
                            txObj = {
                                ...x,
                                overview: 'Unknown',
                            } as TransactionTypes.ScriptObject
                        }
                        // if (logDesc.length > 0) {
                        //     const log = logDesc.find((l) => l.name === 'Transfer')
                        //     if (log) {
                        //         from = log.args.from
                        //         to = log.args.to
                        //         let erc20: Types.Undefined<EvmTypes.ERC20> = this.getTokenInfo(String(to_address))
                        //         if (!erc20) {
                        //             const erc20s = await this.getTokenMetaData([String(to_address)])
                        //             if (erc20s.status === 'SUCCESS' && erc20s.data && erc20s.data?.length > 0) {
                        //                 erc20 = erc20s.data[0]
                        //             }
                        //         }
                        //         if (erc20) {
                        //             txObj = {
                        //                 balance: log.args.value ? Helper.Decimal.fromDecimal(log.args.value, erc20.decimals) : '',
                        //                 symbol: erc20.symbol,
                        //                 type: 'token',
                        //             } as TransactionTypes.CoinObject
                        //         }
                        //     }
                        // }
                    }
                    if (txObj) {
                        txns.push({
                            hash,
                            data: txObj,
                            from,
                            to,
                            gasFee: Bignumber(gas_price).times(Bignumber(receipt_gas_used)).toNumber(),
                            status:
                                receipt_status === '1'
                                    ? TransactionEnums.TransactionStatus.SUCCESS
                                    : TransactionEnums.TransactionStatus.FAILED,
                            timestamp: block_timestamp ? Math.floor(new Date(block_timestamp).getTime() / 1000) : null,
                            type,
                            version: Number(block_number),
                        } as TransactionTypes.Transaction)
                    }
                })
            }
            return { status: 'SUCCESS', data: txns }
        } catch (error) {
            return { error, status: 'ERROR' }
        }
    }

    async getTokenMetaData(address: PrimitiveHexString): Promise<Interfaces.ResponseData<EvmTypes.ERC20>> {
        try {
            const response = await axios.get<
                {
                    decimals: number
                    name: string
                    symbol: string
                    address: PrimitiveHexString
                    logo?: string | null
                    logoHash?: string | null
                    thumbnail?: string | null
                }[]
            >(`${this.config.endpoint}/${this.config.prefix}/erc20/metadata`, {
                headers: this.contentType,
                params: { chain: this.chainId, addresses: [address] },
            })

            if (response.data && response.data.length > 0) {
                for (let i = 0; i < response.data.length; i++) {
                    const target = response.data[i]
                    if (target) {
                        const { address, decimals, name, symbol, thumbnail } = target
                        return {
                            status: 'SUCCESS',
                            data: {
                                address,
                                chainId: this.chainId,
                                decimals,
                                logoURI: thumbnail || '',
                                name,
                                symbol,
                            },
                        }
                    }
                }
            }
            throw new Error('Data not found')
        } catch (error) {
            return { error, status: 'ERROR' }
        }
    }
}
