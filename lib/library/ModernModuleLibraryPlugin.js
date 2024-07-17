/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const ChunkGraph = require("../ChunkGraph");
const ModuleGraph = require("../ModuleGraph");
const ConcatenatedModule = require("../optimize/ConcatenatedModule");
const ModuleConcatenationPlugin = require("../optimize/ModuleConcatenationPlugin");
const AbstractLibraryPlugin = require("./AbstractLibraryPlugin");
const { STAGE_DEFAULT } = require("../OptimizationStages");
const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const { mergeRuntimeOwned } = require("../util/runtime");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions").LibraryType} LibraryType */
/** @typedef {import("../dependencies/HarmonyExportSpecifierDependency")} HarmonyExportSpecifierDependency */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation").ChunkHashContext} ChunkHashContext */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../javascript/JavascriptModulesPlugin").StartupRenderContext} StartupRenderContext */
/** @typedef {import("../util/Hash")} Hash */
/** @template T @typedef {import("./AbstractLibraryPlugin").LibraryContext<T>} LibraryContext<T> */

/**
 * @typedef {object} ModernModuleLibraryPluginOptions
 * @property {LibraryType} type
 */

/**
 * @typedef {object} ModernModuleLibraryPluginParsed
 * @property {string} name
 */

/**
 * @typedef {ModernModuleLibraryPluginParsed} T
 * @extends {AbstractLibraryPlugin<ModernModuleLibraryPluginParsed>}
 */
class ModernModuleLibraryPlugin extends AbstractLibraryPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		super.apply(compiler);

		compiler.hooks.compilation.tap("ModernModuleLibraryPlugin", compilation => {
			const { exportsDefinitions } =
				ConcatenatedModule.getCompilationHooks(compilation);
			exportsDefinitions.tap("ModernModuleLibraryPlugin", () => {
				return true;
			});

			// handle single module

			compilation.hooks.optimizeChunkModules.tapAsync(
				{
					name: "ModuleConcatenationPlugin",
					stage: STAGE_DEFAULT
				},
				(allChunks, modules, callback) => {
					const { chunkGraph, moduleGraph } = compilation;

					if ([...modules].length > 1) return callback();
					/** @type {Module} */
					const currentRoot = modules[0];

					let chunkRuntime = undefined;
					for (const r of chunkGraph.getModuleRuntimes(currentRoot)) {
						chunkRuntime = mergeRuntimeOwned(chunkRuntime, r);
					}

					// create a configuration with the root
					const currentConfiguration =
						new ModuleConcatenationPlugin.ConcatConfiguration(
							currentRoot,
							chunkRuntime
						);

					const modulesInConfiguration = currentConfiguration.getModules();

					let newModule = ConcatenatedModule.create(
						currentRoot,
						modulesInConfiguration,
						currentConfiguration.runtime,
						compilation,
						compiler.root,
						compilation.outputOptions.hashFunction
					);

					const build = () => {
						newModule.build(compiler.options, compilation, null, null, err => {
							if (err) {
								if (!err.module) {
									err.module = newModule;
								}
								return callback(err);
							}
							integrate();
						});
					};

					const integrate = () => {
						moduleGraph.cloneModuleAttributes(currentRoot, newModule);
						for (const m of modulesInConfiguration) {
							// add to builtModules when one of the included modules was built
							if (compilation.builtModules.has(m)) {
								compilation.builtModules.add(newModule);
							}
						}
						compilation.modules.delete(currentRoot);
						ChunkGraph.clearChunkGraphForModule(currentRoot);
						ModuleGraph.clearModuleGraphForModule(currentRoot);

						// remove module from chunk
						chunkGraph.replaceModule(currentRoot, newModule);

						moduleGraph.moveModuleConnections(currentRoot, newModule, c => {
							const otherModule =
								c.module === currentRoot ? c.originModule : c.module;
							const innerConnection =
								c.dependency instanceof HarmonyImportDependency &&
								modulesInConfiguration.has(/** @type {Module} */ (otherModule));
							return !innerConnection;
						});

						// add concatenated module to the compilation
						compilation.modules.add(newModule);
						callback();
					};

					build();
				}
			);
		});
	}

	/**
	 * @param {ModernModuleLibraryPluginOptions} options the plugin options
	 */
	constructor(options) {
		super({
			pluginName: "ModernModuleLibraryPlugin",
			type: options.type
		});
	}

	/**
	 * @param {LibraryOptions} library normalized library option
	 * @returns {T | false} preprocess as needed by overriding
	 */
	parseOptions(library) {
		const { name } = library;
		if (name) {
			throw new Error(
				`Library name must be unset. ${AbstractLibraryPlugin.COMMON_LIBRARY_NAME_MESSAGE}`
			);
		}
		return {
			name: /** @type {string} */ (name)
		};
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {Set<string>} set runtime requirements
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {void}
	 */
	// runtimeRequirements(chunk, set, libraryContext) {
	// 	// console.log("🧕", set);
	// 	// set.clear();
	// 	// if (this.render !== AbstractLibraryPlugin.prototype.render)
	// 	// set.add(RuntimeGlobals.returnExportsFromRuntime);
	// }

	/**
	 * @param {Source} source source
	 * @param {Module} module module
	 * @param {StartupRenderContext} renderContext render context
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {Source} source with library export
	 */
	renderStartup(
		source,
		module,
		{ moduleGraph, chunk },
		{ options, compilation }
	) {
		const result = new ConcatSource(source);
		const exportsInfo = moduleGraph.getExportsInfo(module);
		const definitions = module.buildMeta.exportsFinalName;
		const exports = [];

		if (definitions) {
			for (const exportInfo of exportsInfo.orderedExports) {
				const webpackExportsProperty = exportInfo.getUsedName(
					exportInfo.name,
					chunk.runtime
				);
				const finalName =
					definitions[
						/** @type {string} */
						(webpackExportsProperty)
					];
				exports.push(
					finalName === exportInfo.name
						? finalName
						: `${finalName} as ${exportInfo.name}`
				);
			}
		} else {
			const moduleDeps = module.dependencies;
			for (const moduleDep of moduleDeps) {
				if (moduleDep.type === "harmony export specifier") {
					const dep = /** @type {HarmonyExportSpecifierDependency} */ (
						moduleDep
					);
					if (dep.name === dep.id) {
						exports.push(dep.name);
					} else {
						exports.push(`${dep.name} as ${dep.id}`);
					}
				}
			}
		}

		if (exports.length > 0) {
			result.add(`export { ${exports.join(", ")} };\n`);
		}

		return result;
	}
}

module.exports = ModernModuleLibraryPlugin;
