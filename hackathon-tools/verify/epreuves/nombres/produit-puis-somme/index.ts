import * as DCommon from "@duplojs/lang/common";

function scaleThenShift(value: number, factor: number, shift: number) {
	return value * factor + shift;
}

function shiftThenScale(value: number, factor: number, shift: number) {
	return shift + value * factor;
}

DCommon.print(scaleThenShift(0.1, 10, -1));
DCommon.print(scaleThenShift(0.1, 3, -0.3));
DCommon.print(shiftThenScale(0.1, 10, -1));
DCommon.print(shiftThenScale(0.1, 3, -0.3));
