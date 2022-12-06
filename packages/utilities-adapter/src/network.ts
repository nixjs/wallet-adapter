import { NetworkTypes } from "./types";
import { Networks as AptosNetworks, BaseIconURL as AptosLogo } from "./aptos";
import { Networks as SUINetworks, BaseIconURL as SUILogo } from "./sui";

export namespace Network {
  export const BlockchainNetworks: NetworkTypes.NetworkByProviders = {
    aptos: {
      name: "Aptos Blockchain",
      url: AptosLogo,
      data: AptosNetworks,
    },
    sui: {
      name: "SUI Blockchain",
      url: SUILogo,
      data: SUINetworks,
    },
  };
}
