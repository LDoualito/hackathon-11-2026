import * as DCommon from "@duplojs/lang/common";

function double(value: number) {
	return value * 2;
}

function fromProperty(box: { value: number | undefined }) {
	if (box.value !== undefined) {
		return double(box.value);
	}
	return 0;
}

function fromBinding({ value }: { value: number | undefined }) {
	if (value !== undefined) {
		return double(value);
	}
	return 0;
}

DCommon.print(fromProperty({ value: 2 }));
DCommon.print(fromBinding({ value: 3 }));
