import * as DCommon from "@duplojs/lang/common";

function named(value: number) {
	return value;
}

DCommon.print(named);
DCommon.print((value: number) => value);
DCommon.print([named]);
DCommon.print({ named });
