import {
  HexString,
  VaultTypes,
  TransactionTypes,
} from "@nixjs23n6/utilities-adapter";

export abstract class BaseProvider {
  abstract getAccountFromMnemonic(
    derivationPath: number,
    mnemonic: string
  ): Promise<VaultTypes.AccountObject>;

  abstract address(): string;

  abstract pubKey(): string;
  /**
   * Derives account address, public key and private key
   * @returns AccountObject instance.
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
  abstract toPrivateKeyObject(): VaultTypes.AccountObject;

  /**
   * Signs specified `hexString` with account's private key
   * @param hexString A regular string or Uint8Array to sign
   * @returns A signature HexString
   */
  abstract signMessage(
    message: Uint8Array | string,
    privateKey?: HexString
  ): Promise<HexString>;

  /**
   * Signs specified `hexString` with account's private key
   * @param hexString A regular string or Uint8Array to sign
   * @returns A signature HexString
   */
  abstract signTransaction(
    unsigned: TransactionTypes.UnsignedTransaction,
    privateKey?: HexString
  ): Promise<TransactionTypes.SignedTransaction>;
}
