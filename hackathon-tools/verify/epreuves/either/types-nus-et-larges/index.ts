import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function side(input: DEither.Left | DEither.Right) {
	return DEither.isLeft(input) ? "left" : "right";
}

function done(): DEither.Right<"done"> {
	return DEither.right("done");
}

function anything(value: unknown): DEither.Success<unknown> | DEither.Error<unknown> {
	return value === undefined ? DEither.error(value) : DEither.success(value);
}

function nothing(): DEither.Success<void> | DEither.Left<"nothing", void> {
	return DEither.success(undefined);
}

DCommon.print(side(DEither.fail()));
DCommon.print(side(DEither.right("named", 1)));
DCommon.print(done());
DCommon.print(anything(1));
DCommon.print(anything("text"));
DCommon.print(anything(undefined));
DCommon.print(nothing());
