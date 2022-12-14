import * as bip39 from '@scure/bip39'
import nacl from 'tweetnacl'
import { Buffer } from 'buffer'
import { Ed25519HdKey } from './hdkey'
import { HexString, VaultTypes, ProviderEnums, SUIUtil, TransactionTypes } from '@nixjs23n6/utilities-adapter'
import { Crypto } from '../vault/crypto'
import { BaseProvider } from '../vault/base'

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
        const path = Crypto.derivationHdPath(SUIUtil.CoinType, derivationPath)
        const ac = await SUIVault.fromDerivePath(Crypto.derivationHdPath(SUIUtil.CoinType, derivationPath), mnemonic)
        return { ...ac.toPrivateKeyObject(), path }
    }

    hdKey: Ed25519HdKey

    constructor(hdKey: Ed25519HdKey) {
        super()
        this.hdKey = hdKey
    }

    public get coinType(): number {
        return SUIUtil.CoinType
    }

    public get type(): ProviderEnums.Provider {
        return ProviderEnums.Provider.SUI
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

    async signMessage(message: Uint8Array | string, owner?: VaultTypes.AccountObject): Promise<HexString> {
        function Uint8ArrayToBuffer(bytes: Uint8Array) {
            const buffer = Buffer.alloc(bytes.byteLength)
            for (let i = 0; i < buffer.length; ++i) {
                buffer[i] = bytes[i]
            }
            return buffer
        }
        const buffer = message instanceof Uint8Array ? Uint8ArrayToBuffer(message) : Buffer.from(message)
        let signature: HexString
        if (owner && owner.privateKeyHex && owner.publicKeyHex) {
            const ourPrivateKey = new HexString(Crypto.mergePrivateKey(owner.publicKeyHex, owner.privateKeyHex)).toUint8Array()
            const toSign = HexString.ensure(HexString.fromBuffer(buffer)).toUint8Array()
            const signed = await nacl.sign(toSign, ourPrivateKey)
            signature = HexString.fromUint8Array(signed)
        } else {
            signature = await this.hdKey.sign(HexString.fromBuffer(buffer))
        }
        return signature
    }

    async signTransaction(
        unsigned: TransactionTypes.UnsignedTransaction,
        owner?: VaultTypes.AccountObject
    ): Promise<TransactionTypes.SignedTransaction> {
        let signature: HexString
        if (owner && owner.privateKeyHex && owner.publicKeyHex) {
            // const signature = await this.hdKey.signBuffer(Buffer.from(unsigned.data.hex()))
            const ourPrivateKey = new HexString(Crypto.mergePrivateKey(owner.publicKeyHex, owner.privateKeyHex)).toUint8Array()
            const toSign = HexString.ensure(unsigned.data.hex()).toUint8Array()
            const signed = await nacl.sign(toSign, ourPrivateKey)
            signature = HexString.fromUint8Array(signed)
        } else {
            signature = await this.hdKey.signBuffer(Buffer.from(unsigned.data.hex()))
        }
        return {
            data: unsigned.data,
            signature,
        }
    }
}
