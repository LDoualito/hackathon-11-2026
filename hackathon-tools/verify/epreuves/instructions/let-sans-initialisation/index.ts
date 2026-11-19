import * as DCommon from "@duplojs/lang/common";

function pick(value: number) {
	let label: string;
	if (value > 0) {
		label = "positive";
	} else {
		label = "other";
	}
	return label;
}

let late: number | undefined;

DCommon.print(late);
late = 5;
DCommon.print(late);
DCommon.print(pick(1));
DCommon.print(pick(0));
