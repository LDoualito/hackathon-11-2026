import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

type Mixed = (number | string)[];

const numbers = [1, 2];
const wrapped = DEither.success(numbers);
const box: { content: DEither.Success<number> } = { content: DEither.success(1) };

function double(value: number) {
	return value + value;
}

const produce: () => DEither.Success<Mixed> = (): DEither.Success<number[]> => wrapped;
const produceRaw: () => Mixed = (): number[] => numbers;
const replace: (target: { content: DEither.Success<number> }) => void = (target: { content: DEither.Success<number | string> }) => {
	target.content = DEither.success("b");
};

DCommon.print(DArray.map(DEither.unwrapRight(produce()), (item) => item === 1));
DCommon.print(DArray.map(produceRaw(), (item) => item === 2));

replace(box);

DCommon.print(double(DEither.unwrapRight(box.content)));
