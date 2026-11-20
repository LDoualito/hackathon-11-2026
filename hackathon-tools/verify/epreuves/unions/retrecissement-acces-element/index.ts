import * as DCommon from "@duplojs/lang/common";

function double(value: number) {
	return value + value;
}

const box: { value: number | undefined } = { value: 2 };

if (box["value"] !== undefined) {
	DCommon.print(double(box["value"]));
}

const list: (number | string)[] = [3, "a"];

if (typeof list[0] === "number") {
	DCommon.print(double(list[0]));
}
