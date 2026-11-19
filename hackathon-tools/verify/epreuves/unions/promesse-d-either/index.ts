import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

async function add(
	one: number,
	two: number,
): Promise<
	| DEither.Success<number>
	| DEither.Fail
> {
	DCommon.print(one);
	if (one < 0) {
		return DEither.fail();
	}
	return DEither.success(one + two);
}

async function twice(value: number) {
	const first = await add(value, 1);
	if (DEither.isLeft(first)) {
		return first;
	}
	const second = await add(DEither.unwrapRight(first), 1);
	return second;
}

const pending = twice(1);

DCommon.print("après");

const result = await pending;

if (DEither.isRight(result)) {
	DCommon.print(result);
}

DCommon.print(await twice(-1));

const all = await Promise.all([
	twice(10),
	twice(-2),
	twice(20),
	twice(30),
	twice(40),
	twice(50),
]);

DCommon.print(all);
