import * as DCommon from "@duplojs/lang/common";

const double = (value: number) => value * 2;

function apply() {
	const triple = (value: number) => value * 3;
	return triple(double(1));
}

DCommon.print(double(2));
DCommon.print(apply());
