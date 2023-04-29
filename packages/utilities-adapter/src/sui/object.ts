import { SuiMoveObject, Coin } from '@mysten/sui.js'

export type CoinObject = {
    objectId: string
    symbol: string
    balance: bigint
    object: SuiMoveObject
}

export type NftObject = {
    objectId: string
    name: string
    description: string
    url: string
    previousTransaction?: string
    objectType: string
    fields: Record<string, any>
    hasPublicTransfer: boolean
}

export class Nft {
    public static isNft(obj: SuiMoveObject) {
        if (!Coin.isCoin(obj)) {
            if (obj.fields?.name || obj.fields?.description || obj.fields?.url) {
                return true
            } else if (obj.fields?.metadata) {
                return true
            }
        }
        return false
    }

    public static getNftObject(obj: SuiMoveObject, previousTransaction?: string): NftObject {
        return {
            objectId: obj.fields.id.id,
            name: obj.fields.name,
            description: obj.fields.description,
            url: obj.fields.url,
            previousTransaction,
            objectType: obj.type,
            fields: obj.fields,
            hasPublicTransfer: obj.hasPublicTransfer ? obj.hasPublicTransfer : false,
        }
    }
}
