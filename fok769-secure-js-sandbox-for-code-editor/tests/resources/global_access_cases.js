// Code snippets that attempt to access or modify global state
export const globalAccessCases = [
  {
    name: "global_variable_pollution",
    code: "window.__hacked = true;",
    shouldFail: true,
    failureReason: "Should not be able to modify window object"
  },
  {
    name: "global_this_access",
    code: "globalThis.__hacked = true;",
    shouldFail: true,
    failureReason: "Should not be able to modify globalThis"
  },
  {
    name: "prototype_pollution",
    code: "Object.prototype.__hacked = true;",
    shouldFail: true,
    failureReason: "Should not be able to pollute prototypes"
  },
  {
    name: "console_override",
    code: `
console.log = function() {};
console.log('test');
    `.trim(),
    shouldFail: false, // Console override should be intercepted and restored
    note: "Console should be restored after execution"
  }
];
