import { useCallback, useEffect, useMemo, useState } from "react";
import type { Client, Gender, Anamnesis } from "../shared/domain";
import { storage } from "../shared/storage";
import { filterAndSortClients, validateClientInput } from "../shared/clients";
import AnamnesisForm from "../components/AnamnesisForm";
import { learn } from "../shared/suggestions";

/** Strikter Typ für Storage ohne any */
type StorageAPI = {
  listClients: () => Promise<Client[]>;
  addClient: (
    name: string,
    gender: Gender,
    age: number | null
  ) => Promise<void>;
  updateClient?: (
    patch: { id: number } & Partial<Client>
  ) => Promise<Client | void>;
  deleteClient?: (id: number) => Promise<void>;
};

const s = storage as unknown as StorageAPI;

/* ------------- Hash-Helpers (Deep Links) ------------- */
function parseSelectedIdFromHash(): number | null {
  // akzeptiert #clients?id=42
  const h = window.location.hash;
  if (!h.startsWith("#clients")) return null;
  const qIndex = h.indexOf("?");
  if (qIndex === -1) return null;
  const qs = new URLSearchParams(h.slice(qIndex + 1));
  const id = qs.get("id");
  return id ? Number(id) : null;
}
function gotoClient(id: number) {
  window.location.hash = `#clients?id=${id}`;
}

export default function ClientsPage() {
  // Daten
  const [clients, setClients] = useState<Client[]>([]);

  // Neuer Klient (Form)
  const [name, setName] = useState("");
  const [newGender, setNewGender] = useState<Gender>("w");
  const [newAge, setNewAge] = useState<number | "">("");
  const [anamnesis, setAnamnesis] = useState<Anamnesis>({});

  // Suche + Auswahl
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Edit-Modus + Draft für Karteikarte
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<{
    name: string;
    gender: Gender | null;
    age: number | null;
    anamnesis: Anamnesis | null;
  }>({ name: "", gender: null, age: null, anamnesis: null });

  const refresh = useCallback(async () => {
    const list = await s.listClients();
    setClients(list);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Hash lesen (Deep-Link auf #clients?id=…)
  useEffect(() => {
    const apply = () => setSelectedId(parseSelectedIdFromHash());
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const visibleClients = useMemo(
    () => filterAndSortClients(clients, query),
    [clients, query]
  );

  // --------- Create ----------
  async function createClient() {
    const check = validateClientInput(name);
    if (!check.ok) return;

    // 1) Client anlegen – addClient: Positionsparameter, Rückgabe: void
    await s.addClient(
      check.value.name,
      newGender,
      newAge === "" ? null : Number(newAge)
    );

    // 2) Anamnese anhängen – falls updateClient existiert
    if (s.updateClient) {
      const after = await s.listClients();
      const created = after[after.length - 1]; // heuristisch: letzter ist neu
      if (created) {
        await s.updateClient({ id: created.id, anamnesis });
        gotoClient(created.id); // direkt Klientenkartei öffnen
      }
    }

    // 3) Vokabeln lernen
    const therapyLabels = (anamnesis?.previous_therapies ?? [])
      .map((t) => t.type)
      .filter((x): x is string => !!x && x.trim().length > 0);
    if (therapyLabels.length) learn("therapy", therapyLabels);
    if (anamnesis?.initial_problem_category)
      learn("problem", [anamnesis.initial_problem_category]);
    if (anamnesis?.planned_method_text)
      learn("method", [anamnesis.planned_method_text]);

    // 4) Reset + Refresh
    setName("");
    setNewGender("w");
    setNewAge("");
    setAnamnesis({});
    await refresh();
  }

  // ausgewählter Klient
  const selected = useMemo(
    () =>
      selectedId != null
        ? clients.find((c) => c.id === selectedId) ?? null
        : null,
    [selectedId, clients]
  );

  // in den Edit-Draft übernehmen, wenn Edit startet
  function startEdit() {
    if (!selected) return;
    setDraft({
      name: selected.name ?? "",
      gender: selected.gender ?? null,
      age: selected.age ?? null,
      anamnesis: selected.anamnesis ?? {},
    });
    setEditMode(true);
  }
  function cancelEdit() {
    setEditMode(false);
  }
  async function saveEdit() {
    if (!s.updateClient || !selected) return;
    await s.updateClient({
      id: selected.id,
      name: draft.name,
      gender: draft.gender ?? null,
      age: draft.age ?? null,
      anamnesis: draft.anamnesis ?? null,
    });
    setEditMode(false);
    await refresh();
  }

  async function deleteSelected() {
    if (!s.deleteClient || selectedId == null) return;
    if (!confirm("Klienten wirklich löschen?")) return;
    await s.deleteClient(selectedId);
    setSelectedId(null);
    await refresh();
  }

  const nameCheck = validateClientInput(name);

  return (
    <section className="card" style={{ display: "grid", gap: 12 }}>
      <h1 style={{ marginTop: 0 }}>Klienten</h1>

      {/* --------- Klient anlegen --------- */}
      <div className="cardSection">
        {/* <--- NEU: Rahmen + Padding */}
        <div className="formGrid" style={{ background: "#f9fff9" }}>
          <h2 style={{ marginTop: 0 }}>Klient anlegen</h2>

          <label style={{ display: "block", marginBottom: 8 }}>
            Name
            <input
              className="input"
              placeholder="Klientenname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={
                !nameCheck.ok && name.trim()
                  ? { borderColor: "#d33" }
                  : undefined
              }
            />
          </label>

          <div className="formGrid" style={{ marginTop: 8 }}>
            <div className="field">
              <span>Geschlecht</span>
              <div className="row">
                <label>
                  <input
                    type="radio"
                    name="gender"
                    checked={newGender === "w"}
                    onChange={() => setNewGender("w")}
                  />{" "}
                  weiblich
                </label>
                <label>
                  <input
                    type="radio"
                    name="gender"
                    checked={newGender === "m"}
                    onChange={() => setNewGender("m")}
                  />{" "}
                  männlich
                </label>
                <label>
                  <input
                    type="radio"
                    name="gender"
                    checked={newGender === "d"}
                    onChange={() => setNewGender("d")}
                  />{" "}
                  divers
                </label>
              </div>
            </div>

            <label>
              Alter
              <input
                className="input"
                type="number"
                min={0}
                placeholder="z. B. 35"
                value={newAge}
                onChange={(e) =>
                  setNewAge(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </label>
          </div>

          {/* ---- ANAMNESE ---- */}
          <AnamnesisForm value={anamnesis} onChange={setAnamnesis} />

          <div className="actions" style={{ marginTop: 10 }}>
            <button
              className="btn btnPrimary"
              onClick={createClient}
              disabled={!nameCheck.ok}
            >
              Anlegen
            </button>
          </div>

          {!s.updateClient && (
            <div className="hint" style={{ marginTop: 6 }}>
              Hinweis: Dein Storage hat keine <code>updateClient</code>
              -Funktion. Die Anamnese wird beim Anlegen gesetzt; spätere
              Bearbeitung ist aktuell nicht möglich.
            </div>
          )}
        </div>
      </div>
      {/* --------- Klient suchen --------- */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Klient suchen</h2>
        <div className="row" style={{ gap: 12, alignItems: "center" }}>
          <label style={{ flex: 1 }}>
            Name
            <input
              className="input"
              placeholder="Name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="hint">Keine Vorschläge</div>
        </div>
        <div style={{ marginTop: 8 }} className="hint">
          {visibleClients.length} Klient
          {visibleClients.length === 1 ? "" : "en"}
        </div>

        {/* Trefferliste */}
        {visibleClients.length === 0 ? (
          <div className="hint">Keine Treffer.</div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 8,
            }}
          >
            {visibleClients.map((c) => (
              <li
                key={c.id}
                id={`client-${c.id}`}
                className="row"
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <button
                  className="btn"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "var(--primary)",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setSelectedId(c.id);
                    gotoClient(c.id);
                  }}
                >
                  <strong>#{c.id}</strong> {c.name}{" "}
                  <span className="hint">
                    {c.gender ?? "–"}
                    {c.age != null ? ` · ${c.age} J.` : ""}
                  </span>
                </button>
                <div className="row" style={{ gap: 8 }}>
                  {/* Deep-Link: Sitzungen dieses Klienten */}
                  <a className="btn" href={`#sessions?client=${c.id}`}>
                    Zu den Sitzungen
                  </a>
                  <a className="btn" href={`#clients?id=${c.id}`}>
                    Zur Klientenkartei
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* --------- Klientenkartei / Details --------- */}
      {selected && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            Klient #{selected.id} – Klientenkartei
          </h3>

          {/* Stammdaten */}
          <div
            className="row"
            style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}
          >
            <input
              className="input"
              style={{ minWidth: 220 }}
              value={editMode ? draft.name ?? "" : selected.name ?? ""}
              onChange={(e) =>
                editMode && setDraft((d) => ({ ...d, name: e.target.value }))
              }
              disabled={!editMode}
              placeholder="-"
            />
            <select
              className="input"
              value={editMode ? draft.gender ?? "" : selected.gender ?? ""}
              onChange={(e) =>
                editMode &&
                setDraft((d) => ({
                  ...d,
                  gender: (e.target.value || null) as Gender | null,
                }))
              }
              disabled={!editMode}
            >
              <option value="">-</option>
              <option value="w">weiblich</option>
              <option value="m">männlich</option>
              <option value="d">divers</option>
            </select>
            <input
              className="input"
              type="number"
              min={0}
              style={{ width: 120 }}
              value={editMode ? draft.age ?? "" : selected.age ?? ""}
              onChange={(e) =>
                editMode &&
                setDraft((d) => ({
                  ...d,
                  age: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              disabled={!editMode}
              placeholder="-"
            />
            <a className="btn" href={`#sessions?client=${selected.id}`}>
              Zu den Sitzungen
            </a>
            {s.deleteClient && (
              <button className="btn" onClick={deleteSelected}>
                Löschen
              </button>
            )}
            {s.updateClient && !editMode && (
              <button className="btn btnPrimary" onClick={startEdit}>
                Bearbeiten
              </button>
            )}
            {s.updateClient && editMode && (
              <>
                <button className="btn btnPrimary" onClick={saveEdit}>
                  Speichern
                </button>
                <button className="btn" onClick={cancelEdit}>
                  Abbrechen
                </button>
              </>
            )}
          </div>

          {/* Anamnese – Zusammenfassung oder Editor */}
          {!editMode ? (
            <div className="card" style={{ marginTop: 12 }}>
              <h4 style={{ margin: 0 }}>Anamnese</h4>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <div className="hint">Anliegen (Kategorie)</div>
                <div>{selected.anamnesis?.initial_problem_category || "-"}</div>

                <div className="hint">Beschreibung</div>
                <div>{selected.anamnesis?.initial_problem_text || "-"}</div>

                <div className="hint">Geplante Methode</div>
                <div>{selected.anamnesis?.planned_method_text || "-"}</div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div className="hint" style={{ marginBottom: 4 }}>
                  Bisherige Therapien
                </div>
                {selected.anamnesis?.previous_therapies?.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {selected.anamnesis.previous_therapies.map((t, i) => (
                      <li key={i}>
                        {t.type || "-"}
                        {t.duration_months != null
                          ? ` · ${t.duration_months} Mon.`
                          : ""}
                        {t.completed != null
                          ? ` · ${
                              t.completed
                                ? "abgeschlossen"
                                : "nicht abgeschlossen"
                            }`
                          : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>-</div>
                )}
              </div>

              <div style={{ marginTop: 8 }}>
                <div className="hint" style={{ marginBottom: 4 }}>
                  Medikamente
                </div>
                {selected.anamnesis?.medications?.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {selected.anamnesis.medications.map((m, i) => (
                      <li key={i}>
                        {m.name || "-"}
                        {m.dosage ? ` · ${m.dosage}` : ""}
                        {m.frequency ? ` · ${m.frequency}` : ""}
                        {m.current != null
                          ? ` · ${m.current ? "aktuell" : "nicht aktuell"}`
                          : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>-</div>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ marginTop: 12 }}>
              <h4 style={{ margin: 0 }}>Anamnese bearbeiten</h4>
              <AnamnesisForm
                value={draft.anamnesis ?? {}}
                onChange={(next) =>
                  setDraft((d) => ({ ...d, anamnesis: next }))
                }
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
