import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

const nested = DEither.success(DEither.success(DEither.success(DEither.success(1))));

DCommon.print(nested, { depth: 0 });
DCommon.print(nested, { depth: 1 });
DCommon.print(nested, { depth: null });
DCommon.print([[1, [2, [3, [4]]]]], { depth: 10 });
DCommon.print("it's", { depth: 2 });
DCommon.print(3, { depth: 0 });
