import * as DCommon from "@duplojs/lang/common";

function late() {
	function read() {
		return local;
	}
	const local = 1;
	return read();
}

function run() {
	function read() {
		return local;
	}
	const early = read();
	DCommon.print(1);
	const local = 2;
	DCommon.print(2);
	return early + local;
}

DCommon.print(late());
DCommon.print(run());
