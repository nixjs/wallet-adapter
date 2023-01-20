import { Types } from '@nixjs23n6/types'
import { ProviderEnums } from '../enums'
import { NetworkTypes } from '../types'

export const AptosCoinStore = '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
export const AptosCoinSymbol = 'APT'
export const BaseCoinStore = '0x1::coin::CoinStore'
export const AptosTokenStore = '0x3::token::TokenStore'
export const BaseCoinType = '0x1::aptos_coin::AptosCoin'
export const CoinType = 637
export const BaseFundingAirdrop = 1000000000
export const BaseGasPrice = 100
export const BaseMaxGasAmount = 2000
export const BaseExpireTimestamp = 300 // second
export const BaseDecimals = 8
export const BaseIconURL = 'https://raw.githubusercontent.com/nixjs/aptos-wallet-icon/main/icons/aptos-logo.svg'

export const MainnetNodeURL = 'https://fullnode.mainnet.aptoslabs.com'
export const TestnetNodeURL = 'https://fullnode.testnet.aptoslabs.com'
export const DevnetNodeURL = 'https://fullnode.devnet.aptoslabs.com'

export const MainnetChain = '0x1'
export const TestnetChain = '0x2'
export const DevnetChain = '0x2B'

export const BaseNodeInfo: Record<ProviderEnums.Network, string> = {
    [ProviderEnums.Network.MAIN_NET]: MainnetNodeURL,
    [ProviderEnums.Network.TEST_NET]: TestnetNodeURL,
    [ProviderEnums.Network.DEV_NET]: DevnetNodeURL,
}

export const BaseNodeByChainInfo: Record<string, string> = {
    [MainnetChain]: MainnetNodeURL,
    [TestnetChain]: TestnetNodeURL,
    [DevnetChain]: DevnetNodeURL,
}

export const Networks: Types.Object<NetworkTypes.Network> = {
    [MainnetChain]: {
        chainId: MainnetChain,
        name: 'Aptos Mainnet',
        faucetURL: '',
        nodeURL: MainnetNodeURL,
        explorerURL: 'https://explorer.aptoslabs.com',
        nativeToken: 'APT',
        type: ProviderEnums.Network.MAIN_NET,
        active: true,
    },
    [TestnetChain]: {
        chainId: TestnetChain,
        name: 'Aptos Testnet',
        faucetURL: 'https://faucet.testnet.aptoslabs.com',
        nodeURL: TestnetNodeURL,
        explorerURL: 'https://explorer.aptoslabs.com',
        nativeToken: 'APT',
        type: ProviderEnums.Network.TEST_NET,
        active: true,
        isFaucetNft: true,
    },
    [DevnetChain]: {
        chainId: DevnetChain,
        name: 'Aptos Devnet',
        faucetURL: 'https://faucet.devnet.aptoslabs.com',
        nodeURL: DevnetNodeURL,
        explorerURL: 'https://explorer.aptoslabs.com',
        nativeToken: 'APT',
        type: ProviderEnums.Network.DEV_NET,
        active: true,
        isFaucetNft: true,
    },
}
