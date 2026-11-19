import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const items = [1, 2];
const wrapped = DEither.success(items);

interface Box {
	items: (number | string)[];
	wrapped: DEither.Success<(number | string)[]>;
}

const box: Box = {
	items,
	wrapped,
};

DCommon.print(DArray.map(box.items, (item) => item === 1));
DCommon.print(DArray.map(DEither.unwrapRight(box.wrapped), (item) => item === 2));
