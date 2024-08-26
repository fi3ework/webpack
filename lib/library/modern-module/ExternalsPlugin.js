/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ExternalModuleFactoryPlugin = require("./ExternalModuleFactoryPlugin");
const ModuleImportDependency = require("./Dependency");

/** @typedef {import("../../../declarations/WebpackOptions").Externals} Externals */
/** @typedef {import("../../Compiler")} Compiler */

class ExternalsPlugin {
	/**
	 * @param {string | undefined} type default external type
	 * @param {Externals} externals externals config
	 */
	constructor(type, externals) {
		this.type = type;
		this.externals = externals;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compile.tap("ExternalsPlugin", ({ normalModuleFactory }) => {
			new ExternalModuleFactoryPlugin(this.type, this.externals).apply(
				normalModuleFactory
			);
		});

		compiler.hooks.compilation.tap(
			"ExternalsPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ModuleImportDependency,
					new ModuleImportDependency.Template()
				);
			}
		);
	}
}

module.exports = ExternalsPlugin;
