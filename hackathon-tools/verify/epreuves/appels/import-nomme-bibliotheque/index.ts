import { success, isRight, fail as failure } from "@duplojs/lang/either";
import * as E from "@duplojs/lang/either";
import { print } from "@duplojs/lang/common";

function add(one: number, two: number) {
	if (one === -1) {
		return failure();
	}
	return success(one + two);
}

const result = add(1, 2);

if (isRight(result)) {
	print(result);
}

if (E.isLeft(add(-1, 2))) {
	print("left");
}
