import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";

type AddResult = DEither.Success<number> | DEither.Left<"negative", string>;
type AddValue = DEither.GetValue<AddResult>;
type AddInformation = DEither.GetInformation<AddResult>;
type AddFailure = Extract<AddResult, DEither.Left>;

function add(one: number, two: number): AddResult {
	return one < 0 ? DEither.left("negative", "negative") : DEither.success(one + two);
}

function find(value: number): DEither.Maybe<number> {
	return value === 0 ? DEither.none() : DEither.some(value);
}

function failure(result: AddResult): AddFailure | undefined {
	return DEither.isLeft(result) ? result : undefined;
}

const value: AddValue = "negative";
const information: AddInformation = "success";

DCommon.print(add(1, 2));
DCommon.print(failure(add(-1, 2)));
DCommon.print(failure(add(1, 2)));
DCommon.print(find(0));
DCommon.print(find(1));
DCommon.print(value);
DCommon.print(information);
