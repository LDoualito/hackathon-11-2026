import * as DCommon from "@duplojs/lang/common";

function resolve(input: number | undefined) {
	let value = input;
	value ??= 1;
	let label = "";
	label ||= "empty";
	let flag = value > 0;
	flag &&= label === "empty";
	return [value, label, flag];
}

DCommon.print(resolve(undefined));
DCommon.print(resolve(-2));
