import { value, T } from './re-export'

export { value, T }

it("should not re-export type", function () {
	// if the type is re-exported, will throw an syntax error
  expect(value).toBe(1)
});
