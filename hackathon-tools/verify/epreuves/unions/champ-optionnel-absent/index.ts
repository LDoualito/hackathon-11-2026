import * as DCommon from "@duplojs/lang/common";

const box: { value?: number } = {};
const other: { value?: number } = { value: 1 };

if (box.value === undefined) {
	DCommon.print(1);
}
if (other.value === undefined) {
	DCommon.print(2);
}
DCommon.print(box.value);
