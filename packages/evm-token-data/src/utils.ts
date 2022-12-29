import * as ethers from 'ethers'
import { JsonFragment } from '@ethersproject/abi'
import { EvmTypes } from './types'
import ERC20 from './abis/erc20.json'
import ERC721 from './abis/erc721.json'
import ERC1155 from './abis/erc1155.json'
import { Types } from '@nixjs23n6/types'

export function decodeTransactionLogFromABIs(logs: { topics: Array<string>; data: string }[]): Types.Undefined<EvmTypes.LogDescription[]> {
    const ABIs: JsonFragment[][] = [ERC20, ERC721, ERC1155]
    for (let i = 0; i < ABIs.length; i++) {
        const target = ABIs[i]
        const log = decodeTransactionLog(target, logs)
        if (log) return log
    }
}

export function decodeInputDataFromABIs(inputData: string): Types.Undefined<EvmTypes.InputData> {
    const ABIs: JsonFragment[][] = [ERC20, ERC721, ERC1155]
    for (let i = 0; i < ABIs.length; i++) {
        const target = ABIs[i]
        const log = decodeInputData(target, inputData)
        if (log) return log
    }
}

export function decodeTransactionLog(ABI: JsonFragment[], logs: { topics: Array<string>; data: string }[]): EvmTypes.LogDescription[] {
    if (ABI.length === 0 || logs.length === 0) return []

    const events: EvmTypes.LogDescription[] = []
    logs.forEach((log: { topics: Array<string>; data: string }) => {
        try {
            const iface: ethers.utils.Interface = new ethers.utils.Interface(ABI)
            const event: ethers.utils.LogDescription = iface.parseLog(log)
            if (event) {
                const { args, eventFragment, name } = event
                const request: Record<string, any> = {}
                const inputs = eventFragment.inputs.map((i) => i.name)
                for (let i = 0; i < inputs.length; i++) {
                    const target = inputs[i]
                    let value = args[target]
                    if (ethers.BigNumber.isBigNumber(args[target])) {
                        value = ethers.BigNumber.from(args[target]).toString()
                    }

                    let key = target
                    if (target.startsWith('_')) key = target.replace('_', '')
                    Object.assign(request, { [key]: value })
                }
                events.push({ name, args: request, original: event })
            }
        } catch (error) {
            // event not found, find in next abi
        }
    })
    return events
}

export function decodeInputData(ABI: JsonFragment[], inputData: string): Types.Nullable<EvmTypes.InputData> {
    try {
        const inter = new ethers.utils.Interface(ABI)
        const original = inter.parseTransaction({ data: inputData })
        const { name, args, functionFragment } = original

        const inputs = functionFragment.inputs.map((i) => i.name)

        const request: Record<string, any> = {}
        for (let i = 0; i < inputs.length; i++) {
            const target = inputs[i]
            let value = args[target]
            if (ethers.BigNumber.isBigNumber(args[target])) {
                value = ethers.BigNumber.from(args[target]).toString()
            }

            let key = target
            if (target.startsWith('_')) key = target.replace('_', '')
            Object.assign(request, { [key]: value })
        }
        return { name, args: request, original }
    } catch (error) {
        return null
    }
}
