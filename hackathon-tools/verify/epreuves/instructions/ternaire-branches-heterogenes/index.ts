import * as DCommon from "@duplojs/lang/common";

function produce(step: number) {
	return step === 0
		? 0
		: step === 1
			? "one"
			: step === 2
				? true
				: step === 3
					? [step]
					: step === 4
						? { step }
						: undefined;
}

DCommon.print(produce(0));
DCommon.print(produce(1));
DCommon.print(produce(2));
DCommon.print(produce(3));
DCommon.print(produce(4));
DCommon.print(produce(5));
