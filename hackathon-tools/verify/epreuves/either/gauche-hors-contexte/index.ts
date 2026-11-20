import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

const refused = DEither.left("refused", 1);
const failure = DEither.fail();

function pick(value: number) {
	if (value === 0) {
		return refused;
	}
	if (value === 1) {
		return failure;
	}
	return DEither.success("picked");
}

DCommon.print(refused);
DCommon.print(pick(0));
DCommon.print(pick(1));
DCommon.print(pick(2));
