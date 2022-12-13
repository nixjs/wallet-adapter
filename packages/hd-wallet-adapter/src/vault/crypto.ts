import { HexString } from '@nixjs23n6/utilities-adapter'

export namespace Crypto {
    export function derivationHdPath(coinType: number, id: number) {
        return `m/44'/${coinType}'/${id}'/0'/0'`
    }

    export function derivationPathIndex(derivationPath: string): number {
        return parseFloat(derivationPath.split('/')[3])
    }

    export function mergePrivateKey(publicKey: string | HexString, privateKey: string | HexString) {
        let pubKey = ''
        if (HexString.ensure(publicKey)) {
            pubKey = (publicKey as HexString).noPrefix()
        } else {
            pubKey = new HexString(publicKey as string).noPrefix()
        }

        let priKey = ''
        if (HexString.ensure(privateKey)) {
            priKey = (privateKey as HexString).noPrefix()
        } else {
            priKey = new HexString(privateKey as string).noPrefix()
        }
        return `0x${priKey}${pubKey}`
    }
}
