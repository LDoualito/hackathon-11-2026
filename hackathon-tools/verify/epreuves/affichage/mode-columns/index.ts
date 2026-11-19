import * as DCommon from "@duplojs/lang/common";

const rows = [
	{ name: "a", total: 1, hidden: true },
	{ name: "bb", total: 22, hidden: false },
];

DCommon.print(rows, { columns: ["name", "total"] });
DCommon.print(rows, { columns: [] });
DCommon.print(rows, { columns: ["missing"] });
DCommon.print(3, { columns: ["name"] });
