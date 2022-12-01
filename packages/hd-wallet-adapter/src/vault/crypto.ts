export namespace Crypto {
    export function derivationHdPath(coinType: number, id: number) {
        return `m/44'/${coinType}'/0'/0'/${id}'`
    }

    export function derivationPathIndex(derivationPath: string): number {
        return parseFloat(derivationPath.split('/')[3])
    }
}
