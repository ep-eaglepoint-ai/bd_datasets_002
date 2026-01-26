import { render, screen, fireEvent } from "@testing-library/react";
import Home from "./page";
// We don't import the actual store, we just mock the module that exports the hook
import * as useFlagStoreModule from "../store/useFlagStore";

// Mock the entire module
jest.mock("../store/useFlagStore", () => ({
  useFlagStore: jest.fn(),
}));

describe("Home Page Component Tests", () => {
  const mockUpdateFlagValue = jest.fn();
  const mockUpdateFlagType = jest.fn();
  const mockDiscard = jest.fn();
  const mockSync = jest.fn();
  const mockFetchFlags = jest.fn();

  const defaultStoreState = {
    draftState: {
      version_id: "v1",
      flags: [
        {
          id: "123e4567-e89b-12d3-a456-426614174000",
          key: "test_flag",
          description: "Test Desc",
          enabled: true,
          type: "BOOLEAN",
          value: true,
        },
      ],
    },
    isLoading: false,
    error: null,
    isDirty: false,
    validationErrors: {},
    fetchFlags: mockFetchFlags,
    updateFlagValue: mockUpdateFlagValue,
    updateFlagType: mockUpdateFlagType,
    sync: mockSync,
    discard: mockDiscard,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useFlagStoreModule.useFlagStore as unknown as jest.Mock).mockReturnValue(
      defaultStoreState,
    );
  });

  test("Requirement 5: Schema Driven UI - Renders correct input for BOOLEAN", () => {
    render(<Home />);
    expect(screen.getByText("test_flag")).toBeInTheDocument();
    expect(screen.getByText("ENABLED")).toBeInTheDocument();
    // Just find by clicking
    const toggle = screen.getByText("ENABLED").previousElementSibling;
    fireEvent.click(toggle!);
    expect(mockUpdateFlagValue).toHaveBeenCalledWith(
      "123e4567-e89b-12d3-a456-426614174000",
      false,
    );
  });

  test("Requirement 6: Real-time Error Reporting - Disables Sync button when invalid", () => {
    (useFlagStoreModule.useFlagStore as unknown as jest.Mock).mockReturnValue({
      ...defaultStoreState,
      isDirty: true,
      validationErrors: {
        "123e4567-e89b-12d3-a456-426614174000": ["Invalid value"],
      },
    });

    render(<Home />);

    const syncBtn = screen.getByRole("button", { name: /Sync Changes/i });
    expect(syncBtn).toBeDisabled();
    expect(screen.getByText("Invalid value")).toBeInTheDocument();
  });

  test("Requirement 6: Real-time Error Reporting - Disables Sync button when not dirty", () => {
    // default isDirty: false
    render(<Home />);
    const syncBtn = screen.getByRole("button", { name: /Sync Changes/i });
    expect(syncBtn).toBeDisabled();
  });

  test("Requirement 8: State Reversion UI - Check Discard Button", () => {
    (useFlagStoreModule.useFlagStore as unknown as jest.Mock).mockReturnValue({
      ...defaultStoreState,
      isDirty: true,
    });

    render(<Home />);
    const discardBtn = screen.getByRole("button", { name: /Discard/i });
    expect(discardBtn).toBeEnabled();

    fireEvent.click(discardBtn);
    expect(mockDiscard).toHaveBeenCalled();
  });

  test("Req 5: Verifying Enum Rendering", () => {
    (useFlagStoreModule.useFlagStore as unknown as jest.Mock).mockReturnValue({
      ...defaultStoreState,
      draftState: {
        version_id: "v1",
        flags: [
          {
            id: "2",
            key: "enum_flag",
            type: "ENUM",
            options: ["A", "B"],
            value: "A",
            enabled: true,
          },
        ],
      },
    });

    render(<Home />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});
