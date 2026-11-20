import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

const box = { count: 1 };
const boxed = DEither.success(box);

box.count++;
--box.count;
box.count++;

DCommon.print(DEither.unwrapRight(boxed).count);

const counters = [1, 2];
const wrapped = DEither.success(counters);

counters[0]!++;

DCommon.print(DEither.unwrapRight(wrapped));
