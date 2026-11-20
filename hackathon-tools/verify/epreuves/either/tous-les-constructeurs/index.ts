import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

DCommon.print(DEither.success(1));
DCommon.print(DEither.right("found"));
DCommon.print(DEither.right("found", 1));
DCommon.print(DEither.ok());
DCommon.print(DEither.some(1));
DCommon.print(DEither.result("validated", 1));
DCommon.print(DEither.fail());
DCommon.print(DEither.left("missing"));
DCommon.print(DEither.left("missing", 1));
DCommon.print(DEither.error("broken"));
DCommon.print(DEither.none());
