import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const shown = DArray.map([1, 2, 3], (value) => DCommon.print(value));

DCommon.print(shown);

const piped = DCommon.pipe(
	[4, 5],
	(values) => DCommon.print(values),
	DArray.map((value) => DCommon.print(value * 2)),
);

DCommon.print(piped);
