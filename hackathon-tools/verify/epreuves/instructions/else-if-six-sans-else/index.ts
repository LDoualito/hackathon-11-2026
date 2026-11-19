import * as DCommon from "@duplojs/lang/common";

function probe(label: string, value: number, expected: number) {
	DCommon.print(label);
	return value === expected;
}

const value = 3;

if (probe("a", value, 1)) {
	DCommon.print("is a");
} else if (probe("b", value, 2)) {
	DCommon.print("is b");
} else if (probe("c", value, 3)) {
	DCommon.print("is c");
} else if (probe("d", value, 4)) {
	DCommon.print("is d");
} else if (probe("e", value, 5)) {
	DCommon.print("is e");
} else if (probe("f", value, 6)) {
	DCommon.print("is f");
}

DCommon.print("done");
