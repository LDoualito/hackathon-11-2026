import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

const narrow: DEither.Success<number>[] = [DEither.success(1)];
const wide: DEither.Success<number | string>[] = narrow;

wide.push(DEither.success("a"));

function double(value: number) {
	return value + value;
}

DCommon.print(double(DEither.unwrapRight(narrow[0]!)));
DCommon.print(double(DEither.unwrapRight(narrow[1]!)));

const fails: DEither.Fail[] = [DEither.fail()];
const mixed: (DEither.Success<number> | DEither.Fail)[] = fails;

mixed.push(DEither.success(3));

DCommon.print(fails);

const box: { content: DEither.Success<number> } = { content: DEither.success(1) };
const wideBox: { content: DEither.Success<number | string> } = box;

wideBox.content = DEither.success("b");

DCommon.print(double(DEither.unwrapRight(box.content)));
