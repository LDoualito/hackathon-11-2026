import * as DCommon from "@duplojs/lang/common";

function noisy(value: number) {
	DCommon.print(value);
	return value + 1;
}

noisy(1);

function caller() {
	noisy(2);
	return noisy(3);
}

DCommon.print(caller());
