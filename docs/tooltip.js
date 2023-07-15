const nameOrShortcode = function (name, shortcode) {
	return name ? `${name} <span class="shortcode">(${shortcode})</span>` : shortcode;
}

const comparePlatforms = function (a, b) {
	let matchA = /^([A-Z]*)(\d*)$/.exec(a),
		matchB = /^([A-Z]*)(\d*)$/.exec(b);

	return matchA[1].localeCompare(matchB[1]) || matchA[2] - matchB[2];
}

const stationTooltip = function (station) {
	document.body.style.cursor = "pointer";
	document.getElementById("tooltip").style.visibility = "visible";
	let title = `● ${nameOrShortcode(station.aircs_station, station.shortcode)}`;
	let platforms = "<tr><th>Platform</th><th>Destination</th></tr>";
	for (let platform of Object.values(station.platforms).sort((a, b) => comparePlatforms(a.platform, b.platform))) {
		platforms += `<tr><td class="platform ${platform.type}">${platform.platform}</td><td>${nameOrShortcode(AirCS.stations[platform.to].aircs_station, platform.to)}</td></tr>`;
	}
	document.getElementById("tooltip").innerHTML = `<h3>${title}</h3><p>Station</p><hr><table>${platforms}</table>`;
}

const lineTooltip = function (from, to, type, service) {
	//document.body.style.cursor = "pointer";
	document.getElementById("tooltip").style.visibility = "visible";
	document.getElementById("tooltip").innerHTML = `
<h3 class="${type}">⇢ ${from}&ndash;${to}</h3>
<p>AirCS ${service}</p>
`;
}

const hideTooltip = function () {
	document.getElementById("tooltip").style.visibility = "hidden";
	document.body.style.cursor = "auto";
}

export {stationTooltip, lineTooltip, hideTooltip};
