import * as DCommon from "@duplojs/lang/common";

function check(label: string, answer: boolean) {
	DCommon.print(label);
	return answer;
}

if (check("a", true) || check("b", true)) {
	DCommon.print("or");
}

if (check("c", false) && check("d", true)) {
	DCommon.print("never");
}

function safeDivide(value: number, divisor: number) {
	if (divisor !== 0 && value / divisor > 1) {
		return "big";
	}
	return "small";
}

DCommon.print(safeDivide(4, 0));
DCommon.print(safeDivide(4, 2));
