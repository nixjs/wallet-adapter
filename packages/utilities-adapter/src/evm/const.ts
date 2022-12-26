import { Types } from '@nixjs23n6/types'
import { ProviderEnums } from '../enums'
import { NetworkTypes } from '../types'
import { EvmChain } from './evmChain'

export const CoinSymbol = 'ETH'
export const CoinType = 60
export const BaseGasPrice = 100
export const BaseMaxGasAmount = 2000
export const BaseExpireTimestamp = 100 // second
export const BaseDecimals = 18
export const BaseIconURL = 'https://raw.githubusercontent.com/nixjs/coin-dapp-wallet-list/main/src/etherum/etherum.svg'

export const MainnetNodeURL = 'https://mainnet.infura.io/v3'
export const GoerliNodeURL = 'https://goerli.infura.io/v3'
export const SepoliaNodeURL = 'https://sepolia.infura.io/v3'
export const PolygonNodeURL = 'https://polygon-rpc.com'
export const PolygonMumbaiNodeURL = 'https://rpc-mumbai.maticvigil.com'

export const MainnetChain = EvmChain.ETHEREUM
export const GoerliChain = EvmChain.GOERLI
export const SepoliaChain = EvmChain.SEPOLIA
export const PolygonChain = EvmChain.POLYGON
export const PolygonMumbaiChain = EvmChain.MUMBAI

export const BaseNodeByChainInfo: Record<string, string> = {
    [MainnetChain]: MainnetNodeURL,
    [GoerliChain]: GoerliNodeURL,
    [SepoliaChain]: SepoliaNodeURL,
    [PolygonChain]: PolygonNodeURL,
    [PolygonMumbaiChain]: PolygonMumbaiNodeURL,
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
    [GoerliChain]: {
        chainId: GoerliChain,
        name: 'Ethereum Goerli',
        faucetURL: '',
        nodeURL: GoerliNodeURL,
        explorerURL: 'https://goerli.etherscan.io',
        nativeToken: 'ETH',
        type: ProviderEnums.Network.TEST_NET,
    },
    [SepoliaChain]: {
        chainId: SepoliaChain,
        name: 'Ethereum Sepolia',
        faucetURL: '',
        nodeURL: SepoliaNodeURL,
        explorerURL: 'https://sepolia.etherscan.io',
        nativeToken: 'ETH',
        type: ProviderEnums.Network.TEST_NET,
    },
    [PolygonChain]: {
        chainId: PolygonChain,
        name: 'Polygon Mainnet',
        faucetURL: '',
        nodeURL: PolygonNodeURL,
        explorerURL: 'https://polygonscan.com',
        nativeToken: 'MATIC',
        type: ProviderEnums.Network.MAIN_NET,
    },
    [PolygonMumbaiChain]: {
        chainId: PolygonMumbaiChain,
        name: 'Polygon Mumbai Mainnet',
        faucetURL: '',
        nodeURL: PolygonNodeURL,
        explorerURL: 'https://mumbai.polygonscan.com',
        nativeToken: 'MATIC',
        type: ProviderEnums.Network.TEST_NET,
    },
}
