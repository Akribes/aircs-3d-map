export default (function () {
	const SPREADSHEET = "https://docs.google.com/spreadsheets/d/1KCrVmLrHPoyrF_7onE10wE8CdloQrHFbOcuzHb51BC8/gviz/tq?tqx=out:json&sheet=";

	return async function () {
		let stations_res = fetch(SPREADSHEET + "Stations"),
			platforms_res = fetch(SPREADSHEET + "Platforms");

		let stations_json = JSON.parse((await (await stations_res).text())
			.slice(47, -2))["table"];

		let data = {};
		const insertStation = function (shortcode, aircs_station, sqtr_station, clyrail_station, cx, cz, built_aircs, built_sqtr, racecs,
										pts, newmap, chataccouncements, newsigns, surveyed, connected2022) {
			data[shortcode] = {shortcode, aircs_station, platforms: {}, cx, cz};
		}
		for (let r of stations_json["rows"]) {
			if (r["c"][0] !== null) insertStation(...(r["c"].map(entry => entry === null ? null : entry["v"])));
		}

		let platforms_json = JSON.parse((await (await platforms_res).text()).slice(47, -2))["table"];
		const insertPlatform = (from, platform, to, type, service, speed, blocks, speed_multiplier, distance) => {
			data[from].platforms[platform] = {from, platform, to, type, service, speed, blocks, speed_multiplier, distance};
		}
		for (let r of platforms_json["rows"]) {
			if (r["c"][0] !== null) insertPlatform(...(r["c"].map(entry => entry === null ? null : entry["v"])));
		}

		// Filter out SQTR stations with no platforms
		for (let [shortcode, station] of Object.entries(data)) {
			if (Object.keys(station.platforms).length === 0) {
				delete data[shortcode];
			}
		}
		return data;
	};
})();
