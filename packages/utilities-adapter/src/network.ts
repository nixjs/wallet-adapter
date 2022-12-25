import { NetworkTypes } from './types'
import { Networks as AptosNetworks, BaseIconURL as AptosLogo } from './aptos'
import { Networks as SUINetworks, BaseIconURL as SUILogo } from './sui'
import { Networks as EthereumNetworks, BaseIconURL as EthereumLogo } from './ethereum'

export namespace Network {
    export const NetworkByProviders: NetworkTypes.NetworkByProviders = {
        aptos: {
            name: 'Aptos Blockchain',
            url: AptosLogo,
            data: AptosNetworks,
            active: true,
        },
        sui: {
            name: 'SUI Blockchain',
            url: SUILogo,
            data: SUINetworks,
            active: true,
        },
        ethereum: {
            name: 'Ethereum Blockchain',
            url: EthereumLogo,
            data: EthereumNetworks,
        },
    }
}
