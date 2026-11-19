import * as DEither from "@duplojs/lang/either";
import * as DCommon from "@duplojs/lang/common";
import * as DArray from "@duplojs/lang/array";

const empty: (DEither.Success<number> | DEither.Fail)[] = [];
const onlyLefts = [DEither.fail(), DEither.left("refused", 1), DEither.none()];
const onlyRights = [DEither.success(1), DEither.success(2)];

DCommon.print(empty);
DCommon.print(DArray.filter(empty, DEither.isRight));
DCommon.print(onlyLefts);
DCommon.print(DArray.filter(onlyLefts, DEither.isRight));
DCommon.print(onlyRights);
DCommon.print(DArray.filter(onlyRights, DEither.isLeft));
