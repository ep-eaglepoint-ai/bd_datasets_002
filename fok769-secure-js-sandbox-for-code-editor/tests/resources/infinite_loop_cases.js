// Code snippets that create infinite loops
export const infiniteLoopCases = [
  {
    name: "while_true",
    code: "while(true) { }",
    shouldTimeout: true
  },
  {
    name: "for_infinite",
    code: "for(;;) { }",
    shouldTimeout: true
  },
  {
    name: "recursive_infinite",
    code: `
function recurse() {
  recurse();
}
recurse();
    `.trim(),
    shouldTimeout: true
  },
  {
    name: "nested_loops",
    code: `
while(true) {
  for(let i = 0; i < 1000000; i++) {
    // Busy loop
  }
}
    `.trim(),
    shouldTimeout: true
  }
];
