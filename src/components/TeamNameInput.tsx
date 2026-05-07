import { forwardRef, useEffect, useMemo } from "react";
import { Check, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRegisteredTeamNames } from "@/lib/teamNames";
import { normalizeTeamName, genNameSuggestions } from "@/pages/Inscripcion.logic";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  name?: string;
  placeholder?: string;
  className?: string;
  /** Si el nom està duplicat, comuniquem al pare per bloquejar submit. */
  onAvailabilityChange?: (state: { available: boolean; checking: boolean }) => void;
};

/* Camp del nom d'equip amb:
   - Comprovació de disponibilitat en temps real (case + accent insensitive)
   - 3 suggeriments automàtics si està registrat
   - Indicador visual verd/vermell

   Failure mode: si la llista no es carrega (xarxa caiguda) → comportament neutral
   (no mostra ni verd ni vermell); el backend continua tenint l'última paraula. */
export const TeamNameInput = forwardRef<HTMLInputElement, Props>(function TeamNameInput(
  { value, onChange, onBlur, name, placeholder, className, onAvailabilityChange },
  ref,
) {
  const { normalizedSet, loading, error } = useRegisteredTeamNames();

  const trimmed = (value || "").trim();
  const normalized = normalizeTeamName(trimmed);
  const tooShort = normalized.length < 2;
  const isDuplicate = !tooShort && !error && normalizedSet.has(normalized);
  const isAvailable = !tooShort && !loading && !error && !normalizedSet.has(normalized);

  const suggestions = useMemo(
    () => (isDuplicate ? genNameSuggestions(trimmed, normalizedSet) : []),
    [isDuplicate, trimmed, normalizedSet],
  );

  // Comuniquem l'estat al formulari (per bloquejar submit)
  useEffect(() => {
    onAvailabilityChange?.({ available: !isDuplicate, checking: loading && !error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDuplicate, loading, error]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          ref={ref}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={40}
          autoComplete="off"
          className={cn(
            "pr-9",
            isDuplicate && "border-red-500 focus-visible:ring-red-500/40",
            isAvailable && "border-emerald-500/70 focus-visible:ring-emerald-500/40",
            className,
          )}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading && !value ? (
            <Loader2 className="h-4 w-4 animate-spin text-white/40" aria-hidden />
          ) : isDuplicate ? (
            <AlertCircle className="h-4 w-4 text-red-400" aria-label="Nom registrat" />
          ) : isAvailable ? (
            <Check className="h-4 w-4 text-emerald-400" aria-label="Disponible" />
          ) : null}
        </div>
      </div>

      {/* Estat textual */}
      {isAvailable && (
        <p className="text-xs text-emerald-400 flex items-center gap-1">
          <Check className="h-3 w-3" aria-hidden /> Nom disponible
        </p>
      )}
      {isDuplicate && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
          <p className="font-medium flex items-center gap-1.5 mb-2">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
            Aquest nom ja està registrat. Prova:
          </p>
          {suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange(s)}
                  className="inline-flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/20 transition px-3 py-1 text-white text-xs font-medium"
                >
                  <Sparkles className="h-3 w-3 text-amber-300" aria-hidden />
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <p>Tria un nom diferent (afegeix-hi una ciutat, número o adjectiu).</p>
          )}
        </div>
      )}
      {error && !isDuplicate && !isAvailable && (
        <p className="text-xs text-white/40">
          No s'ha pogut comprovar la disponibilitat ara mateix · es validarà a l'enviar.
        </p>
      )}
    </div>
  );
});
