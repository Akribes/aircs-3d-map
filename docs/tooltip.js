import {comparePlatforms, nameOrShortcode} from "./util.js";

let element = document.getElementById("tooltip"),
	frozen = false,
	targetType,
	target,
	show = function () { element.style.visibility = "visible"; },
	hide = function () { element.style.visibility = "hidden"; },
	isVisible = function () { return element.style.visibility === "visible"; },
	update = function () {
		switch (targetType) {
			case "station":
				let title = `● ${nameOrShortcode(target.aircs_station, target.shortcode)}`;
				let platforms = "<tr><th>Platform</th><th>Destination</th></tr>";
				for (let platform of Object.values(target.platforms).sort((a, b) => comparePlatforms(a.platform, b.platform))) {
					platforms += `<tr><td class="platform ${platform.type}">${platform.platform}</td>` +
						`<td>${nameOrShortcode(AirCS.stations[platform.to].aircs_station, platform.to)}</td></tr>`;
				}
				element.innerHTML = `<h3>${title}</h3><p>Station</p><hr><table>${platforms}</table>`;
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
	domElement.addEventListener("pointermove", function (event) {
		if (!frozen) {
			element.style.left = event.clientX + "px";
			element.style.top = event.clientY + "px";
			update();
		}
	});
	domElement.addEventListener("mousedown", function (event) {
		element.style.left = event.clientX + "px";
		element.style.top = event.clientY + "px";
		unfreeze();
	});
	domElement.addEventListener("mouseup", function (event) {
		element.style.left = event.clientX + "px";
		element.style.top = event.clientY + "px";
		update();
		frozen = isVisible();
	});
	domElement.addEventListener("wheel", unfreeze);
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
