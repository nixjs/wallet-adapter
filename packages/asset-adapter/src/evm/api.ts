import { Types } from '@nixjs23n6/types'
import { EVMUtil, Helper } from '@nixjs23n6/utilities-adapter'
import { Contract, getDefaultProvider, providers, utils, BigNumber } from 'ethers'

const ETCChainId = '0x3D'

export namespace EthereumApiRequest {
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
        return EVMUtil.Erc20Tokens.find((t) => t.address === address)
    }

    export function getProvider(chainId: string): providers.BaseProvider {
        const nodeURL = EVMUtil.BaseNodeByChainInfo[chainId]
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
}
