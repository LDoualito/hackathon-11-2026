import * as DCommon from "@duplojs/lang/common";

function add(one: number, two: number) {
	DCommon.print("add");
	return one + two;
}

function chooseOperation(label: string) {
	DCommon.print(label);
	return add;
}

DCommon.print(add(DCommon.print(1), DCommon.print(2)));

DCommon.print(
	add(
		add(DCommon.print(3), DCommon.print(4)),
		add(DCommon.print(5), DCommon.print(6)),
	),
);

DCommon.print(chooseOperation("callee")(DCommon.print(7), DCommon.print(8)));
