import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

DCommon.print(DEither.success("it's"));
DCommon.print(DEither.success("a\nb"));
DCommon.print(DEither.success(NaN));
DCommon.print(DEither.success(-0));
DCommon.print(DEither.success(true));
DCommon.print(DEither.success(null));
DCommon.print(DEither.success(undefined));
DCommon.print(DEither.left("with-list", [1, 2, 3, 4, 5, 6, 7]));
DCommon.print(DEither.left("with-record", { reason: "x", code: 4 }));
