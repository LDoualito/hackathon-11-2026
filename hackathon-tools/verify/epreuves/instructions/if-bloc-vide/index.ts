import * as DCommon from "@duplojs/lang/common";

function check(label: string) {
	DCommon.print(label);
	return true;
}

if (check("evaluated")) {
}

if (check("again")) {
} else {
	DCommon.print("never");
}

DCommon.print("done");
