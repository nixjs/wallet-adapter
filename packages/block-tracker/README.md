# @nixjs23n6/aptos-block-tracker

Assets

## Install

`yarn add @nixjs23n6/aptos-block-tracker`

## Usage

### Aptos

```typescript
import { PollingAptosTracker } from '@nixjs23n6/aptos-block-tracker'

const blockTracker = new PollingAptosTracker({
    address: '0xb1ab189ee69f9c4f7e99d3b3595aed20670098367c18d5a65234ce97596feb4e',
    nodeURL: 'https://indexer-testnet.staging.gcp.aptosdev.com/v1/graphql',
})

blockTracker.on('sync', ({ newBlock, oldBlock }) => {
    if (oldBlock) {
        console.log(`sync #${Number(oldBlock)} -> #${Number(newBlock)}`)
    } else {
        console.log(`first sync #${Number(newBlock)}`)
    }
})
```

### SUI

```typescript
import { PollingSUITracker } from '@nixjs23n6/aptos-block-tracker'

const blockTracker = new PollingSUITracker({
    address: '0x1058a41ebe92ff069b65b692e20e51874a431e8b',
    nodeURL: 'https://fullnode.devnet.sui.io/',
})

blockTracker.on('sync', ({ newBlock, oldBlock }) => {
    if (oldBlock) {
        console.log(`sync`, oldBlock, newBlock)
    } else {
        console.log(`first sync`, newBlock)
    }
})
```
