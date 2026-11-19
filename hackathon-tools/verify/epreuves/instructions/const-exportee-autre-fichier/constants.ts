import * as DCommon from "@duplojs/lang/common";

DCommon.print("constants starts");

export const base = 41;

export const labels = ["a", "b", "c", "d", "e", "f"];

export function describe() {
	return base + labels.length;
}

DCommon.print("constants ends");
