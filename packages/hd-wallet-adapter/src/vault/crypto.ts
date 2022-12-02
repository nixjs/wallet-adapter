export namespace Crypto {
  export function derivationHdPath(coinType: number, id: number) {
    return `m/44'/${coinType}'/${id}'/0'/0'`;
  }

  export function derivationPathIndex(derivationPath: string): number {
    return parseFloat(derivationPath.split("/")[3]);
  }
}
