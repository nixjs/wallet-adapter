export interface AlchemyResponse<T> {
    jsonrpc: string
    id: number
    error?: any
    result?: T
}
