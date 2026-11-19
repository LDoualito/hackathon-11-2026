import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const numbers = [1, 2];

function make(
	flag: boolean,
): (
	| DEither.Left<"rejected", (number | string)[]>
	| DEither.Right<"accepted", number[]>
) {
	const rejected = DEither.left("rejected", numbers);
	if (flag) {
		return rejected;
	}
	return DEither.right("accepted", numbers);
}

function describe(flag: boolean) {
	const made = make(flag);
	if (DEither.isLeft(made)) {
		const items = DEither.unwrapLeft(made);
		return DArray.map(items, (item) => item === 1);
	}
	return DArray.map(DEither.unwrapRight(made), (item) => item === 2);
}

DCommon.print(describe(false));
DCommon.print(describe(true));
