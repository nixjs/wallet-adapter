import nacl from "tweetnacl";
import { sha3_256 as sha3Hash } from "@noble/hashes/sha3";
import { HexString } from "@nixjs23n6/utilities-adapter";
import * as hmac from "js-crypto-hmac";
import { Buffer } from "buffer";

export class Ed25519HdKey {
  keyPair: nacl.SignKeyPair;
  chainCode: Buffer;
  static readonly ED25519_SCHEME = 0;
  static readonly MASTER_SECRET = "ed25519 seed";

  constructor(privateKeyBytes: Uint8Array | undefined, chainCode: Buffer) {
    if (privateKeyBytes) {
      this.keyPair = nacl.sign.keyPair.fromSeed(privateKeyBytes.slice(0, 32));
    } else {
      this.keyPair = nacl.sign.keyPair();
    }
    this.chainCode = chainCode;
  }

  public static async fromMasterSeed(seed: Buffer): Promise<Ed25519HdKey> {
    const key = await hmac.compute(
      Buffer.from(Ed25519HdKey.MASTER_SECRET),
      seed,
      "SHA-512"
    );
    return new Ed25519HdKey(
      Buffer.from(key.slice(0, 32)),
      Buffer.from(key.slice(32))
    );
  }

  public getAddress(): string {
    const bytes = new Uint8Array(this.keyPair.publicKey.length + 1);
    bytes.set(this.keyPair.publicKey);
    bytes.set([Ed25519HdKey.ED25519_SCHEME], this.keyPair.publicKey.length);

    const hash = sha3Hash.create();
    hash.update(bytes);

    return HexString.fromUint8Array(hash.digest()).hex();
  }

  public getPublicKey(): Uint8Array {
    return this.keyPair.publicKey;
  }

  public getPublicHexString(): string {
    return HexString.fromUint8Array(this.keyPair.publicKey).hex();
  }

  public getPrivateKey(): Uint8Array {
    return this.keyPair.secretKey;
  }

  public getPrivateHexString(): string {
    return HexString.fromUint8Array(this.getPrivateKey()).hex();
  }

  public signBuffer(buffer: Uint8Array): HexString {
    const signature = nacl.sign(buffer, this.keyPair.secretKey);
    return HexString.fromUint8Array(signature.slice(0, 64));
  }

  public sign(message: HexString): HexString {
    const toSign = HexString.ensure(message).toUint8Array();
    return this.signBuffer(toSign);
  }

  // public verify(digest: Buffer, signature: Buffer): boolean {
  //     return this.keyPair.verify(digest, signature)
  // }

  public async derive(path: string): Promise<Ed25519HdKey> {
    if (!/^[mM]'?/.test(path)) {
      throw new Error('Path must start with "m" or "M"');
    }
    if (/^[mM]'?$/.test(path)) {
      return this;
    }
    const parts = path.replace(/^[mM]'?\//, "").split("/");
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let key: Ed25519HdKey = this;

    for (const part of parts) {
      const m = /^(\d+)('?)$/.exec(part);
      if (!m || m.length !== 3) {
        throw new Error(`Invalid child index: ${part}`);
      }
      const idx = m[2] === "'" ? parseInt(m[1]) + 2 ** 31 : parseInt(m[1]);
      key = await key.deriveChild(idx);
    }

    return key;
  }

  public async deriveChild(index: number): Promise<Ed25519HdKey> {
    if (!this.keyPair || !this.chainCode) {
      throw new Error("No publicKey or chainCode set");
    }
    if (!isHardenedIndex(index)) {
      throw Error("Only hardened CKDPriv is supported for ed25519.");
    }

    const data: Buffer = Buffer.alloc(37);
    data.fill(this.keyPair.secretKey, 1, 33);
    data.fill(ser32(index), 33, 37);

    const key = await hmac.compute(this.chainCode, data, "SHA-512");
    return new Ed25519HdKey(
      Buffer.from(key.slice(0, 32)),
      Buffer.from(key.slice(32))
    );
  }
}

function isHardenedIndex(index: number): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= 2 ** 32) {
    throw Error("Invalid index.");
  }
  return index >= 2 ** 31;
}

function ser32(index: number): Buffer {
  if (!Number.isInteger(index)) {
    throw Error("Invalid index.");
  }

  if (index < 0 || index >= 2 ** 32) {
    throw Error("Overflowed.");
  }

  return Buffer.from(index.toString(16).padStart((32 / 8) * 2, "0"), "hex");
}
