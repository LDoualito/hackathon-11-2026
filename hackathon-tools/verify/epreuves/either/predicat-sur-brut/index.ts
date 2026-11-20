import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

function load(value: number): number | string | null | DEither.Success<number> | DEither.Left<"refused", string> {
	if (value === 0) {
		return value;
	}
	if (value === 1) {
		return "raw";
	}
	if (value === 2) {
		return null;
	}
	if (value === 3) {
		return DEither.success(value);
	}
	return DEither.left("refused", "no");
}

const values = DArray.map([0, 1, 2, 3, 4], (value) => load(value));
const unknownValue: unknown = DEither.success(1);

DCommon.print(DArray.map(values, (value) => DEither.isRight(value)));
DCommon.print(DArray.map(values, (value) => DEither.isLeft(value)));
DCommon.print(DArray.map(values, (value) => DEither.hasInformation(value, "refused")));
DCommon.print(DEither.isRight(unknownValue));
DCommon.print(DEither.isLeft(1));
