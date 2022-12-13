import { HexString } from '@nixjs23n6/utilities-adapter'

export namespace Crypto {
    export function derivationHdPath(coinType: number, id: number) {
        return `m/44'/${coinType}'/${id}'/0'/0'`
    }

    export function derivationPathIndex(derivationPath: string): number {
        return parseFloat(derivationPath.split('/')[3])
    }

    export function mergePrivateKey(publicKey: string, privateKey: string) {
        const pubKey = new HexString(publicKey).noPrefix()
        const priKey = new HexString(privateKey).noPrefix()
        return `0x${priKey}${pubKey}`
    }
}
