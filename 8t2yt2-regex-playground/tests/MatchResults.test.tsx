import React from "react";
import { render, screen } from "@testing-library/react";

import MatchResults from "../repository_after/src/components/MatchResults";

describe("MatchResults", () => {
  it("renders match metadata and nested capture groups", () => {
    render(
      <MatchResults
        matches={[
          {
            index: 4,
            end: 9,
            match: "café",
            groups: [
              {
                index: 1,
                name: "outer",
                text: "café",
                start: 4,
                end: 8,
                parentIndex: null,
              },
              {
                index: 2,
                name: "inner",
                text: "afé",
                start: 5,
                end: 8,
                parentIndex: 1,
              },
            ],
          },
        ]}
        executionTimeMs={2.5}
        truncated={false}
        status="idle"
      />,
    );

    expect(screen.getByText("1 match")).toBeInTheDocument();
    expect(screen.getByText("[4, 9)")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("(outer)")).toBeInTheDocument();
    expect(screen.getByText("parent #1")).toBeInTheDocument();
  });

  it("shows running status and truncation", () => {
    render(
      <MatchResults
        matches={[]}
        executionTimeMs={0.5}
        truncated
        status="running"
      />,
    );

    expect(screen.getByText("Running…")).toBeInTheDocument();
    expect(screen.getByText("Results truncated")).toBeInTheDocument();
  });

  it("shows regex error message", () => {
    render(
      <MatchResults
        matches={[]}
        executionTimeMs={0}
        truncated={false}
        error="Invalid regular expression"
        status="idle"
      />,
    );

    expect(screen.getByText("Regex Error")).toBeInTheDocument();
    expect(screen.getByText("Invalid regular expression")).toBeInTheDocument();
  });
});
