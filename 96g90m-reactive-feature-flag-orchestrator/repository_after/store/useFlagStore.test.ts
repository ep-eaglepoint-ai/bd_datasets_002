import { act } from "@testing-library/react";
import { useFlagStore } from "./useFlagStore";
import { FeatureFlag, Configuration } from "@/lib/schema";

// Mock fetch
global.fetch = jest.fn();

describe("useFlagStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFlagStore.setState({
      persistedState: null,
      draftState: null,
      isDirty: false,
      validationErrors: {},
      isLoading: false,
      error: null,
    });
  });

  const mockFlags: FeatureFlag[] = [
    {
      id: "123e4567-e89b-12d3-a456-426614174000",
      key: "test_flag",
      description: "Test",
      enabled: true,
      type: "BOOLEAN",
      value: true,
    },
    {
      id: "123e4567-e89b-12d3-a456-426614174001",
      key: "percent_flag",
      enabled: true,
      type: "PERCENTAGE",
      value: 50,
    },
  ];

  const mockConfig: Configuration = {
    version_id: "123e4567-e89b-12d3-a456-426614174999",
    flags: mockFlags,
  };

  test("Requirement 2: Draft State Orchestration - maintains staged changes separate from persisted", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockConfig,
    });

    await act(async () => {
      await useFlagStore.getState().fetchFlags();
    });

    const state = useFlagStore.getState();
    expect(state.persistedState).toEqual(mockConfig);
    expect(state.draftState).toEqual(mockConfig);
    expect(state.isDirty).toBe(false);

    // Update value
    act(() => {
      useFlagStore
        .getState()
        .updateFlagValue("123e4567-e89b-12d3-a456-426614174000", false);
    });

    const newState = useFlagStore.getState();
    expect(newState.draftState?.flags[0].value).toBe(false); // Changed
    expect(newState.persistedState?.flags[0].value).toBe(true); // Unchanged
    expect(newState.isDirty).toBe(true); // Computed flag
  });

  test("Requirement 6: Real-time Error Reporting (Validation Logic)", () => {
    // Setup initial state
    useFlagStore.setState({
      persistedState: mockConfig,
      draftState: mockConfig,
    });

    // Update with invalid Percentage
    act(() => {
      useFlagStore
        .getState()
        .updateFlagValue("123e4567-e89b-12d3-a456-426614174001", 101);
    });

    const state = useFlagStore.getState();
    expect(
      state.validationErrors["123e4567-e89b-12d3-a456-426614174001"],
    ).toBeDefined();
    expect(state.isDirty).toBe(true);

    // Fix it
    act(() => {
      useFlagStore
        .getState()
        .updateFlagValue("123e4567-e89b-12d3-a456-426614174001", 100);
    });

    expect(
      useFlagStore.getState().validationErrors[
        "123e4567-e89b-12d3-a456-426614174001"
      ],
    ).toBeUndefined();
  });

  test("Requirement 8: State Reversion Logic (Discard)", () => {
    useFlagStore.setState({
      persistedState: mockConfig,
      draftState: mockConfig,
    });

    // Make dirty
    act(() => {
      useFlagStore
        .getState()
        .updateFlagValue("123e4567-e89b-12d3-a456-426614174000", false);
    });
    expect(useFlagStore.getState().isDirty).toBe(true);

    // Discard
    act(() => {
      useFlagStore.getState().discard();
    });

    const state = useFlagStore.getState();
    expect(state.draftState).toEqual(mockConfig);
    expect(state.isDirty).toBe(false);
    expect(state.draftState?.flags[0].value).toBe(true);
  });

  test("Requirement 5: Schema Driven UI (Type Change Reset)", () => {
    useFlagStore.setState({
      persistedState: mockConfig,
      draftState: mockConfig,
    });

    // Change BOOLEAN to PERCENTAGE
    act(() => {
      useFlagStore
        .getState()
        .updateFlagType("123e4567-e89b-12d3-a456-426614174000", "PERCENTAGE");
    });

    const state = useFlagStore.getState();
    const flag = state.draftState?.flags[0];
    expect(flag?.type).toBe("PERCENTAGE");
    expect(flag?.value).toBe(0); // Default reset value
  });
});
