import { SUIUtil, AssetTypes } from '@nixjs23n6/utilities-adapter'
import { JsonRpcProvider, getObjectExistsResponse, getMoveObject, SuiObject, SuiMoveObject } from '@mysten/sui.js'

export namespace SUIApiRequest {
    export async function getOwnedObjects(query: JsonRpcProvider, address: string): Promise<SuiObject[]> {
        const objectInfos = await query.getObjectsOwnedByAddress(address)
        const objectIds = objectInfos.map((obj) => obj.objectId)
        if (objectIds.length > 0) {
            const res = await query.getObjectBatch(objectIds)
            return res.filter((r) => r.status === 'Exists').map((r) => getObjectExistsResponse(r) as SuiObject)
        }
        return []
    }

    export async function getOwnedCoins(query: JsonRpcProvider, address: string): Promise<SUIUtil.CoinObject[]> {
        const objects = await getOwnedObjects(query, address)
        const res = objects
            .map((item) => ({
                id: item.reference.objectId,
                object: getMoveObject(item),
            }))
            .filter((item) => item.object && SUIUtil.Coin.isCoin(item.object))
            .map((item) => SUIUtil.Coin.getCoinObject(item.object as SuiMoveObject))
        return res
    }

    export async function getCoinsBalance(nodeURL: string, address: string): Promise<AssetTypes.AssetAmount[]> {
        const query = new JsonRpcProvider(nodeURL, {
            skipDataValidation: false,
        })
        const objects = await getOwnedCoins(query, address)
        const result = new Map()
        for (const object of objects) {
            result.has(object.object.type)
                ? result.set(object.object.type, result.get(object.object.type) + object.balance)
                : result.set(object.object.type, object.balance)
        }
        return Array.from(result.entries()).map((item) => ({
            assetId: item[0] as string,
            amount: String(item[1]),
        }))
    }

    export async function getOwnedNfts(nodeURL: string, address: string): Promise<AssetTypes.NFT[]> {
        const query = new JsonRpcProvider(nodeURL, {
            skipDataValidation: false,
        })
        const objects = await getOwnedObjects(query, address)
        const res = objects
            .map((item) => ({
                id: item.reference.objectId,
                object: getMoveObject(item),
                previousTransaction: item.previousTransaction,
            }))
            .filter((item) => item.object && SUIUtil.Nft.isNft(item.object))
            .map((item) => {
                const obj = item.object as SuiMoveObject
                return SUIUtil.Nft.getNftObject(obj, item.previousTransaction)
            })
        return res.map(
            (nft) =>
                ({
                    name: nft.name,
                    description: nft.description,
                    uri: nft.url,
                    id: nft.objectId,
                    collection: '',
                    creator: '',
                    metadata: {
                        objectId: nft.objectId,
                        previousTransaction: nft.previousTransaction,
                        objectType: nft.objectType,
                        hasPublicTransfer: nft.hasPublicTransfer,
                    },
                } as AssetTypes.NFT)
        )
    }
}
