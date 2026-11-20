import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as Operations from "./add";

DCommon.print(Operations.add(1, 2));
DCommon.print(DArray.map([1, -2], (value) => Operations.add(value, 1)));
