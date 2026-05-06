import { describe, it, expect } from "vitest";
import {
  buildTeamId,
  buildConcepte,
  buildEpcQr,
  calcTotal,
  precioByCat,
} from "../pages/Inscripcion.logic";

describe("buildTeamId", () => {
  it("slugifies the team name and appends a base36 timestamp", () => {
    const id = buildTeamId("Tigers BCN");
    expect(id).toMatch(/^tigers-bcn-[a-z0-9]+$/);
  });

  it("falls back to 'equip' for empty/undefined input", () => {
    expect(buildTeamId(undefined)).toMatch(/^equip-[a-z0-9]+$/);
    expect(buildTeamId("")).toMatch(/^equip-[a-z0-9]+$/);
  });
});

describe("buildConcepte", () => {
  it("uppercases ASCII and collapses runs of non-alphanumerics into a single underscore", () => {
    // Accents + spaces + punctuation are all stripped by /[^A-Z0-9]+/g and collapsed.
    expect(buildConcepte("Açò Èpic!")).toBe("3X3+A_PIC");
    // Plain ASCII case: spaces become a single underscore between words.
    expect(buildConcepte("Tigers BCN")).toBe("3X3+TIGERS_BCN");
    // Trim leading/trailing underscores that come from boundary punctuation.
    expect(buildConcepte("  Hello  ")).toBe("3X3+HELLO");
  });

  it("falls back to '3X3+EQUIP' for empty input", () => {
    expect(buildConcepte("")).toBe("3X3+EQUIP");
    expect(buildConcepte(undefined)).toBe("3X3+EQUIP");
  });
});

describe("buildEpcQr", () => {
  it("builds a valid 11-line EPC069-12 v002 payload", () => {
    const payload = buildEpcQr(75, "Tigers");
    const lines = payload.split("\n");
    expect(lines).toHaveLength(11);
    expect(lines[0]).toBe("BCD");
    expect(lines[1]).toBe("002");
    expect(lines[3]).toBe("SCT");
    expect(lines[7]).toBe("EUR75.00");
    expect(lines[10]).toBe("3X3+TIGERS");
  });
});

describe("calcTotal", () => {
  it("computes 4-jug Sèniors M with 5% code = 80.75€", () => {
    const r = calcTotal("4", "Sèniors M", true, false);
    expect(r.base).toBe(85);
    expect(r.desc5).toBeCloseTo(4.25, 2);
    expect(r.total).toBeCloseTo(80.75, 2);
  });

  it("never returns a negative total", () => {
    const r = calcTotal("4", "Sub-16", true, true);
    expect(r.total).toBeGreaterThanOrEqual(0);
  });
});

describe("precioByCat", () => {
  it("returns formative prices for non-senior categories", () => {
    expect(precioByCat("Sub-16", "5")).toBe(90);
    expect(precioByCat("Sub-12", "4")).toBe(75);
  });

  it("returns senior/veteran prices for those categories", () => {
    expect(precioByCat("Veterans M", "4")).toBe(85);
    expect(precioByCat("Sèniors F", "5")).toBe(105);
  });
});
