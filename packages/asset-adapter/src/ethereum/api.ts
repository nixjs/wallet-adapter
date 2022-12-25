import { Types } from '@nixjs23n6/types'
import { EthereumUtil, Helper } from '@nixjs23n6/utilities-adapter'
import axios from 'axios'
import { Contract, getDefaultProvider, providers, utils, BigNumber } from 'ethers'
import * as TokenList from './erc20-list.json'

const ETCChainId = '0x3D'

export namespace EthereumApiRequest {
    export function getTokens(): {
        chainId: number
        address: string
        name: string
        symbol: string
        decimals: number
        logoURI: string
        extensions: {
            optimismBridgeAddress: string
        }
    }[] {
        return TokenList.tokens
    }

    export function getTokenInfo(address: string): Types.Undefined<{
        chainId: number
        address: string
        name: string
        symbol: string
        decimals: number
        logoURI: string
        extensions: {
            optimismBridgeAddress: string
        }
    }> {
        return (TokenList.tokens as Array<any>).find((t) => t.address === address)
    }

    export function getProvider(chainId: string): providers.BaseProvider {
        const nodeURL = EthereumUtil.BaseNodeByChainInfo[chainId]
        const provider =
            chainId !== ETCChainId
                ? getDefaultProvider(nodeURL)
                : new providers.JsonRpcProvider('https://www.ethercluster.com/etc', 'classic')
        return provider
    }

    export async function getBalance(chainId: string, address: string): Promise<string> {
        const provider = getProvider(chainId)

        return utils.formatEther(await provider.getBalance(address))
    }

    export async function getERC20TokenBalance(chainId: string, assetId: string, address: string): Promise<string> {
        const tokenInfo = getTokenInfo(assetId)
        if (tokenInfo === undefined) {
            throw new Error(`Can NOT find ERC20 information of ${assetId}`)
        }

        const contractAbiFragment = [
            {
                name: 'balanceOf',
                type: 'function',
                inputs: [
                    {
                        name: '_owner',
                        type: 'address',
                    },
                ],
                outputs: [
                    {
                        name: 'balance',
                        type: 'uint256',
                    },
                ],
                constant: true,
                payable: false,
            },
        ]

        const provider = getProvider(chainId)
        const contract = new Contract(tokenInfo.address, contractAbiFragment, provider)

        const balance: BigNumber = await contract.balanceOf(address)

        return Helper.Decimal.fromDecimal(balance.toString(), tokenInfo.decimals)
    }

    export async function getERC20TokenBalanceList(chainId: string, address: string, assetIds: string[]): Promise<Types.Object<string>> {
        const result: { [key: string]: string } = {}

        for (let i = 0; i < assetIds.length; i += 1) {
            const assetId = assetIds[i]
            const balance = await getERC20TokenBalance(chainId, assetId, address) // eslint-disable-line no-await-in-loop
            result[assetId] = balance
        }
        return result
    }

    export async function getAllERC20TokensBalance(address: string): Promise<Types.Object<string>> {
        const result: Types.Object<string> = {}

        const data = JSON.stringify({
            jsonrpc: '2.0',
            method: 'alchemy_getTokenBalances',
            headers: {
                'Content-Type': 'application/json',
            },
            params: [`${address}`, 'erc20'],
            id: 42,
        })

        const response = await axios
            .post('https://eth-goerli.g.alchemy.com/v2/cCqOfbVMXtJ81nL8A6sPgq-g-auk5wkP', {
                headers: {
                    'Content-Type': 'application/json',
                },
                data: data,
            })
            .catch((e: Error) => {
                return e
            })
        if (response instanceof Error) {
            return result
        }

        const arr = response.data?.result
            ? (response.data.result as {
                  address: string
                  tokenBalances: Array<{ contractAddress: string; tokenBalance: string }>
              })
            : { tokenBalances: [] }

        arr.tokenBalances.forEach((x) => {
            const token = getTokenInfo(x.contractAddress)
            let dec = 0
            if (token) dec = token.decimals
            result[x.contractAddress] = Helper.Decimal.fromDecimal(x.tokenBalance, dec)
        })

        return result
    }
}
