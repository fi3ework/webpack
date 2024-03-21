/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const propertyAccess = require("../util/propertyAccess");
const AbstractLibraryPlugin = require("./AbstractLibraryPlugin");
const ConcatenatedModule = require("../optimize/ConcatenatedModule");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions").LibraryType} LibraryType */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation").ChunkHashContext} ChunkHashContext */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../javascript/JavascriptModulesPlugin").StartupRenderContext} StartupRenderContext */
/** @typedef {import("../util/Hash")} Hash */
/** @template T @typedef {import("./AbstractLibraryPlugin").LibraryContext<T>} LibraryContext<T> */

/**
 * @typedef {Object} ModuleLibraryPluginOptions
 * @property {LibraryType} type
 */

/**
 * @typedef {Object} ModuleLibraryPluginParsed
 * @property {string} name
 */

/**
 * @typedef {ModuleLibraryPluginParsed} T
 * @extends {AbstractLibraryPlugin<ModuleLibraryPluginParsed>}
 */
class ModuleLibraryPlugin extends AbstractLibraryPlugin {
	apply(compiler) {
		super.apply(compiler);

		compiler.hooks.compilation.tap("ModuleLibraryPlugin", compilation => {
			const { exportsDefinitions } =
				ConcatenatedModule.getCompilationHooks(compilation);
			exportsDefinitions.tap("ModuleLibraryPlugin", () => {
				if (
					!(
						// only works without split chunks now
						(
							compilation.options.optimization &&
							compilation.options.optimization.splitChunks
						)
					)
				) {
					return true;
				}
				return;
			});
		});
	}

	/**
	 * @param {ModuleLibraryPluginOptions} options the plugin options
	 */
	constructor(options) {
		super({
			pluginName: "ModuleLibraryPlugin",
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
		const canUseEsmExport = module.buildMeta.exportsFinalName;
		if (canUseEsmExport) {
			const definitions = module.buildMeta.exportsFinalName;
			const result = new ConcatSource(source);
			const exportsInfo = moduleGraph.getExportsInfo(module);
			const exports = [];

			for (const exportInfo of exportsInfo.orderedExports) {
				if (!exportInfo.provided) continue;
				const webpackExportsProperty = exportInfo.getUsedName(
					exportInfo.name,
					chunk.runtime
				);
				const finalName =
					definitions[
						/** @type {string} */
						(webpackExportsProperty)
					];
				exports.push(`${finalName} as ${exportInfo.name}`);
			}
			if (exports.length > 0) {
				result.add(`export { ${exports.join(",\n")} };\n`);
			}

			return result;
		} else {
			const result = new ConcatSource(source);
			const exportsInfo = moduleGraph.getExportsInfo(module);
			const exports = [];
			const isAsync = moduleGraph.isAsync(module);
			if (isAsync) {
				result.add(
					`${RuntimeGlobals.exports} = await ${RuntimeGlobals.exports};\n`
				);
			}
			for (const exportInfo of exportsInfo.orderedExports) {
				if (!exportInfo.provided) continue;
				const varName = `${RuntimeGlobals.exports}${Template.toIdentifier(
					exportInfo.name
				)}`;
				result.add(
					`var ${varName} = ${RuntimeGlobals.exports}${propertyAccess([
						/** @type {string} */
						(exportInfo.getUsedName(exportInfo.name, chunk.runtime))
					])};\n`
				);
				exports.push(`${varName} as ${exportInfo.name}`);
			}
			if (exports.length > 0) {
				result.add(`export { ${exports.join(", ")} };\n`);
			}

			return result;
		}
	}
}

module.exports = ModuleLibraryPlugin;
