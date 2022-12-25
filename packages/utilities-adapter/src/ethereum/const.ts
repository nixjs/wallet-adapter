import { Types } from '@nixjs23n6/types'
import { ProviderEnums } from '../enums'
import { NetworkTypes } from '../types'

export const CoinSymbol = 'ETH'
export const CoinType = 60
export const BaseGasPrice = 100
export const BaseMaxGasAmount = 2000
export const BaseExpireTimestamp = 100 // second
export const BaseDecimals = 18
export const BaseIconURL = 'https://raw.githubusercontent.com/nixjs/coin-dapp-wallet-list/main/src/etherum/etherum.svg'

export const MainnetNodeURL = 'https://mainnet.infura.io/v3'
export const TestnetGoerliNodeURL = 'https://goerli.infura.io/v3'
export const TestnetSepoliaNodeURL = 'https://sepolia.infura.io/v3'

export const AssetIdByChainId: Types.Object<string> = {
    '0x1': '0x0000000000000000000000000000000000000000',
    '0xA': '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000',
    '2xA': '0x0000000000000000000000000000000000000000',
    '0x5': '0x0000000000000000000000000000000000000000',
    '0x45': '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000',
    '1A4': '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000',
}

export const MainnetChain = '0x1'
export const TestnetGoerliChain = '0x5'
export const TestnetSepoliaChain = '0xAA36A7'

export const BaseNodeInfo: Record<ProviderEnums.Network, string> = {
    [ProviderEnums.Network.MAIN_NET]: MainnetNodeURL,
    [ProviderEnums.Network.TEST_NET]: TestnetGoerliNodeURL,
    [ProviderEnums.Network.DEV_NET]: TestnetSepoliaNodeURL,
}

export const BaseNodeByChainInfo: Record<string, string> = {
    [MainnetChain]: MainnetNodeURL,
    [TestnetGoerliChain]: TestnetGoerliNodeURL,
    [TestnetSepoliaChain]: TestnetSepoliaNodeURL,
}

export const Networks: Types.Object<NetworkTypes.Network> = {
    [MainnetChain]: {
        chainId: MainnetChain,
        name: 'Ethereum Mainnet',
        faucetURL: '',
        nodeURL: MainnetNodeURL,
        explorerURL: 'https://etherscan.io',
        nativeToken: 'ETH',
        type: ProviderEnums.Network.MAIN_NET,
    },
    [TestnetGoerliChain]: {
        chainId: TestnetGoerliChain,
        name: 'Goerli test network',
        faucetURL: '',
        nodeURL: TestnetGoerliNodeURL,
        explorerURL: 'https://goerli.etherscan.io',
        nativeToken: 'ETH',
        type: ProviderEnums.Network.TEST_NET,
    },
    [TestnetSepoliaChain]: {
        chainId: TestnetSepoliaChain,
        name: 'Ethereum Devnet',
        faucetURL: '',
        nodeURL: TestnetSepoliaNodeURL,
        explorerURL: 'https://sepolia.etherscan.io',
        nativeToken: 'ETH',
        type: ProviderEnums.Network.TEST_NET,
    },
}
