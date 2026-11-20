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
	return DEither.right("positive", `${value}`);
}

const results = DArray.map([0, -5, 4], (value) => classify(value));

DCommon.print(
	DArray.map(
		results,
		(result) => DEither.isSelected(
			result,
			{
				zero: true,
				negative: false,
				positive: true,
			},
		),
	),
);
