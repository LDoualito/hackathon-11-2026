import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

DCommon.print(["漢字漢字", "a", "bb", "ccc", "漢", "dddd", "e"]);
DCommon.print(["😀😀", "a", "bb", "ccc", "😀", "dddd", "e"]);
DCommon.print(["éé", "a", "bb", "ccc", "é", "dddd", "e"]);
DCommon.print(DEither.success(["漢字漢字", "a", "bb", "ccc", "漢", "dddd", "e"]));
