export namespace BaseTypes {
    export interface Asset {
        // 0x1::coin::CoinStore<0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::AnimeCoin::ANI> or smart contract address
        assetId: string
        name: string
        symbol: string
    }
    export interface AssetAmount {
        amount: string
        assetId: string
    }

    export interface NFT {
        id: string
        collection: string
        name: string
        description: string
        uri: string
        amount: string
        metadata?: NFTMetadata
    }
    export interface NFTMetadata {
        [key: string]: any
    }
}

// const t = {
//     type: '0x1::coin::CoinInfo<0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::AnimeCoin::ANI>',
//     data: {
//         decimals: 8,
//         name: 'AnimeSwap Coin',
//         supply: {
//             vec: [
//                 {
//                     aggregator: { vec: [] },
//                     integer: { vec: [{ limit: '340282366920938463463374607431768211455', value: '1857211417538829' }] },
//                 },
//             ],
//         },
//         symbol: 'ANI',
//     },
//     icon: './static/media/help.5ed05255.svg',
// }
// const t2 = {
//     type: '0x1::coin::CoinInfo<0x16fe2df00ea7dde4a63409201f7f4e536bde7bb7335526a35d05111e68aa322c::TestCoinsV1::USDT>',
//     data: {
//         decimals: 8,
//         name: 'Tether',
//         supply: {
//             vec: [
//                 {
//                     aggregator: { vec: [] },
//                     integer: { vec: [{ limit: '340282366920938463463374607431768211455', value: '2000200000000000000' }] },
//                 },
//             ],
//         },
//         symbol: 'USDT',
//     },
//     icon: './static/media/help.5ed05255.svg',
// }
// // ;[
// //     {
// //         assetId: '0x1::coin::CoinStore<0x881ac202b1f1e6ad4efcff7a1d0579411533f2502417a19211cfc49751ddb5f4::coin::MOJO>',
// //         balance: 0,
// //         isCustomAsset: false,
// //         isDefaultAsset: true,
// //         isShownInHomeScreen: true,
// //         name: 'Mojito',
// //         pName: 'Mojito',
// //         pSymbol: 'MOJO',
// //         symbol: 'MOJO',
// //     },
// //     {
// //         address: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa',
// //         addressType: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
// //         assetId: '0x1::coin::CoinStore<0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC>',
// //         balance: 0,
// //         isCustomAsset: false,
// //         isDefaultAsset: true,
// //         isShownInHomeScreen: true,
// //         name: 'USD Coin',
// //         symbol: 'USDC',
// //     },
// //     {
// //         address: '0x1',
// //         addressType: '0x1::aptos_coin::AptosCoin',
// //         assetId: '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>',
// //         balance: 46290249,
// //         isCustomAsset: false,
// //         isDefaultAsset: true,
// //         isShownInHomeScreen: true,
// //         name: 'Aptos Coin',
// //         symbol: 'APT',
// //     },
// // ]
