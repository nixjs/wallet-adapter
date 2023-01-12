import { PrimitiveHexString } from '@nixjs23n6/utilities-adapter'
import { EvmNativeConfig } from '../evmNativeConfig'

export function getAddressExplorer(address: PrimitiveHexString, chainId: PrimitiveHexString): string {
    const native = EvmNativeConfig[chainId]
    if (!native) return ''
    return `${native.explorer}/address/${address}`
}

export function getTransactionExplorer(address: PrimitiveHexString, chainId: PrimitiveHexString): string {
    const native = EvmNativeConfig[chainId]
    if (!native) return ''
    return `${native.explorer}/tx/${address}`
}
