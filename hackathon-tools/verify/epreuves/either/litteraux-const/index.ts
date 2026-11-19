import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

function literal() {
	return DEither.success(42);
}

function list() {
	return DEither.right("list", [1, 2]);
}

function record() {
	return DEither.success({
		name: "a",
		tags: ["x", "y"],
	});
}

function leftRecord() {
	return DEither.left("rejected", {
		code: 7,
		reasons: ["x"],
	});
}

DCommon.print(literal());
DCommon.print(list());
DCommon.print(record());
DCommon.print(leftRecord());
