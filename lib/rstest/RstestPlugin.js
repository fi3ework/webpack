/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const ConstDependency = require("../dependencies/ConstDependency");
const NullDependency = require("../dependencies/NullDependency");
const RstestDependency = require("./RstestDependency");

/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */

const PLUGIN_NAME = "RstestPlugin";

class RstestPlugin {
	constructor(definitions) {}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);
				compilation.dependencyFactories.set(
					RstestDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					RstestDependency,
					new RstestDependency.Template()
				);
				/**
				 * @param {JavascriptParser} parser the parser
				 * @param {JavascriptParserOptions} parserOptions options
				 * @returns {void}
				 */
				const handler = (parser, parserOptions) => {
					for (const name of ["__dirname", "__filename"]) {
						parser.hooks.expression.for(name).tap(PLUGIN_NAME, expr => {
							const dep = new RstestDependency(
								/** @type {Range} */ (expr.range)
							);
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});

						parser.hooks.call.for(name).tap(PLUGIN_NAME, expr => {
							const dep = new RstestDependency(
								/** @type {Range} */ (expr.callee.range)
							);
							parser.state.module.addDependency(dep);
							parser.walkExpressions(expr.arguments);
							return true;
						});
					}
				};
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}
}

module.exports = RstestPlugin;
