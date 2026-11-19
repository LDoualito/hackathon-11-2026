import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

const scores: Record<string, DEither.Success<number>> = {};
const wide: Record<string, DEither.Success<number | string>> = scores;

function double(value: number) {
	return value + value;
}

scores["first"] = DEither.success(1);

DCommon.print(double(DEither.unwrapRight(scores["first"])));

scores["second"] = DEither.success(0);
wide["second"] = DEither.success("a");

DCommon.print(double(DEither.unwrapRight(scores["second"])));
