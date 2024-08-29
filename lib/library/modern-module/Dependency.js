/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../../util/makeSerializable");
const CachedConstDependency = require("../../dependencies/CachedConstDependency");
const ModuleDependency = require("../../dependencies/ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../../Dependency")} Dependency */
/** @typedef {import("../../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../../javascript/JavascriptModulesPlugin").ChunkRenderContext} ChunkRenderContext */
/** @typedef {import("../../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../../util/Hash")} Hash */

class ExternalModuleImportDependency extends ModuleDependency {
	/**
	 * @param {string} request the request
	 * @param {string| string[]} targetRequest the original request
	 * @param {Range} range expression range
	 */
	constructor(request, targetRequest, range) {
		super(request);
		this.request = request;
		this.targetRequest = targetRequest;
		this.range = range;
	}

	// /**
	//  * @returns {string} hash update
	//  */
	// _createHashUpdate() {
	// 	return `${this.importedModule}${JSON.stringify(this.specifiers)}${
	// 		this.default || "null"
	// 	}${super._createHashUpdate()}`;
	// }

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		super.serialize(context);
		const { write } = context;
		write(this.importedModule);
		write(this.specifiers);
		write(this.default);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		super.deserialize(context);
		const { read } = context;
		this.importedModule = read();
		this.specifiers = read();
		this.default = read();
	}
}

makeSerializable(
	ExternalModuleImportDependency,
	"webpack/lib/dependencies/ModuleImportDependency"
);

ExternalModuleImportDependency.Template = class ExternalModuleImportDependencyTemplate extends (
	CachedConstDependency.Template
) {
	/**
	 * @param {ExternalModuleImportDependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		// const content = runtimeTemplate.moduleNamespacePromise({
		// 	chunkGraph,
		// 	block,
		// 	module: /** @type {Module} */ (moduleGraph.getModule(dep)),
		// 	request: dep.request,
		// 	strict: /** @type {BuildMeta} */ (module.buildMeta).strictHarmonyModule,
		// 	message: "import()",
		// 	runtimeRequirements
		// });

		console.log("👱‍♀️", 1);
		// const content = JSON.stringify(dependency.targetRequest);
		// source.replace(
		// 	dependency.range[0],
		// 	dependency.range[1] - 1,
		// 	`import(${content})`
		// );
	}
};

module.exports = ExternalModuleImportDependency;
