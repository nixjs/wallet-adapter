import axios, { Axios } from "axios";
import { Interfaces } from "@nixjs23n6/types";
import { Types as AptosTypes } from "aptos";
import { AptosEnums } from "./enums";
import { AptosCoinStore } from "./const";

function interceptors(axiosInstance: Axios) {
  axiosInstance.interceptors.response.use((response) => {
    return response;
  });
  axiosInstance.interceptors.request.use(function (config) {
    return config;
  });
}

export namespace AptosApiRequest {
  export function fetchEstimateApi(
    baseURL: string
  ): Promise<Interfaces.ResponseData<{ gas_estimate: number }>> {
    return new Promise((resolve) => {
      interceptors(axios);
      axios
        .get<{ gas_estimate: number }>(`${baseURL}/v1/estimate_gas_price`)
        .then((res) =>
          resolve({
            status: "SUCCESS",
            data: res.data,
          })
        )
        .catch((err) =>
          resolve({
            status: "ERROR",
            error: err.response,
          })
        );
    });
  }

  export function fundAccountApi(
    baseURL: string,
    address: string,
    amount: number
  ): Promise<Interfaces.ResponseData<string[]>> {
    return new Promise((resolve) => {
      interceptors(axios);
      axios
        .post(`${baseURL}/mint?address=${address}&amount=${amount}`)
        .then((res) =>
          resolve({
            status: "SUCCESS",
            data: res.data,
          })
        )
        .catch((err) =>
          resolve({
            status: "ERROR",
            error: err.response,
          })
        );
    });
  }

  export function fetchAccountResourcesApi(
    baseURL: string,
    address: string,
    ledgerVersion?: string
  ): Promise<Interfaces.ResponseData<AptosTypes.MoveResource[]>> {
    return new Promise((resolve) => {
      interceptors(axios);
      axios
        .get(`${baseURL}/v1/accounts/${address}/resources`, {
          params: {
            ledger_version: ledgerVersion,
          },
        })
        .then((res) =>
          resolve({
            status: "SUCCESS",
            data: res.data,
          })
        )
        .catch((err) =>
          resolve({
            status: "ERROR",
            error: err.response,
          })
        );
    });
  }

  export function fetchAccountResourceApi(
    baseURL: string,
    address: string,
    resourceType: string,
    ledgerVersion?: string
  ): Promise<Interfaces.ResponseData<AptosTypes.MoveResource>> {
    return new Promise((resolve) => {
      interceptors(axios);
      axios
        .get(`${baseURL}/v1/accounts/${address}/resource/${resourceType}`, {
          params: { ledger_version: ledgerVersion },
        })
        .then((res) =>
          resolve({
            status: "SUCCESS",
            data: res.data,
          })
        )
        .catch((err) => {
          return resolve({
            status: "ERROR",
            error: err.response,
          });
        });
    });
  }

  export function fetchAccountApi(
    baseURL: string,
    address: string,
    params?: { ledger_version: string }
  ): Promise<Interfaces.ResponseData<AptosTypes.AccountData>> {
    return new Promise((resolve) => {
      interceptors(axios);
      axios
        .get<AptosTypes.AccountData>(`${baseURL}/v1/accounts/${address}`, {
          data: params,
        })
        .then((res) =>
          resolve({
            status: "SUCCESS",
            data: res.data,
          })
        )
        .catch((err) =>
          resolve({
            status: "ERROR",
            error: err.response,
          })
        );
    });
  }

  export function fetchAccountTransactionsApi(
    baseURL: string,
    address: string,
    limit?: number,
    start?: number
  ): Promise<Interfaces.ResponseData<AptosTypes.Transaction[]>> {
    const query: {
      start?: bigint | number;
      limit?: number;
    } = {};
    if (limit && limit > 0) {
      query.limit = limit;
    }
    if (start && start > 0) {
      query.start = start;
    }

    return new Promise((resolve) => {
      interceptors(axios);
      axios
        .get<AptosTypes.Transaction[]>(
          `${baseURL}/v1/accounts/${address}/transactions`,
          {
            baseURL: baseURL,
            params: query,
          }
        )
        .then((res) =>
          resolve({
            status: "SUCCESS",
            data: res.data,
          })
        )
        .catch((err) =>
          resolve({
            status: "ERROR",
            error: err.response,
          })
        );
    });
  }

  export function fetchTransactionsByVersionApi(
    baseURL: string,
    version: string
  ): Promise<Interfaces.ResponseData<AptosTypes.Transaction>> {
    return new Promise((resolve) => {
      interceptors(axios);
      axios
        .get<AptosTypes.Transaction>(
          `${baseURL}/v1/transactions/by_version/${version}`
        )
        .then((res) =>
          resolve({
            status: "SUCCESS",
            data: res.data,
          })
        )
        .catch((err) =>
          resolve({
            status: "ERROR",
            error: err.response,
          })
        );
    });
  }

  export function fetchTransactionsByHashApi(
    baseURL: string,
    hash: string
  ): Promise<Interfaces.ResponseData<AptosTypes.Transaction>> {
    return new Promise((resolve) => {
      interceptors(axios);
      axios
        .get<AptosTypes.Transaction>(
          `${baseURL}/v1/transactions/by_hash/${hash}`
        )
        .then((res) =>
          resolve({
            status: "SUCCESS",
            data: res.data,
          })
        )
        .catch((err) =>
          resolve({
            status: "ERROR",
            error: err.response,
          })
        );
    });
  }

  export function fetchEventsByEventHandleApi(
    baseURL: string,
    address: string,
    eventHandle: string = AptosCoinStore,
    fieldName: AptosEnums.TxEvent,
    limit?: number,
    start?: number
  ): Promise<
    Interfaces.ResponseData<(AptosTypes.Event & { version: string })[]>
  > {
    const query: {
      start?: bigint | number;
      limit?: number;
    } = {};
    if (limit && limit > 0) {
      query.limit = limit;
    }
    if (start && start > 0) {
      query.start = start;
    }

    return new Promise((resolve) => {
      interceptors(axios);
      axios
        .get<(AptosTypes.Event & { version: string })[]>(
          `${baseURL}/v1/accounts/${address}/events/${eventHandle}/${fieldName}`,
          {
            baseURL: baseURL,
            params: query,
          }
        )
        .then((res) =>
          resolve({
            status: "SUCCESS",
            data: res.data,
          })
        )
        .catch((err) =>
          resolve({
            status: "ERROR",
            error: err.response,
          })
        );
    });
  }
}
