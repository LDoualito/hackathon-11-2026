import * as DCommon from "@duplojs/lang/common";

function add(one: number, two: number) {
	return one + two;
}

const pair: [number, number] = [1, 2];
const tail: [number] = [4];

DCommon.print(add(...pair));
DCommon.print(add(3, ...tail));
