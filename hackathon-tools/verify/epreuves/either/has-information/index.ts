import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

function classify(value: number) {
	if (value === 0) {
		return DEither.left("zero");
	}
	if (value < 0) {
		return DEither.left("negative", value);
	}
	if (value > 10) {
		return DEither.right("big", `${value}`);
	}
	return DEither.right("small", value);
}

function describe(value: number) {
	const result = classify(value);
	if (DEither.hasInformation(result, "negative")) {
		return DEither.unwrapLeft(result) - 1;
	}
	if (DEither.hasInformation(result, "big")) {
		return DEither.unwrapRight(result).length;
	}
	if (DEither.hasInformation(result, "small")) {
		return DEither.unwrapRight(result) + 1;
	}
	return 0;
}

DCommon.print(DArray.map([0, -5, 123, 4], (value) => describe(value)));
