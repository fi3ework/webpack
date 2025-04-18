/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const path = require("node:path");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */

/**
 * @extends {InitFragment<GenerateContext>}
 */
class RstestDirnameInitFragment extends InitFragment {
	/**
	 * @param {string} resource
	 */
	constructor(resource) {
		super(
			undefined,
			InitFragment.STAGE_ASYNC_DEPENDENCIES,
			0,
			"rstest-dependencies"
		);
		this.resource = resource;
	}

	// /**
	//  * @param {RstestDirnameInitFragment} other other AwaitDependenciesInitFragment
	//  * @returns {RstestDirnameInitFragment} AwaitDependenciesInitFragment
	//  */
	// merge(other) {
	// 	const promises = new Set(other.promises);
	// 	for (const p of this.promises) {
	// 		promises.add(p);
	// 	}
	// 	return new RstestDirnameInitFragment(promises);
	// }

	/**
	 * @param {GenerateContext} context context
	 * @returns {string | Source | undefined} the source code that will be included as initialization code
	 */
	getContent({ runtimeRequirements }) {
		return `const __filename = '${this.resource}'\nconst __dirname = '${path.dirname(
			this.resource
		)}'\n`;
	}
}

module.exports = RstestDirnameInitFragment;
