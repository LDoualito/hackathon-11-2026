import * as DCommon from "@duplojs/lang/common";

const zero: number = 0;
const tenth: number = 0.1;
const huge: number = 1e308;

DCommon.print(-zero);
DCommon.print(zero / zero);
DCommon.print(1 / zero);
DCommon.print(-1 / zero);
DCommon.print(tenth + 0.2);
DCommon.print(huge * 10);
DCommon.print(huge / 1e287);
DCommon.print(tenth / 1e6);
DCommon.print(tenth / 1e5);
DCommon.print(5e-324);
DCommon.print(2 ** 53);
DCommon.print(123456789012345680000);
DCommon.print(1.7976931348623157e308);
