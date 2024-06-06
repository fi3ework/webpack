var localVar = 42;
const through_variable = typeof no_var_leak_localVar

;(function(){
	typeof entry_inline_no_var_leak_localVar ;
})();

it("should not leak localVar to other modules", () => {
	expect(localVar).toBe(42);
	expect(require("./module")).toBe("undefined");
	expect(through_variable).toBe("undefined");
});
