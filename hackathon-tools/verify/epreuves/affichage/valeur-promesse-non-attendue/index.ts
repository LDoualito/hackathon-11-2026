import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

async function calculate(value: number) {
	return DEither.success(value);
}

const pending = calculate(1);

DCommon.print(pending);
DCommon.print(await pending);
DCommon.print(pending);
