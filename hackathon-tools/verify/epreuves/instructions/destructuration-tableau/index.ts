import * as DCommon from "@duplojs/lang/common";

const pair: [number, string] = [1, "one"];
const [count, label] = pair;

function swap(input: [number, number]) {
	const [first, second] = input;
	return [second, first];
}

DCommon.print(count);
DCommon.print(label);
DCommon.print(swap([1, 2]));
