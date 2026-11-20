import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function keep<GenericValue>(
	value: GenericValue,
	accepted: boolean,
): DEither.Success<GenericValue> | DEither.Left<"rejected", GenericValue> {
	return accepted ? DEither.success(value) : DEither.left("rejected", value);
}

DCommon.print(keep(1, true));
DCommon.print(keep("text", true));
DCommon.print(keep([1, 2], false));
DCommon.print(keep(DEither.fail(), true));
