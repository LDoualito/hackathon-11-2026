import * as DCommon from "@duplojs/lang/common";

function pair(first: number, second: number) {
	return [first, second];
}

DCommon.print(pair(DCommon.print(1), DCommon.print(2)));

const chosen = DCommon.print(0) === 0 ? DCommon.print("zéro") : DCommon.print("autre");

DCommon.print(chosen);
