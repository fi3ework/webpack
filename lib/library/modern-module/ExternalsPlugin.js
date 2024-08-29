/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ExternalModuleFactoryPlugin = require("./ExternalModuleFactoryPlugin");
const ImportRawDependency = require("../../dependencies/ImportRawDependency");
const ExternalModuleImportDependency = require("./Dependency");
const { ExternalModule } = require("../../util/internalSerializables");
const ImportDependency = require("../../dependencies/ImportDependency");

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
		// compiler.hooks.compile.tap("ExternalsPlugin", ({ normalModuleFactory }) => {
		// 	new ExternalModuleFactoryPlugin(this.type, this.externals).apply(
		// 		normalModuleFactory
		// 	);
		// });

		compiler.hooks.compilation.tap(
			"ExternalsPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ExternalModuleImportDependency,
					new ExternalModuleImportDependency.Template()
				);
			}
		);
		// }

		compiler.hooks.compilation.tap("ExternalsPlugin", compilation => {
			compilation.hooks.finishModules.tap("MY_PLUGIN_NAME", modules => {
				const { moduleGraph } = compilation;
				// map external module -> pure mode
				const externalModules = [];
				for (const module of modules) {
					if (module && module?.externalType) {
						externalModules.push(module);
					}
				}

				// do pure external module
				for (const module of modules) {
					const deps = module.dependencies;
					deps
						.filter(dep => dep instanceof ImportRawDependency)
						.forEach(dep => {
							const target = externalModules.find(m => {
								return m.userRequest === dep.request;
							});

							const moduleImportDep = new ExternalModuleImportDependency(
								dep.request,
								target.request,
								dep.range
							);
							module.addPresentationalDependency(moduleImportDep);
						});
				}

				// remove external module
				for (const module of externalModules) {
					const connections = moduleGraph.getIncomingConnections(module);
					for (const connection of connections) {
						const connectionDep = connection.dependency;
						if (connectionDep instanceof ImportRawDependency) {
							moduleGraph.removeConnection(connectionDep);
						}
					}
				}
			});
		});
	}
}

module.exports = ExternalsPlugin;
