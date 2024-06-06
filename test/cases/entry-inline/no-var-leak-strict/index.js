var localVar = 42;
const through_variable = typeof no_var_leak_localVar

it("should not leak localVar to other modules", () => {
	expect(localVar).toBe(42);
	import(/* webpackMode: "eager" */ "./module").then(module => {
		expect(module.default).toBe("undefined");
		expect(through_variable).toBe("undefined");
	});
});

export {};
