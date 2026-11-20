import * as DCommon from "@duplojs/lang/common";

function rank(value: number) {
	return value === 1
		? "a"
		: value === 2
			? "b"
			: value === 3
				? "c"
				: value === 4
					? "d"
					: value === 5
						? "e"
						: value === 6
							? "f"
							: "rest";
}

DCommon.print(rank(1));
DCommon.print(rank(4));
DCommon.print(rank(6));
DCommon.print(rank(7));
