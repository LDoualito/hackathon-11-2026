import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function add(one: number, two: number) {
	return DEither.success(one + two);
}

function inReturn() {
	return add(1, 2);
}

const inArrowBody = () => add(3, 4);
const inArray = [add(5, 6), add(7, 8)];
const inObject = { value: add(9, 10) };
const inTemplate = `somme ${DEither.isRight(add(11, 12))}`;
const inTernary = DEither.isRight(add(13, 14)) ? add(15, 16) : add(17, 18);

if (DEither.isRight(add(19, 20))) {
	DCommon.print(inReturn());
}

DCommon.print(inArrowBody());
DCommon.print(inArray);
DCommon.print(inObject);
DCommon.print(inTemplate);
DCommon.print(inTernary);
