import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";

const thirty = DString.repeat("a", 30);

DCommon.print([thirty, DString.repeat("b", 36)]);
DCommon.print([thirty, DString.repeat("b", 37)]);
DCommon.print([DString.repeat("x", 100)]);
DCommon.print(["aaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbb", "cccccccccccccccc", "ddddddddddddddddd", "eeeeeeeeeeeeeee", "ffffffffffffff"]);
