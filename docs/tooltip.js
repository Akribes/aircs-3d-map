import {comparePlatforms, nameOrShortcode} from "./util.js";

let element = document.getElementById("tooltip"),
	frozen = false,
	targetType,
	target,
	show = function () { element.style.visibility = "visible"; },
	hide = function () { element.style.visibility = "hidden"; },
	isVisible = function () { return element.style.visibility === "visible"; },
	update = function () {
        AirCS.raycastPointer();
		switch (targetType) {
			case "station":
				let title = `● ${nameOrShortcode(target.aircs_station, target.shortcode)}`;
				let platformsTable = document.createElement("table");
				platformsTable.insertAdjacentHTML("beforeend", "<tr><th>Platform</th><th>Destination</th></tr>");
				for (let platform of Object.values(target.platforms).sort((a, b) => comparePlatforms(a.platform, b.platform))) {
					let tr = document.createElement("tr");
					tr.insertAdjacentHTML("beforeend",
						`<td class="platform ${platform.type}">${platform.platform}</td>`);
					let stationTd = document.createElement("td");
					let stationA = document.createElement("a");
					stationA.setAttribute("href", "#");
					stationA.addEventListener("click", () => AirCS.viewStation(AirCS.stations[platform.to]));
					stationA.innerHTML = nameOrShortcode(AirCS.stations[platform.to].aircs_station, platform.to);
					stationTd.appendChild(stationA);
					tr.appendChild(stationTd);
					platformsTable.appendChild(tr);
				}
				element.innerHTML = `<h3>${title}</h3><p>Station</p><hr>`;
				element.appendChild(platformsTable);
				show();
				break;
			case "line":
				element.innerHTML = `<h3 class="${target.type}">⇢ ${target.a}&ndash;${target.b}</h3><p>AirCS ${target.service}</p>`;
				show();
				break;
			default:
				hide();
		}
	};

export function unfreeze () {
	update();
	frozen = false;
}

export function addEventListenersTo(domElement) {
	domElement.addEventListener("pointerdown", function (event) {
		element.style.left = event.clientX + "px";
		element.style.top = event.clientY + "px";
		unfreeze();
	});
	domElement.addEventListener("pointerup", function (event) {
		element.style.left = event.clientX + "px";
		element.style.top = event.clientY + "px";
		update();
		frozen = isVisible();
	});
	domElement.addEventListener("wheel", unfreeze);

	// Add this to window instead of the renderer, in case the mouse moves over the tooltip when it's not frozen
	window.addEventListener("pointermove", function (event) {
		if (!frozen) {
			element.style.left = event.clientX + "px";
			element.style.top = event.clientY + "px";
			update();
		}
	});
}

export function targetStation (station) {
	targetType = "station";
	target = station;
}

export function targetLine (line) {
	targetType = "line";
	target = line;
}

export function removeTarget () {
	targetType = null;
}
