import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

function classify(value: number) {
	if (value < 0) {
		return DEither.left("negative", value);
	}
	if (value > 10) {
		return DEither.right("big", value);
	}
	return DEither.right("small", `${value}`);
}

const results = DArray.map([-5, 123, 4, 50], (value) => classify(value));

DCommon.print(DArray.filter(results, DEither.hasInformation("big")));
DCommon.print(DArray.filter(results, DEither.hasInformation(["negative", "small"])));
