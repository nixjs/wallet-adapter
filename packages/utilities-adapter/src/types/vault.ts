import { Types } from '@nixjs23n6/types'
import { PrimitiveHexString } from '../HexString'

export namespace VaultTypes {
    export interface AccountObject {
        address?: PrimitiveHexString
        publicKeyHex?: PrimitiveHexString
        privateKeyHex: PrimitiveHexString
    }
    export interface AccountInfo {
        index: number
        name: string
        address: PrimitiveHexString
        derivationPath: string
        publicKey?: PrimitiveHexString
        display: boolean
    }

    export type AccountProviders = Types.Object<{
        accountActivated: PrimitiveHexString
        accounts: Types.Object<AccountInfo>
    }>
}
