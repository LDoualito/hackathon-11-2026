import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const narrow: DEither.Success<number>[] = [DEither.success(1), DEither.success(2)];
const fails: DEither.Fail[] = [DEither.fail()];

function describe(list: readonly (DEither.Success<number | string> | DEither.Fail)[]) {
	return DArray.map(list, (item) => DEither.isRight(item) ? DEither.unwrapRight(item) : "fail");
}

const frozen: readonly DEither.Success<number | string>[] = narrow;

DCommon.print(describe(narrow));
DCommon.print(describe(fails));
DCommon.print(describe(frozen));

narrow.push(DEither.success(3));

DCommon.print(describe(frozen));
