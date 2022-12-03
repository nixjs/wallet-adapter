export namespace ProviderEnums {
  export enum Provider {
    APTOS = "aptos",
    SUI = "sui",
  }
}

export namespace TransactionEnums {
  export enum TransactionType {
    RECEIVE,
    SEND,
    MINT,
    SCRIPT,
    CLAIM,
    UNKNOWN,
  }
  export enum TransactionStatus {
    FAILED,
    SUCCESS,
  }
}
