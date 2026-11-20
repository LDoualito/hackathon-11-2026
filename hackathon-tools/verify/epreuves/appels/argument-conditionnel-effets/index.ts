import * as DCommon from "@duplojs/lang/common";

function trace(label: string, value: number) {
	DCommon.print(label);
	return value;
}

function add(one: number, two: number) {
	return one + two;
}

const negative = add(-1, 0) < 0;

DCommon.print(add(negative ? trace("gauche", 1) : trace("droite", 2), trace("second", 3)));
DCommon.print(add(1, 2) > 5 && trace("non évalué", 1) > 0);
DCommon.print(add(1, 2) < 5 || trace("non évalué", 1) > 0);
