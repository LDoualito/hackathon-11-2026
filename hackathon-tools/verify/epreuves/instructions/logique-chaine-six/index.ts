import * as DCommon from "@duplojs/lang/common";

function check(label: string, answer: boolean) {
	DCommon.print(label);
	return answer;
}

const anyTrue = check("a", false) || check("b", false) || check("c", false) || check("d", true) || check("e", true) || check("f", true);
const allTrue = check("a", true) && check("b", true) && check("c", true) && check("d", false) && check("e", true) && check("f", true);
const mixed = check("a", false) && check("b", true) || check("c", true) && (check("d", false) || check("e", true)) && check("f", true);

DCommon.print(anyTrue);
DCommon.print(allTrue);
DCommon.print(mixed);
