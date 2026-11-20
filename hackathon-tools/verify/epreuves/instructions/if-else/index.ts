import * as DCommon from "@duplojs/lang/common";

const value = 1;

if (value === 1) {
	DCommon.print("then");
} else {
	DCommon.print("else");
}

function choose(input: number) {
	if (input === 1) {
		DCommon.print("one");
	} else {
		DCommon.print("other");
	}
	return input;
}

DCommon.print(choose(1));
DCommon.print(choose(2));
