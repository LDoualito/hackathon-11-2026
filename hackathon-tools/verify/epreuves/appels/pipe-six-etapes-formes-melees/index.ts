import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DString from "@duplojs/lang/string";

function double(value: number) {
	return value * 2;
}

function keepLong(minimum: number) {
	return (texts: readonly string[]) => DArray.filter(texts, (text) => text.length >= minimum);
}

const output = DCommon.pipe(
	[1, 20, 300],
	DArray.map(double),
	DArray.map(DString.to),
	keepLong(2),
	(texts) => texts.length,
	DEither.success,
	DEither.whenIsRightOtherwise(
		DString.to,
		() => "échec",
	),
);

DCommon.print(output);
