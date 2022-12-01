import * as bip39 from '@scure/bip39'
import { Buffer } from 'buffer'
import { Ed25519HdKey } from './hdkey'
import { BaseProvider } from '../vault/base'
import { Crypto } from '../vault/crypto'
import { HexString } from '../hex_string'
import { VaultTypes } from '../vault/types'
import { BaseEnums } from '../enum'
import { SUIWalletConfig } from './const'

export class SUIVault extends BaseProvider {
    static async fromDerivePath(path: string, mnemonics: string): Promise<SUIVault> {
        if (!SUIVault.isValidPath(path)) {
            throw new Error('Invalid derivation path')
        }
        const seed = await bip39.mnemonicToSeed(mnemonics)
        const master = await Ed25519HdKey.fromMasterSeed(Buffer.from(seed))

        const hdKey = await master.derive(path)
        return new SUIVault(hdKey)
    }

    static isValidPath(path: string): boolean {
        if (!/^m\/44'\/784'\/[0-9]+'\/[0-9]+'\/[0-9]+'+$/.test(path)) {
            return false
        }
        return true
    }

    async getAccountFromMnemonic(derivationPath: number, mnemonic: string): Promise<VaultTypes.AccountObject & { path: string }> {
        const path = Crypto.derivationHdPath(SUIWalletConfig.CoinType, derivationPath)
        const ac = await SUIVault.fromDerivePath(Crypto.derivationHdPath(SUIWalletConfig.CoinType, derivationPath), mnemonic)
        return { ...ac.toPrivateKeyObject(), path }
    }

    hdKey: Ed25519HdKey

    constructor(hdKey: Ed25519HdKey) {
        super()
        this.hdKey = hdKey
    }

    public get coinType(): number {
        return SUIWalletConfig.CoinType
    }

    public get type(): BaseEnums.Provider {
        return BaseEnums.Provider.SUI
    }

    address(): string {
        return this.hdKey.getAddress()
    }

    pubKey(): string {
        return this.hdKey.getPrivateHexString()
    }

    toPrivateKeyObject(): VaultTypes.AccountObject {
        return {
            address: this.address(),
            publicKeyHex: this.hdKey.getPublicHexString(),
            privateKeyHex: this.hdKey.getPrivateHexString(),
        }
    }

    async signMessage(message: Uint8Array | string): Promise<HexString> {
        function Uint8ArrayToBuffer(bytes: Uint8Array) {
            const buffer = Buffer.alloc(bytes.byteLength)
            for (let i = 0; i < buffer.length; ++i) {
                buffer[i] = bytes[i]
            }
            return buffer
        }
        const buffer = message instanceof Uint8Array ? Uint8ArrayToBuffer(message) : Buffer.from(message)
        const signature = await this.hdKey.sign(HexString.fromBuffer(buffer).toString())
        return signature
    }
}
