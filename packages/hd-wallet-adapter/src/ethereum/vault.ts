import { VaultTypes, ProviderEnums, EvmUtil, HexString, TransactionTypes } from '@nixjs23n6/utilities-adapter'
import { BaseProvider } from '../vault/base'
import { Crypto } from '../vault/crypto'
import * as ether from 'ethers'

export class EthereumVault extends BaseProvider {
    static formatDerivePath(path: string) {
        const t = path.split('/')
        let text = ''
        const len = t.length
        for (let i = 0; i < len; i += 1) {
            if (i < len - 2) {
                text += t[i] + '/'
            } else if (i === len - 2 || i === len - 1) {
                text += t[i].split("'")[0]
                if (i === len - 2) text += '/'
            }
        }
        return text
    }
    static async fromDerivePath(path: string, mnemonics: string): Promise<EthereumVault> {
        if (!EthereumVault.isValidPath(path)) {
            throw new Error('Invalid derivation path')
        }
        const wallet = await ether.Wallet.fromMnemonic(mnemonics, this.formatDerivePath(path))
        return new EthereumVault(wallet)
    }

    static isValidPath(path: string): boolean {
        if (!/^m\/44'\/60'\/[0-9]+'\/[0-9]+'\/[0-9]+'+$/.test(path)) {
            return false
        }
        return true
    }

    async getAccountFromMnemonic(derivationPath: number, mnemonic: string): Promise<VaultTypes.AccountObject & { path: string }> {
        const path = Crypto.derivationHdPath(EvmUtil.CoinType, derivationPath)
        const ac = await EthereumVault.fromDerivePath(Crypto.derivationHdPath(EvmUtil.CoinType, derivationPath), mnemonic)
        return { ...ac.toPrivateKeyObject(), path }
    }

    wallet: ether.Wallet

    constructor(wallet: ether.Wallet) {
        super()
        this.wallet = wallet
    }

    public get coinType(): number {
        return EvmUtil.CoinType
    }

    public get type(): ProviderEnums.Provider {
        return ProviderEnums.Provider.ETHEREUM
    }

    address(): string {
        return this.wallet.address
    }

    pubKey(): string {
        return this.wallet.publicKey
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
            address: this.wallet.address,
            publicKeyHex: this.wallet.publicKey,
            privateKeyHex: this.wallet.privateKey,
        }
    }

    async signMessage(message: string | Uint8Array, owner?: VaultTypes.AccountObject): Promise<HexString> {
        let signed: string
        function Uint8ArrayToBuffer(bytes: Uint8Array) {
            const buffer = Buffer.alloc(bytes.byteLength)
            for (let i = 0; i < buffer.length; ++i) {
                buffer[i] = bytes[i]
            }
            return buffer
        }
        const buffer = message instanceof Uint8Array ? Uint8ArrayToBuffer(message) : Buffer.from(message)

        if (owner && owner.privateKeyHex && owner.publicKeyHex) {
            const ourPrivateKey = new HexString(Crypto.mergePrivateKey(owner.publicKeyHex, owner.privateKeyHex)).toUint8Array()
            const toSign = HexString.ensure(HexString.fromBuffer(buffer)).toUint8Array()
            const ourWallet = new ether.Wallet(ourPrivateKey)
            signed = await ourWallet.signMessage(toSign)
        } else {
            signed = await this.wallet.signMessage(message)
        }
        return HexString.ensure(signed)
    }

    /**
     * @deprecated
     * Signs specified `hexString` with account's private key
     * @param hexString A regular string or Uint8Array to sign
     * @returns A signature HexString
     */
    async signTransaction(
        unsigned: TransactionTypes.UnsignedTransaction,
        owner?: VaultTypes.AccountObject
    ): Promise<TransactionTypes.SignedTransaction> {
        let signature: string
        if (owner && owner.privateKeyHex && owner.publicKeyHex) {
            const ourPrivateKey = new HexString(Crypto.mergePrivateKey(owner.publicKeyHex, owner.privateKeyHex)).toUint8Array()
            const ourWallet = new ether.Wallet(ourPrivateKey)
            signature = await ourWallet.signTransaction({})
        } else {
            signature = await this.wallet.signTransaction({})
        }
        return {
            data: unsigned.data,
            signature: HexString.ensure(signature),
        }
    }
}
