import * as DCommon from "@duplojs/lang/common";
import type { TypeA } from "./a";
import { type TypeB } from "./b";
import { TypeC } from "./c";
import { valueD } from "./d";
import { valueE } from "./e";
import "./f";
import { valueG } from "./g";
import * as H from "./h";

export { valueI } from "./i";
export type { TypeJ } from "./j";

function sum(
	one: TypeA,
	two: TypeB,
	three: TypeC,
	four: typeof valueE,
	five: H.TypeH,
) {
	return one + two + three + four + five + valueG;
}

DCommon.print(sum(1, 2, 3, 1, 5));
