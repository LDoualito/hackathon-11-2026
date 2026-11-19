import * as DCommon from "@duplojs/lang/common";

function announce(label: string) {
	DCommon.print(label);
	DCommon.print(label.length);
}

announce("first");
announce("");
