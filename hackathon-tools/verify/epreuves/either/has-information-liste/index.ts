import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

function classify(value: number) {
	if (value === 0) {
		return DEither.left("zero", "none");
	}
	if (value < 0) {
		return DEither.left("negative", value);
	}
	if (value > 10) {
		return DEither.right("big", value);
	}
	return DEither.right("small", `${value}`);
}

const results = DArray.map([0, -5, 123, 4], (value) => classify(value));

DCommon.print(DArray.map(results, (result) => DEither.hasInformation(result, ["zero", "big"])));
DCommon.print(DArray.map(results, (result) => DEither.hasInformation(result, ["negative", "zero"])));
DCommon.print(DArray.map(results, (result) => DEither.hasInformation(result, [])));
