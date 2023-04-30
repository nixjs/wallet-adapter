import {
    JsonRpcProvider,
    ExecuteTransactionRequestType,
    SUI_TYPE_ARG,
    Ed25519Keypair,
    RawSigner,
    SuiTransactionBlockResponseOptions,
    Connection,
    TransactionBlock,
    SuiTransactionBlockResponse,
} from '@mysten/sui.js'
import BigNumber from 'bignumber.js'
import { Interfaces } from '@nixjs23n6/types'
import { Crypto } from '@nixjs23n6/hd-wallet-adapter'
import { HexString, VaultTypes } from '@nixjs23n6/utilities-adapter'

export const SUI_SYSTEM_STATE_OBJECT_ID = '0x0000000000000000000000000000000000000005'
export class Provider {
    provider: JsonRpcProvider

    constructor(nodeURL: string, faucetURL?: string) {
        this.provider = new JsonRpcProvider(
            new Connection({
                fullnode: nodeURL,
                faucet: faucetURL,
            })
        )
    }

    async transferCoin(
        coinType: string,
        amount: number,
        from: VaultTypes.AccountObject,
        to: string,
        decimals?: number,
        isPayAllSui?: boolean
    ): Promise<
        Interfaces.ResponseData<{
            rawData: string
            gasLimit: string
            transactionFee: string
        }>
    > {
        if (!from.address) throw new Error('Owner info not found')
        const coinResp = await this.provider.getAllCoins({
            owner: from.address,
        })
        if (!coinResp.data || coinResp.data.length === 0) throw new Error('No coin to transfer')
        const coins = coinResp.data.filter((coin) => coin.coinType === coinType)
        if (coins.length === 0) {
            throw new Error('No coin to transfer')
        }

        const tx = new TransactionBlock()
        tx.setSenderIfNotSet(from.address)

        if (isPayAllSui && coinType === SUI_TYPE_ARG) {
            tx.transferObjects([tx.gas], tx.pure(to))
            tx.setGasPayment(
                coins
                    .filter((coin) => coin.coinType === coinType)
                    .map((coin) => ({
                        objectId: coin.coinObjectId,
                        digest: coin.digest,
                        version: coin.version,
                    }))
            )

            const {
                effects: {
                    gasUsed: { computationCost, storageCost, storageRebate },
                },
            } = await this.provider.dryRunTransactionBlock({
                transactionBlock: await tx.build({ provider: this.provider }),
            })
            return {
                status: 'SUCCESS',
                data: {
                    rawData: tx.serialize(),
                    transactionFee: String(Number(computationCost) + Number(storageCost) - Number(storageRebate)),
                    gasLimit: tx.blockData.gasConfig.budget || '0',
                },
            }
        }

        let ourDecimals = decimals

        if (!ourDecimals)
            ourDecimals =
                (
                    await this.provider.getCoinMetadata({
                        coinType,
                    })
                )?.decimals || 0

        const bigIntAmount = BigInt(new BigNumber(amount).shiftedBy(ourDecimals).integerValue().toString())
        const [primaryCoin, ...mergeCoins] = coins.filter((coin) => coin.coinType === coinType)

        if (coinType === SUI_TYPE_ARG) {
            const coin = tx.splitCoins(tx.gas, [tx.pure(bigIntAmount)])
            tx.transferObjects([coin], tx.pure(to))
        } else {
            const primaryCoinInput = tx.object(primaryCoin.coinObjectId)
            if (mergeCoins.length) {
                // TODO: This could just merge a subset of coins that meet the balance requirements instead of all of them.
                tx.mergeCoins(
                    primaryCoinInput,
                    mergeCoins.map((coin) => tx.object(coin.coinObjectId))
                )
            }
            const coin = tx.splitCoins(primaryCoinInput, [tx.pure(bigIntAmount)])
            tx.transferObjects([coin], tx.pure(to))
        }

        const {
            effects: {
                gasUsed: { computationCost, storageCost, storageRebate },
            },
        } = await this.provider.dryRunTransactionBlock({
            transactionBlock: await tx.build({ provider: this.provider }),
        })
        return {
            status: 'SUCCESS',
            data: {
                rawData: tx.serialize(),
                transactionFee: String(Number(computationCost) + Number(storageCost) - Number(storageRebate)),
                gasLimit: tx.blockData.gasConfig.budget || '0',
            },
        }
    }

    async transferObject(
        objectId: string,
        from: VaultTypes.AccountObject,
        to: string,
        gasLimit?: number
    ): Promise<
        Interfaces.ResponseData<{
            rawData: string
            gasLimit: string
            transactionFee: string
        }>
    > {
        if (!from.address) throw new Error('Owner info not found')
        const object = (
            await this.provider.getOwnedObjects({
                owner: from.address,
            })
        ).data.find((object) => object.data?.objectId === objectId)
        if (!object) {
            throw new Error('No object to transfer')
        }
        const tx = new TransactionBlock()
        tx.setSenderIfNotSet(from.address)
        tx.transferObjects([tx.object(objectId)], tx.pure(to))
        const {
            effects: {
                gasUsed: { computationCost, storageCost, storageRebate },
            },
        } = await this.provider.dryRunTransactionBlock({
            transactionBlock: await tx.build({ provider: this.provider }),
        })
        return {
            status: 'SUCCESS',
            data: {
                rawData: tx.serialize(),
                transactionFee: String(Number(computationCost) + Number(storageCost) - Number(storageRebate)),
                gasLimit: tx.blockData.gasConfig.budget || '0',
            },
        }
    }
}

export const MINT_EXAMPLE_NFT_MOVE_CALL = {
    packageObjectId: '0x2',
    module: 'devnet_nft',
    function: 'mint',
    typeArguments: [],
    arguments: [
        'Suiet Nft',
        'An Nft created by Suiet',
        'https://xc6fbqjny4wfkgukliockypoutzhcqwjmlw2gigombpp2ynufaxa.arweave.net/uLxQwS3HLFUailocJWHupPJxQsli7aMgzmBe_WG0KC4',
    ],
    gasBudget: 10000,
}

export async function executeTransaction(
    provider: JsonRpcProvider,
    owner: VaultTypes.AccountObject,
    data: TransactionBlock | Uint8Array,
    requestType: ExecuteTransactionRequestType = 'WaitForLocalExecution',
    options?: SuiTransactionBlockResponseOptions
): Promise<Interfaces.ResponseData<SuiTransactionBlockResponse>> {
    try {
        if (!owner.address || !owner.publicKeyHex) throw new Error('Owner info not found')
        const keypair = new Ed25519Keypair({
            publicKey: new HexString(owner.publicKeyHex).toUint8Array(),
            secretKey: new HexString(Crypto.mergePrivateKey(owner.publicKeyHex, owner.privateKeyHex)).toUint8Array(),
        })
        const signer = new RawSigner(keypair, provider)
        const txn = await signer.signAndExecuteTransactionBlock({
            transactionBlock: data,
            requestType,
        })
        return {
            data: txn,
            status: 'SUCCESS',
        }
    } catch (error) {
        return {
            error,
            status: 'ERROR',
        }
    }
}
