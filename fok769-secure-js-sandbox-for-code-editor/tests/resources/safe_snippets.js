// Safe code snippets that should execute successfully
export const safeSnippets = [
  {
    name: "simple_arithmetic",
    code: "console.log(2 + 2);",
    expectedOutput: ["4"]
  },
  {
    name: "function_definition",
    code: `
function add(a, b) {
  return a + b;
}
console.log(add(5, 3));
    `.trim(),
    expectedOutput: ["8"]
  },
  {
    name: "array_operations",
    code: `
const arr = [1, 2, 3];
console.log(arr.map(x => x * 2));
    `.trim(),
    expectedOutput: ["[2,4,6]"]
  },
  {
    name: "string_manipulation",
    code: `
const str = "Hello";
console.log(str.toUpperCase());
    `.trim(),
    expectedOutput: ["HELLO"]
  }
];
