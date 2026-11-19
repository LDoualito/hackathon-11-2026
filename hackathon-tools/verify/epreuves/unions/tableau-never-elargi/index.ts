import * as DCommon from "@duplojs/lang/common";

function none() {
	return [];
}

const empty = none();
const numbers: number[] = empty;
const texts: string[] = empty;

numbers.push(1);

DCommon.print(empty.length);
DCommon.print(texts);
