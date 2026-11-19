import * as DCommon from "@duplojs/lang/common";

function levelOf(value: number) {
	if (value < 0) {
		return "error";
	}
	return "info";
}

DCommon.print(1, levelOf(1));
DCommon.print(-1, levelOf(-1));
