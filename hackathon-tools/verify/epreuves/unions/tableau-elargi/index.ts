import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const fails = DArray.map([1, 2, 3], () => DEither.fail());

const numbers = DArray.map([1, 2, 3], (value) => DEither.success(value));

const texts = DArray.map(["a", "b"], (value) => DEither.success(value));

function countRights(results: readonly (DEither.Success<number> | DEither.Fail)[]) {
	return DArray.length(DArray.filter(results, DEither.isRight));
}

function countAll(results: readonly (DEither.Success<number> | DEither.Success<string> | DEither.Fail)[]) {
	return DArray.length(results);
}

DCommon.print(countRights(fails));
DCommon.print(countRights(numbers));
DCommon.print(countAll(fails));
DCommon.print(countAll(numbers));
DCommon.print(countAll(texts));
DCommon.print(countAll([...numbers, ...texts, ...fails]));
