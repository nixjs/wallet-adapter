export namespace AptosEnums {
  export enum TxEvent {
    WITHDRAW_EVENT = "withdraw_events",
    DEPOSIT_EVENT = "deposit_events",
  }

  export enum PayloadFunctionType {
    REGISTER = "0x1::managed_coin::register",
    TRANSFER = "0x1::coin::transfer",
    APTOS_ACCOUNT_TRANSFER = "0x1::aptos_account::transfer",
    MINT = "factory::mint_with_quantity",
    MINT_COLLECTION = "0x3::token::create_collection_script",
    ACCEPT_OFFER_COLLECTION = "::marketplaceV2::accept_offer_collection",
    MINT_TOKEN = "0x3::token::create_token_script",
    CLAIM = "claim::claim",
  }
}
