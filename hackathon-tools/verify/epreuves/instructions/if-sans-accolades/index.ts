import * as DCommon from "@duplojs/lang/common";

const value: number = 2;

if (value === 2) DCommon.print("two");

if (value === 1) DCommon.print("one");
else if (value === 2) DCommon.print("two again");
else DCommon.print("other");

function pick(input: number) {
	if (input === 1) return "one";
	else return "other";
}

DCommon.print(pick(1));
DCommon.print(pick(2));
