import * as DCommon from "@duplojs/lang/common";

const list = [1, 2];
const beyond = list[5];

DCommon.print(beyond);
if (beyond === undefined) {
	DCommon.print(1);
}
list[3] = 4;
DCommon.print(list.length);
DCommon.print(list);
