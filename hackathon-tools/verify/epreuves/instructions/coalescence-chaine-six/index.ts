import * as DCommon from "@duplojs/lang/common";

function first(
	one: number | undefined,
	two: number | null,
	three: number | undefined,
	four: number | null,
	five: number | undefined,
	six: number,
) {
	return one ?? two ?? three ?? four ?? five ?? six;
}

DCommon.print(first(undefined, null, undefined, null, undefined, 6));
DCommon.print(first(undefined, null, 3, null, 5, 6));
DCommon.print(first(0, 2, 3, 4, 5, 6));
