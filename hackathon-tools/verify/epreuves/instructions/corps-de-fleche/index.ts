import * as DCommon from "@duplojs/lang/common";

const classify = (value: number) => {
	const doubled = value * 2;
	if (doubled > 10) {
		return "big";
	}
	return "small";
};

const announce = (label: string) => {
	DCommon.print(label);
};

announce(classify(3));
announce(classify(8));
