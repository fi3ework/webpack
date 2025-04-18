/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const Dependency = require("../Dependency");
const InitFragment = require("../InitFragment");
const makeSerializable = require("../util/makeSerializable");
const RstestDirnameInitFragment = require("./RstestDirnameInitFragment");
const NullDependency = require("../dependencies/NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency").ReferencedExport} ReferencedExport */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

/**
 * @param {string[]|null} path the property path array
 * @returns {string} the converted path
 */
const pathToString = path =>
	path !== null && path.length > 0
		? path.map(part => `[${JSON.stringify(part)}]`).join("")
		: "";

class RstestDependency extends NullDependency {
	/**
	 * @param {Range} range range
	 */
	constructor(range) {
		super();
		this.range = range;
	}

	get type() {
		return "rstest";
	}

	get category() {
		return "esm";
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.identifier);
		write(this.ids);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.identifier = read();
		this.ids = read();
		super.deserialize(context);
	}
}

makeSerializable(RstestDependency, "webpack/lib/rstest/RstestDependency");

class RstestDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{
			module,
			runtime,
			runtimeTemplate,
			moduleGraph,
			chunkGraph,
			initFragments,
			runtimeRequirements
		}
	) {
		initFragments.push(
			new RstestDirnameInitFragment(module?.resource || "__NO_NO_NO__")
		);
	}
}

RstestDependency.Template = RstestDependencyTemplate;

module.exports = RstestDependency;
