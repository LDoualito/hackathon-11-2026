import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

const list = DEither.success([1, 2]);
const alias = list;
const other = DEither.success([1, 2]);

DCommon.print(list === alias);
DCommon.print(list === other);
