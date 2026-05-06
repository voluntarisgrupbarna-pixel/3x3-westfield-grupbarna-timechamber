import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// Stubs for modules that touch analytics, telemetry, or external SDKs we don't
// want to exercise in unit tests. They have no effect on the form state machine.
vi.mock("@/lib/track", () => ({
  tracker: new Proxy({}, { get: () => () => {} }),
}));
vi.mock("@/components/SEO", () => ({ default: () => null }));
vi.mock("@/components/WhatsAppLeadForm", () => ({ default: () => null }));

import Inscripcion from "../pages/Inscripcion";

function renderForm() {
  return render(
    <MemoryRouter>
      <Inscripcion />
    </MemoryRouter>
  );
}

// Skip the queue (8-20 positions × 550ms ticks ≈ up to 11.7s) and the viral gate.
// We pin Math.random to 0 so queueInitial = 8 and decrement is deterministic.
// Real timers are used end-to-end; tests get a generous timeout.
async function reachStep1() {
  const rng = vi.spyOn(Math, "random").mockReturnValue(0);
  const user = userEvent.setup();
  renderForm();
  // Wait for the queue to clear and the gate to render. queueInitial=8, dec=1 per
  // 550ms tick → ~4.4s + 700ms tail. findByRole polls under real timers.
  const skipBtn = await screen.findByRole(
    "button",
    { name: /No vull descompte.*continuar al preu complet/i },
    { timeout: 15000 }
  );
  await user.click(skipBtn);
  await screen.findByText(/Nom de l'equip/i);
  rng.mockRestore();
  return { user };
}

describe("Inscripcion · Step 1 (regressió bug nom equip)", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollTo", () => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the team name field and the 'Següent' button on Step 1", { timeout: 20000 }, async () => {
    await reachStep1();
    expect(screen.getByPlaceholderText(/Barcelona Ballers/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Següent/i })).toBeInTheDocument();
  });

  it("clicking 'Següent' with empty nomEquip shows Catalan error and stays on Step 1", { timeout: 20000 }, async () => {
    const { user } = await reachStep1();
    await user.click(screen.getByRole("button", { name: /Següent/i }));
    expect(
      await screen.findByText(/El nom de l'equip ha de tenir almenys 2 caràcters/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Nom i mida de l'equip/i)).toBeInTheDocument();
  });

  it("valid nomEquip + size 4 + 'Següent' advances to Step 2 (Capità)", { timeout: 20000 }, async () => {
    const { user } = await reachStep1();
    await user.type(
      screen.getByPlaceholderText(/Barcelona Ballers/i),
      "Tigers BCN"
    );
    await user.click(screen.getByRole("button", { name: /^4 jugadors/i }));
    await user.click(screen.getByRole("button", { name: /Següent/i }));
    expect(
      await screen.findByRole("heading", { name: /Capità.*Responsable/i })
    ).toBeInTheDocument();
  });

  it("Enter inside nomEquip with no size selected does NOT submit and stays on Step 1", { timeout: 20000 }, async () => {
    const { user } = await reachStep1();
    const input = screen.getByPlaceholderText(/Barcelona Ballers/i);
    await user.type(input, "Tigers BCN{Enter}");
    // No advance: heading remains.
    expect(screen.getByText(/Nom i mida de l'equip/i)).toBeInTheDocument();
    // After selecting the size, Enter should advance.
    await user.click(screen.getByRole("button", { name: /^4 jugadors/i }));
    await user.click(input);
    await user.keyboard("{Enter}");
    expect(
      await screen.findByRole("heading", { name: /Capità.*Responsable/i })
    ).toBeInTheDocument();
  });

  it("1-character nomEquip + valid size + 'Següent' stays on Step 1 (boundary)", { timeout: 20000 }, async () => {
    const { user } = await reachStep1();
    await user.type(screen.getByPlaceholderText(/Barcelona Ballers/i), "X");
    await user.click(screen.getByRole("button", { name: /^4 jugadors/i }));
    await user.click(screen.getByRole("button", { name: /Següent/i }));
    expect(
      await screen.findByText(/El nom de l'equip ha de tenir almenys 2 caràcters/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Nom i mida de l'equip/i)).toBeInTheDocument();
  });
});
