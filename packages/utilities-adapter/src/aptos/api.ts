import axios, { Axios } from 'axios'
import { Interfaces } from '@nixjs23n6/types'
import { AptosClient, AptosAccount, Types as AptosTypes, TxnBuilderTypes, BCS } from 'aptos'
import { AptosEnums } from './enums'
import { AptosCoinStore, BaseMaxGasAmount, BaseExpireTimestamp } from './const'
import { secondFromNow } from '../helper/date'

function interceptors(axiosInstance: Axios) {
    axiosInstance.interceptors.response.use((response) => {
        return response
    })
    axiosInstance.interceptors.request.use(function (config) {
        return config
    })
}

const { AccountAddress, TypeTagStruct, EntryFunction, StructTag, TransactionPayloadEntryFunction, RawTransaction, ChainId } =
    TxnBuilderTypes

export namespace AptosApiRequest {
    export function fetchEstimateApi(baseURL: string): Promise<Interfaces.ResponseData<{ gas_estimate: number }>> {
        return new Promise((resolve) => {
            interceptors(axios)
            axios
                .get<{ gas_estimate: number }>(`${baseURL}/v1/estimate_gas_price`)
                .then((res) =>
                    resolve({
                        status: 'SUCCESS',
                        data: res.data,
                    })
                )
                .catch((err) =>
                    resolve({
                        status: 'ERROR',
                        error: err.response,
                    })
                )
        })
    }

    export function fundAccountApi(baseURL: string, address: string, amount: number): Promise<Interfaces.ResponseData<string[]>> {
        return new Promise((resolve) => {
            interceptors(axios)
            axios
                .post(`${baseURL}/mint?address=${address}&amount=${amount}`)
                .then((res) =>
                    resolve({
                        status: 'SUCCESS',
                        data: res.data,
                    })
                )
                .catch((err) =>
                    resolve({
                        status: 'ERROR',
                        error: err.response,
                    })
                )
        })
    }

    export function fetchAccountResourcesApi(
        baseURL: string,
        address: string,
        ledgerVersion?: string
    ): Promise<Interfaces.ResponseData<AptosTypes.MoveResource[]>> {
        return new Promise((resolve) => {
            interceptors(axios)
            axios
                .get(`${baseURL}/v1/accounts/${address}/resources`, {
                    params: {
                        ledger_version: ledgerVersion,
                    },
                })
                .then((res) =>
                    resolve({
                        status: 'SUCCESS',
                        data: res.data,
                    })
                )
                .catch((err) =>
                    resolve({
                        status: 'ERROR',
                        error: err.response,
                    })
                )
        })
    }

    export function fetchAccountResourceApi(
        baseURL: string,
        address: string,
        resourceType: string,
        ledgerVersion?: string
    ): Promise<Interfaces.ResponseData<AptosTypes.MoveResource>> {
        return new Promise((resolve) => {
            interceptors(axios)
            axios
                .get(`${baseURL}/v1/accounts/${address}/resource/${resourceType}`, {
                    params: { ledger_version: ledgerVersion },
                })
                .then((res) =>
                    resolve({
                        status: 'SUCCESS',
                        data: res.data,
                    })
                )
                .catch((err) => {
                    return resolve({
                        status: 'ERROR',
                        error: err.response,
                    })
                })
        })
    }

    export function fetchAccountApi(
        baseURL: string,
        address: string,
        params?: { ledger_version: string }
    ): Promise<Interfaces.ResponseData<AptosTypes.AccountData>> {
        return new Promise((resolve) => {
            interceptors(axios)
            axios
                .get<AptosTypes.AccountData>(`${baseURL}/v1/accounts/${address}`, {
                    data: params,
                })
                .then((res) =>
                    resolve({
                        status: 'SUCCESS',
                        data: res.data,
                    })
                )
                .catch((err) =>
                    resolve({
                        status: 'ERROR',
                        error: err.response,
                    })
                )
        })
    }

    export function fetchAccountTransactionsApi(
        baseURL: string,
        address: string,
        limit?: number,
        start?: number
    ): Promise<Interfaces.ResponseData<AptosTypes.Transaction[]>> {
        const query: {
            start?: bigint | number
            limit?: number
        } = {}
        if (limit && limit > 0) {
            query.limit = limit
        }
        if (start && start > 0) {
            query.start = start
        }

        return new Promise((resolve) => {
            interceptors(axios)
            axios
                .get<AptosTypes.Transaction[]>(`${baseURL}/v1/accounts/${address}/transactions`, {
                    baseURL: baseURL,
                    params: query,
                })
                .then((res) =>
                    resolve({
                        status: 'SUCCESS',
                        data: res.data,
                    })
                )
                .catch((err) =>
                    resolve({
                        status: 'ERROR',
                        error: err.response,
                    })
                )
        })
    }

    export function fetchTransactionsByVersionApi(
        baseURL: string,
        version: string
    ): Promise<Interfaces.ResponseData<AptosTypes.Transaction>> {
        return new Promise((resolve) => {
            interceptors(axios)
            axios
                .get<AptosTypes.Transaction>(`${baseURL}/v1/transactions/by_version/${version}`)
                .then((res) =>
                    resolve({
                        status: 'SUCCESS',
                        data: res.data,
                    })
                )
                .catch((err) =>
                    resolve({
                        status: 'ERROR',
                        error: err.response,
                    })
                )
        })
    }

    export function fetchTransactionsByHashApi(baseURL: string, hash: string): Promise<Interfaces.ResponseData<AptosTypes.Transaction>> {
        return new Promise((resolve) => {
            interceptors(axios)
            axios
                .get<AptosTypes.Transaction>(`${baseURL}/v1/transactions/by_hash/${hash}`)
                .then((res) =>
                    resolve({
                        status: 'SUCCESS',
                        data: res.data,
                    })
                )
                .catch((err) =>
                    resolve({
                        status: 'ERROR',
                        error: err.response,
                    })
                )
        })
    }

    export function fetchEventsByEventHandleApi(
        baseURL: string,
        address: string,
        eventHandle: string = AptosCoinStore,
        fieldName: AptosEnums.TxEvent,
        limit?: number,
        start?: number
    ): Promise<Interfaces.ResponseData<(AptosTypes.Event & { version: string })[]>> {
        const query: {
            start?: bigint | number
            limit?: number
        } = {}
        if (limit && limit > 0) {
            query.limit = limit
        }
        if (start && start > 0) {
            query.start = start
        }

        return new Promise((resolve) => {
            interceptors(axios)
            axios
                .get<(AptosTypes.Event & { version: string })[]>(`${baseURL}/v1/accounts/${address}/events/${eventHandle}/${fieldName}`, {
                    baseURL: baseURL,
                    params: query,
                })
                .then((res) =>
                    resolve({
                        status: 'SUCCESS',
                        data: res.data,
                    })
                )
                .catch((err) =>
                    resolve({
                        status: 'ERROR',
                        error: err.response,
                    })
                )
        })
    }
    export async function transferCoinPayload(
        address: string,
        amount: number,
        exactTokenName: string
    ): Promise<TxnBuilderTypes.TransactionPayloadEntryFunction> {
        const token = new TypeTagStruct(StructTag.fromString(exactTokenName))
        // TS SDK support 3 types of transaction payloads: `EntryFunction`, `Script` and `Module`.
        // See https://aptos-labs.github.io/ts-sdk-doc/ for the details.
        const entryFunctionPayload = new TransactionPayloadEntryFunction(
            EntryFunction.natural(
                // Fully qualified module name, `AccountAddress::ModuleName`
                '0x1::coin',
                // Module function
                'transfer',
                // The coin type to transfer
                [token],
                // Arguments for function `transfer`: receiver account address and amount to transfer
                [BCS.bcsToBytes(AccountAddress.fromHex(address)), BCS.bcsSerializeUint64(amount)]
            )
        )
        return entryFunctionPayload
    }

    export async function AptosAccountTransferPayload(
        address: string,
        amount: number
    ): Promise<TxnBuilderTypes.TransactionPayloadEntryFunction> {
        // TS SDK support 3 types of transaction payloads: `EntryFunction`, `Script` and `Module`.
        // See https://aptos-labs.github.io/ts-sdk-doc/ for the details.
        const entryFunctionPayload = new TransactionPayloadEntryFunction(
            EntryFunction.natural(
                // Fully qualified module name, `AccountAddress::ModuleName`
                '0x1::aptos_account',
                // Module function
                'transfer',
                // The coin type to transfer
                [],
                // Arguments for function `transfer`: receiver account address and amount to transfer
                [BCS.bcsToBytes(AccountAddress.fromHex(address)), BCS.bcsSerializeUint64(amount)]
            )
        )
        return entryFunctionPayload
    }
    export async function createRawTransaction(
        client: AptosClient,
        owner: AptosAccount,
        entryFunctionPayload: any,
        gasUnitPrice: BCS.Uint64,
        maxGasAmount?: BCS.Uint64,
        expireTimestamp?: number
    ): Promise<TxnBuilderTypes.RawTransaction> {
        // TS SDK support 3 types of transaction payloads: `EntryFunction`, `Script` and `Module`.
        // See https://aptos-labs.github.io/ts-sdk-doc/ for the details.
        const [{ sequence_number: sequenceNumber }, chainId] = await Promise.all([client.getAccount(owner.address()), client.getChainId()])
        const rawTxn = new RawTransaction(
            AccountAddress.fromHex(owner.address()),
            BigInt(sequenceNumber),
            entryFunctionPayload,
            // Max gas unit to spend
            BigInt(maxGasAmount || BaseMaxGasAmount),
            // Gas price per unit
            BigInt(gasUnitPrice),
            // Expiration timestamp. Transaction is discarded if it is not executed within ${expireTimestamp} seconds from now.
            BigInt(secondFromNow(BaseExpireTimestamp, expireTimestamp)),
            new ChainId(chainId)
        )
        return rawTxn
    }
    export function generateBCSTransaction(owner: AptosAccount, rawTxn: TxnBuilderTypes.RawTransaction): Uint8Array {
        return AptosClient.generateBCSTransaction(owner, rawTxn)
    }

    export async function submitSignedBCSTransaction(client: AptosClient, bcsTxn: Uint8Array): Promise<string> {
        const res = await client.submitSignedBCSTransaction(bcsTxn)
        return res.hash
    }

    export async function simulateTransaction(client: AptosClient, owner: AptosAccount, rawTxn: TxnBuilderTypes.RawTransaction) {
        return await client.simulateTransaction(owner, rawTxn)
    }

    export async function signTransaction(client: AptosClient, owner: AptosAccount, rawTxn: TxnBuilderTypes.RawTransaction) {
        return await client.signTransaction(owner, rawTxn)
    }
}
