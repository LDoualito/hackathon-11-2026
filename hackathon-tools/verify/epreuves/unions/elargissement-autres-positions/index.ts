import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

const numbers = [1, 2];
const mixed: (number | string)[] = ["a", 1];

interface Holder {
	items: (number | string)[];
}

function wrap(): DEither.Success<(number | string)[]> {
	return DEither.success(numbers);
}

function hold(): Holder {
	return { items: numbers };
}

const pickArrow = (flag: boolean): (number | string)[] => flag ? numbers : mixed;

let current: (number | string)[] = mixed;

current = numbers;

const optional: number[] | undefined = numbers;
const eithers: (DEither.Success<number> | DEither.Fail)[] = [DEither.fail(), DEither.fail()];
const fails = [DEither.fail()];
const wide: (DEither.Success<number> | DEither.Fail)[] = fails;

DCommon.print(wrap());
DCommon.print(hold());
DCommon.print(pickArrow(true));
DCommon.print(current);
DCommon.print(optional);
DCommon.print(eithers.length + wide.length);
