import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

const count: number = 1;
const label: string = "one";
const maybe: number | undefined = 2;
const result: DEither.Success<number> | DEither.Fail = DEither.success(3);

DCommon.print(count);
DCommon.print(label);
DCommon.print(maybe);
DCommon.print(result);
