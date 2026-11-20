import * as DCommon from "@duplojs/lang/common";

const value = 5;
const label = value > 3 ? "big" : "small";

function absolute(input: number) {
	return input < 0 ? -input : input;
}

const describe = (input: number) => input === 0 ? "zero" : "non-zero";

DCommon.print(label);
DCommon.print(absolute(-4));
DCommon.print(describe(0));
DCommon.print({ kind: value > 3 ? "big" : "small" });
