import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";

const long = DString.repeat("x", 10001);

DCommon.print(DString.length(long));
DCommon.print([long]);
