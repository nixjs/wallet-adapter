import nacl from 'tweetnacl'
import { blake2b } from '@noble/hashes/blake2b'
import { bytesToHex } from '@noble/hashes/utils'
import { hmac } from '@noble/hashes/hmac'
import { sha512 } from '@noble/hashes/sha512'
import * as hmacc from 'js-crypto-hmac'
import { Buffer } from 'buffer'
import { HexString } from '@nixjs23n6/utilities-adapter'

export const SIGNATURE_SCHEME_TO_FLAG = {
    ED25519: 0x00,
    Secp256k1: 0x01,
}

export function normalizeSuiAddress(value: string, forceAdd0x = false): string {
    let address = value.toLowerCase()
    if (!forceAdd0x && address.startsWith('0x')) {
        address = address.slice(2)
    }
    return `0x${address.padStart(64, '0')}`
}

export class Ed25519HdKey {
    keyPair: nacl.SignKeyPair
    chainCode: Buffer
    static readonly ED25519_SCHEME = 0
    static readonly MASTER_SECRET = 'ed25519 seed'

    constructor(privateKeyBytes: Uint8Array | undefined, chainCode: Buffer) {
        if (privateKeyBytes) {
            this.keyPair = nacl.sign.keyPair.fromSeed(privateKeyBytes.slice(0, 32))
        } else {
            this.keyPair = nacl.sign.keyPair()
        }
        this.chainCode = chainCode
    }

    public static async fromMasterSeed(seed: Buffer): Promise<Ed25519HdKey> {
        // const key = await hmac.compute(Buffer.from(Ed25519HdKey.MASTER_SECRET), seed, 'SHA-512')
        const key = hmac.create(sha512, Ed25519HdKey.MASTER_SECRET)
        const I = key.update(seed).digest()
        return new Ed25519HdKey(Buffer.from(I.slice(0, 32)), Buffer.from(I.slice(32)))
    }

    public getAddress(): string {
        const tmp = new Uint8Array(33)
        tmp.set([SIGNATURE_SCHEME_TO_FLAG['ED25519']])
        tmp.set(this.getPublicKey(), 1)
        return normalizeSuiAddress(bytesToHex(blake2b(tmp, { dkLen: 32 })).slice(0, 64))
    }

    public getPublicKey(): Uint8Array {
        return this.keyPair.publicKey
    }

    public getPublicHexString(): string {
        return HexString.fromUint8Array(this.keyPair.publicKey).hex()
    }

    public getPrivateKey(): Uint8Array {
        return this.keyPair.secretKey.slice(0, 32)
    }

    public getPrivateHexString(): string {
        return HexString.fromUint8Array(this.getPrivateKey()).hex()
    }

    public signBuffer(buffer: Uint8Array): HexString {
        const signature = nacl.sign(buffer, this.keyPair.secretKey)
        return HexString.fromUint8Array(signature.slice(0, 64))
    }

    public sign(message: HexString): HexString {
        const toSign = HexString.ensure(message).toUint8Array()
        return this.signBuffer(toSign)
    }

    public async derive(path: string): Promise<Ed25519HdKey> {
        if (!/^[mM]'?/.test(path)) {
            throw new Error('Path must start with "m" or "M"')
        }
        if (/^[mM]'?$/.test(path)) {
            return this
        }
        const parts = path.replace(/^[mM]'?\//, '').split('/')
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let key: Ed25519HdKey = this

        for (const part of parts) {
            const m = /^(\d+)('?)$/.exec(part)
            if (!m || m.length !== 3) {
                throw new Error(`Invalid child index: ${part}`)
            }
            const idx = m[2] === "'" ? parseInt(m[1]) + 2 ** 31 : parseInt(m[1])
            key = await key.deriveChild(idx)
        }

        return key
    }

    public async deriveChild(index: number): Promise<Ed25519HdKey> {
        if (!this.keyPair || !this.chainCode) {
            throw new Error('No publicKey or chainCode set')
        }
        if (!isHardenedIndex(index)) {
            throw Error('Only hardened CKDPriv is supported for ed25519.')
        }

        const data: Buffer = Buffer.alloc(37)
        data.fill(this.keyPair.secretKey, 1, 33)
        data.fill(ser32(index), 33, 37)

        const key = await hmacc.compute(this.chainCode, data, 'SHA-512')
        return new Ed25519HdKey(Buffer.from(key.slice(0, 32)), Buffer.from(key.slice(32)))
    }
}

function isHardenedIndex(index: number): boolean {
    if (!Number.isInteger(index) || index < 0 || index >= 2 ** 32) {
        throw Error('Invalid index.')
    }
    return index >= 2 ** 31
}

function ser32(index: number): Buffer {
    if (!Number.isInteger(index)) {
        throw Error('Invalid index.')
    }

    if (index < 0 || index >= 2 ** 32) {
        throw Error('Overflowed.')
    }

    return Buffer.from(index.toString(16).padStart((32 / 8) * 2, '0'), 'hex')
}
