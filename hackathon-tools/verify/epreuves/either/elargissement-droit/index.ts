import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function count(value: number): DEither.Success<number> | DEither.Fail {
	return value < 0 ? DEither.fail() : DEither.success(value);
}

function label(value: number): DEither.Success<string> | DEither.Left<"unnamed", number> {
	return value === 0 ? DEither.left("unnamed", value) : DEither.success(`label-${value}`);
}

function either(value: number) {
	if (value % 2 === 0) {
		return count(value);
	}
	return label(value);
}

const widened: DEither.Success<number | string> | DEither.Fail = count(3);
const pair = [count(1), label(1)];

DCommon.print(either(2));
DCommon.print(either(3));
DCommon.print(either(0));
DCommon.print(widened);
DCommon.print(pair);
