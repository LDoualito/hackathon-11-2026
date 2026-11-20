import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const hundred = DArray.fillAll(DArray.from({ length: 100 }), 7);
const hundredAndOne = DArray.push(hundred, 7);
const hundredAndTwo = DArray.push(hundredAndOne, 7);

DCommon.print(hundred);
DCommon.print(hundredAndOne);
DCommon.print(hundredAndTwo);
