import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function add(one: number, two: number) {
	return one < 0 ? DEither.left("negative", one) : DEither.success(one + two);
}

const report = {
	first: add(1, 2),
	second: add(-1, 2),
	pair: [add(3, 4), "raw"] as const,
};

DCommon.print(report);
DCommon.print(DEither.isRight(report.first));
DCommon.print(DEither.isLeft(report.second));
DCommon.print(DEither.isRight(report.pair[0]));
