import { Types } from '@nixjs23n6/types'
import { SUI_TYPE_ARG } from '@mysten/sui.js'
import { ProviderEnums } from '../enums'
import { NetworkTypes } from '../types'

export const SUICoinStore = SUI_TYPE_ARG
export const BaseCoinType = '0x2::coin::Coin'
export const BaseCoinTypeRegex = /^0x2::coin::Coin<(.+)>$/
export const BaseMaxGasAmount = 150
export const CoinType = 784
export const BaseDecimals = 9
export const BaseIconURL = 'https://raw.githubusercontent.com/nixjs/aptos-wallet-icon/main/icons/sui-logo.svg'

export const MainnetNodeURL = 'https://fullnode.mainnet.sui.io'
export const TestnetNodeURL = 'https://fullnode.testnet.sui.io'
export const DevnetNodeURL = 'https://fullnode.devnet.sui.io'

export const MainnetChain = '0x1:mainnet'
export const TestnetChain = '0x2:testnet'
export const DevnetChain = '0x2:devnet'

export const BaseNodeInfo: Record<ProviderEnums.Network, string> = {
    [ProviderEnums.Network.MAIN_NET]: MainnetNodeURL,
    [ProviderEnums.Network.TEST_NET]: TestnetNodeURL,
    [ProviderEnums.Network.DEV_NET]: DevnetNodeURL,
}
export const BaseNodeByChainInfo: Record<number | string, string> = {
    [MainnetChain]: MainnetNodeURL,
    [TestnetChain]: TestnetNodeURL,
    [DevnetChain]: DevnetNodeURL,
}

export const Networks: Types.Object<NetworkTypes.Network> = {
    [MainnetChain]: {
        chainId: MainnetChain,
        name: 'SUI Mainnet',
        faucetURL: '',
        nodeURL: MainnetNodeURL,
        explorerURL: 'https://explorer.sui.io',
        nativeToken: 'SUI',
        active: true,
        type: ProviderEnums.Network.MAIN_NET,
    },
    [TestnetChain]: {
        chainId: TestnetChain,
        name: 'SUI Testnet',
        faucetURL: 'https://faucet.testnet.sui.io/gas',
        nodeURL: TestnetNodeURL,
        explorerURL: 'https://explorer.sui.io',
        nativeToken: 'SUI',
        type: ProviderEnums.Network.TEST_NET,
        active: true,
        isFaucetNft: true,
    },
    [DevnetChain]: {
        chainId: DevnetChain,
        name: 'SUI Devnet',
        faucetURL: 'https://faucet.devnet.sui.io/gas',
        nodeURL: DevnetNodeURL,
        explorerURL: 'https://explorer.sui.io',
        nativeToken: 'SUI',
        type: ProviderEnums.Network.DEV_NET,
        active: true,
        isFaucetNft: true,
    },
}
