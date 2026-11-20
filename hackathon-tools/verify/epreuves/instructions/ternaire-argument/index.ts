import * as DCommon from "@duplojs/lang/common";

function show(value: number) {
	return value * 2;
}

const one = -1;
const two = 2;

DCommon.print(one < 0 ? one : two);
DCommon.print(show(one > 0 ? one : two));
