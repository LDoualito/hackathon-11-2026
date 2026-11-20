import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";
import * as DArray from "@duplojs/lang/array";

function chain(start: number) {
	return DEither.rightPipe(
		start === 1 ? DEither.left("a-number", start) : DEither.success(DString.to(start)),
		(text) => start === 2 ? DEither.left("b-text", text) : DEither.success(start > 0),
		(flag) => start === 3 ? DEither.left("c-flag", flag) : DEither.success([start, start]),
		(values) => start === 4 ? DEither.left("d-list", values) : DEither.success({ count: values.length }),
		(record) => start === 5 ? DEither.fail() : DEither.success(record.count),
		(count) => start === 6 ? DEither.left("f-record", { count }) : DEither.success(count * 2),
	);
}

const inputs = [1, 2, 3, 4, 5, 6, 7];

const results = DArray.map(inputs, (start) => chain(start));

DCommon.print(results);

const messages = DArray.map(
	results,
	(result) => DEither.matchInformation(
		result,
		{
			"a-number": (value) => `a ${DString.to(value)}`,
			"b-text": (text) => `b ${text}`,
			"c-flag": (flag) => `c ${DString.to(flag)}`,
			"d-list": (values) => `d ${DString.to(values.length)}`,
			fail: () => "e",
			"f-record": (record) => `f ${DString.to(record.count)}`,
			success: (value) => `ok ${DString.to(value)}`,
		},
	),
);

DCommon.print(messages);
