import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const mixed = [
	DEither.success(1),
	DEither.success("text"),
	DEither.right("flag", true),
	DEither.fail(),
	DEither.left("refused", 2),
	DEither.left("refused-text", "two"),
];

DCommon.print(mixed);
DCommon.print(DArray.filter(mixed, DEither.isRight));
DCommon.print(DArray.filter(mixed, DEither.isLeft));
