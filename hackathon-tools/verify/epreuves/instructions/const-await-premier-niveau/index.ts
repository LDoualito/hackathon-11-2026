import * as DCommon from "@duplojs/lang/common";

async function load(value: number) {
	return value + 1;
}

const loaded = await load(1);

DCommon.print(loaded);
