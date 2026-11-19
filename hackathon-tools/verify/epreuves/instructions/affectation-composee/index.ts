import * as DCommon from "@duplojs/lang/common";

function accumulate(limit: number) {
	let total = 0;
	total += limit;
	total -= 1;
	total *= 2;
	total /= 4;
	total++;
	total--;
	let text = "a";
	text += "b";
	return text + total.toString();
}

DCommon.print(accumulate(5));
