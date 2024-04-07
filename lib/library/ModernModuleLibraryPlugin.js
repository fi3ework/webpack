/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const Entrypoint = require("../Entrypoint");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const ConcatenatedModule = require("../optimize/ConcatenatedModule");
const propertyAccess = require("../util/propertyAccess");
const AbstractLibraryPlugin = require("./AbstractLibraryPlugin");

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
 * @typedef {Object} ModernModuleLibraryPluginOptions
 * @property {LibraryType} type
 */

/**
 * @typedef {Object} ModernModuleLibraryPluginParsed
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
				if (
					compilation.chunkGroups
						.filter(chunkGroup => chunkGroup instanceof Entrypoint)
						.some(entryPoint => entryPoint.chunks.length > 1)
				) {
					return;
				}

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
		const shouldExportFinalName = module.buildMeta.exportsFinalName;
		const result = new ConcatSource(source);
		const exportsInfo = moduleGraph.getExportsInfo(module);
		const exports = [];

		if (shouldExportFinalName) {
			const definitions = module.buildMeta.exportsFinalName;
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
				exports.push(
					finalName === exportInfo.name
						? finalName
						: `${finalName} as ${exportInfo.name}`
				);
			}
		} else {
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
		}

		if (exports.length > 0) {
			result.add(`export { ${exports.join(", ")} };\n`);
		}

		return result;
	}
}

module.exports = ModernModuleLibraryPlugin;
