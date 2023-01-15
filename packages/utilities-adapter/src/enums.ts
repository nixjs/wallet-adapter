export namespace ProviderEnums {
    export enum Provider {
        APTOS = 'aptos',
        SUI = 'sui',
        ETHEREUM = 'ethereum',
        // POLYGON = 'polygon',
        // BSC = 'bsc',
        // CELO = 'celo',
        // STARK_NET = 'starknet',
        // AVELANCHE = 'avelanche',
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
    export enum GasPriceTypes {
        SLOW = 'SLOW',
        AVERAGE = 'AVERAGE',
        FAST = 'FAST',
    }
}

export namespace NftEnums {
    export enum NftTokenType {
        ERC721 = 'ERC721',
        ERC1155 = 'ERC1155',
        UNKNOWN = 'UNKNOWN',
    }
}
