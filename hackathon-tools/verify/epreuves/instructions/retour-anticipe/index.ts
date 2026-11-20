import * as DCommon from "@duplojs/lang/common";

function grade(score: number) {
	if (score < 0) {
		return -1;
	}
	if (score === 0) {
		return 0;
	}
	if (score < 10) {
		return 1;
	}
	if (score < 100) {
		return 2;
	}
	if (score < 1000) {
		return 3;
	}
	return 4;
}

DCommon.print(grade(-5));
DCommon.print(grade(0));
DCommon.print(grade(5));
DCommon.print(grade(50));
DCommon.print(grade(500));
DCommon.print(grade(5000));
