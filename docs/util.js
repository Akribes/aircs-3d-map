const nameOrShortcode = function (name, shortcode) {
	return name ? `${name} <span class="shortcode">(${shortcode})</span>` : shortcode;
}

const comparePlatforms = function (a, b) {
	let matchA = /^([A-Z]*)(\d*)$/.exec(a),
		matchB = /^([A-Z]*)(\d*)$/.exec(b);

	return matchA[1].localeCompare(matchB[1]) || matchA[2] - matchB[2];
}

const cubicEaseInOut = function (a, b, t) {
	if (t <= (a + b) / 2) {
		return 4 * Math.pow((t - a) / (b - a), 3);
	} else {
		return 1 + 4 * Math.pow((t - b) / (b - a), 3);
	}
};

const cubicEaseInOutDerivative = function (a, b, t) {
	if (t <= (a + b) / 2) {
		return 12 * Math.pow(t - a, 2) / Math.pow(b - a, 3);
	} else {
		return 12 * Math.pow(t - b, 2) / Math.pow(b - a, 3);
	}
};

export {nameOrShortcode, comparePlatforms, cubicEaseInOut, cubicEaseInOutDerivative};
