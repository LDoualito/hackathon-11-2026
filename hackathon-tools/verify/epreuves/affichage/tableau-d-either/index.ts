import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

DCommon.print([DEither.success(1), DEither.fail()]);
DCommon.print([[DEither.success(1)]]);
DCommon.print([[[DEither.success(1)]]]);
