import * as DCommon from "@duplojs/lang/common";

const value = 1;

if (value === 1) {
	const value = 2;
	DCommon.print(value);
	if (value === 2) {
		const value = 3;
		DCommon.print(value);
	}
}

function shadow(input: number) {
	const value = input + 10;
	if (value > 10) {
		const value = input + 100;
		return value;
	}
	return value;
}

DCommon.print(value);
DCommon.print(shadow(1));
