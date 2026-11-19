import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const numbers = [1, 2];
const mixed: (number | string)[] = ["a", 1];

function count(items: (number | string)[]) {
	return DArray.map(items, (item) => item === 1);
}

function choose(flag: boolean) {
	if (flag) {
		return numbers;
	}
	return mixed;
}

function pick(flag: boolean) {
	return flag ? numbers : mixed;
}

const lists = [numbers, mixed];
const widened: (number | string)[] = numbers;

DCommon.print(count(numbers));
DCommon.print(count(choose(true)));
DCommon.print(count(pick(true)));
DCommon.print(DArray.map(lists, count));
DCommon.print(count(widened));
