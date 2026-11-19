import * as DCommon from "@duplojs/lang/common";
import { base, describe, labels } from "./constants";

DCommon.print("index starts");

const total = base + 1;

function readInside() {
	return base * 10;
}

if (total > base) {
	DCommon.print(total);
}

DCommon.print(readInside());
DCommon.print(describe());
DCommon.print(labels);
