import * as DCommon from "@duplojs/lang/common";

function sign(value: number) {
	if (value > 0) {
		return "positive";
	} else if (value < 0) {
		return "negative";
	} else {
		return "zero";
	}
}

DCommon.print(sign(1));
DCommon.print(sign(-1));
DCommon.print(sign(0));
