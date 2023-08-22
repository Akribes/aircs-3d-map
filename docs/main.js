import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

import fetchData from './data.js'
import * as tooltip from "./tooltip.js";
import {cubicEaseInOut, cubicEaseInOutDerivative, nameOrShortcode} from "./util.js";

String.prototype.hashCode = function() {
	let hash = 0,
		i, chr;
	if (this.length === 0) return hash;
	for (i = 0; i < this.length; i++) {
		chr = this.charCodeAt(i);
		hash = ((hash << 5) - hash) + chr;
		hash |= 0;
	}
	return hash;
};

window.AirCS = {
	pointer: new THREE.Vector2(),
	materials: {
		floor: new THREE.MeshLambertMaterial({side: THREE.DoubleSide, color: 0xc0c0c0}),
		lines: {
			X: new THREE.MeshBasicMaterial({color: 0}),
			Y: new THREE.MeshBasicMaterial({color: 0xcc4400}),
			A: new THREE.MeshBasicMaterial({color: 0x3377aa})
		}
	},
	gltf: new GLTFLoader()
};

AirCS.scene = new THREE.Scene();
AirCS.scene.background = new THREE.Color(0xffffff)
AirCS.scene.fog = new THREE.Fog(AirCS.scene.background, 1, 500);

AirCS.renderer = new THREE.WebGLRenderer({antialias: true});
AirCS.renderer.shadowMap.enabled = true;
AirCS.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
AirCS.renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(AirCS.renderer.domElement);

AirCS.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
AirCS.camera.position.set(0, 25, 50);

AirCS.controls = new OrbitControls(AirCS.camera, AirCS.renderer.domElement);
AirCS.controls.enableDamping = true;
AirCS.controls.screenSpacePanning = false;
AirCS.controls.maxPolarAngle = 0.49 * Math.PI;

window.addEventListener('resize', function () {
	AirCS.camera.aspect = window.innerWidth / window.innerHeight;
	AirCS.camera.updateProjectionMatrix();
	AirCS.renderer.setSize(window.innerWidth, window.innerHeight);
});

// Floor
AirCS.floor = (function () {
	let geometry = new THREE.CircleGeometry(1000, 32);
	geometry.rotateX(Math.PI / 2);
	return new THREE.Mesh(geometry, AirCS.materials.floor);
})();
AirCS.floor.receiveShadow = true;
AirCS.scene.add(AirCS.floor);

// Lighting
AirCS.hemiLight = new THREE.HemisphereLight(0xffffff, 0xf0f0f0, 0.2);
AirCS.scene.add(AirCS.hemiLight);

AirCS.dirLight = new THREE.DirectionalLight(0xffffff, 1);
AirCS.dirLight.position.set(0, 100, 100);
AirCS.dirLight.castShadow = true;
AirCS.dirLight.shadow.mapSize.width = 512;
AirCS.dirLight.shadow.mapSize.height = 512;
AirCS.dirLight.shadow.camera.near = 0.5;
AirCS.dirLight.shadow.camera.far = 1000;
AirCS.scene.add(AirCS.dirLight);

AirCS.raycaster = new THREE.Raycaster();

AirCS.clock = new THREE.Clock();
AirCS.clock.start();

// Fetch data
AirCS.stations = await fetchData();

// Create models for stations and lines.
const createModels = function () {
	let stationGeometry = new THREE.SphereGeometry(0.2, 32, 16),
		stationMaterial = new THREE.MeshLambertMaterial({color: 0xff0000}),
		lineGeometries = {
			X: new THREE.BoxGeometry(0.15, 1, 0.001).rotateX(Math.PI / -2),
			Y: new THREE.BoxGeometry(0.15, 1, 0.002).rotateX(Math.PI / -2),
			A: new THREE.BoxGeometry(0.15, 1, 0.003).rotateX(Math.PI / -2)
		};

	AirCS.lines = [];
	let remainingStations = [];
	for (let station of Object.values(AirCS.stations)) {
		let stationMesh = new THREE.Mesh(stationGeometry, stationMaterial);
		stationMesh.rotateY(Math.random() * Math.PI * 2);
		stationMesh.castShadow = true;
		stationMesh.receiveShadow = true;
		stationMesh.userData.AirCSStation = station;

		// Load landmark model if there is one
		if ([
			"DLA", "III", "LD", "MSA", "UFO", "WOVR", "YAV"
		].includes(station.shortcode)) {
			AirCS.gltf.load(`./models/${station.shortcode}.glb`, function (x) {
				stationMesh.add(x.scene);
			}, function (xhr) {
				console.log(station.shortcode, (xhr.loaded / xhr.total * 100) + "% loaded");
			}, function (err) {
				console.log("Error loading model for", station.shortcode, err);
			});
		}

		AirCS.scene.add(stationMesh);
		station.mesh = stationMesh;
		if (station.cx || station.cz) {
			station.mesh.position.set(station.cx / 100, 0, station.cz / 100);
		} else {
			remainingStations.push(station);
		}
		station.acceleration = new THREE.Vector3();
		station.velocity = new THREE.Vector3();
		station.update = function (time) {
			this.velocity.addScaledVector(this.acceleration, time);
			this.mesh.position.addScaledVector(this.velocity, time);
			return this.velocity.multiplyScalar(time).lengthSq();
		}
	}

	let i = 0;
	while (remainingStations.length > 0 && i < 10) {
		let newRemainingStations = [];
		for (let station of remainingStations) {
			let neighbours = Object.values(station.platforms)
				.map(p => AirCS.stations[p.to].mesh.position)
				.filter(pos => pos.lengthSq() > 0);
			if (neighbours.length > 0) {
				station.mesh.position.copy(neighbours.reduce((acc, x) => acc.add(x),
						new THREE.Vector3()).divideScalar(neighbours.length));
				let hashcode = station.shortcode.hashCode();
				station.mesh.position.add(new THREE.Vector3(0.1 * Math.cos(hashcode), 0, 0.1 * Math.sin(hashcode)));
			} else {
				newRemainingStations.push(station);
			}
		}
		remainingStations = newRemainingStations;
		i += 1;
	}

	for (let [shortcode, station] of Object.entries(AirCS.stations)) {
		for (let platform of Object.values(station.platforms)) {
			if (!AirCS.lines.some(line => line.a === platform.to && line.b === shortcode)) {
				let otherPlatform = Object.values(AirCS.stations[platform.to].platforms).find(p => p.to === shortcode);
				if (!otherPlatform) {
					console.log(`There's no platform from ${platform.to} back to ${shortcode}! Is the Distances sheet broken?`);
					otherPlatform = {platform: "?"};
				}
				let line = {
					a: shortcode,
					aPlatform: platform.platform,
					b: platform.to,
					bPlatform: otherPlatform.platform,
					type: platform.type,
					service: platform.service,
					mesh: new THREE.Mesh(lineGeometries[platform.type],
						AirCS.materials.lines[platform.type] || AirCS.materials.lines.X),
					update: function () {
						// Move this plane between the stations and rotate and scale it so that it reaches both
						let a = AirCS.stations[this.a].mesh.position,
							b = AirCS.stations[this.b].mesh.position;
						this.mesh.position.addVectors(a, b).divideScalar(2);
						this.mesh.position.y = 0.001;
						this.mesh.lookAt(a);
						this.mesh.scale.z = a.distanceTo(b);
					}
				};
				line.mesh.userData.AirCSLine = line; // So we can figure out what line a mesh is when raycasting
				AirCS.scene.add(line.mesh);
				line.update();
				AirCS.lines.push(line);
			}
		}
	}
};
createModels();

// Move the stations so that their mean position on the map is (0, 0, 0).
const balance = function () {
	let mean = new THREE.Vector3();
	for (let position of Object.values(AirCS.stations).map(s => s.mesh.position)) {
		mean.add(position);
	}
	mean.divideScalar(Object.keys(AirCS.stations).length);
	for (let position of Object.values(AirCS.stations).map(s => s.mesh.position)) {
		position.sub(mean);
	}
}

// Try to find a good graph drawing of the network by pulling all neighbours towards each other and pushing every pair
// of stations away from each other. Also, apply some force towards the centre of the world so that stations don't drift
// off. Returns the mean square position change of the stations.
const physics = function (dt) {
	const SEPARATE = 600; // Push away vertices from each other
	const SEPARATE_RADIUS = 15; // Vertices affect each other within this distance
	const NEIGHBOURS = 600; // Pull neighbours towards each other
	const NEIGHBOURS_DISTANCE = 5; // Target distance between neighbours
	const GRAVITY = 0.01; // Pull everything towards the centre of the world slightly

	for (let me of Object.values(AirCS.stations)) {
		let f_res = new THREE.Vector3(0, 0, 0);
		for (let [yourShortcode, you] of Object.entries(AirCS.stations)) {
			let diff = new THREE.Vector3().subVectors(you.mesh.position, me.mesh.position);
			let distance = diff.length();
			if (distance > 0) {
				let direction = diff.normalize();
				f_res.addScaledVector(direction, -1 * SEPARATE * Math.max(0, 1 - distance / SEPARATE_RADIUS));

				if (Object.values(me.platforms).map(p => p.to).includes(yourShortcode)) {
					f_res.addScaledVector(direction, NEIGHBOURS * Math.max(distance - NEIGHBOURS_DISTANCE, 0));
				}

				f_res.addScaledVector(me.mesh.position, -1 * GRAVITY);
			}
		}
		me.acceleration = f_res;
	}

	let movement = 0;
	for (let station of Object.values(AirCS.stations)) {
		movement += station.update(dt);
	}
	for (let line of AirCS.lines) {
		line.update();
	}
	return movement / Object.keys(AirCS.stations).length;
}

console.log("Loaded", Object.keys(AirCS.stations).length, "stations, ", AirCS.lines.length, "lines");

AirCS.viewStation = function (station) {
	AirCS.cameraSliding = {
		startTime: AirCS.clock.elapsedTime,
		endTime: AirCS.clock.elapsedTime + 1,
		targetPosition: station.mesh.position,
		cameraPosition: new THREE.Vector3(0, 3, 4).add(station.mesh.position)
	};
};

// Searching
const search = function () {
	let query = this.value.toUpperCase();
	let results = Object.values(AirCS.stations)
		.filter(station => station.shortcode.includes(query) || station.aircs_station && station.aircs_station.toUpperCase().includes(query));
	let resultsElement = document.getElementById("results");
	resultsElement.innerHTML = "";
	for (let r of results) {
		let item = document.createElement("li");
		item.className = "result";
		item.tabIndex = 0; // Make it tabbable, and also cause it to appear as a relatedTarget in blur events
		let that = this;
		item.addEventListener("click", function (e) {
			that.value = r.aircs_station || r.shortcode;
			AirCS.viewStation(r);
			resultsElement.innerHTML = "";
		});
		item.innerHTML = nameOrShortcode(r.aircs_station, r.shortcode);
		resultsElement.appendChild(item);
	}
	if (results.length === 0) {
		resultsElement.innerHTML = "<li><i>No stations found</i></li>";
	}
};

document.getElementById("search").addEventListener("input", search);
document.getElementById("search").addEventListener("focusin", search);
document.getElementById("search").addEventListener("focusout", function (event) {
	// Hide the search results, unless one of the search results gained focus.
	let resultsElement = document.getElementById("results");
	if (!resultsElement.contains(event.relatedTarget)) {
		resultsElement.innerHTML = "";
	}
});

// Dark mode
AirCS.darkMode = (function () {
	let dark = false,
		applyBackground = function (colour) {
			AirCS.scene.background.setHex(colour);
			AirCS.scene.fog.color.setHex(colour);
		},
		applyFloor = function (colour) {
			AirCS.materials.floor.color.setHex(colour);
		},
		applyXLine = function (colour) {
			AirCS.materials.lines.X.color.setHex(colour);
		},
		apply = function () {
			if (dark) {
				document.getElementById("swap").setAttribute("href", "css/dark.css");
				applyBackground(0x2c2c2c);
				applyFloor(0x1c1c1c);
				applyXLine(0xd3d3d3);
			} else {
				document.getElementById("swap").setAttribute("href", "css/light.css");
				applyBackground(0xffffff);
				applyFloor(0xc0c0c0);
				applyXLine(0);
			}
		};
	return {
		get: function () { return dark; },
		set: function (darkMode) { dark = darkMode; apply(); },
		toggle: function () { dark = !dark; apply(); }
	};
})();
document.getElementById("darkModeSwitch").addEventListener("click", AirCS.darkMode.toggle);

AirCS.raycastPointer = function () {
	AirCS.raycaster.setFromCamera(AirCS.pointer, AirCS.camera)
	const intersects = AirCS.raycaster.intersectObjects(AirCS.scene.children);
	let lineIntersect, stationIntersect;
	for (let intersect of intersects) {
		// We're mostly interested in stations and not so much in lines
		if (intersect.object.userData.hasOwnProperty("AirCSStation")) {
			stationIntersect = intersect.object.userData.AirCSStation;
			break;
		}
		if (!stationIntersect && intersect.object.userData.hasOwnProperty("AirCSLine")) {
			lineIntersect = intersect.object.userData.AirCSLine;
			// Don't break yet, maybe we'll find a station
		}
	}
	if (stationIntersect) {
		AirCS.renderer.domElement.style.cursor = "pointer";
		tooltip.targetStation(stationIntersect);
	} else if (lineIntersect) {
		AirCS.renderer.domElement.style.cursor = "pointer";
		tooltip.targetLine(lineIntersect);
	} else {
		AirCS.renderer.domElement.style.cursor = "auto";
		tooltip.removeTarget();
	}
};

// Register pointer movement to use for showing information popups
const handlePointerEvents = function (e) {
	AirCS.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
	AirCS.pointer.y = - (e.clientY / window.innerHeight) * 2 + 1;
}
window.addEventListener("pointermove", handlePointerEvents, true);
window.addEventListener("pointerdown", handlePointerEvents, true);
window.addEventListener("pointerup", handlePointerEvents, true);

tooltip.addEventListenersTo(AirCS.renderer.domElement);

// Main loop
const animate = function () {
	// Camera sliding
	let dt = AirCS.clock.getDelta();
	if (AirCS.cameraSliding) {
		tooltip.unfreeze();
		let y = cubicEaseInOut(AirCS.cameraSliding.startTime, AirCS.cameraSliding.endTime, AirCS.clock.elapsedTime),
			dy = dt * cubicEaseInOutDerivative(AirCS.cameraSliding.startTime, AirCS.cameraSliding.endTime, AirCS.clock.elapsedTime),
			targetDir = new THREE.Vector3().subVectors(AirCS.cameraSliding.targetPosition, AirCS.controls.target).divideScalar(1 - y),
			cameraDir = new THREE.Vector3().subVectors(AirCS.cameraSliding.cameraPosition, AirCS.camera.position).divideScalar(1 - y);
		AirCS.controls.target.addScaledVector(targetDir, dy);
		AirCS.camera.position.addScaledVector(cameraDir, dy);
		if (AirCS.cameraSliding.endTime <= AirCS.clock.elapsedTime) {
			AirCS.controls.target.copy(AirCS.cameraSliding.targetPosition);
			AirCS.camera.position.copy(AirCS.cameraSliding.cameraPosition);
			delete AirCS.cameraSliding;
		}
	}

	AirCS.controls.update();
	
	// Render
	AirCS.renderer.render(AirCS.scene, AirCS.camera);
	requestAnimationFrame(animate);
}
animate();

// Run physics separately, we don't want to wait for animation frames
const process = function () {
	let i = 0;
	return function () {
		i += 1;
		let movement = physics(1 / 60);
		balance();
		if (movement >= 0.0105 / 60) {
			setTimeout(process);
		}
	}
}();
process();
