import { useEffect, useState } from "react";
import NavBar, { type Tab } from "./components/NavBar";
import ClientsPage from "./pages/ClientsPage";
import SessionsPage from "./pages/SessionsPage";
import ReportPage from "./pages/ReportPage";

/** Hash -> Tab (clients | sessions | report) */
function parseTabFromHash(hash: string): Tab | null {
  const raw = hash.replace(/^#\//, "").replace(/^#/, "");
  return raw === "clients" || raw === "sessions" || raw === "report"
    ? raw
    : null;
}

export default function App() {
  // Starttab aus URL lesen (Fallback: clients)
  const [active, setActive] = useState<Tab>(() => {
    if (typeof window === "undefined") return "clients";
    return parseTabFromHash(window.location.hash) ?? "clients";
  });

  // Key, um die SessionsPage beim Menü‑Klick neu zu montieren
  const [sessionsKey, setSessionsKey] = useState(0);

  // Auf Hash‑Änderungen reagieren -> active setzen
  useEffect(() => {
    const onHashChange = () => {
      const t = parseTabFromHash(window.location.hash);
      if (t) setActive(t);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Menüwechsel (NavBar)
  function handleNavChange(tab: Tab) {
    window.location.hash = tab; // sorgt auch für Back/Forward‑Kompatibilität
    setActive(tab);
    if (tab === "sessions") {
      // optional: remount der Seite (Dialog‑State etc. zurücksetzen)
      setSessionsKey((k) => k + 1);
    }
  }

  // Aus Sitzungen zu einem Klienten springen (optional)
  function goToClient(id: number) {
    window.location.hash = `#clients?id=${id}`;
    setActive("clients");
    // Nach dem Tabwechsel zur Klientenliste scrollen (falls Element vorhanden)
    setTimeout(() => {
      document.getElementById(`client-${id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  return (
    <div className="topbar">
      <div className="container">
        <div className="headerBar">
          {/* Passe den Pfad zu deinem Logo an (z. B. /logo.svg oder /logo.png) */}
          <img className="logo" src="/notizia_logo.png" alt="Notizia" />
          <h1 className="title">Heilerfolge sichtbar machen</h1>
        </div>
      
      <div>
        <NavBar active={active} onChange={handleNavChange} />

        {/* Hauptbereich */}
        <main id="main" role="main" tabIndex={-1}>
          {active === "clients" && <ClientsPage />}

          {active === "sessions" && (
            <SessionsPage
              key={sessionsKey}
              onGoToClient={goToClient} // optional; wird in SessionsPage abgefangen
            />
          )}

          {active === "report" && <ReportPage />}
        </main>
      </div>
      </div>
    </div>
  );
}
