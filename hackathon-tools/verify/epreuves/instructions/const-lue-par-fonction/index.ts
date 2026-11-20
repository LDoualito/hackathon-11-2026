import * as DCommon from "@duplojs/lang/common";

const factor = 3;

function scale(value: number) {
	return value * factor;
}

const scaled = scale(2);

function readBoth() {
	return scaled + factor;
}

DCommon.print(scaled);
DCommon.print(readBoth());
