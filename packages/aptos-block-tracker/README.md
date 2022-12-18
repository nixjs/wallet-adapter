# @nixjs23n6/aptos-block-tracker

Assets

## Install

`yarn add @nixjs23n6/aptos-block-tracker`

## Usage

```typescript
import { PollingBlockTracker } from '@nixjs23n6/aptos-block-tracker';

const blockTracker = new PollingBlockTracker({
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
