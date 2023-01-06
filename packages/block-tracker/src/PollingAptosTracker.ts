import axios from 'axios'
import { BaseBlockTracker, PollingBlockTrackerOptions, Block } from './BaseBlockTracker'

const sec = 1000

export class PollingAptosTracker extends BaseBlockTracker {
    #address: string
    #nodeURL: string

    #pollingInterval: number

    #retryTimeout: number

    #keepEventLoopActive: boolean

    // #setSkipCacheFlag: boolean

    constructor(opts: PollingBlockTrackerOptions) {
        // parse + validate args
        if (!opts.address || !opts.nodeURL) {
            throw new Error('PollingBlockTracker - no address/nodeURL specified.')
        }

        super({
            blockResetDuration: opts.blockResetDuration ?? opts.pollingInterval,
        })

        // config
        this.#address = opts.address
        this.#nodeURL = opts.nodeURL
        this.#pollingInterval = opts.pollingInterval || 20 * sec
        this.#retryTimeout = opts.retryTimeout || this.#pollingInterval / 10
        this.#keepEventLoopActive = opts.keepEventLoopActive === undefined ? true : opts.keepEventLoopActive
        // this.#setSkipCacheFlag = opts.setSkipCacheFlag || false
    }

    // trigger block polling
    async checkForLatestBlock() {
        await this._updateLatestBlock()
        return await this.getLatestBlock()
    }

    protected async _start(): Promise<void> {
        this._synchronize()
    }

    protected async _end(): Promise<void> {
        // No-op
    }

    private async _synchronize(): Promise<void> {
        while (this._isRunning) {
            try {
                await this._updateLatestBlock()
                const promise = timeout(this.#pollingInterval, !this.#keepEventLoopActive)
                this.emit('_waitingForNextIteration')
                await promise
            } catch (err: any) {
                const newErr = new Error(
                    `PollingBlockTracker - encountered an error while attempting to update latest block:\n${err.stack ?? err}`
                )
                try {
                    this.emit('error', newErr)
                } catch (emitErr) {
                    console.error(newErr)
                }
                const promise = timeout(this.#retryTimeout, !this.#keepEventLoopActive)
                this.emit('_waitingForNextIteration')
                await promise
            }
        }
    }

    private async _updateLatestBlock(): Promise<void> {
        // fetch + set latest block
        const latestBlock = await this._fetchLatestBlock()
        this._newPotentialLatest(latestBlock)
    }

    private async _fetchLatestBlock(): Promise<Block> {
        const res = await axios.post(`${this.#nodeURL}`, {
            query: 'query MoveRequestAggregate($address: String) {\n  move_resources_aggregate(\n    limit: 1\n    order_by: {transaction_version: desc}\n    distinct_on: transaction_version\n    where: {address: {_eq: $address}}\n  ) {\n    nodes {\n      address\n      transaction_version\n    }\n  }\n}\n',
            operationName: 'MoveRequestAggregate',
            variables: {
                address: this.#address,
            },
        })

        const result = res.data
        if ([200, 201].includes(res.status) && result?.data && result.data?.move_resources_aggregate) {
            const nodes = result?.data?.move_resources_aggregate?.nodes
            if (nodes.length === 0) {
                return {
                    version: '0',
                    hash: null,
                }
            }
            if (nodes[0])
                return {
                    version: nodes[0]?.transaction_version,
                    hash: nodes[0]?.transaction_version,
                }
        }
        return {
            hash: '0',
            version: '0',
        }
    }
}

/**
 * Waits for the specified amount of time.
 *
 * @param duration - The amount of time in milliseconds.
 * @param unref - Assuming this function is run in a Node context, governs
 * whether Node should wait before the `setTimeout` has completed before ending
 * the process (true for no, false for yes). Defaults to false.
 * @returns A promise that can be used to wait.
 */
function timeout(duration: number, unref: boolean) {
    return new Promise((resolve) => {
        const timeoutRef = setTimeout(resolve, duration)
        // don't keep process open
        if (timeoutRef.unref && unref) {
            timeoutRef.unref()
        }
    })
}
