import * as DCommon from "@duplojs/lang/common";

function nameOrDefault(name: string) {
	return name || "anonymous";
}

function lengthWhenPresent(text: string | undefined) {
	return text && text.length;
}

function describe(count: number) {
	return count ? "some" : "none";
}

DCommon.print(nameOrDefault(""));
DCommon.print(nameOrDefault("ada"));
DCommon.print(lengthWhenPresent(undefined));
DCommon.print(lengthWhenPresent(""));
DCommon.print(lengthWhenPresent("abc"));
DCommon.print(describe(0));
DCommon.print(describe(NaN));
DCommon.print(describe(2));
