/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");
const RstestDirnameInitFragment = require("../rstest/RstestDirnameInitFragment");
const ExternalModule = require("../ExternalModule");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("../Dependency").ReferencedExport} ReferencedExport */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../javascript/JavascriptParser").ImportAttributes} ImportAttributes */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class ImportDependency extends ModuleDependency {
	/**
	 * @param {string} request the request
	 * @param {Range} range expression range
	 * @param {(string[][] | null)=} referencedExports list of referenced exports
	 * @param {ImportAttributes=} attributes import attributes
	 */
	constructor(request, range, referencedExports, attributes) {
		super(request);
		this.range = range;
		this.referencedExports = referencedExports;
		this.assertions = attributes;
	}

	get type() {
		return "import()";
	}

	get category() {
		return "esm";
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {(string[] | ReferencedExport)[]} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		if (!this.referencedExports) return Dependency.EXPORTS_OBJECT_REFERENCED;
		const refs = [];
		for (const referencedExport of this.referencedExports) {
			if (referencedExport[0] === "default") {
				const selfModule =
					/** @type {Module} */
					(moduleGraph.getParentModule(this));
				const importedModule =
					/** @type {Module} */
					(moduleGraph.getModule(this));
				const exportsType = importedModule.getExportsType(
					moduleGraph,
					/** @type {BuildMeta} */
					(selfModule.buildMeta).strictHarmonyModule
				);
				if (
					exportsType === "default-only" ||
					exportsType === "default-with-named"
				) {
					return Dependency.EXPORTS_OBJECT_REFERENCED;
				}
			}
			refs.push({
				name: referencedExport,
				canMangle: false
			});
		}
		return refs;
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.range);
		context.write(this.referencedExports);
		context.write(this.assertions);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.range = context.read();
		this.referencedExports = context.read();
		this.assertions = context.read();
		super.deserialize(context);
	}
}

makeSerializable(ImportDependency, "webpack/lib/dependencies/ImportDependency");

ImportDependency.Template = class ImportDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void} */
	apply(
		dependency,
		source,
		{
			runtimeTemplate,
			module,
			moduleGraph,
			chunkGraph,
			runtimeRequirements,
			initFragments
		}
	) {
		// @ts-ignore
		initFragments.push(new RstestDirnameInitFragment(module.resource));

		// const moduleResourcePath = module
		const dep = /** @type {ImportDependency} */ (dependency);
		const block = /** @type {AsyncDependenciesBlock} */ (
			moduleGraph.getParentBlock(dep)
		);
		const content = runtimeTemplate.moduleNamespacePromise({
			chunkGraph,
			block,
			module: /** @type {Module} */ (moduleGraph.getModule(dep)),
			request: dep.request,
			strict: /** @type {BuildMeta} */ (module.buildMeta).strictHarmonyModule,
			message: "import()",
			runtimeRequirements
		});

		const mod = moduleGraph.getModule(dep);
		const isExternal = mod instanceof ExternalModule;

		// replace all __webpack_require__ in content to __webpack_require__.e

		// if (isExternal) {
		// 	const finalContent = content.replace(
		// 		/__webpack_require__.bind\(__webpack_require__/g,
		// 		"__webpack_require__.rstest_require.bind(__webpack_require__.rstest_require"
		// 	);
		// 	source.replace(dep.range[0], dep.range[1] - 1, content);
		// } else {
		source.replace(dep.range[0], dep.range[1] - 1, content);
		// }
	}
};

module.exports = ImportDependency;
