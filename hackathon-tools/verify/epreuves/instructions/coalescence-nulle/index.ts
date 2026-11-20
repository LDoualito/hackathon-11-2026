import * as DCommon from "@duplojs/lang/common";

function fallback() {
	DCommon.print("fallback evaluated");
	return 9;
}

function withDefault(value: number | undefined | null) {
	return value ?? fallback();
}

const text: string | undefined = undefined;
const shown = text ?? "none";

DCommon.print(withDefault(undefined));
DCommon.print(withDefault(null));
DCommon.print(withDefault(0));
DCommon.print(withDefault(NaN));
DCommon.print(shown);
