import { success, left, isRight, isLeft, hasInformation, type Success, type Left } from "@duplojs/lang/either";
import * as E from "@duplojs/lang/either";
import { DEither as Root, DCommon } from "@duplojs/lang";

function add(one: number, two: number): Success<number> | Left<"negative", number> | E.Fail | Root.Ok {
	if (one < 0) {
		return left("negative", one);
	}
	if (two < 0) {
		return E.fail();
	}
	if (one === 0) {
		return Root.ok();
	}
	return success(one + two);
}

const results = [add(-1, 1), add(1, -1), add(0, 1), add(1, 1)];

DCommon.print(results);
DCommon.print(results.map((result) => isRight(result)));
DCommon.print(results.map((result) => E.isLeft(result)));
DCommon.print(results.map((result) => hasInformation(result, "negative")));
DCommon.print(results.map((result) => Root.isRight(result)));
