/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").Compilation} Compilation */

module.exports = {
	mode: "none",
	entry: { main: "./index.ts" },
	ignoreWarnings: [
		warning => {
			// when using swc-loader or `transpileOnly: true` with ts-loader, the warning is expected
			expect(warning.message).toContain(
				"export 'T' (reexported as 'T') was not found in './re-export' (possible exports: value)"
			);
			return true;
		}
	],
	plugins: [
		/**
		 * @this {Compiler} compiler
		 */
		function () {
			/**
			 * @param {Compilation} compilation compilation
			 * @returns {void}
			 */
			const handler = compilation => {
				compilation.hooks.afterProcessAssets.tap("testcase", assets => {
					for (const asset of Object.keys(assets)) {
						const source = assets[asset].source();
						expect(source).toContain("export { value }");
					}
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	],
	output: {
		module: true,
		library: {
			type: "modern-module"
		},
		chunkFormat: "module"
	},
	experiments: {
		outputModule: true
	},
	resolve: {
		extensions: [".ts"]
	},
	optimization: {
		concatenateModules: true
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				loader: "ts-loader",
				options: {
					transpileOnly: true
				}
			}
		]
	}
};
