import { Types } from "@nixjs23n6/types";
import { BaseEnums as HdWalletEnums } from "@nixjs23n6/hd-wallet-adapter";
import { BaseProvider } from "./base";

export class Transaction {
  provider: string;
  private readonly _classes: Types.Class[];
  private _container: Types.Object<any> = {};
  private _currentType?: HdWalletEnums.Provider;
  private _prevType?: HdWalletEnums.Provider;

  constructor(args: Types.Class[], provider?: string) {
    this.provider = provider || "";
    this._classes = args;
  }

  connect(type: HdWalletEnums.Provider): void {
    if (!type) {
      throw new Error("Required parameter provider missing.");
    }
    if (
      (Object.values(HdWalletEnums.Provider) as string[]).includes(type) ===
      false
    ) {
      throw new Error("Parameter invalid.");
    }
    this._currentType = type;
    if (this._prevType !== this._currentType) {
      this._prevType && this.destroy(this._prevType);
      for (let index = 0; index < this._classes.length; index++) {
        const Provider: Types.Class = this._classes[index];
        if (Provider.prototype.type && Provider.prototype.type === type) {
          this._container[type] = Provider;
          break;
        }
      }
      this._prevType = type;
      console.log(
        "» Connect new provider:  %c" + this._currentType,
        "color: #FABB51; font-size:14px"
      );
    } else {
      console.log(
        "» Continue to connect the current provider:  %c" + this._prevType,
        "color: #FABB51; font-size:14px"
      );
    }
  }

  destroy(type?: HdWalletEnums.Provider): void {
    try {
      let t: Types.Undefined<HdWalletEnums.Provider> = this._currentType;
      if (type) {
        t = type;
      }
      if (!t) {
        throw new Error("Provider type not found");
      }
      delete this._container[t];
    } catch (error) {
      throw new Error("The instance is not found to delete.");
    }
  }

  get container(): Types.Object<any> {
    return this._container;
  }

  get instance(): BaseProvider {
    return this._currentType ? new this._container[this._currentType]() : null;
  }

  set prevType(v: Types.Undefined<HdWalletEnums.Provider>) {
    this._prevType = v;
  }

  get prevType(): Types.Undefined<HdWalletEnums.Provider> {
    return (this._prevType as HdWalletEnums.Provider) || undefined;
  }

  set currentType(v: Types.Undefined<HdWalletEnums.Provider>) {
    this._currentType = v;
  }

  get currentType(): Types.Undefined<HdWalletEnums.Provider> {
    return (this._currentType as HdWalletEnums.Provider) || undefined;
  }
}
