import { Types } from '@nixjs23n6/types'
import { AssetTypes, EvmUtil } from '@nixjs23n6/utilities-adapter'

export const EvmNativeConfig: Types.Object<{
    explorer: string
    native: AssetTypes.Asset
}> = {
    [EvmUtil.EvmChain.EVM]: {
        explorer: 'https://etherscan.io',
        native: {
            assetId: 'ETH',
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18,
            logoUrl: EvmUtil.BaseIconURL,
            isNative: true,
        },
    },
    [EvmUtil.EvmChain.GOERLI]: {
        explorer: 'https://goerli.etherscan.io',
        native: {
            assetId: 'ETH',
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18,
            logoUrl: EvmUtil.BaseIconURL,
            isNative: true,
        },
    },
    [EvmUtil.EvmChain.BSC]: {
        explorer: 'https://bscscan.com',
        native: {
            assetId: 'BNB',
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18,
            logoUrl: EvmUtil.BaseIconURL,
            isNative: true,
        },
    },
    [EvmUtil.EvmChain.BSC_TESTNET]: {
        explorer: 'https://testnet.bscscan.com',
        native: {
            assetId: 'BNB',
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18,
            logoUrl: EvmUtil.BaseIconURL,
            isNative: true,
        },
    },
    [EvmUtil.EvmChain.POLYGON]: {
        explorer: 'https://polygonscan.com',
        native: {
            assetId: 'MATIC',
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18,
            logoUrl: EvmUtil.BaseIconURL,
            isNative: true,
        },
    },
    [EvmUtil.EvmChain.MUMBAI]: {
        explorer: 'https://explorer-mumbai.maticvigil.com',
        native: {
            assetId: 'MATIC',
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18,
            logoUrl: EvmUtil.BaseIconURL,
            isNative: true,
        },
    },
}
