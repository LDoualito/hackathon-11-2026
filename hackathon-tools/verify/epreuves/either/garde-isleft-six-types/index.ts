import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

function toNumber(input: number) {
	return input < 0 ? DEither.left("a-negative", input) : DEither.success(input + 1);
}

function toText(input: number) {
	return input > 100 ? DEither.left("b-too-big", "big") : DEither.success(`n${input}`);
}

function toFlag(input: string) {
	return input === "n3" ? DEither.left("c-forbidden", true) : DEither.success(input.length > 2);
}

function toList(input: boolean) {
	return input ? DEither.left("d-long", [1, 2]) : DEither.success([input, input]);
}

function toRecord(input: readonly boolean[]) {
	return input.length === 0 ? DEither.left("e-empty") : DEither.success({ size: input.length });
}

function toSize(input: { size: number }) {
	return input.size > 5 ? DEither.left("f-oversize", { size: input.size }) : DEither.success(input.size);
}

function run(input: number) {
	const first = toNumber(input);
	if (DEither.isLeft(first)) {
		return first;
	}
	const second = toText(DEither.unwrapRight(first));
	if (DEither.isLeft(second)) {
		return second;
	}
	const third = toFlag(DEither.unwrapRight(second));
	if (DEither.isLeft(third)) {
		return third;
	}
	const fourth = toList(DEither.unwrapRight(third));
	if (DEither.isLeft(fourth)) {
		return fourth;
	}
	const fifth = toRecord(DEither.unwrapRight(fourth));
	if (DEither.isLeft(fifth)) {
		return fifth;
	}
	return toSize(DEither.unwrapRight(fifth));
}

DCommon.print(DArray.map([-1, 200, 2, 12, 1], (input) => run(input)));
