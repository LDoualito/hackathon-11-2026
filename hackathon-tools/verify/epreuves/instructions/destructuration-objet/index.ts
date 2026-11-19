import * as DCommon from "@duplojs/lang/common";

const point = {
	horizontal: 1,
	vertical: 2,
	label: "origin",
};
const { horizontal, vertical: renamed } = point;

function describe(input: { label: string; horizontal: number }) {
	const { label, horizontal } = input;
	return label + ":" + horizontal.toString();
}

DCommon.print(horizontal);
DCommon.print(renamed);
DCommon.print(describe(point));
