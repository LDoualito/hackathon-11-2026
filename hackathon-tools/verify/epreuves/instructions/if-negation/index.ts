import * as DCommon from "@duplojs/lang/common";

function isPositive(value: number) {
	return value > 0;
}

const flag = false;

if (!flag) {
	DCommon.print("not flag");
}

if (!isPositive(-1)) {
	DCommon.print("not positive");
}

if (!(1 > 2)) {
	DCommon.print("not greater");
}

if (!!flag) {
	DCommon.print("never");
}
