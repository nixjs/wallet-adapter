export type RawCoinInfo = {
    name: string
    symbol: string
    coingecko_id: string
    decimals: number
    logo_url: string
    project_url: string
    token_type: TokenType
    extensions: ExtensionType
    installed?: boolean
}
export type TokenType = {
    type: string
    account_address: string
    module_name: string
    struct_name: string
}

export type ExtensionType = {
    data: [string, string][]
}
