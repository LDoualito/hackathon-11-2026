import * as DCommon from "@duplojs/lang/common";

let value: number | string | boolean | undefined | null | number[] = 1;
DCommon.print(value);
value = "two";
DCommon.print(value);
value = true;
DCommon.print(value);
value = undefined;
DCommon.print(value);
value = null;
DCommon.print(value);
value = [6];
DCommon.print(value);
