import axios from "axios";

import * as crypto from "crypto";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000/api/flags";

// Helper to generate UUID if package not available
const randomUUID = () => crypto.randomUUID();

describe("Feature Flag Orchestrator Integration Tests", () => {
  // Wait for server to be ready?
  // Jest runs before server might be fully ready if I start them together.
  // I'll add a check or rely on the agent to ensure server is up.

  // Clean state or just work with what's there?
  // The file persistence persists across runs.

  test("Requirement 3 & 9: Optimistic Concurrency Control / Collision Resilience", async () => {
    // 1. Get current config
    const getRes = await axios.get(BASE_URL);
    const initialConfig = getRes.data;
    const initialVersion = initialConfig.version_id;
    const initialFlags = initialConfig.flags;

    // 2. Client A updates
    const clientAFlags = [...initialFlags];
    if (clientAFlags.length > 0) {
      // Modify first flag
      clientAFlags[0] = {
        ...clientAFlags[0],
        enabled: !clientAFlags[0].enabled,
      };
    }

    const payloadA = {
      version_id: initialVersion,
      flags: clientAFlags,
    };

    const resA = await axios.post(BASE_URL, payloadA);
    expect(resA.status).toBe(200);
    const newVersion = resA.data.version_id;
    expect(newVersion).not.toBe(initialVersion);

    // 3. Client B updates with OLD version
    const clientBFlags = [...initialFlags]; // Same base
    // Modify differently
    if (clientBFlags.length > 0) {
      clientBFlags[0] = {
        ...clientBFlags[0],
        description: "Changed by Client B",
      };
    }

    const payloadB = {
      version_id: initialVersion, // STALE version
      flags: clientBFlags,
    };

    try {
      await axios.post(BASE_URL, payloadB);
      fail("Client B should have failed with 409");
    } catch (error: any) {
      expect(error.response.status).toBe(409);
    }
  });

  test("Requirement 1 & 10: Type Integrity Validation", async () => {
    // 1. Get current config for version
    const getRes = await axios.get(BASE_URL);
    const currentVersion = getRes.data.version_id;
    const flags = getRes.data.flags;

    // 2. Try to save Percentage > 100
    const percentageFlag = {
      id: randomUUID(),
      key: "test_percentage",
      enabled: true,
      type: "PERCENTAGE",
      value: 101, // Invalid
    };

    // We need to add this flag to the list or replace one.
    // Schema is array of flags.
    const invalidPayload1 = {
      version_id: currentVersion,
      flags: [...flags, percentageFlag],
    };

    try {
      await axios.post(BASE_URL, invalidPayload1);
      fail("Should fail validation for Percentage > 100");
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      // Optional: check error details
    }

    // 3. Try to save Boolean with string value
    // Note: TypeScript static check would prevent this in client code, but runtime API must catch it.
    const booleanFlagInvalid = {
      id: randomUUID(),
      key: "test_bool_invalid",
      enabled: true,
      type: "BOOLEAN",
      value: "true", // Invalid type
    };

    const invalidPayload2 = {
      version_id: currentVersion,
      flags: [...flags, booleanFlagInvalid],
    };

    try {
      await axios.post(BASE_URL, invalidPayload2);
      fail("Should fail validation for Boolean with string value");
    } catch (error: any) {
      expect(error.response.status).toBe(400);
    }
  });
});
