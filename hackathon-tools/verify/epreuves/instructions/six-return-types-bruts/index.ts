import * as DCommon from "@duplojs/lang/common";

function produce(step: number) {
	if (step === 0) {
		return 0;
	}
	if (step === 1) {
		return "one";
	}
	if (step === 2) {
		return true;
	}
	if (step === 3) {
		return [step];
	}
	if (step === 4) {
		return { step };
	}
	return undefined;
}

DCommon.print(produce(0));
DCommon.print(produce(1));
DCommon.print(produce(2));
DCommon.print(produce(3));
DCommon.print(produce(4));
DCommon.print(produce(5));
