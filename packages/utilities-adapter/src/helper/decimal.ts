import BigNumber from "bignumber.js";

export class Decimal {
  static toDecimal(value: string, dec: number): string {
    const v = new BigNumber(value);
    if (v.isNaN()) {
      return "0";
    }
    return v.times(new BigNumber(10).pow(dec)).toFixed();
  }

  static fromDecimal(value: string, dec: number): string {
    const v = new BigNumber(value);
    if (v.isNaN()) {
      return "0";
    }
    return v.div(new BigNumber(10).pow(dec)).toFixed();
  }
}
