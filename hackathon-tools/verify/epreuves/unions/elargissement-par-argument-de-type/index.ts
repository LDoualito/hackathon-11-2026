import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const numbers = [1, 2];

const wrapped = DEither.success<(number | string)[]>(numbers);
const rejected = DEither.left<"rejected", (number | string)[]>("rejected", numbers);

DCommon.print(DArray.map(DEither.unwrapRight(wrapped), (item) => item === 1));
DCommon.print(DArray.map(DEither.unwrapLeft(rejected), (item) => item === 2));
