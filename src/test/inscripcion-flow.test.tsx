import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/track", () => ({
  tracker: new Proxy({}, { get: () => () => {} }),
}));
vi.mock("@/components/SEO", () => ({ default: () => null }));
vi.mock("@/components/WhatsAppLeadForm", () => ({ default: () => null }));

// Replace Radix Select with a native <select> for tests. Radix relies on
// pointer events / portals / measurements that don't work reliably in jsdom.
// We collect <SelectItem> children synchronously by walking React.Children.
vi.mock("@/components/ui/select", async () => {
  const React = await import("react");

  // Recursively collect any { value, children } pairs from a tree of
  // SelectItem (or anything carrying those props). Skips SelectTrigger.
  function collectItems(node: React.ReactNode, acc: { value: string; label: React.ReactNode }[]) {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return;
      const props = child.props as Record<string, unknown> | undefined;
      const ctype = (child.type as { __role?: string } | string) as { __role?: string };
      if (ctype && (ctype as { __role?: string }).__role === "trigger") return;
      if (props && typeof props.value === "string") {
        acc.push({ value: props.value, label: props.children as React.ReactNode });
      }
      if (props && props.children !== undefined) {
        collectItems(props.children as React.ReactNode, acc);
      }
    });
  }

  function Select({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    children: React.ReactNode;
  }) {
    const items: { value: string; label: React.ReactNode }[] = [];
    collectItems(children, items);
    return (
      <select
        data-testid="mock-select"
        value={value ?? ""}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        <option value="" disabled hidden>--</option>
        {items.map((it) => (
          <option key={it.value} value={it.value}>
            {String(it.label)}
          </option>
        ))}
      </select>
    );
  }

  const SelectTrigger = (() => {
    const C = (_props: { children?: React.ReactNode }) => null;
    (C as unknown as { __role: string }).__role = "trigger";
    return C;
  })();
  function SelectValue() { return null; }
  function SelectContent({ children }: { children?: React.ReactNode }) {
    return <>{children}</>;
  }
  function SelectItem({ children }: { value: string; children: React.ReactNode }) {
    // Items are read by Select via React.Children walking; rendering nothing
    // here keeps the DOM clean.
    return <>{null}{children && null}</>;
  }

  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

import Inscripcion from "../pages/Inscripcion";

beforeEach(() => {
  vi.stubGlobal("scrollTo", () => {});
  // VITE_GOOGLE_SHEET_WEBHOOK is read at module-import time, so we cannot inject
  // it from here — instead we just stub `fetch` and assert the call.
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true } as Response)));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Pin Math.random and skip the queue + viral gate to land on Step 1.
async function reachStep1() {
  const rng = vi.spyOn(Math, "random").mockReturnValue(0);
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <Inscripcion />
    </MemoryRouter>
  );
  const skipBtn = await screen.findByRole(
    "button",
    { name: /Saltar i pagar preu complet/i },
    { timeout: 15000 }
  );
  await user.click(skipBtn);
  await screen.findByText(/Nom de l'equip/i);
  rng.mockRestore();
  return user;
}

// Helper to set a value on the mocked Select. We mocked @/components/ui/select
// to render a native <select data-testid="mock-select"> that calls onValueChange
// on change. We pick the one whose options contain the desired text.
async function pickMockSelect(
  user: ReturnType<typeof userEvent.setup>,
  optionLabel: string,
  pickIndex = 0,
) {
  const selects = (screen.getAllByTestId("mock-select") as HTMLSelectElement[]).filter((s) =>
    Array.from(s.options).some((o) => o.text === optionLabel)
  );
  const target = selects[pickIndex];
  if (!target) {
    throw new Error(
      `No mock select #${pickIndex} with exact option "${optionLabel}". ` +
      `Available selects: ${(screen.queryAllByTestId("mock-select") as HTMLSelectElement[])
        .map((s) => Array.from(s.options).map((o) => o.text).join("|")).join(" / ")}`
    );
  }
  await user.selectOptions(target, optionLabel);
}

describe("Inscripcion · Flow happy path", () => {
  it(
    "walks all 5 steps and submits the inscription payload",
    { timeout: 40000 },
    async () => {
      const user = await reachStep1();

      // ── Step 1 ──
      await user.type(screen.getByPlaceholderText(/Barcelona Ballers/i), "Tigers BCN");
      await user.click(screen.getByRole("button", { name: /^4 jugadors/i }));
      await user.click(screen.getByRole("button", { name: /Següent/i }));

      // ── Step 2 ── Capità
      await screen.findByRole("heading", { name: /Capità.*Responsable/i });
      await user.type(screen.getByPlaceholderText(/^Nom$/), "Anna");
      await user.type(screen.getByPlaceholderText(/^Cognom$/), "Garcia");
      await user.type(screen.getByPlaceholderText(/email@exemple\.com/i), "anna@example.com");
      await user.type(screen.getByPlaceholderText(/\+34 600 000 000/), "600123456");
      // date input — use fireEvent.change since user.type doesn't always support type=date in jsdom
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      const { fireEvent } = await import("@testing-library/react");
      fireEvent.change(dateInput, { target: { value: "1990-01-15" } });
      // Categoria + Talla samarreta (mocked native selects).
      await pickMockSelect(user, "Sèniors");
      await pickMockSelect(user, "M");
      // Club actual del capità (camp obligatori)
      await user.type(screen.getByPlaceholderText(/Club on jugues/i), "CB Grup Barna");
      await user.click(screen.getByRole("button", { name: /Següent/i }));

      // ── Step 3 ── Jugadors 2-4 (since midaEquip=4 → numJugadors=4 → 3 extras)
      await screen.findByRole("heading", { name: /Resta de jugadors/i });
      const nomInputs = screen.getAllByPlaceholderText(/^Nom$/);
      const cognomInputs = screen.getAllByPlaceholderText(/^Cognom$/);
      expect(nomInputs).toHaveLength(3);
      for (let i = 0; i < 3; i++) {
        await user.type(nomInputs[i], `Jug${i + 2}`);
        await user.type(cognomInputs[i], `Cognom${i + 2}`);
      }
      // Talles dels 3 jugadors. Cada select és independent: l'usem per índex.
      for (let i = 0; i < 3; i++) {
        await pickMockSelect(user, "M", i);
      }
      // Club actual de cada jugador (camp obligatori)
      const clubInputs = screen.getAllByPlaceholderText(/Club on jugues/i);
      expect(clubInputs).toHaveLength(3);
      for (let i = 0; i < 3; i++) {
        await user.type(clubInputs[i], "Sense club");
      }
      await user.click(screen.getByRole("button", { name: /Següent/i }));

      // ── Step 4 ── Pagament (no required fields → just advance)
      await screen.findByRole("heading", { name: /Pagament/i });
      await user.click(screen.getByRole("button", { name: /Següent/i }));

      // ── Step 5 ── Bases + 3 checkboxes + submit
      await screen.findByRole("heading", { name: /Bases.*Confirmació/i });
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThanOrEqual(3);
      for (const cb of checkboxes) {
        await user.click(cb);
      }
      const submitBtn = screen.getByRole("button", { name: /Enviar Inscripció/i });
      const { fireEvent: fe } = await import("@testing-library/react");
      await act(async () => {
        fe.click(submitBtn);
      });

      // ── Asserts ──
      const fetchMock = (globalThis.fetch as unknown) as ReturnType<typeof vi.fn>;
      await waitFor(() => expect(fetchMock).toHaveBeenCalled(), { timeout: 5000 });
      // Success heading shows "INSCRIPCIÓ ENVIADA!" split across two lines.
      await screen.findByText(/ENVIADA/i, undefined, { timeout: 5000 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.nomEquip).toBe("Tigers BCN");
      expect(body.midaEquip).toBe("4");
      expect(body.capEmail).toBe("anna@example.com");
      expect(body.concepte).toBe("3X3+TIGERS_BCN");
      expect(body.teamId).toMatch(/^tigers-bcn-[a-z0-9]+$/);
    }
  );
});
