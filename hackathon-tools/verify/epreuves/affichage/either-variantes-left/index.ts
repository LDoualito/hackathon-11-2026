import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

DCommon.print(DEither.fail());
DCommon.print(DEither.none());
DCommon.print(DEither.error("broken"));
DCommon.print(DEither.left("negative-operand"));
DCommon.print(DEither.left("negative-operand", -1));
