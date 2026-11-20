import * as DCommon from "@duplojs/lang/common";

const value = 1;

{
	const value = 2;
	DCommon.print(value);
	{
		DCommon.print(value + 1);
	}
}

function scoped() {
	{
		const inner = 4;
		DCommon.print(inner);
	}
	{
	}
	return 5;
}

DCommon.print(value);
DCommon.print(scoped());
