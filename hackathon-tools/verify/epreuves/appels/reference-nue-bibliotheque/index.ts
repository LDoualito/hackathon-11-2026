import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";
import * as DString from "@duplojs/lang/string";

const values = [1, 2, 3];

DCommon.print(DArray.map(values, DString.to));

const results = DArray.map(values, DEither.success);

DCommon.print(results);
DCommon.print(DArray.filter(results, DEither.isRight));

const toText = DString.to;

DCommon.print(toText(4));

const handlers = {
	success: DString.to,
};

DCommon.print(handlers.success(5));
