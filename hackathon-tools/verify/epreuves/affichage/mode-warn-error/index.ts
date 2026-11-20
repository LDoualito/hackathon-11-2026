import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

DCommon.print("avant");
DCommon.print(DEither.success(3), "warn");
DCommon.print(["échec"], "error");
DCommon.print("après");
