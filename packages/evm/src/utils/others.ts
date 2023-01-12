import { EvmTypes } from '../types'

export const createEndpoint = (config: EvmTypes.ConfigData) => {
    let url = config.endpoint
    if (config.prefix) url += `/${config.prefix}`
    url += `/${config.apiKey}`
    return url
}
