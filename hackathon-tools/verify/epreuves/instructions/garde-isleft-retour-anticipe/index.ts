import * as DCommon from "@duplojs/lang/common";
import * as DEither from "@duplojs/lang/either";

function parse(value: number) {
	if (value < 0) {
		return DEither.left("negative", value);
	}
	return DEither.success(value);
}

function label(value: number) {
	if (value > 100) {
		return DEither.left("too-big", "limit");
	}
	return DEither.success(value.toString());
}

function run(value: number) {
	const parsed = parse(value);
	if (DEither.isLeft(parsed)) {
		return parsed;
	}
	const labelled = label(DEither.unwrapRight(parsed));
	if (DEither.isLeft(labelled)) {
		return labelled;
	}
	return DEither.success(DEither.unwrapRight(labelled).length);
}

DCommon.print(run(-1));
DCommon.print(run(1000));
DCommon.print(run(42));
