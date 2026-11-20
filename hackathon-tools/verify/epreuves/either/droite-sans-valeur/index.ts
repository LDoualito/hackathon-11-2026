import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function find(value: number): (
	| DEither.Right<"empty">
	| DEither.Right<"full", number>
	| DEither.Ok
	| DEither.Fail
) {
	if (value === 0) {
		return DEither.right("empty");
	}
	if (value === 1) {
		return DEither.right("full", value);
	}
	if (value === 2) {
		return DEither.ok();
	}
	return DEither.fail();
}

DCommon.print(find(0));
DCommon.print(find(1));
DCommon.print(find(2));
DCommon.print(find(3));
