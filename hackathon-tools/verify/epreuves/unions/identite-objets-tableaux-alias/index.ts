import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function add(
	one: number,
	two: number,
): (
	| DEither.Success<number>
	| DEither.Fail
) {
	if (one < 0) {
		return DEither.fail();
	}
	return DEither.success(one + two);
}

function same(value: DEither.Success<number> | DEither.Fail) {
	return value;
}

function double(value: number) {
	return value * 2;
}

const first = add(1, 2);
const failed = add(-1, 2);
const list = [1, 2];
const listAlias = list;
const otherList = [1, 2];
const box = { count: 1 };
const boxAlias = box;
const otherBox = { count: 1 };
const results = [first, failed];

function find(flag: boolean) {
	return flag ? failed : undefined;
}

DCommon.print(same(first) === first);
DCommon.print(results[0] === first);
DCommon.print(DEither.whenIsRight(failed, double) === failed);
DCommon.print(add(-1, 2) === failed);
DCommon.print(DEither.fail() === DEither.fail());
DCommon.print(list === listAlias);
DCommon.print(list === otherList);
DCommon.print(list !== otherList);
DCommon.print(box === boxAlias);
DCommon.print(box === otherBox);
DCommon.print(find(true) === undefined);
DCommon.print(find(false) === undefined);
DCommon.print(find(true) === failed);
