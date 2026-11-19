import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

const items = [1];
const wrapped = DEither.success(items);

items.push(2);

DCommon.print(wrapped);
DCommon.print(DEither.unwrapRight(wrapped).length);

const inner = DEither.unwrapRight(wrapped);

inner.push(3);

DCommon.print(items);

const box = { count: 1 };
const boxed = DEither.left("box", box);

box.count = 2;

DCommon.print(boxed);
