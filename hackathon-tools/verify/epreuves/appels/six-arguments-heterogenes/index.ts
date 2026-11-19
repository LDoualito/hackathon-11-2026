import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";

function describe(
	count: number,
	label: string,
	enabled: boolean,
	values: number[],
	options: { depth: number },
	format: (value: number) => string,
) {
	return [
		format(count),
		label,
		DString.to(enabled),
		DString.to(values.length),
		DString.to(options.depth),
	];
}

function zero() {
	return 0;
}

function increment(value: number) {
	return value + 1;
}

DCommon.print(describe(1, "a", true, [1, 2], { depth: 3 }, DString.to));
DCommon.print(zero());
DCommon.print(increment(increment(increment(increment(increment(increment(zero())))))));
