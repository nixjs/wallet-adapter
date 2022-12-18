import * as bip39 from '@scure/bip39'
import nacl from 'tweetnacl'
import { Buffer } from 'buffer'
import { Ed25519HdKey } from './hdkey'
import { HexString, VaultTypes, ProviderEnums, AptosUtil, TransactionTypes } from '@nixjs23n6/utilities-adapter'
import { BaseProvider } from '../vault/base'
import { Crypto } from '../vault/crypto'

export class AptosVault extends BaseProvider {
    static async fromDerivePath(path: string, mnemonics: string): Promise<AptosVault> {
        if (!AptosVault.isValidPath(path)) {
            throw new Error('Invalid derivation path')
        }
        const seed = bip39.mnemonicToSeedSync(mnemonics)
        const master = await Ed25519HdKey.fromMasterSeed(Buffer.from(seed))
        const hdKey = await master.derive(path)
        return new AptosVault(hdKey)
    }

    static isValidPath(path: string): boolean {
        if (!/^m\/44'\/637'\/[0-9]+'\/[0-9]+'\/[0-9]+'+$/.test(path)) {
            return false
        }
        return true
    }

    async getAccountFromMnemonic(derivationPath: number, mnemonic: string): Promise<VaultTypes.AccountObject & { path: string }> {
        const path = Crypto.derivationHdPath(AptosUtil.CoinType, derivationPath)
        const ac = await AptosVault.fromDerivePath(Crypto.derivationHdPath(AptosUtil.CoinType, derivationPath), mnemonic)
        return { ...ac.toPrivateKeyObject(), path }
    }

    hdKey: Ed25519HdKey

    constructor(hdKey: Ed25519HdKey) {
        super()
        this.hdKey = hdKey
    }

    public get coinType(): number {
        return AptosUtil.CoinType
    }

    public get type(): ProviderEnums.Provider {
        return ProviderEnums.Provider.APTOS
    }

    address(): string {
        return this.hdKey.getAddress()
    }

    pubKey(): string {
        return this.hdKey.getPrivateHexString()
    }

    /**
     * Derives account address, public key and private key
     * @returns CryptoAccountObject instance.
     * @example An example of the returned AptosAccountObject object
     * ```
     * {
     *    address: "0xe8012714cd17606cee7188a2a365eef3fe760be598750678c8c5954eb548a591",
     *    publicKeyHex: "0xf56d8524faf79fbc0f48c13aeed3b0ce5dd376b4db93b8130a107c0a5e04ba04",
     *    privateKeyHex: `0x009c9f7c992a06cfafe916f125d8adb7a395fca243e264a8e56a4b3e6accf940
     *      d2b11e9ece3049ce60e3c7b4a1c58aebfa9298e29a30a58a67f1998646135204`
     * }
     * ```
     */
    toPrivateKeyObject(): VaultTypes.AccountObject {
        return {
            address: this.hdKey.getAddress(),
            publicKeyHex: this.hdKey.getPublicHexString(),
            privateKeyHex: this.hdKey.getPrivateHexString(),
        }
    }

    async signMessage(message: Uint8Array | string, privateKey?: HexString): Promise<HexString> {
        function Uint8ArrayToBuffer(bytes: Uint8Array) {
            const buffer = Buffer.alloc(bytes.byteLength)
            for (let i = 0; i < buffer.length; ++i) {
                buffer[i] = bytes[i]
            }
            return buffer
        }
        const buffer = message instanceof Uint8Array ? Uint8ArrayToBuffer(message) : Buffer.from(message)
        let signature: HexString
        if (privateKey) {
            const toSign = HexString.ensure(HexString.fromBuffer(buffer)).toUint8Array()
            const signed = await nacl.sign(toSign, privateKey.toUint8Array())
            signature = HexString.fromUint8Array(signed)
        } else {
            signature = await this.hdKey.sign(HexString.fromBuffer(buffer))
        }
        return signature
    }

    async signTransaction(
        unsigned: TransactionTypes.UnsignedTransaction,
        privateKey?: HexString
    ): Promise<TransactionTypes.SignedTransaction> {
        let signature: HexString
        if (privateKey) {
            const toSign = HexString.ensure(unsigned.data.hex()).toUint8Array()
            const signed = await nacl.sign(toSign, privateKey.toUint8Array())
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
