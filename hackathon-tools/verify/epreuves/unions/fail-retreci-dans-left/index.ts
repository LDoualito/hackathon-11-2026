import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DString from "@duplojs/lang/string";

function label(value: number): DEither.Success<string> | DEither.Fail {
	if (value < 0) {
		return DEither.fail();
	}
	return DEither.success(DString.to(value));
}

function wrap(value: number) {
	const labelled = label(value);
	if (DEither.isLeft(labelled)) {
		return DEither.left("wrapped", labelled);
	}
	return labelled;
}

function count(input: DEither.Success<number> | DEither.Fail) {
	return DEither.isLeft(input) ? 0 : 1;
}

const result = wrap(-1);

DCommon.print(result);

DCommon.print(
	DEither.matchInformation(
		result,
		{
			wrapped: (inner) => count(inner),
			success: () => 2,
		},
	),
);
