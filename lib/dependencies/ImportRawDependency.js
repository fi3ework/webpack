/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ImportDependency = require("./ImportDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ReferencedExport} ReferencedExport */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../javascript/JavascriptParser").ImportAttributes} ImportAttributes */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */

class ImportRawDependency extends ImportDependency {
	/**
	 * @param {string} request the request
	 * @param {Range} range expression range
	 * @param {(string[][] | null)=} referencedExports list of referenced exports
	 * @param {ImportAttributes=} attributes import attributes
	 */
	constructor(request, range, referencedExports, attributes) {
		super(request, range, referencedExports, attributes);
	}

	get type() {
		return "import() raw";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(
	ImportRawDependency,
	"webpack/lib/dependencies/ImportRawDependency"
);

ImportRawDependency.Template = class ImportRawDependencyTemplate extends (
	ImportDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ runtimeTemplate, module, moduleGraph, chunkGraph, runtimeRequirements }
	) {}
};

module.exports = ImportRawDependency;
