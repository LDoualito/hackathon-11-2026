import * as DCommon from "@duplojs/lang/common";
import { type Forme } from "./forme";

function double(value: Forme): Forme {
	return value * 2;
}

DCommon.print(double(2));
