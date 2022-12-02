import { Types } from "@nixjs23n6/types";

export namespace VaultTypes {
  export interface AccountObject {
    address?: string;
    publicKeyHex?: string;
    privateKeyHex: string;
  }
  export interface AccountInfo {
    index: number;
    name: string;
    address: string;
    derivationPath: string;
    publicKey?: string;
    display: boolean;
  }

  export type AccountProviders = Types.Object<{
    accountActivated: string;
    accounts: Types.Object<AccountInfo>;
  }>;
}
