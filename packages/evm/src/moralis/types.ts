import { Types } from '@nixjs23n6/types'

export interface Erc20TokenBalance {
    token_address: string
    name: string
    symbol: string
    logo: Types.Nullable<string>
    thumbnail: Types.Nullable<string>
    decimals: number
    balance: string
}

export interface NFT {
    token_address: string
    token_id: string
    amount: Types.Nullable<string>
    owner_of: string
    token_hash: string
    block_number_minted: string
    block_number: string
    contract_type: string
    name: string
    symbol: string
    token_uri: Types.Nullable<string>
    metadata: Types.Nullable<string>
    last_token_uri_sync: string
    last_metadata_sync: string
    minter_address: string
}
