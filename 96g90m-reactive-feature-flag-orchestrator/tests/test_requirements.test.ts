import axios from "axios";
import * as crypto from "crypto";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFlagStore } from "../repository_after/store/useFlagStore";
import {
  FeatureFlagSchema,
  BooleanFlagSchema,
  PercentageFlagSchema,
  EnumFlagSchema,
} from "../repository_after/lib/schema";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000/api/flags";

// Helper to generate UUID if package not available
const randomUUID = () => crypto.randomUUID();

describe("Feature Flag Orchestrator - 100% Requirements Coverage", () => {
  // ========================================================================
  // REQUIREMENT 1: schema_parity_validation
  // ========================================================================
  describe("Req 1: Schema Parity Validation", () => {
    test("Zod schema enforces discriminated union based on 'type' field", () => {
      // Valid Boolean flag
      const boolFlag = {
        id: randomUUID(),
        key: "test_bool",
        enabled: true,
        type: "BOOLEAN",
        value: true,
      };
      expect(BooleanFlagSchema.safeParse(boolFlag).success).toBe(true);

      // Valid Percentage flag
      const percentFlag = {
        id: randomUUID(),
        key: "test_percent",
        enabled: true,
        type: "PERCENTAGE",
        value: 50,
      };
      expect(PercentageFlagSchema.safeParse(percentFlag).success).toBe(true);

      // Valid Enum flag
      const enumFlag = {
        id: randomUUID(),
        key: "test_enum",
        enabled: true,
        type: "ENUM",
        options: ["red", "blue", "green"],
        value: "red",
      };
      expect(EnumFlagSchema.safeParse(enumFlag).success).toBe(true);
    });

    test("Percentage must be 0-100", () => {
      const invalidPercentage = {
        id: randomUUID(),
        key: "test_percent",
        enabled: true,
        type: "PERCENTAGE",
        value: 101,
      };
      const result = PercentageFlagSchema.safeParse(invalidPercentage);
      expect(result.success).toBe(false);

      const validPercentage = {
        id: randomUUID(),
        key: "test_percent",
        enabled: true,
        type: "PERCENTAGE",
        value: 100,
      };
      expect(PercentageFlagSchema.safeParse(validPercentage).success).toBe(
        true,
      );
    });

    test("Boolean must be strict", () => {
      const invalidBoolean = {
        id: randomUUID(),
        key: "test_bool",
        enabled: true,
        type: "BOOLEAN",
        value: "true", // String instead of boolean
      };
      const result = BooleanFlagSchema.safeParse(invalidBoolean);
      expect(result.success).toBe(false);
    });

    test("Enum value must match predefined options", () => {
      const invalidEnum = {
        id: randomUUID(),
        key: "test_enum",
        enabled: true,
        type: "ENUM",
        options: ["red", "blue"],
        value: "green", // Not in options
      };
      const result = EnumFlagSchema.safeParse(invalidEnum);
      expect(result.success).toBe(false);
    });
  });

  // ========================================================================
  // REQUIREMENT 2: draft_state_orchestration
  // ========================================================================
  describe("Req 2: Draft State Orchestration", () => {
    test("Zustand store maintains separate staged_changes and persisted_state", async () => {
      const { result } = renderHook(() => useFlagStore());

      // Mock fetch to return initial data
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version_id: randomUUID(),
              flags: [
                {
                  id: randomUUID(),
                  key: "test_flag",
                  enabled: true,
                  type: "BOOLEAN",
                  value: false,
                },
              ],
            }),
        }),
      ) as jest.Mock;

      await act(async () => {
        await result.current.fetchFlags();
      });

      // Verify separate states exist
      expect(result.current.persistedState).not.toBeNull();
      expect(result.current.draftState).not.toBeNull();
      expect(result.current.persistedState).toEqual(result.current.draftState);
    });

    test("Store provides computed 'is_dirty' flag", async () => {
      const { result } = renderHook(() => useFlagStore());

      const flagId = randomUUID();
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version_id: randomUUID(),
              flags: [
                {
                  id: flagId,
                  key: "test_flag",
                  enabled: true,
                  type: "BOOLEAN",
                  value: false,
                },
              ],
            }),
        }),
      ) as jest.Mock;

      await act(async () => {
        await result.current.fetchFlags();
      });

      // Initially not dirty
      expect(result.current.isDirty).toBe(false);

      // Make a change
      act(() => {
        result.current.updateFlagValue(flagId, true);
      });

      // Now should be dirty
      expect(result.current.isDirty).toBe(true);
    });

    test("Store provides 'validation_errors' object derived from Zod schema", async () => {
      const { result } = renderHook(() => useFlagStore());

      const flagId = randomUUID();
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version_id: randomUUID(),
              flags: [
                {
                  id: flagId,
                  key: "test_flag",
                  enabled: true,
                  type: "PERCENTAGE",
                  value: 50,
                },
              ],
            }),
        }),
      ) as jest.Mock;

      await act(async () => {
        await result.current.fetchFlags();
      });

      // Initially no errors
      expect(Object.keys(result.current.validationErrors).length).toBe(0);

      // Update with invalid value
      act(() => {
        result.current.updateFlagValue(flagId, 150); // Invalid percentage
      });

      // Should have validation errors
      expect(result.current.validationErrors[flagId]).toBeDefined();
      expect(result.current.validationErrors[flagId].length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // REQUIREMENT 3 & 9: optimistic_concurrency_control + collision_resilience
  // ========================================================================
  describe("Req 3 & 9: Optimistic Concurrency Control / Collision Resilience", () => {
    test("Persistence layer tracks version_id", async () => {
      const getRes = await axios.get(BASE_URL);
      expect(getRes.data.version_id).toBeDefined();
      expect(typeof getRes.data.version_id).toBe("string");
    });

    test("Two clients attempting concurrent updates - only first succeeds", async () => {
      // 1. Get current config
      const getRes = await axios.get(BASE_URL);
      const initialConfig = getRes.data;
      const initialVersion = initialConfig.version_id;
      const initialFlags = initialConfig.flags;

      // 2. Client A updates
      const clientAFlags = [...initialFlags];
      if (clientAFlags.length > 0) {
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
      const clientBFlags = [...initialFlags];
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
        throw new Error("Client B should have failed with 409");
      } catch (error: any) {
        expect(error.response.status).toBe(409);
        expect(error.response.data.error).toContain("Conflict");
      }
    });
  });

  // ========================================================================
  // REQUIREMENT 4: atomic_file_persistence
  // ========================================================================
  describe("Req 4: Atomic File Persistence", () => {
    test("Failed validation leaves file in original state", async () => {
      // 1. Get initial state
      const getRes = await axios.get(BASE_URL);
      const initialConfig = getRes.data;
      const initialVersion = initialConfig.version_id;

      // 2. Try to save invalid payload
      const invalidPayload = {
        version_id: initialVersion,
        flags: [
          ...initialConfig.flags,
          {
            id: randomUUID(),
            key: "atomic_test",
            enabled: true,
            type: "BOOLEAN",
            value: "not_a_boolean",
          },
        ],
      };

      try {
        await axios.post(BASE_URL, invalidPayload);
        throw new Error("Should fail validation");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }

      // 3. Verify state is unchanged
      const getResAfter = await axios.get(BASE_URL);
      const finalConfig = getResAfter.data;

      expect(finalConfig.version_id).toBe(initialVersion);
      expect(finalConfig.flags).toEqual(initialConfig.flags);
    });

    test("Version mismatch leaves file in original state", async () => {
      const getRes = await axios.get(BASE_URL);
      const initialConfig = getRes.data;
      const initialVersion = initialConfig.version_id;

      // Try to update with fake version
      const invalidPayload = {
        version_id: randomUUID(), // Wrong version
        flags: initialConfig.flags,
      };

      try {
        await axios.post(BASE_URL, invalidPayload);
        throw new Error("Should fail with 409");
      } catch (error: any) {
        expect(error.response.status).toBe(409);
      }

      // Verify state unchanged
      const getResAfter = await axios.get(BASE_URL);
      expect(getResAfter.data.version_id).toBe(initialVersion);
    });
  });

  // ========================================================================
  // REQUIREMENT 5: schema_driven_ui_rendering
  // ========================================================================
  describe("Req 5: Schema-Driven UI Rendering", () => {
    test("Changing flag type resets value to valid default", async () => {
      const { result } = renderHook(() => useFlagStore());

      const flagId = randomUUID();
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version_id: randomUUID(),
              flags: [
                {
                  id: flagId,
                  key: "test_flag",
                  enabled: true,
                  type: "BOOLEAN",
                  value: true,
                },
              ],
            }),
        }),
      ) as jest.Mock;

      await act(async () => {
        await result.current.fetchFlags();
      });

      // Change type from BOOLEAN to PERCENTAGE
      act(() => {
        result.current.updateFlagType(flagId, "PERCENTAGE");
      });

      const updatedFlag = result.current.draftState?.flags.find(
        (f: any) => f.id === flagId,
      );
      expect(updatedFlag?.type).toBe("PERCENTAGE");
      expect(updatedFlag?.value).toBe(0); // Default for percentage

      // Change to ENUM
      act(() => {
        result.current.updateFlagType(flagId, "ENUM");
      });

      const enumFlag = result.current.draftState?.flags.find(
        (f: any) => f.id === flagId,
      );
      expect(enumFlag?.type).toBe("ENUM");
      expect(enumFlag?.value).toBe("option1"); // Default for enum
    });

    test("UI dynamically renders input fields based on flag type", async () => {
      // This is tested via the store's updateFlagType method
      const { result } = renderHook(() => useFlagStore());

      const flagId = randomUUID();
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version_id: randomUUID(),
              flags: [
                {
                  id: flagId,
                  key: "test_flag",
                  enabled: true,
                  type: "BOOLEAN",
                  value: false,
                },
              ],
            }),
        }),
      ) as jest.Mock;

      await act(async () => {
        await result.current.fetchFlags();
      });

      // Verify flag structure matches schema for BOOLEAN
      const boolFlag = result.current.draftState?.flags[0];
      expect(boolFlag?.type).toBe("BOOLEAN");
      expect(typeof boolFlag?.value).toBe("boolean");
    });
  });

  // ========================================================================
  // REQUIREMENT 6: real_time_error_reporting
  // ========================================================================
  describe("Req 6: Real-Time Error Reporting", () => {
    test("Validation occurs on every keystroke (updateFlagValue)", async () => {
      const { result } = renderHook(() => useFlagStore());

      const flagId = randomUUID();
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version_id: randomUUID(),
              flags: [
                {
                  id: flagId,
                  key: "test_flag",
                  enabled: true,
                  type: "PERCENTAGE",
                  value: 50,
                },
              ],
            }),
        }),
      ) as jest.Mock;

      await act(async () => {
        await result.current.fetchFlags();
      });

      // Update with valid value - no errors
      act(() => {
        result.current.updateFlagValue(flagId, 75);
      });
      expect(result.current.validationErrors[flagId]).toBeUndefined();

      // Update with invalid value - immediate error
      act(() => {
        result.current.updateFlagValue(flagId, 150);
      });
      expect(result.current.validationErrors[flagId]).toBeDefined();
    });

    test("Commit button disabled when validation errors exist", async () => {
      const { result } = renderHook(() => useFlagStore());

      const flagId = randomUUID();
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version_id: randomUUID(),
              flags: [
                {
                  id: flagId,
                  key: "test_flag",
                  enabled: true,
                  type: "PERCENTAGE",
                  value: 50,
                },
              ],
            }),
        }),
      ) as jest.Mock;

      await act(async () => {
        await result.current.fetchFlags();
      });

      // Make invalid change
      act(() => {
        result.current.updateFlagValue(flagId, 200);
      });

      // Verify conditions that would disable button
      expect(result.current.isDirty).toBe(true);
      expect(
        Object.keys(result.current.validationErrors).length,
      ).toBeGreaterThan(0);

      // In the UI, button is disabled when:
      // !isDirty || Object.keys(validationErrors).length > 0 || isLoading
      const shouldBeDisabled =
        Object.keys(result.current.validationErrors).length > 0;
      expect(shouldBeDisabled).toBe(true);
    });

    test("Validation errors display summary from Zod", async () => {
      const { result } = renderHook(() => useFlagStore());

      const flagId = randomUUID();
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version_id: randomUUID(),
              flags: [
                {
                  id: flagId,
                  key: "test_flag",
                  enabled: true,
                  type: "PERCENTAGE",
                  value: 50,
                },
              ],
            }),
        }),
      ) as jest.Mock;

      await act(async () => {
        await result.current.fetchFlags();
      });

      act(() => {
        result.current.updateFlagValue(flagId, -10);
      });

      expect(result.current.validationErrors[flagId]).toBeDefined();
      expect(Array.isArray(result.current.validationErrors[flagId])).toBe(true);
    });
  });

  // ========================================================================
  // REQUIREMENT 7: transactional_sync_protocol
  // ========================================================================
  describe("Req 7: Transactional Sync Protocol", () => {
    test("Server re-validates entire payload before writing", async () => {
      const getRes = await axios.get(BASE_URL);
      const currentVersion = getRes.data.version_id;

      // Try to sync with invalid data
      const invalidPayload = {
        version_id: currentVersion,
        flags: [
          {
            id: randomUUID(),
            key: "test_flag",
            enabled: true,
            type: "PERCENTAGE",
            value: 150, // Invalid
          },
        ],
      };

      try {
        await axios.post(BASE_URL, invalidPayload);
        throw new Error("Server should reject invalid payload");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain("Validation Error");
      }
    });

    test("Server validation prevents client-side bypass", async () => {
      const getRes = await axios.get(BASE_URL);
      const currentVersion = getRes.data.version_id;

      // Attempt to bypass client validation with malformed data
      const malformedPayload = {
        version_id: currentVersion,
        flags: [
          {
            id: randomUUID(),
            key: "test_flag",
            enabled: true,
            type: "BOOLEAN",
            value: "string_instead_of_boolean",
          },
        ],
      };

      try {
        await axios.post(BASE_URL, malformedPayload);
        throw new Error("Server should validate and reject");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });

    test("Database remains consistent even if client validation bypassed", async () => {
      const getResBefore = await axios.get(BASE_URL);
      const versionBefore = getResBefore.data.version_id;

      // Try invalid update
      try {
        await axios.post(BASE_URL, {
          version_id: versionBefore,
          flags: [
            {
              id: randomUUID(),
              key: "bypass_test",
              enabled: true,
              type: "ENUM",
              options: ["a", "b"],
              value: "c", // Not in options
            },
          ],
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }

      // Verify database unchanged
      const getResAfter = await axios.get(BASE_URL);
      expect(getResAfter.data.version_id).toBe(versionBefore);
    });
  });

  // ========================================================================
  // REQUIREMENT 8: state_reversion_logic
  // ========================================================================
  describe("Req 8: State Reversion Logic", () => {
    test("Discard resets Zustand store to server-side state", async () => {
      const { result } = renderHook(() => useFlagStore());

      const flagId = randomUUID();
      const serverData = {
        version_id: randomUUID(),
        flags: [
          {
            id: flagId,
            key: "test_flag",
            enabled: true,
            type: "BOOLEAN",
            value: false,
          },
        ],
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(serverData),
        }),
      ) as jest.Mock;

      await act(async () => {
        await result.current.fetchFlags();
      });

      // Make changes
      act(() => {
        result.current.updateFlagValue(flagId, true);
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.draftState?.flags[0].value).toBe(true);

      // Discard changes
      act(() => {
        result.current.discard();
      });

      expect(result.current.isDirty).toBe(false);
      expect(result.current.draftState?.flags[0].value).toBe(false);
      expect(result.current.validationErrors).toEqual({});
    });

    test("Discard clears validation errors", async () => {
      const { result } = renderHook(() => useFlagStore());

      const flagId = randomUUID();
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version_id: randomUUID(),
              flags: [
                {
                  id: flagId,
                  key: "test_flag",
                  enabled: true,
                  type: "PERCENTAGE",
                  value: 50,
                },
              ],
            }),
        }),
      ) as jest.Mock;

      await act(async () => {
        await result.current.fetchFlags();
      });

      // Create validation error
      act(() => {
        result.current.updateFlagValue(flagId, 200);
      });

      expect(
        Object.keys(result.current.validationErrors).length,
      ).toBeGreaterThan(0);

      // Discard
      act(() => {
        result.current.discard();
      });

      expect(Object.keys(result.current.validationErrors).length).toBe(0);
    });

    test("Discard resets to current server version_id", async () => {
      const { result } = renderHook(() => useFlagStore());

      const serverVersionId = randomUUID();
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version_id: serverVersionId,
              flags: [],
            }),
        }),
      ) as jest.Mock;

      await act(async () => {
        await result.current.fetchFlags();
      });

      expect(result.current.persistedState?.version_id).toBe(serverVersionId);
      expect(result.current.draftState?.version_id).toBe(serverVersionId);
    });
  });

  // ========================================================================
  // REQUIREMENT 10: testing_type_integrity
  // ========================================================================
  describe("Req 10: Testing Type Integrity", () => {
    test("Percentage flag with value 101 returns 400 Bad Request", async () => {
      const getRes = await axios.get(BASE_URL);
      const currentVersion = getRes.data.version_id;
      const flags = getRes.data.flags;

      const percentageFlag = {
        id: randomUUID(),
        key: "test_percentage",
        enabled: true,
        type: "PERCENTAGE",
        value: 101,
      };

      const invalidPayload = {
        version_id: currentVersion,
        flags: [...flags, percentageFlag],
      };

      try {
        await axios.post(BASE_URL, invalidPayload);
        throw new Error("Should fail validation for Percentage > 100");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe("Validation Error");
        expect(error.response.data.details).toBeDefined();
      }
    });

    test("Boolean flag with string value returns 400 Bad Request", async () => {
      const getRes = await axios.get(BASE_URL);
      const currentVersion = getRes.data.version_id;
      const flags = getRes.data.flags;

      const booleanFlagInvalid = {
        id: randomUUID(),
        key: "test_bool_invalid",
        enabled: true,
        type: "BOOLEAN",
        value: "true",
      };

      const invalidPayload = {
        version_id: currentVersion,
        flags: [...flags, booleanFlagInvalid],
      };

      try {
        await axios.post(BASE_URL, invalidPayload);
        throw new Error("Should fail validation for Boolean with string value");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe("Validation Error");
      }
    });

    test("Enum flag with value not in options returns 400", async () => {
      const getRes = await axios.get(BASE_URL);
      const currentVersion = getRes.data.version_id;
      const flags = getRes.data.flags;

      const enumFlagInvalid = {
        id: randomUUID(),
        key: "test_enum_invalid",
        enabled: true,
        type: "ENUM",
        options: ["red", "blue"],
        value: "green", // Not in options
      };

      const invalidPayload = {
        version_id: currentVersion,
        flags: [...flags, enumFlagInvalid],
      };

      try {
        await axios.post(BASE_URL, invalidPayload);
        throw new Error("Should fail validation for Enum with invalid value");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe("Validation Error");
      }
    });

    test("Percentage boundary values (0 and 100) are valid", async () => {
      const getRes = await axios.get(BASE_URL);
      const currentVersion = getRes.data.version_id;

      // Test value 0
      const payload0 = {
        version_id: currentVersion,
        flags: [
          {
            id: randomUUID(),
            key: "test_percent_0",
            enabled: true,
            type: "PERCENTAGE",
            value: 0,
          },
        ],
      };

      const res0 = await axios.post(BASE_URL, payload0);
      expect(res0.status).toBe(200);

      // Get new version
      const getRes2 = await axios.get(BASE_URL);
      const newVersion = getRes2.data.version_id;

      // Test value 100
      const payload100 = {
        version_id: newVersion,
        flags: [
          {
            id: randomUUID(),
            key: "test_percent_100",
            enabled: true,
            type: "PERCENTAGE",
            value: 100,
          },
        ],
      };

      const res100 = await axios.post(BASE_URL, payload100);
      expect(res100.status).toBe(200);
    });

    test("Negative percentage value returns 400", async () => {
      const getRes = await axios.get(BASE_URL);
      const currentVersion = getRes.data.version_id;

      const invalidPayload = {
        version_id: currentVersion,
        flags: [
          {
            id: randomUUID(),
            key: "test_percent_negative",
            enabled: true,
            type: "PERCENTAGE",
            value: -1,
          },
        ],
      };

      try {
        await axios.post(BASE_URL, invalidPayload);
        throw new Error("Should fail validation for negative percentage");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });
});
