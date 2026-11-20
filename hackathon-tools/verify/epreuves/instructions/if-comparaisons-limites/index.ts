import * as DCommon from "@duplojs/lang/common";

function same(one: number, two: number) {
	if (one === two) {
		return "same";
	}
	return "different";
}

function sameText(one: string, two: string) {
	if (one !== two) {
		return "different";
	}
	return "same";
}

DCommon.print(same(NaN, NaN));
DCommon.print(same(0, -0));
DCommon.print(same(0.1 + 0.2, 0.3));
DCommon.print(same(Infinity, Infinity));
DCommon.print(sameText("", ""));
DCommon.print(sameText("é", "é"));
DCommon.print(sameText("a", "A"));
