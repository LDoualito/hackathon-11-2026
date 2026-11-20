import * as DCommon from "@duplojs/lang/common";

const values = [3, 1, 2];
const text = "abc";

DCommon.print(values.map((value) => value * 2));
DCommon.print(values.filter((value) => value > 1).join("-"));
DCommon.print(text.toUpperCase().slice(1));
DCommon.print(values.includes(2));
DCommon.print((12.5).toFixed(1));
