import { useState } from 'react';
import type { Anamnesis, TherapyEntry, MedicationEntry, Method } from '../shared/domain';
import { getSuggestions, mapMethodLabelToCanonical } from '../shared/suggestions';

function ensureOption(list: string[], opt: string) {
  return list.includes(opt) ? list : [...list, opt];
}

/** Select mit Option "Eigener Eintrag …" + Textfeld im Custom-Modus */
function SelectWithCustom({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  options: string[];
  placeholder?: string;
}) {
  const CUSTOM = '__custom__';
  const opts = Array.from(new Set(options.filter(Boolean)));
  const [customMode, setCustomMode] = useState<boolean>(false);

  const selected = customMode ? CUSTOM : (value && opts.includes(value) ? value : '');

  return (
    <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        className="input"
        value={selected}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) { setCustomMode(false); onChange(null); return; }
          if (v === CUSTOM) { setCustomMode(true); onChange(value ?? ''); return; }
          setCustomMode(false); onChange(v);
        }}
      >
        <option value="">{placeholder ?? 'Bitte wählen…'}</option>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
        <option value={CUSTOM}>Eigener Eintrag …</option>
      </select>

      {customMode && (
        <input
          className="input"
          style={{ minWidth: 220 }}
          placeholder="Eigener Eintrag"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export default function AnamnesisForm({
  value,
  onChange,
}: {
  value: Anamnesis;
  onChange: (next: Anamnesis) => void;
}) {
  const v = value ?? {};

  function update<K extends keyof Anamnesis>(key: K, val: Anamnesis[K]) {
    onChange({ ...(v as Anamnesis), [key]: val });
  }

  const therapies = v.previous_therapies ?? [];
  const meds = v.medications ?? [];

  function updateTherapy(i: number, patch: Partial<TherapyEntry>) {
    const next = therapies.slice();
    next[i] = { ...next[i], ...patch };
    update('previous_therapies', next);
  }
  function addTherapy() { update('previous_therapies', [...therapies, { type: '' }]); }
  function removeTherapy(i: number) {
    const next = therapies.slice(); next.splice(i, 1); update('previous_therapies', next);
  }

  function updateMed(i: number, patch: Partial<MedicationEntry>) {
    const next = meds.slice();
    next[i] = { ...next[i], ...patch };
    update('medications', next);
  }
  function addMed() { update('medications', [...meds, { name: '' }]); }
  function removeMed(i: number) {
    const next = meds.slice(); next.splice(i, 1); update('medications', next);
  }

  const problemOptions = ensureOption(getSuggestions('problem'), 'Sonstige');
  const methodOptions  = ensureOption(getSuggestions('method'),  'Sonstige');
  const therapyOptions = ensureOption(getSuggestions('therapy'), 'Sonstige');

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>Anamnese (beim Ersttermin)</h3>

      {/* Anliegen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
        <label>
          Anliegen
          <SelectWithCustom
            value={v.initial_problem_category ?? null}
            onChange={(val) => update('initial_problem_category', val)}
            options={problemOptions}
            placeholder="Anliegen wählen"
          />
        </label>

        <label>
          Beschreibung
          <input
            className="input"
            placeholder="Text"
            value={v.initial_problem_text ?? ''}
            onChange={(e) => update('initial_problem_text', e.target.value || null)}
          />
        </label>
      </div>

      {/* Geplante Methode */}
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label>
          Geplante Methode
          <SelectWithCustom
            value={v.planned_method_text ?? null}
            onChange={(label) => {
              const text = label ?? null;
              const mapped: Method | null = text ? mapMethodLabelToCanonical(text) : null;
              onChange({ ...(v as Anamnesis), planned_method_text: text, planned_method: mapped });
            }}
            options={methodOptions}
            placeholder="Methode wählen"
          />
        </label>
      </div>

      {/* Bisherige Therapien */}
      <div style={{ marginTop: 8 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>Bisherige Therapien</h4>
          <button type="button" className="btn" onClick={addTherapy}>+ hinzufügen</button>
        </div>

        {therapies.length === 0 && <div className="hint">Noch keine Einträge.</div>}

        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          {therapies.map((t, i) => (
            <div key={i} className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <SelectWithCustom
                value={t.type}
                onChange={(txt) => updateTherapy(i, { type: (txt ?? '') })}
                options={therapyOptions}
                placeholder="Therapieart wählen"
              />
              <input
                className="input"
                type="number"
                min={0}
                placeholder="Dauer (Monate)"
                style={{ width: 140 }}
                value={t.duration_months ?? ''}
                onChange={(e) =>
                  updateTherapy(i, {
                    duration_months: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!!t.completed}
                  onChange={(e) => updateTherapy(i, { completed: e.target.checked })}
                />
                abgeschlossen?
              </label>
              <button type="button" className="btn" onClick={() => removeTherapy(i)}>Entfernen</button>
            </div>
          ))}
        </div>
      </div>

      {/* Medikamente */}
      <div style={{ marginTop: 8 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>Medikamente</h4>
          <button type="button" className="btn" onClick={addMed}>+ hinzufügen</button>
        </div>

        {meds.length === 0 && <div className="hint">Keine Medikamente erfasst.</div>}

        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          {meds.map((m, i) => (
            <div key={i} className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ minWidth: 220 }}
                placeholder="Name (z. B. Sertralin)"
                value={m.name}
                onChange={(e) => updateMed(i, { name: e.target.value })}
              />
              <input
                className="input"
                style={{ width: 140 }}
                placeholder="Dosierung (z. B. 50 mg)"
                value={m.dosage ?? ''}
                onChange={(e) => updateMed(i, { dosage: e.target.value || null })}
              />
              <input
                className="input"
                style={{ width: 160 }}
                placeholder="Frequenz (z. B. 1× täglich)"
                value={m.frequency ?? ''}
                onChange={(e) => updateMed(i, { frequency: e.target.value || null })}
              />
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!!m.current}
                  onChange={(e) => updateMed(i, { current: e.target.checked })}
                />
                aktuell?
              </label>
              <button type="button" className="btn" onClick={() => removeMed(i)}>Entfernen</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
