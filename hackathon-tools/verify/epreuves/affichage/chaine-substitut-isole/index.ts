import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";

DCommon.print(["\ud83d"]);
DCommon.print(["a\udc00b", "\u007f", "\u0085", " "]);
DCommon.print(DString.length("\ud83d"));
