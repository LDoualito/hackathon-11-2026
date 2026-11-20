import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import { read } from "./other";

export const early = read();

DCommon.print(1);

export const result = DEither.success(3);

DCommon.print(2);
