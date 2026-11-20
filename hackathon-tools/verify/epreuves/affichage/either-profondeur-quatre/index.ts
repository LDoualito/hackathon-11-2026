import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

DCommon.print(DEither.success(DEither.success(DEither.success(1))));
DCommon.print(DEither.success(DEither.success(DEither.success(DEither.success(1)))));
DCommon.print(DEither.left("outer", DEither.left("middle", DEither.left("inner", DEither.fail()))));
DCommon.print(DEither.success([DEither.success([1, 2])]));
