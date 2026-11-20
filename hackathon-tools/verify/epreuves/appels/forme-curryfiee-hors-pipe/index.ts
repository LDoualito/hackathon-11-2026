import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DString from "@duplojs/lang/string";

const toTexts = DArray.map<readonly number[], string>(DString.to);

DCommon.print(toTexts([1, 2]));
DCommon.print(DArray.map<readonly number[], number>((value) => value + 1)([1, 2]));

const wrap = DEither.whenIsRight(DArray.coalescing);

DCommon.print(wrap(DEither.success(3)));
DCommon.print(wrap(DEither.fail()));

const describe = DEither.whenIsRightOtherwise(
	DString.to,
	() => "échec",
);

DCommon.print(DArray.map([DEither.success(4), DEither.fail()], describe));
