import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function add(one: number, two: number): DEither.Success<number> | DEither.Fail {
	return DEither.success(one + two);
}

function read(value: DEither.Success<number> | DEither.Fail = result) {
	return value;
}

export const early = read();

DCommon.print(1);

const result = add(1, 2);

DCommon.print(2);
