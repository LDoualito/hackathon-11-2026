import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

DCommon.print(DEither.ok());
DCommon.print(DEither.some(1));
DCommon.print(DEither.right("created"));
DCommon.print(DEither.right("created", 1));
DCommon.print(DEither.result("pending", 1));
