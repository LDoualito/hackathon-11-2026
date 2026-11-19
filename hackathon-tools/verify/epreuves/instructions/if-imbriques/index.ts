import * as DCommon from "@duplojs/lang/common";

function locate(one: number, two: number, three: number) {
	if (one > 0) {
		if (two > 0) {
			if (three > 0) {
				return "all";
			}
			return "two";
		}
		DCommon.print("only one");
	}
	return "none";
}

DCommon.print(locate(1, 1, 1));
DCommon.print(locate(1, 1, 0));
DCommon.print(locate(1, 0, 0));
DCommon.print(locate(0, 0, 0));
