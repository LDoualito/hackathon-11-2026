import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

let pending: number | undefined;

const wrapped = DEither.success(pending);

DCommon.print(wrapped);

if (pending === undefined) {
	DCommon.print(1);
}

function absent(value?: number) {
	return DEither.success(value);
}

DCommon.print(absent());
