import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const numbers = [1, 2];
const mixed: (number | string)[] = ["a", 1];

function find(flag: boolean): DEither.Success<(number | string)[]> | undefined {
	return flag ? DEither.success(mixed) : undefined;
}

function choose(flag: boolean) {
	return find(flag) ?? DEither.success(numbers);
}

function describe(flag: boolean) {
	const items = DEither.unwrapRight(choose(flag));
	return DArray.map(items, (item) => item === 1);
}

DCommon.print(describe(true));
DCommon.print(describe(false));
