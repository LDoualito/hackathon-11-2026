import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";
import * as DArray from "@duplojs/lang/array";

function classify(value: number) {
	if (value === 0) {
		return DEither.right("a-number", value);
	}
	if (value === 1) {
		return DEither.right("b-text", "one");
	}
	if (value === 2) {
		return DEither.right("c-flag", true);
	}
	if (value === 3) {
		return DEither.right("d-list", [value, value]);
	}
	if (value === 4) {
		return DEither.right("e-record", { value });
	}
	return DEither.success(value);
}

const inputs = [0, 1, 2, 3, 4, 5];

const results = DArray.map(inputs, (value) => classify(value));

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
			"e-record": (record) => `e ${DString.to(record.value)}`,
			success: (value) => `ok ${DString.to(value)}`,
		},
	),
);

DCommon.print(messages);
