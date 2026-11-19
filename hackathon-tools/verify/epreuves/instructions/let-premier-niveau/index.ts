import * as DCommon from "@duplojs/lang/common";

let counter = 0;

function increment() {
	counter = counter + 1;
	return counter;
}

DCommon.print(increment());
counter = counter + 10;
DCommon.print(increment());
DCommon.print(counter);
