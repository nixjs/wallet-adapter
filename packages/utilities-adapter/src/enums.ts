export namespace ProviderEnums {
    export enum Provider {
        APTOS = 'aptos',
        SUI = 'sui',
        EVM = 'ethereum',
    }
    export enum Network {
        DEV_NET = 'devnet',
        TEST_NET = 'testnet',
        MAIN_NET = 'mainnet',
    }
}

export namespace TransactionEnums {
    export enum TransactionType {
        RECEIVE,
        SEND,
        MINT,
        SCRIPT,
        CLAIM,
        REGISTER_ASSET,
    }
    export enum TransactionStatus {
        FAILED,
        SUCCESS,
    }
}

export namespace NftEnums {
    export enum NftTokenType {
        ERC721 = 'ERC721',
        ERC1155 = 'ERC1155',
        UNKNOWN = 'UNKNOWN',
    }
}
