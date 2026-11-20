import * as DCommon from "@duplojs/lang/common";

function trace(label: string, value: number) {
	DCommon.print(label);
	return value;
}

const chosen = trace("condition", 1) === 1 ? trace("then", 10) : trace("else", 20);
const other = trace("condition", 2) === 1 ? trace("then", 10) : trace("else", 20);

DCommon.print(chosen);
DCommon.print(other);
