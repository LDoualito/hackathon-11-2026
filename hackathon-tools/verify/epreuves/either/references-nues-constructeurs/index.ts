import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const values = [1, 2];

DCommon.print(DArray.map(values, DEither.success));
DCommon.print(DArray.map(values, DEither.error));
DCommon.print(DArray.map(values, DEither.some));
DCommon.print(DArray.map(values, DEither.result("counted")));
DCommon.print(DArray.map(values, DEither.ok));
DCommon.print(DArray.map(values, DEither.fail));
DCommon.print(DArray.map(values, DEither.none));
