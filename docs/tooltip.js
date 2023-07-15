const stationTooltip = function (shortcode, name) {
	document.body.style.cursor = "pointer";
	document.getElementById("tooltip").style.visibility = "visible";
	document.getElementById("tooltip").innerHTML = `
<h3>● ${name}</h3>
<p>Station</p>
	`;
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
