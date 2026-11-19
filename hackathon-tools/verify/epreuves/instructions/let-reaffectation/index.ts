import * as DCommon from "@duplojs/lang/common";

function classify(value: number) {
	let label = "zero";
	if (value > 0) {
		label = "positive";
	}
	if (value < 0) {
		label = "negative";
	}
	return label;
}

DCommon.print(classify(1));
DCommon.print(classify(0));
DCommon.print(classify(-1));
