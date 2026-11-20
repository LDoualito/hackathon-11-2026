import * as DCommon from "@duplojs/lang/common";

const memoized = DCommon.memo(() => 42);

DCommon.print(memoized);
DCommon.print(memoized.value);
DCommon.print(memoized);
