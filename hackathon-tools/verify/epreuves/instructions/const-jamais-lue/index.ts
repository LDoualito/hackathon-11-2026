import * as DCommon from "@duplojs/lang/common";

function double(value: number) {
	return value * 2;
}

const unused = double(1);
const used = double(2);

DCommon.print(used);
