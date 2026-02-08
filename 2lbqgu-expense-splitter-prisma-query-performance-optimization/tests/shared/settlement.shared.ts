import path from "path";

function loadSettlementModule(repoName: string) {
  const repoRoot = path.resolve(__dirname, "..", "..", repoName);
  const settlementModulePath = path.join(repoRoot, "lib", "settlement-utils");

  const settlementModule = require(settlementModulePath);
  return settlementModule as typeof import("../../repository_after/lib/settlement-utils");
}

export function registerSettlementTests(repoName: string) {
  describe(`Settlement Algorithm Tests (${repoName})`, () => {
    test("Settlement algorithm produces identical results", () => {
      const { calculateMinimumSettlements } = loadSettlementModule(repoName);

      const balances = [
        { userId: "user1", name: "Alice", balance: 2000 },
        { userId: "user2", name: "Bob", balance: -1500 },
        { userId: "user3", name: "Charlie", balance: -500 },
      ];

      const settlements1 = calculateMinimumSettlements(balances);
      const settlements2 = calculateMinimumSettlements(balances);

      expect(settlements1).toEqual(settlements2);
      expect(settlements1).toHaveLength(2);

      const bobToAlice = settlements1.find(
        (s) => s.fromName === "Bob" && s.toName === "Alice",
      );
      const charlieToAlice = settlements1.find(
        (s) => s.fromName === "Charlie" && s.toName === "Alice",
      );

      expect(bobToAlice?.amount).toBe(1500);
      expect(charlieToAlice?.amount).toBe(500);
    });

    test("Balance formatting accuracy", () => {
      const { formatCents } = loadSettlementModule(repoName);
      expect(formatCents(2500)).toBe("$25.00");
      expect(formatCents(1)).toBe("$0.01");
      expect(formatCents(0)).toBe("$0.00");
      expect(formatCents(-1500)).toBe("-$15.00");
    });
  });
}
