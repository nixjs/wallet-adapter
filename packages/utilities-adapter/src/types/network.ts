import { Types } from '@nixjs23n6/types'
import { ProviderEnums } from '../enums'

export namespace NetworkTypes {
    export interface Network {
        chainId: string
        name: string
        nodeURL: string
        faucetURL: string
        explorerURL: string
        nativeToken: string
        type: ProviderEnums.Network
        active?: boolean
        isFaucetNft?: boolean
    }
    export type NetworkData = {
        data: Types.Object<Network>
        name: string
        url: string
        active?: boolean
    }
    export type NetworkByProviders = Record<ProviderEnums.Provider, NetworkData>
}
