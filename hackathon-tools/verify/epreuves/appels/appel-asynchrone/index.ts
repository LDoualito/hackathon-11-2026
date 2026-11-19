import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";

async function load(value: number) {
	DCommon.print(`charge ${value}`);
	return DEither.success(value);
}

async function combine(one: number, two: number) {
	const first = await load(one);
	const second = await load(two);
	return [first, second];
}

DCommon.print(await combine(1, 2));

const pending = load(3);

DCommon.print("après l'appel");
DCommon.print(await pending);
DCommon.print(
	await DCommon.asyncPipe(
		load(4),
		DEither.whenIsRightOtherwise(
			DString.to,
			() => "échec",
		),
	),
);
