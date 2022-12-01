export class Explore {
    static account(exploreURL: string, address: string, type: string) {
        return `${exploreURL}/addresses/${address}?network=${type.toLowerCase()}`
    }
    static txn(explorerURL: string, hash: string, type: string) {
        return `${explorerURL}/transactions/${hash}?network=${type.toLowerCase()}`
    }
}
