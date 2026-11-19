import * as DCommon from "@duplojs/lang/common";

const numbers = [1, 2];
const widened: (number | string)[] = numbers;

widened.push("a");

DCommon.print(numbers);
DCommon.print(widened === numbers);
