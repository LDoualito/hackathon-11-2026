import * as DCommon from "@duplojs/lang/common";

const one = 1, two = one + 1, three = two + 1, four = three + 1, five = four + 1, six = five + 1;

function sum() {
	const first = one + two, second = first + three;
	return second + four + five + six;
}

DCommon.print(six);
DCommon.print(sum());
