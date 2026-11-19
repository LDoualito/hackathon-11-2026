import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const numbers = [1, 2];
const mixed: (number | string)[] = ["a", 1];

function pick(flag: boolean) {
	return flag ? DEither.success(numbers) : DEither.success(mixed);
}

function describe(flag: boolean) {
	const chosen = pick(flag);
	const items = DEither.unwrapRight(chosen);
	return DArray.map(items, (item) => item === 1);
}

DCommon.print(describe(false));
DCommon.print(describe(true));
