import { describe, it, expect } from "vitest";
import { schema } from "../pages/Inscripcion.logic";

const validBase = {
  nomEquip: "Tigers BCN",
  midaEquip: "4" as const,
  capNom: "Anna",
  capCognom: "Garcia Lopez",
  capEmail: "anna@example.com",
  capTelefon: "600123456",
  capDataNaix: "1990-01-15",
  capCategoria: "Sèniors M",
  capTalla: "M",
  capClub: "CB Grup Barna",
  jugadors: [
    { nom: "Joan", cognom: "Pi", talla: "L", email: "", telefon: "", club: "CB Grup Barna" },
    { nom: "Marc", cognom: "Roca", talla: "M", email: "", telefon: "", club: "Sense club" },
    { nom: "Pere", cognom: "Sala", talla: "S", email: "", telefon: "", club: "CB Sant Martí" },
  ],
  acceptaBases: true,
  acceptaLopd: true,
  acceptaImatge: true,
  acceptaCancellacio: true,
};

describe("Inscripcion Zod schema", () => {
  it("rejects empty nomEquip with Catalan message", () => {
    const r = schema.safeParse({ ...validBase, nomEquip: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = r.error.issues.find(i => i.path[0] === "nomEquip")?.message;
      expect(msg).toBe("El nom de l'equip ha de tenir almenys 2 caràcters");
    }
  });

  it("rejects 1-character nomEquip (boundary) with Catalan message", () => {
    const r = schema.safeParse({ ...validBase, nomEquip: "X" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = r.error.issues.find(i => i.path[0] === "nomEquip")?.message;
      expect(msg).toBe("El nom de l'equip ha de tenir almenys 2 caràcters");
      expect(msg).not.toMatch(/String must contain/i);
    }
  });

  it("rejects missing midaEquip with Catalan message", () => {
    const r = schema.safeParse({ ...validBase, midaEquip: undefined });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = r.error.issues.find(i => i.path[0] === "midaEquip")?.message;
      expect(msg).toBe("Selecciona la mida de l'equip");
    }
  });

  it("partial step-1 (nomEquip + midaEquip) passes the picked schema", () => {
    const step1 = schema.pick({ nomEquip: true, midaEquip: true });
    const r = step1.safeParse({ nomEquip: "Tigers", midaEquip: "4" });
    expect(r.success).toBe(true);
  });

  it("rejects invalid capEmail with 'Email no vàlid'", () => {
    const r = schema.safeParse({ ...validBase, capEmail: "not-an-email" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = r.error.issues.find(i => i.path[0] === "capEmail")?.message;
      expect(msg).toBe("Email no vàlid");
    }
  });

  it("rejects empty capClub with Catalan message", () => {
    const r = schema.safeParse({ ...validBase, capClub: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = r.error.issues.find(i => i.path[0] === "capClub")?.message;
      expect(msg).toBe("Indica el club o escriu 'Sense club'");
    }
  });

  it("rejects empty club on a jugador with Catalan message", () => {
    const jugadors = [
      { ...validBase.jugadors[0], club: "" },
      validBase.jugadors[1],
      validBase.jugadors[2],
    ];
    const r = schema.safeParse({ ...validBase, jugadors });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find(i => i.path[0] === "jugadors" && i.path[2] === "club");
      expect(issue?.message).toBe("Indica el club o escriu 'Sense club'");
    }
  });

  it("accepts validBase with all clubs filled", () => {
    const r = schema.safeParse(validBase);
    expect(r.success).toBe(true);
  });
});
