import * as THREE from 'three';

const GRAVITY = 0.2;
const NOT_ADJACENT = 1.2;
const NOT_ADJACENT_THRESHOLD = 8;
const ADJACENT = 0.12;
const ADJACENT_TARGET_DIST = 5

// Given a list of 2D coordinates and an adjacency matrix, return new coordinates for a better drawing, according to
// three rules: (1) all points are moved towards (0, 0), (2) adjacent points are moved to a target distance from each
// other and (3) non-adjacent points are moved away from each other if they are close
export function step(points, adjacent) {
	let next = points.map(x => x.clone());

	for (let i = 0; i < points.length; i++) {
		next[i].sub(next[i].clone().setLength(GRAVITY));
	}

	for (let i = 0; i < points.length; i++) {
		for (let j = 0; j < i; j++) {
			let diff = new THREE.Vector2().subVectors(points[j], points[i]).normalize();
			let dist = points[i].distanceTo(points[j]);

			if (adjacent[i][j]) {
				diff.multiplyScalar(ADJACENT * (ADJACENT_TARGET_DIST - dist));
				next[j].add(diff);
				next[i].sub(diff);
			} else {
				if (dist <= NOT_ADJACENT_THRESHOLD) {
					diff.multiplyScalar(NOT_ADJACENT / dist ** 1.5);
					next[j].add(diff);
					next[i].sub(diff);
				}
			}
		}
	}

	return next;
}
