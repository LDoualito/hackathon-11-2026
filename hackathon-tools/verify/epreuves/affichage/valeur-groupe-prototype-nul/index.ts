import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const grouped = DArray.group(
	[1, 2, 3],
	(value, { output }) => output(value > 1 ? "big" : "small", value),
);

DCommon.print(grouped);
