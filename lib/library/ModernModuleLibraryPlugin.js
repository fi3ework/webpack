/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const ConcatenatedModule = require("../optimize/ConcatenatedModule");
const AbstractLibraryPlugin = require("./AbstractLibraryPlugin");
const { RuntimeGlobals, Template } = require("..");

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
		const reexports = [];

		const handleReexport = (exportInfo, finalName) => {
			const varName = `${RuntimeGlobals.exports}${Template.toIdentifier(
				exportInfo.name
			)}`;
			const statement = `var ${varName} = ${RuntimeGlobals.exports}${finalName};\n`;
			reexports.push(statement);
			exports.push(`${varName} as ${exportInfo.name}`);
		};

		if (definitions) {
			for (const exportInfo of exportsInfo.orderedExports) {
				const isReexport = exportInfo.isReexport();

				const webpackExportsProperty = exportInfo.getUsedName(
					exportInfo.name,
					chunk.runtime
				);
				const finalName =
					definitions[
						/** @type {string} */
						(webpackExportsProperty)
					];

				if (isReexport) {
					handleReexport(exportInfo, finalName);
				} else {
					exports.push(
						finalName === exportInfo.name
							? finalName
							: `${finalName} as ${exportInfo.name}`
					);
				}
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

		if (reexports.length > 0) {
			result.add(reexports.join("") + "\n");
		}

		if (exports.length > 0) {
			result.add(`export { ${exports.join(", ")} };\n`);
		}

		return result;
	}
}

module.exports = ModernModuleLibraryPlugin;
