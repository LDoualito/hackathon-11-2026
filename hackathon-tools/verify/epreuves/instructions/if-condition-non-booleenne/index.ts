import * as DCommon from "@duplojs/lang/common";

function truthy(value: number | string | undefined | null | number[] | object) {
	if (value) {
		return "truthy";
	}
	return "falsy";
}

DCommon.print(truthy(0));
DCommon.print(truthy(-0));
DCommon.print(truthy(NaN));
DCommon.print(truthy(1));
DCommon.print(truthy(""));
DCommon.print(truthy("0"));
DCommon.print(truthy(undefined));
DCommon.print(truthy(null));
DCommon.print(truthy([]));
DCommon.print(truthy({}));
