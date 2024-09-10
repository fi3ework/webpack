/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const ConcatenatedModule = require("../optimize/ConcatenatedModule");
const AbstractLibraryPlugin = require("./AbstractLibraryPlugin");
const ExternalModuleImportDependency = require("./modern-module/Dependency");
const ImportDependency = require("../dependencies/ImportDependency");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const ConstDependency = require("../dependencies/ConstDependency");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions").LibraryType} LibraryType */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation").ChunkHashContext} ChunkHashContext */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
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
			exportsDefinitions.tap("ModernModuleLibraryPlugin", () => true);
		});

		compiler.hooks.compilation.tap(
			"ModernModuleLibraryPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ExternalModuleImportDependency,
					new ExternalModuleImportDependency.Template()
				);
			}
		);

		compiler.hooks.compilation.tap("ModernModuleLibraryPlugin", compilation => {
			compilation.hooks.finishModules.tap(
				"ModernModuleLibraryPlugin",
				modules => {
					const { moduleGraph } = compilation;

					// preserve export * from 'module' syntax
					for (const module of modules) {
						let deps = module.dependencies;
						const connections = moduleGraph.getOutgoingConnections(module);

						module.dependencies = deps.filter(dep => {
							if (dep instanceof HarmonyExportImportedSpecifierDependency) {
								const exportDep =
									/** @type {HarmonyExportImportedSpecifierDependency} */ (dep);
								if (exportDep.allStarExports) {
									const targetConnection = Array.from(connections).find(c => {
										const module = c.module;

										// @ts-ignore can't use instanceof here
										if (module && module?.externalType) {
											// @ts-ignore
											return module.userRequest === dep.request;
										}
									});

									if (!targetConnection) {
										return true;
									}

									let presentationalDeps = module.presentationalDependencies;
									const clearDeps = presentationalDeps
										.filter(d => d instanceof ConstDependency)
										.filter(
											/** @type {ConstDependency} */ d => {
												return d.expression === "" && d.loc.index - 1;
											}
										);

									for (const clearDep of clearDeps) {
										const idx =
											module.presentationalDependencies.indexOf(clearDep);
										if (idx >= 0) {
											module.presentationalDependencies.splice(idx, 1);
										}
									}

									return false;
								}
								return true;
							}

							return true;
						});
					}

					// Do external module id replacement based on external module
					// e.g. import('react') -> import('react-native')
					for (const module of modules) {
						const blocks = module.blocks;
						const connections = moduleGraph.getOutgoingConnections(module);

						// Add new dependency.
						blocks.forEach(block => {
							block.dependencies
								.filter(dep => dep instanceof ImportDependency)
								.forEach(dep => {
									const targetConnection = Array.from(connections).find(c => {
										const module = c.module;

										// @ts-ignore can't use instanceof here
										if (module && module?.externalType) {
											// @ts-ignore
											return module.userRequest === dep.request;
										}
									});

									if (!targetConnection) {
										return;
									}

									const targetModule = targetConnection.module;
									const moduleImportDep = new ExternalModuleImportDependency(
										dep.request,
										targetModule.request,
										dep.range
									);

									let newDeps = [];
									block.dependencies.forEach(d => {
										if (d === dep) {
											newDeps.push(moduleImportDep);
										} else {
											newDeps.push(d);
										}
									});
									block.dependencies = newDeps;

									// Remove original external module connection
									const originalModule = moduleGraph.getModule(dep);
									if (originalModule) {
										moduleGraph.removeConnection(dep);
									}
								});
						});
					}
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
		const _name = /** @type {string} */ (name);
		return {
			name: _name
		};
	}

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
		const definitions =
			/** @type {BuildMeta} */
			(module.buildMeta).exportsFinalName;
		const exports = [];

		for (const exportInfo of exportsInfo.orderedExports) {
			let shouldContinue = false;
			const reexport = exportInfo.findTarget(moduleGraph, _m => true);

			if (reexport) {
				const exp = moduleGraph.getExportsInfo(reexport.module);

				for (const reexportInfo of exp.orderedExports) {
					if (
						!reexportInfo.provided &&
						reexportInfo.name === /** @type {string[]} */ (reexport.export)[0]
					) {
						// shouldContinue = true;
					}
				}
			}

			if (shouldContinue) continue;

			const webpackExportsProperty = exportInfo.getUsedName(
				exportInfo.name,
				chunk.runtime
			);
			const finalName =
				definitions?.[
					/** @type {string} */
					(webpackExportsProperty)
				];
			exports.push(
				finalName === exportInfo.name
					? finalName
					: `${finalName} as ${exportInfo.name}`
			);
		}

		if (exports.length > 0) {
			result.add(`export { ${exports.join(", ")} };\n`);
		}

		return result;
	}
}

module.exports = ModernModuleLibraryPlugin;
