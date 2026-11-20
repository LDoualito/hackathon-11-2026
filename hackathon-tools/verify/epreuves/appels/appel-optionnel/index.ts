import * as DCommon from "@duplojs/lang/common";

function run(value: number, format?: (value: number) => string) {
	return format?.(value);
}

DCommon.print(run(1));
DCommon.print(run(2, (value) => `n${value}`));
