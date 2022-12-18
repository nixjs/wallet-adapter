import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { BaseBlockTracker, PollingBlockTrackerOptions, Block } from './BaseBlockTracker'

const sec = 1000

export class PollingSUITracker extends BaseBlockTracker {
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
        const res = await axios.post(`${this.#nodeURL}`, [
            {
                method: 'sui_getTransactions',
                jsonrpc: '2.0',
                params: [
                    {
                        ToAddress: this.#address,
                    },
                    null,
                    1,
                    true,
                ],
                id: uuidv4(),
            },
            {
                method: 'sui_getTransactions',
                jsonrpc: '2.0',
                params: [
                    {
                        FromAddress: this.#address,
                    },
                    null,
                    1,
                    true,
                ],
                id: uuidv4(),
            },
        ])

        const result = res.data
        if ([200, 201].includes(res.status) && result.length > 0) {
            const from = result[0].result.data.length > 0 ? result[0].result.data[0] : null
            const to = result[1].result.data.length > 0 ? result[1].result.data[0] : null
            let version1 = 0
            let version2 = 0
            if (from) {
                const fromResult = await axios.post(`${this.#nodeURL}`, {
                    method: 'sui_getTransaction',
                    jsonrpc: '2.0',
                    params: [from],
                    id: uuidv4(),
                })

                if ([200, 201].includes(fromResult.status) && fromResult?.data.result) {
                    version1 = fromResult?.data?.result.timestamp_ms
                }
            }
            if (to) {
                const toResult = await axios.post(`${this.#nodeURL}`, {
                    method: 'sui_getTransaction',
                    jsonrpc: '2.0',
                    params: [to],
                    id: uuidv4(),
                })
                if ([200, 201].includes(toResult.status) && toResult?.data.result) {
                    version2 = toResult?.data?.result.timestamp_ms
                }
            }
            if (version1 === 0 && version2 === 0) throw new Error(`PollingBlockTracker - encountered error fetching block:\n${res.data}`)
            if (version1 > version2)
                return {
                    version: String(version1),
                    hash: from,
                }
            return {
                version: String(version2),
                hash: to,
            }
        }
        throw new Error(`PollingBlockTracker - encountered error fetching block:\n${res.data}`)
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
