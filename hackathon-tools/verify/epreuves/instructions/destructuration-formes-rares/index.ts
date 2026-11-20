import * as DCommon from "@duplojs/lang/common";

const values: number[] = [1, 2, 3, 4, 5, 6];
const [first, , third, ...others] = values;
const [missing = 7] = [] as number[];
const nested = {
	inner: {
		deep: [10, 20],
	},
	optional: undefined as number | undefined,
};
const { inner: { deep: [tenth] }, optional = 30, ...remaining } = nested;

DCommon.print(first);
DCommon.print(third);
DCommon.print(others);
DCommon.print(missing);
DCommon.print(tenth);
DCommon.print(optional);
DCommon.print(remaining);
