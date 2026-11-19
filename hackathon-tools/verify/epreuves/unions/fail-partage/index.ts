import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";

const failure = DEither.fail();

function parse(text: string): DEither.Success<number> | DEither.Fail {
	if (text === "") {
		return failure;
	}
	return DEither.success(DString.length(text));
}

function label(value: number): DEither.Success<string> | DEither.Fail {
	if (value < 0) {
		return failure;
	}
	return DEither.success(DString.to(value));
}

function pick(flag: boolean) {
	return flag ? parse("abc") : label(7);
}

DCommon.print(parse(""));
DCommon.print(label(-1));
DCommon.print(parse("abc"));
DCommon.print(label(3));
DCommon.print(pick(true));
DCommon.print(pick(false));
