import * as DCommon from "@duplojs/lang/common";

const piped = DCommon.pipe(
	[1, 2],
	DCommon.print,
);

DCommon.print(piped);

const tapped = DCommon.pipe(
	"texte",
	DCommon.tap(DCommon.print),
);

DCommon.print(tapped);
