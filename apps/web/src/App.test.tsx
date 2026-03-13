import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "./App.js";

describe("App", () => {
  it("renders the sidebar brand", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    const headings = screen.getAllByRole("heading", { name: "Semaforo" });
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the applications page by default", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    const headings = screen.getAllByRole("heading", { name: "Applications" });
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });
});
