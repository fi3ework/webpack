/** @type {import("../../../../types").Configuration} */
module.exports = {
	entry: {
		bundle0: "./index.js",
		test: "./test.js"
	},
	module: {
		parser: {
			javascript: {
				requireResolve: false
			}
		}
	},
	output: {
		filename: "[name].js"
	},
	node: {
		__dirname: false
	}
};
