import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import { double } from "./double";
import * as Operations from "./double";

function apply(operation: (value: number) => number, value: number) {
	return operation(value);
}

DCommon.print(DArray.map([1, 2, 3], double));
DCommon.print(DArray.map([1, 2, 3], Operations.double));
DCommon.print(apply(double, 4));

const operation = double;

DCommon.print(operation(5));
DCommon.print(DCommon.pipe(6, double, double));
