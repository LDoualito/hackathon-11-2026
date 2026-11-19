import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

DCommon.print(DCommon.print(DEither.success(3)));

const doubled = DCommon.print(4) * 2;

DCommon.print(doubled);

function show(value: number) {
	return DCommon.print(value);
}

DCommon.print(show(5) + show(6));
