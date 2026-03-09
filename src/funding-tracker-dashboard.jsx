import { useState, useEffect, useCallback } from "react";

const SOURCES = [
  { id: "cdti", label: "CDTI", color: "#0F4C81" },
  { id: "isciii", label: "ISCIII", color: "#1B813E" },
  { id: "cm", label: "Comunidad de Madrid", color: "#C41E3A" },
  { id: "horizon", label: "Horizon Europe", color: "#003399" },
  { id: "aei", label: "AEI", color: "#6B4C9A" },
  { id: "enisa", label: "ENISA", color: "#2E86AB" },
  { id: "fecyt", label: "FECYT", color: "#8B5CF6" },
  { id: "redes", label: "Red.es / ICEX", color: "#0891B2" },
  { id: "eit", label: "EIT Health / AAL", color: "#059669" },
  { id: "eranet", label: "ERA-NET / COST", color: "#1D4ED8" },
  { id: "fundacion", label: "Fundaciones Privadas", color: "#B8860B" },
  { id: "agregador", label: "Agregadores", color: "#78716C" },
  { id: "otra", label: "Otra", color: "#555" },
];

const STATUS_MAP = {
  open: { label: "Abierta", color: "#1B813E", bg: "#E8F5E9" },
  upcoming: { label: "Próxima", color: "#E67E22", bg: "#FFF3E0" },
  closed: { label: "Cerrada", color: "#999", bg: "#F5F5F5" },
  applied: { label: "Solicitada", color: "#0F4C81", bg: "#E3F2FD" },
  descartada: { label: "Descartada", color: "#777", bg: "#EEEEEE" },
};

const ELEGIBILITY = [
  "Empresa privada",
  "Empresa + Centro público (consorcio)",
  "Centro acreditado SNS",
  "Doctorado Industrial",
  "Investigador principal",
  "Sin restricción",
];

const INITIAL_CALLS = [
  // ===================== DOCTORADOS INDUSTRIALES =====================
  {
    id: "1",
    title: "Doctorados Industriales - Comunidad de Madrid (conv. 2025/2026)",
    source: "cm",
    url: "https://www.comunidad.madrid/inversion/innova/ayudas-doctorados-industriales",
    deadline: "2026-12-31",
    status: "upcoming",
    elegibility: "Doctorado Industrial",
    budget: "~32.900€/año contratación + 40.000€ proyecto + 1.500€ matrícula",
    notes: "Convocatoria anual (última: conv. 2024, BOCM 30/12/2024). La conv. 2025 aún no publicada, se espera ~finales 2026. Requiere empresa con sede en CM + entidad académica. Preparar con CSIC (CAR, CSIC-UPM). Contacto: indus_doc2018@madrid.org",
    starred: true,
  },
  {
    id: "2",
    title: "Doctorados Industriales AEI - Convocatoria 2025",
    source: "aei",
    url: "https://www.aei.gob.es/convocatorias/buscador-convocatorias/ayudas-contratos-formacion-doctores-doctoras-empresas-otras-13",
    deadline: "2026-02-17",
    status: "closed",
    elegibility: "Doctorado Industrial",
    budget: "8M€ totales · Contratos de 4 años",
    notes: "Plazo cerrado 17/02/2026. Empresas (incl. pymes, spin-offs). Proyecto I+D industrial + tesis doctoral. La próxima conv. 2026 se espera ~oct-nov 2026. Estar atentos a la publicación en BOE.",
    starred: true,
  },
  // ===================== CDTI =====================
  {
    id: "3",
    title: "CDTI - Proyectos de I+D (PID)",
    source: "cdti",
    url: "https://www.cdti.es/ayudas/convocatorias-ayudas-702",
    deadline: "2026-12-31",
    status: "open",
    elegibility: "Empresa privada",
    budget: "Mín. 175.000€ · Financiación hasta 85% · Tramo no reembolsable 20-33%",
    notes: "Convocatoria abierta permanente. Proyectos de I+D para crear o mejorar productos/procesos/servicios. Duración 12-48 meses. Se puede subcontratar a CSIC u otros OPIs. Ideal para el proyecto de wearable/espasticidad.",
    starred: true,
  },
  {
    id: "4",
    title: "CDTI - Línea de Innovación",
    source: "cdti",
    url: "https://www.cdti.es/ayudas/convocatorias-ayudas-702",
    deadline: "2026-12-31",
    status: "open",
    elegibility: "Empresa privada",
    budget: "Variable · Préstamo bonificado",
    notes: "Convocatoria abierta permanente. Proyectos cercanos a mercado, riesgo medio/bajo, rápida recuperación. Duración 9-24 meses. Alternativa al PID si el proyecto está más avanzado (TRL alto).",
    starred: false,
  },
  {
    id: "5",
    title: "CDTI - Misiones Ciencia e Innovación 2026",
    source: "cdti",
    url: "https://www.cdti.es/",
    deadline: "2026-06-30",
    status: "upcoming",
    elegibility: "Empresa + Centro público (consorcio)",
    budget: "~90M€ en subvenciones FEDER (ref. 2025)",
    notes: "Grandes proyectos colaborativos de I+D. Consorcios de al menos 2 empresas. Retos: salud, digitalización, sostenibilidad. Incluye componente dual. Calendario 2026 pendiente, ventana probable primavera. Encaje con proyecto neuro+wearable en consorcio con CSIC.",
    starred: true,
  },
  // ===================== ISCIII =====================
  {
    id: "6",
    title: "AES 2026 - Proyectos de I+D+I en Salud (ISCIII)",
    source: "isciii",
    url: "https://www.isciii.es/w/aprobada-la-acci%C3%B3n-estrat%C3%A9gica-en-salud-2026-principal-herramienta-para-financiar-en-espa%C3%B1a-i-d-i-en-salud",
    deadline: "2026-03-17",
    status: "open",
    elegibility: "Centro acreditado SNS",
    budget: "152M€ totales AES · Proyectos 3-4 años",
    notes: "Plazo: 17/feb - 17/mar 2026. Requiere vinculación con SNS. Neuron podría participar a través de colaboración con centro acreditado o IIS. Prioridades: patologías neurodegenerativas, tecnología sanitaria, IA en salud. Verificar elegibilidad con CSIC.",
    starred: true,
  },
  {
    id: "7",
    title: "AES 2026 - Desarrollo Tecnológico en Salud (DTS)",
    source: "isciii",
    url: "https://www.isciii.es/",
    deadline: "2026-03-10",
    status: "closed",
    elegibility: "Centro acreditado SNS",
    budget: "Variable",
    notes: "Plazo cerrado 10/03/2026. Proyectos de desarrollo tecnológico en salud, muy relevante para wearables/dispositivos médicos. Próxima conv. en AES 2027. Preparar para la siguiente edición.",
    starred: false,
  },
  {
    id: "8",
    title: "AES 2026 - Proyectos de Investigación Clínica Independiente",
    source: "isciii",
    url: "https://www.isciii.es/",
    deadline: "2026-03-11",
    status: "open",
    elegibility: "Centro acreditado SNS",
    budget: "Variable · Duración 4-6 años (ampliado en 2026)",
    notes: "Plazo: 11/feb - 11/mar 2026. Estudios clínicos no comerciales. Posible encaje para validación clínica de dispositivo wearable en neurorrehabilitación. Requiere vinculación SNS.",
    starred: false,
  },
  {
    id: "9",
    title: "AES 2026 - Colaboración Internacional",
    source: "isciii",
    url: "https://www.isciii.es/",
    deadline: "2026-10-29",
    status: "upcoming",
    elegibility: "Centro acreditado SNS",
    budget: "Variable",
    notes: "Plazo: 1-29 octubre 2026. Incluye partenariados BrainHealth JTC1 y JTC2. Muy relevante para neurociencias. Requiere haber concurrido a convocatoria internacional previa.",
    starred: true,
  },
  // ===================== HORIZON EUROPE =====================
  {
    id: "10",
    title: "Horizon Europe - HLTH-2026-01 Health (Single stage)",
    source: "horizon",
    url: "https://hadea.ec.europa.eu/news/2026-horizon-europe-health-calls-proposals-2026-02-12_en",
    deadline: "2026-04-16",
    status: "open",
    elegibility: "Empresa + Centro público (consorcio)",
    budget: "Hasta 10M€ por proyecto · Financiación hasta 100%",
    notes: "Deadline 16/04/2026. Topics relevantes: STAYHLTH-02 (prevención NCD), DISEASE-02 (salud mental digital), CARE-01 (innovación en acceso sanitario), TOOL-06 (dispositivos médicos NAMs). Consorcio mín. 3 países (1 UE). Neuron como empresa en consorcio con CSIC.",
    starred: true,
  },
  {
    id: "11",
    title: "Horizon Europe 2027 - Addressing disabilities (STAYHLTH-01)",
    source: "horizon",
    url: "https://research-and-innovation.ec.europa.eu/document/download/36c7287d-d38f-4a96-94ca-0dfce1375a48_en",
    deadline: "2027-04-15",
    status: "upcoming",
    elegibility: "Empresa + Centro público (consorcio)",
    budget: "Hasta 10M€",
    notes: "Call 2027: 'Addressing disabilities through the life course to support independent living and inclusion'. Encaje perfecto con neurorrehabilitación y wearables. Empezar a buscar consorcio europeo ya.",
    starred: true,
  },
  // ===================== FUNDACIONES PRIVADAS =====================
  {
    id: "12",
    title: "CaixaResearch - Investigación en Salud 2026",
    source: "fundacion",
    url: "https://caixaresearch.org/es/convocatoria-caixaresearch-investigacion-salud",
    deadline: "2025-11-19",
    status: "closed",
    elegibility: "Sin restricción",
    budget: "Hasta 500.000€/proyecto",
    notes: "Conv. cerrada (nov 2025). Evaluación presencial mayo 2026, resultados junio 2026. Áreas: biomedicina, salud. Próxima edición ~septiembre 2026. Solo organizaciones sin ánimo de lucro, pero empresas pueden ser subcontratadas.",
    starred: false,
  },
  {
    id: "13",
    title: "CaixaResearch - Promoción de la Salud 2026 (1ª edición)",
    source: "fundacion",
    url: "https://caixaresearch.org/es/convocatoria-investigacion-promocion-salud",
    deadline: "2026-02-25",
    status: "closed",
    elegibility: "Sin restricción",
    budget: "Hasta 2.5M€ global · 80K-500K por proyecto",
    notes: "Plazo cerrado 25/02/2026. 1ª edición. Áreas: salud mental, envejecimiento, cronicidad. Resultados julio 2026. Empresas no pueden ser partners pero sí subcontratadas. Próxima edición pendiente.",
    starred: false,
  },
  {
    id: "14",
    title: "Fundación BBVA - Ayudas a Equipos de Investigación 2026",
    source: "fundacion",
    url: "https://www.fbbva.es/investigacion/",
    deadline: "2026-09-30",
    status: "upcoming",
    elegibility: "Investigador principal",
    budget: "Variable · ~100-200K por proyecto",
    notes: "Convocatoria anual, apertura habitual en verano. Proyectos interdisciplinares y exploratorios. Requiere IP en centro de investigación. Posible vía a través de colaboración con grupo CSIC.",
    starred: false,
  },
  // ===================== LÁNZATE =====================
  {
    id: "15",
    title: "Programa LÁNZATE - Comunidad de Madrid (1ª edición 2026)",
    source: "cm",
    url: "https://www.comunidad.madrid/noticias/2026/02/25/comunidad-madrid-crea-programa-lanzate-promover-doble-carrera-clinica-cientifica-investigadores-emergentes",
    deadline: "2026-03-18",
    status: "open",
    elegibility: "Centro acreditado SNS",
    budget: "~1M€ total · Proyectos hasta 2 años · Equipamiento, fungible, PI",
    notes: "1ª edición. Doble carrera clínica-investigadora. 4 modalidades: Enfermería, Atención Primaria, <45 años, certificado R3. Requiere vinculación con IIS públicos acreditados, hospitales públicos o centros de Atención Primaria de la CM. Publicado BOCM 25/02/2026, plazo 15 días hábiles (~18 marzo). Para clínica privada: explorar vía colaboración con IIS público (ej: IdISSC, IdiPAZ, i+12). Requiere doctorado.",
    starred: true,
  },
];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Auto-clasifica convocatorias auto-detectadas según su deadline
function autoClassify(call) {
  // No reclasificar manuales ni descartadas ni solicitadas
  if (!call.auto_detected) return call;
  if (call.status === "descartada" || call.status === "applied") return call;

  const days = daysUntil(call.deadline);
  if (days === null) return { ...call, status: "open" }; // Sin fecha → abierta por defecto
  if (days < 0) return { ...call, status: "closed" };    // Pasada → cerrada
  if (days > 30) return { ...call, status: "upcoming" };  // >30 días → próxima
  return { ...call, status: "open" };                     // ≤30 días → abierta (urgente se calcula aparte)
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

const Modal = ({ children, onClose }) => (
  <div
    style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      backdropFilter: "blur(4px)",
    }}
    onClick={onClose}
  >
    <div
      style={{
        background: "#fff", borderRadius: 16, padding: 32, maxWidth: 560, width: "90%",
        maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

const Badge = ({ text, color, bg }) => (
  <span
    style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.03em",
      color: color, background: bg, textTransform: "uppercase",
    }}
  >
    {text}
  </span>
);

const UrgencyBar = ({ days }) => {
  if (days === null) return null;
  if (days < 0) return null;
  const pct = Math.min(100, Math.max(0, (days / 90) * 100));
  const color = days <= 14 ? "#C41E3A" : days <= 30 ? "#E67E22" : "#1B813E";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
      <div style={{ flex: 1, height: 4, background: "#eee", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${100 - pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700, whiteSpace: "nowrap" }}>
        {days === 0 ? "¡HOY!" : days === 1 ? "1 día" : `${days} días`}
      </span>
    </div>
  );
};

const CallCard = ({ call, onEdit, onToggleStar, onDelete, onDiscard, onRecover }) => {
  const source = SOURCES.find((s) => s.id === call.source) || SOURCES[6];
  const status = STATUS_MAP[call.status] || STATUS_MAP.open;
  const days = daysUntil(call.deadline);

  return (
    <div
      style={{
        background: "#fff", borderRadius: 14, padding: "20px 24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        borderLeft: `4px solid ${source.color}`,
        transition: "transform 0.15s, box-shadow 0.15s",
        cursor: "pointer", position: "relative",
      }}
      onClick={() => onEdit(call)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1), 0 8px 32px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <Badge text={source.label} color={source.color} bg={source.color + "15"} />
            <Badge text={status.label} color={status.color} bg={status.bg} />
            {call.elegibility && (
              <span style={{ fontSize: 11, color: "#888" }}>{call.elegibility}</span>
            )}
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.35 }}>
            {call.title}
          </h3>
          <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#666" }}>
              📅 {formatDate(call.deadline)}
            </span>
            {call.budget && (
              <span style={{ fontSize: 12, color: "#666" }}>
                💰 {call.budget}
              </span>
            )}
          </div>
          {call.status !== "closed" && call.status !== "applied" && call.status !== "descartada" && <UrgencyBar days={days} />}
          {call.notes && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#777", lineHeight: 1.5 }}>
              {call.notes.length > 120 ? call.notes.slice(0, 120) + "…" : call.notes}
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleStar(call.id); }}
            style={{
              background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 4,
              color: call.starred ? "#E67E22" : "#ddd",
              transition: "color 0.2s",
            }}
            title={call.starred ? "Quitar favorito" : "Marcar como favorito"}
          >
            ★
          </button>
          {call.status === "descartada" ? (
            <button
              onClick={(e) => { e.stopPropagation(); onRecover(call.id); }}
              style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: 4,
                color: "#1B813E", transition: "color 0.2s", fontWeight: 600,
              }}
              title="Recuperar convocatoria"
            >
              ↩
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onDiscard(call.id); }}
              style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 4,
                color: "#ccc", transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#E67E22")}
              onMouseLeave={(e) => (e.target.style.color = "#ccc")}
              title="Descartar convocatoria"
            >
              ⊘
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(call.id); }}
            style={{
              background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 4,
              color: "#ccc", transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.color = "#C41E3A")}
            onMouseLeave={(e) => (e.target.style.color = "#ccc")}
            title="Eliminar"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

const InputField = ({ label, value, onChange, type = "text", placeholder, required, options, textarea }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5, letterSpacing: "0.02em" }}>
      {label} {required && <span style={{ color: "#C41E3A" }}>*</span>}
    </label>
    {options ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 8,
          border: "1.5px solid #e0e0e0", fontSize: 14, background: "#fafafa",
          outline: "none", fontFamily: "inherit",
        }}
      >
        <option value="">Seleccionar...</option>
        {options.map((o) =>
          typeof o === "string" ? (
            <option key={o} value={o}>{o}</option>
          ) : (
            <option key={o.value} value={o.value}>{o.label}</option>
          )
        )}
      </select>
    ) : textarea ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 8,
          border: "1.5px solid #e0e0e0", fontSize: 14, background: "#fafafa",
          outline: "none", fontFamily: "inherit", resize: "vertical",
          boxSizing: "border-box",
        }}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 8,
          border: "1.5px solid #e0e0e0", fontSize: 14, background: "#fafafa",
          outline: "none", fontFamily: "inherit", boxSizing: "border-box",
        }}
      />
    )}
  </div>
);

const EMPTY_FORM = {
  title: "", source: "", url: "", deadline: "", status: "upcoming",
  elegibility: "", budget: "", notes: "", starred: false,
};

export default function FundingTracker() {
  const [calls, setCalls] = useState(INITIAL_CALLS);
  const [filter, setFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCall, setEditingCall] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoCount, setAutoCount] = useState(0);

  // Load: primero intenta calls.json (datos del monitor), luego localStorage, luego INITIAL_CALLS
  useEffect(() => {
    (async () => {
      let baseCalls = INITIAL_CALLS;

      // 1. Intentar cargar calls.json (generado por el monitor automático)
      try {
        const base = import.meta.env.BASE_URL || "/radar-convocatorias/";
        const resp = await fetch(`${base}calls.json?t=${Date.now()}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.calls && data.calls.length > 0) {
            baseCalls = data.calls;
            setLastUpdated(data.last_updated);
            setAutoCount(data.auto_count || 0);
            console.log(`Loaded ${data.total} calls from calls.json (${data.auto_count} auto-detected)`);
          }
        }
      } catch (e) {
        console.log("calls.json not available, using built-in data", e);
      }

      // 2. Intentar cargar ediciones del usuario desde localStorage
      try {
        const result = await window.storage.get("funding-calls-user-edits");
        if (result && result.value) {
          const userEdits = JSON.parse(result.value);
          // userEdits = { added: [...], deleted: [...ids], modified: {id: {...}} }
          const deletedIds = new Set(userEdits.deleted || []);
          const modified = userEdits.modified || {};
          const discardedIds = new Set(userEdits.discarded || []);

          baseCalls = baseCalls
            .filter((c) => !deletedIds.has(c.id))
            .map((c) => {
              let updated = modified[c.id] ? { ...c, ...modified[c.id] } : c;
              // Aplicar estado descartada si el usuario lo descartó
              if (discardedIds.has(c.id) && updated.status !== "descartada") {
                updated = { ...updated, status: "descartada", _prevStatus: updated.status };
              }
              return updated;
            });

          // Añadir convocatorias manuales del usuario
          if (userEdits.added) {
            baseCalls = [...baseCalls, ...userEdits.added];
          }
        }
      } catch {
        // No user edits yet
      }

      // 3. Auto-clasificar convocatorias auto-detectadas según deadline
      baseCalls = baseCalls.map(autoClassify);

      setCalls(baseCalls);
      setLoaded(true);
    })();
  }, []);

  // Save user edits (delta sobre los datos base, no el array completo)
  useEffect(() => {
    if (!loaded) return;
    // Guardar solo las diferencias del usuario respecto a INITIAL_CALLS/calls.json
    // Esto evita que localStorage machaque los datos del monitor
    (async () => {
      try {
        const baseIds = new Set(INITIAL_CALLS.map((c) => c.id));
        const added = calls.filter((c) => !baseIds.has(c.id) && !c.auto_detected);
        // Guardar descartadas y modificaciones del usuario
        const discarded = calls.filter((c) => c.status === "descartada").map((c) => c.id);
        const modified = {};
        calls.forEach((c) => {
          if (baseIds.has(c.id) || c.auto_detected) {
            // Guardar cambios de estado hechos por el usuario (starred, status, etc.)
            if (c.status === "applied" || c.starred || c._prevStatus) {
              modified[c.id] = { status: c.status, starred: c.starred };
              if (c._prevStatus) modified[c.id]._prevStatus = c._prevStatus;
            }
          }
        });
        await window.storage.set("funding-calls-user-edits", JSON.stringify({
          added,
          deleted: [],
          modified,
          discarded,
        }));
      } catch (e) {
        console.error("Save error:", e);
      }
    })();
  }, [calls, loaded]);

  const updateForm = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const openNew = () => {
    setEditingCall(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (call) => {
    setEditingCall(call);
    setForm({ ...call });
    setShowModal(true);
  };

  const saveCall = () => {
    if (!form.title || !form.source) return;
    if (editingCall) {
      setCalls((prev) => prev.map((c) => (c.id === editingCall.id ? { ...form, id: editingCall.id } : c)));
    } else {
      setCalls((prev) => [...prev, { ...form, id: Date.now().toString() }]);
    }
    setShowModal(false);
  };

  const deleteCall = (id) => {
    setCalls((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleStar = (id) => {
    setCalls((prev) => prev.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c)));
  };

  const discardCall = (id) => {
    setCalls((prev) => prev.map((c) => (c.id === id ? { ...c, status: "descartada", _prevStatus: c.status } : c)));
  };

  const recoverCall = (id) => {
    setCalls((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      // Restaurar al estado anterior, o auto-clasificar si era auto-detectada
      const restored = { ...c, status: c._prevStatus || "open" };
      delete restored._prevStatus;
      return c.auto_detected ? autoClassify(restored) : restored;
    }));
  };

  const resetData = () => {
    setCalls(INITIAL_CALLS);
  };

  // Filtering & sorting
  const filtered = calls
    .filter((c) => {
      if (filter === "descartada") return c.status === "descartada";
      if (filter === "starred") return c.starred && c.status !== "descartada";
      if (filter === "urgent") {
        const d = daysUntil(c.deadline);
        return d !== null && d >= 0 && d <= 30 && c.status !== "closed" && c.status !== "descartada";
      }
      // "all" excluye descartadas
      if (filter === "all") return c.status !== "descartada";
      if (c.status !== filter) return false;
      return true;
    })
    .filter((c) => sourceFilter === "all" || c.source === sourceFilter)
    .filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return c.title.toLowerCase().includes(q) || (c.notes || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });

  // Stats
  const activeCalls = calls.filter((c) => c.status !== "descartada");
  const openCount = calls.filter((c) => c.status === "open").length;
  const upcomingCount = calls.filter((c) => c.status === "upcoming").length;
  const urgentCount = calls.filter((c) => {
    const d = daysUntil(c.deadline);
    return d !== null && d >= 0 && d <= 30 && c.status !== "closed" && c.status !== "descartada";
  }).length;
  const appliedCount = calls.filter((c) => c.status === "applied").length;
  const closedCount = calls.filter((c) => c.status === "closed").length;
  const discardedCount = calls.filter((c) => c.status === "descartada").length;
  const starredCount = calls.filter((c) => c.starred && c.status !== "descartada").length;

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      minHeight: "100vh",
      background: "linear-gradient(160deg, #F0F2F5 0%, #E8EBF0 50%, #F5F0EB 100%)",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)",
        padding: "28px 32px 24px",
        color: "#fff",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{
                margin: 0, fontSize: 26, fontFamily: "'DM Serif Display', serif",
                fontWeight: 400, letterSpacing: "-0.01em",
              }}>
                🔬 Radar de Convocatorias
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.7, fontWeight: 400 }}>
                Neuron Rehabilitación · Seguimiento de ayudas I+D
                {lastUpdated && (
                  <span style={{ marginLeft: 12, fontSize: 11, opacity: 0.6 }}>
                    Actualizado: {new Date(lastUpdated).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {autoCount > 0 && ` · ${autoCount} auto-detectadas`}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={openNew}
              style={{
                background: "#fff", color: "#0F2027", border: "none", borderRadius: 10,
                padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                transition: "transform 0.15s",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => (e.target.style.transform = "scale(1.03)")}
              onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
            >
              + Nueva convocatoria
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap" }}>
            {[
              { label: "Abiertas", value: openCount, icon: "🟢" },
              { label: "Urgentes (<30d)", value: urgentCount, icon: "🔴" },
              { label: "Próximas", value: upcomingCount, icon: "🟠" },
              { label: "Solicitadas", value: appliedCount, icon: "🔵" },
              { label: "Activas", value: activeCalls.length, icon: "📋" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: "rgba(255,255,255,0.1)", borderRadius: 10,
                  padding: "10px 18px", backdropFilter: "blur(10px)",
                  minWidth: 100,
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {s.icon} {s.value}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 32px 0" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Buscar convocatoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "1.5px solid #ddd",
              fontSize: 13, outline: "none", minWidth: 180, fontFamily: "inherit",
              background: "#fff",
            }}
          />

          {/* Status filter */}
          {[
            { id: "all", label: `Todas (${activeCalls.length})` },
            { id: "urgent", label: `🔴 Urgentes (${urgentCount})` },
            { id: "open", label: `Abiertas (${openCount})` },
            { id: "upcoming", label: `Próximas (${upcomingCount})` },
            { id: "starred", label: `★ Favoritas (${starredCount})` },
            { id: "applied", label: `Solicitadas (${appliedCount})` },
            { id: "descartada", label: `Descartadas (${discardedCount})` },
            { id: "closed", label: `Cerradas (${closedCount})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: filter === f.id ? "1.5px solid #2C5364" : "1.5px solid #ddd",
                background: filter === f.id ? "#2C5364" : "#fff",
                color: filter === f.id ? "#fff" : "#555",
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {f.label}
            </button>
          ))}

          {/* Source dropdown */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{
              padding: "7px 12px", borderRadius: 8, fontSize: 12,
              border: "1.5px solid #ddd", background: "#fff", fontFamily: "inherit",
              color: "#555", cursor: "pointer",
            }}
          >
            <option value="all">Todos los organismos</option>
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk actions */}
      {filter === "closed" && closedCount > 0 && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px 32px 0" }}>
          <button
            onClick={() => {
              if (confirm(`¿Eliminar definitivamente las ${closedCount} convocatorias cerradas? No se podrán recuperar.`)) {
                setCalls((prev) => prev.filter((c) => c.status !== "closed"));
              }
            }}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            🗑️ Eliminar definitivamente todas las cerradas ({closedCount})
          </button>
        </div>
      )}
      {filter === "descartada" && discardedCount > 0 && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px 32px 0" }}>
          <button
            onClick={() => {
              if (confirm(`¿Eliminar definitivamente las ${discardedCount} convocatorias descartadas? No se podrán recuperar.`)) {
                setCalls((prev) => prev.filter((c) => c.status !== "descartada"));
              }
            }}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            🗑️ Eliminar definitivamente todas las descartadas ({discardedCount})
          </button>
        </div>
      )}

      {/* Cards */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 32px 40px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{
              textAlign: "center", padding: 48, color: "#999", fontSize: 14,
            }}>
              No hay convocatorias con estos filtros.
              <br />
              <button
                onClick={openNew}
                style={{
                  marginTop: 12, padding: "8px 16px", borderRadius: 8,
                  background: "#2C5364", color: "#fff", border: "none",
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                + Añadir convocatoria
              </button>
            </div>
          ) : (
            filtered.map((call) => (
              <CallCard
                key={call.id}
                call={call}
                onEdit={openEdit}
                onToggleStar={toggleStar}
                onDelete={deleteCall}
                onDiscard={discardCall}
                onRecover={recoverCall}
              />
            ))
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={resetData}
            style={{
              background: "none", border: "none", color: "#aaa",
              fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              textDecoration: "underline",
            }}
          >
            Restaurar datos de ejemplo
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h2 style={{
            margin: "0 0 20px", fontSize: 20, fontFamily: "'DM Serif Display', serif",
            fontWeight: 400, color: "#1a1a1a",
          }}>
            {editingCall ? "Editar convocatoria" : "Nueva convocatoria"}
          </h2>

          <InputField label="Título" value={form.title} onChange={updateForm("title")} placeholder="Ej: Doctorados Industriales 2026" required />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InputField
              label="Organismo"
              value={form.source}
              onChange={updateForm("source")}
              required
              options={SOURCES.map((s) => ({ value: s.id, label: s.label }))}
            />
            <InputField
              label="Estado"
              value={form.status}
              onChange={updateForm("status")}
              options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InputField label="Fecha límite" value={form.deadline} onChange={updateForm("deadline")} type="date" />
            <InputField label="Presupuesto" value={form.budget} onChange={updateForm("budget")} placeholder="Ej: 50.000€" />
          </div>

          <InputField
            label="Elegibilidad"
            value={form.elegibility}
            onChange={updateForm("elegibility")}
            options={ELEGIBILITY}
          />

          <InputField label="URL" value={form.url} onChange={updateForm("url")} placeholder="https://..." />
          <InputField label="Notas" value={form.notes} onChange={updateForm("notes")} textarea placeholder="Requisitos, plazos, observaciones..." />

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              onClick={saveCall}
              disabled={!form.title || !form.source}
              style={{
                flex: 1, padding: "12px", borderRadius: 10, border: "none",
                background: form.title && form.source ? "#2C5364" : "#ccc",
                color: "#fff", fontSize: 14, fontWeight: 600, cursor: form.title && form.source ? "pointer" : "default",
                fontFamily: "inherit",
              }}
            >
              {editingCall ? "Guardar cambios" : "Añadir convocatoria"}
            </button>
            <button
              onClick={() => setShowModal(false)}
              style={{
                padding: "12px 20px", borderRadius: 10, border: "1.5px solid #ddd",
                background: "#fff", color: "#555", fontSize: 14, fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Cancelar
            </button>
          </div>

          {editingCall && editingCall.url && (
            <a
              href={editingCall.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block", textAlign: "center", marginTop: 12,
                fontSize: 12, color: "#2C5364",
              }}
            >
              🔗 Abrir web de la convocatoria
            </a>
          )}
        </Modal>
      )}
    </div>
  );
}
