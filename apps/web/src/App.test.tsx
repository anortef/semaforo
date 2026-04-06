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

  it("redirects to login when not authenticated", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getAllByText("Sign In").length).toBeGreaterThanOrEqual(1);
  });
});
