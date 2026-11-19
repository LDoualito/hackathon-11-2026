import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function trace(value: number) {
	DCommon.print(value);
	return DEither.success(value);
}

const result = trace(1);

trace(2);
DEither.success(3);
DEither.isRight(result);
DEither.success(trace(4));
DEither.isRight(trace(5));
