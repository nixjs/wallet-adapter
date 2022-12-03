import { Types } from "@nixjs23n6/types";
import { BaseProvider } from "@nixjs23n6/utilities-adapter";

export class Transaction extends BaseProvider {
  constructor(args: Types.Class[], provider?: string) {
    super(args, provider);
  }
}
