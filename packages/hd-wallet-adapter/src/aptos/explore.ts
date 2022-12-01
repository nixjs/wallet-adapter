export class Explore {
    static account(exploreURL: string, address: string, type: string) {
        return `${exploreURL}/account/${address}?network=${type}`
    }
    static txn(explorerURL: string, hash: string, type: string) {
        return `${explorerURL}/txn/${hash}?network=${type}`
    }
}
