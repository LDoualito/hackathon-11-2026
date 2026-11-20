import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

function state(value: number) {
	if (value < 0) {
		return DEither.left("pending", "waiting");
	}
	if (value === 0) {
		return DEither.right("pending", value);
	}
	return DEither.success(value);
}

const results = DArray.map([-1, 0, 1], (value) => state(value));

DCommon.print(results);
DCommon.print(DArray.map(results, (result) => DEither.hasInformation(result, "pending")));
DCommon.print(DArray.map(results, (result) => DEither.hasInformation(result, "pending") && DEither.isLeft(result)));
