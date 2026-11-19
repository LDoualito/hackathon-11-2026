import * as DCommon from "@duplojs/lang/common";

function increment(value: number | undefined) {
	if (value === undefined) {
		return 0;
	}
	return value + 1;
}

function describe(value: number | string) {
	if (typeof value === "string") {
		return value.length;
	}
	return value * 2;
}

const maybe: number | undefined = increment(undefined);

if (maybe !== undefined) {
	DCommon.print(maybe + 1);
}

DCommon.print(increment(4));
DCommon.print(describe("abc"));
DCommon.print(describe(4));
