import { Interfaces, Types } from '@nixjs23n6/types'
import { AssetTypes, Helper, TransactionTypes, TransactionEnums, EVMUtil } from '@nixjs23n6/utilities-adapter'
import Bignumber from 'bignumber.js'
import { GetTransactionJSONResponse } from 'moralis/common-evm-utils'
import axios from 'axios'
import { BaseProvider, Config } from '../base'
import { decodeInputDataFromABIs } from '../utils'
import { Erc20TokenBalance, NFT } from './types'
import { EvmTypes } from '../types'

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

    async getTransactions(address: string, size?: number | undefined): Promise<Interfaces.ResponseData<TransactionTypes.Transaction[]>> {
        try {
            const txns: TransactionTypes.Transaction[] = []

            const response = await axios.get<{ page: number; page_size: number; cursor: null; result: GetTransactionJSONResponse[] }>(
                `https://deep-index.moralis.io/api/v2/${address}`,
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
                            balance: Helper.Decimal.fromDecimal(value, EVMUtil.BaseDecimals),
                            symbol: EVMUtil.CoinSymbol,
                            type: 'coin',
                        } as TransactionTypes.CoinObject
                    } else {
                        if (inputData) {
                            const { args, name } = inputData
                            if (name === 'transfer') {
                                to = args.to
                                type = address === to ? TransactionEnums.TransactionType.RECEIVE : TransactionEnums.TransactionType.SEND
                                let erc20: Types.Undefined<EvmTypes.ERC20> = this.getTokenInfo(String(to_address))
                                if (!erc20) {
                                    const erc20s = await this.getERC20MetaData(String(to_address))
                                    if (erc20s.status === 'SUCCESS' && erc20s.data) {
                                        erc20 = erc20s.data
                                    }
                                }
                                if (erc20)
                                    txObj = {
                                        balance: args.value ? Helper.Decimal.fromDecimal(args.value, erc20.decimals) : '',
                                        symbol: erc20.symbol,
                                        type: 'token',
                                    } as TransactionTypes.CoinObject
                            } else if (name === 'claim') {
                                type = TransactionEnums.TransactionType.CLAIM
                                to = args.receiver
                                // txObj = {
                                //     balance: mTxn.payload.arguments?.[2],
                                //     symbol: AptosUtil.AptosCoinSymbol,
                                //     type: 'coin',
                                // } as TransactionTypes.CoinObject
                            } else if (name === 'mint') {
                                type = TransactionEnums.TransactionType.MINT
                                to = args.to
                                if (args.tokenId || args.uri) {
                                    txObj = {
                                        name: args.tokenId,
                                        url: args.uri,
                                        type: 'nft',
                                    } as TransactionTypes.NFTObject
                                }
                            } else {
                                type = TransactionEnums.TransactionType.SCRIPT
                                txObj = {
                                    ...inputData,
                                    overview: name || 'Unknown',
                                } as TransactionTypes.ScriptObject
                            }
                        }
                        // if (logDesc.length > 0) {
                        //     const log = logDesc.find((l) => l.name === 'Transfer')
                        //     if (log) {
                        //         from = log.args.from
                        //         to = log.args.to
                        //         let erc20: Types.Undefined<EvmTypes.ERC20> = this.getTokenInfo(String(to_address))
                        //         if (!erc20) {
                        //             const erc20s = await this.getERC20MetaData([String(to_address)])
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
                    txns.push({
                        hash,
                        data: txObj,
                        from,
                        to,
                        gasFee: Bignumber(gas_price).times(Bignumber(receipt_gas_used)).toNumber(),
                        status:
                            receipt_status === '1' ? TransactionEnums.TransactionStatus.SUCCESS : TransactionEnums.TransactionStatus.FAILED,
                        timestamp: block_timestamp ? new Date(block_timestamp).getTime() : null,
                        type,
                        version: Number(block_number),
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
            const response = await axios.get<
                {
                    decimals: number
                    name: string
                    symbol: string
                    address: string
                    logo?: string | null
                    logoHash?: string | null
                    thumbnail?: string | null
                }[]
            >('https://deep-index.moralis.io/api/v2/erc20/metadata', {
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
