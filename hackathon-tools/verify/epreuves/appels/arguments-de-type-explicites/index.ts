import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

function identity<GenericValue>(value: GenericValue) {
	return value;
}

const wide = DEither.success<number | string>(1);
const texts = DArray.map<number[], string>([1, 2], (value) => `n${value}`);

DCommon.print(wide);
DCommon.print(texts);
DCommon.print(identity<number>(3));
DCommon.print(identity("inféré"));
