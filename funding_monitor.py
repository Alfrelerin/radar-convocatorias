#!/usr/bin/env python3
"""
=============================================================================
FUNDING CALL MONITOR - Neuron Rehabilitación
=============================================================================

Script de monitorización automática de convocatorias de I+D relevantes para
una clínica de neurorrehabilitación.

Funcionalidades:
  - Chequea RSS feeds de los principales organismos financiadores
  - Detecta nuevas convocatorias por palabras clave
  - Envía resumen diario/semanal por email
  - Registra historial para evitar duplicados

Instalación:
  pip install feedparser requests beautifulsoup4 schedule

Ejecución manual:
  python funding_monitor.py

Ejecución automática (cron, cada día a las 8:00):
  0 8 * * * /usr/bin/python3 /ruta/a/funding_monitor.py

Alternativa gratuita con GitHub Actions:
  Ver instrucciones al final del archivo.

=============================================================================
"""

import feedparser
import requests
from bs4 import BeautifulSoup
import smtplib
import json
import hashlib
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from urllib.parse import urljoin
from pathlib import Path
import logging
import os

# ─────────────────────────────────────────────────────
# CONFIGURACIÓN - Edita estos valores
# ─────────────────────────────────────────────────────

CONFIG = {
    # Email - Remitente (usa una cuenta de Gmail con App Password)
    # Tutorial: https://support.google.com/accounts/answer/185833
    "smtp_server": "smtp.gmail.com",
    "smtp_port": 587,
    "email_from": os.environ.get("EMAIL_FROM", ""),
    "email_password": os.environ.get("EMAIL_PASSWORD", ""),

    # Email - Destinatarios (separar múltiples con comas en variable de entorno)
    "email_to": [e.strip() for e in os.environ.get("EMAIL_TO", "").split(",") if e.strip()],

    # Fichero de historial (para no repetir alertas)
    "history_file": os.environ.get("HISTORY_FILE", "funding_history.json"),
}

# ─────────────────────────────────────────────────────
# FUENTES RSS
# ─────────────────────────────────────────────────────

RSS_FEEDS = [
    # ─── Nacionales ───
    {
        "nombre": "CDTI - Ayudas",
        "url": "https://www.cdti.es/rss/ayudas",
        "tipo": "Nacional",
        "organismo": "CDTI",
    },
    {
        "nombre": "AEI - Convocatorias",
        "url": "https://www.aei.gob.es/rss/convocatorias",
        "tipo": "Nacional",
        "organismo": "AEI",
    },
    {
        "nombre": "ISCIII - Convocatorias",
        "url": "https://www.isciii.es/rss/convocatorias",
        "tipo": "Nacional",
        "organismo": "ISCIII",
    },
    {
        "nombre": "FECYT - Convocatorias",
        "url": "https://www.fecyt.es/es/rss.xml",
        "tipo": "Nacional",
        "organismo": "FECYT",
    },
    # ─── Comunidad de Madrid ───
    {
        "nombre": "Comunidad de Madrid - Subvenciones",
        "url": "https://www.comunidad.madrid/gobierno/informacion-juridica-legislacion/rss",
        "tipo": "Nacional",
        "organismo": "Comunidad de Madrid",
    },
    # ─── Europeas ───
    {
        "nombre": "CORDIS - Health",
        "url": "https://cordis.europa.eu/search/en?q=contenttype%3D%27project%27%20AND%20programme%2Fcode%3D%27HORIZON.1.1%27&format=rss",
        "tipo": "Europea",
        "organismo": "Horizon Europe",
    },
    {
        "nombre": "Euraxess - Spain Funding",
        "url": "https://euraxess.ec.europa.eu/feeds/funding/country/spain",
        "tipo": "Europea",
        "organismo": "Euraxess",
    },
    {
        "nombre": "OpenAIRE - Health Projects",
        "url": "https://explore.openaire.eu/rss/projects?fos=medical%20and%20health%20sciences",
        "tipo": "Europea",
        "organismo": "OpenAIRE",
    },
]

# ─────────────────────────────────────────────────────
# PÁGINAS WEB PARA SCRAPING (cuando no hay RSS)
# ─────────────────────────────────────────────────────

WEB_SOURCES = [
    # ─── Fundaciones Privadas ───
    {
        "nombre": "Fundación La Caixa - CaixaResearch",
        "url": "https://fundacionlacaixa.org/investigacion-y-becas/programas-investigacion/caixaresearch",
        "tipo": "Privada",
        "organismo": "Fundación La Caixa",
        "selector": "article, .card, .programa",
    },
    {
        "nombre": "Fundación BBVA - Convocatorias",
        "url": "https://www.fbbva.es/convocatorias/",
        "tipo": "Privada",
        "organismo": "Fundación BBVA",
        "selector": "article, .convocatoria, .card",
    },
    {
        "nombre": "Fundación Mapfre - Ayudas Investigación",
        "url": "https://www.fundacionmapfre.org/premios-ayudas/ayudas-investigacion/",
        "tipo": "Privada",
        "organismo": "Fundación Mapfre",
        "selector": "article, .card, .convocatoria, .ayuda",
    },
    {
        "nombre": "Fundación Ramón Areces - Investigación",
        "url": "https://www.fundacionareces.es/fundacionareces/es/becas-y-ayudas/convocatorias-702.html",
        "tipo": "Privada",
        "organismo": "Fundación Ramón Areces",
        "selector": "article, .card, .convocatoria, .listado-item",
    },
    {
        "nombre": "Fundación Mutua Madrileña - Ayudas Investigación",
        "url": "https://www.fundacionmutua.es/salud/ayudas-a-la-investigacion/",
        "tipo": "Privada",
        "organismo": "Fundación Mutua Madrileña",
        "selector": "article, .card, .convocatoria",
    },
    {
        "nombre": "Fundación ONCE - Innovación y Accesibilidad",
        "url": "https://www.fundaciononce.es/es/pagina/innovacion-y-accesibilidad",
        "tipo": "Privada",
        "organismo": "Fundación ONCE",
        "selector": "article, .card, .node, .views-row",
    },
    # ─── Nacionales ───
    {
        "nombre": "ENISA - Préstamos Emprendedores",
        "url": "https://www.enisa.es/es/financia-tu-empresa/lineas-de-financiacion",
        "tipo": "Nacional",
        "organismo": "ENISA",
        "selector": "article, .card, .linea, .producto",
    },
    {
        "nombre": "Red.es - Ayudas",
        "url": "https://www.red.es/es/sobre-nosotros/convocatorias",
        "tipo": "Nacional",
        "organismo": "Red.es",
        "selector": "article, .card, .views-row, .convocatoria",
    },
    {
        "nombre": "ICEX - Ayudas Internacionalización",
        "url": "https://www.icex.es/es/todos-nuestros-servicios/programas-y-servicios",
        "tipo": "Nacional",
        "organismo": "ICEX",
        "selector": "article, .card, .programa, .servicio",
    },
    {
        "nombre": "SEEIC - Convocatorias Estatales",
        "url": "https://www.ciencia.gob.es/Convocatorias.html",
        "tipo": "Nacional",
        "organismo": "SEEIC",
        "selector": "article, .card, .views-row, .listado-item",
    },
    # ─── Comunidad de Madrid ───
    {
        "nombre": "Comunidad de Madrid - Portal Innova (I+D+i)",
        "url": "https://www.comunidad.madrid/inversion/innova",
        "tipo": "Nacional",
        "organismo": "Comunidad de Madrid",
        "selector": "article, .card, .views-row, .field-content, .convocatoria",
    },
    {
        "nombre": "Comunidad de Madrid - Convocatorias Investigación",
        "url": "https://www.comunidad.madrid/servicios/investigacion-cientifica-e-innovacion-tecnologica/convocatorias-ayudas-investigacion",
        "tipo": "Nacional",
        "organismo": "Comunidad de Madrid",
        "selector": "article, .views-row, .field-content, .card",
    },
    {
        "nombre": "Madri+d - Convocatorias I+D",
        "url": "https://www.madrimasd.org/convocatorias",
        "tipo": "Nacional",
        "organismo": "Madri+d",
        "selector": "article, .card, .views-row, .convocatoria",
    },
    # ─── Europeas ───
    {
        "nombre": "EIT Health - Calls",
        "url": "https://eithealth.eu/opportunities/",
        "tipo": "Europea",
        "organismo": "EIT Health",
        "selector": "article, .card, .opportunity, .post-item",
    },
    {
        "nombre": "AAL Programme - Calls",
        "url": "https://www.aal-europe.eu/calls/",
        "tipo": "Europea",
        "organismo": "AAL Programme",
        "selector": "article, .card, .call, .entry",
    },
    {
        "nombre": "COST Actions - Open Calls",
        "url": "https://www.cost.eu/funding/open-call-a-]simple-one-step-application-process/",
        "tipo": "Europea",
        "organismo": "COST",
        "selector": "article, .card, .action, .call",
    },
    {
        "nombre": "ERA-NET NEURON - Calls",
        "url": "https://www.neuron-eranet.eu/joint-calls/open-calls/",
        "tipo": "Europea",
        "organismo": "ERA-NET NEURON",
        "selector": "article, .card, .call, .entry-content",
    },
    {
        "nombre": "FundingBox - Health Calls",
        "url": "https://fundingbox.com/spaces/health",
        "tipo": "Agregador",
        "organismo": "FundingBox",
        "selector": "article, .card, .call, .opportunity",
    },
]

# ─────────────────────────────────────────────────────
# PALABRAS CLAVE (ajusta según tu perfil)
# ─────────────────────────────────────────────────────

KEYWORDS_TEMATICOS = [
    "neurociencia", "neurología", "rehabilitación", "neurorrehabilitación",
    "fisioterapia", "espasticidad", "ictus", "stroke", "daño cerebral",
    "wearable", "robótica", "bioingeniería", "brain", "motor control",
    "neurorehabilitation", "spasticity", "brain injury", "physiotherapy",
    "tecnología asistiva", "assistive technology", "biomecánica",
    "electromiografía", "EMG", "estimulación", "stimulation",
]

KEYWORDS_TIPO_AYUDA = [
    "empresa", "clínica", "PYME", "industrial", "innovación",
    "I+D", "subvención", "ayuda", "convocatoria", "grant",
    "funding", "call", "doctorado", "colaboración", "consorcio",
    "transferencia", "aplicada",
]

# ─────────────────────────────────────────────────────
# LÓGICA PRINCIPAL
# ─────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("funding_monitor")


def load_history():
    path = Path(CONFIG["history_file"])
    if path.exists():
        try:
            data = json.loads(path.read_text())
            if "seen_ids" not in data:
                data["seen_ids"] = []
            return data
        except (json.JSONDecodeError, KeyError) as e:
            log.warning(f"Historial corrupto, reiniciando: {e}")
    return {"seen_ids": [], "last_check": None}


def save_history(history):
    history["last_check"] = datetime.now().isoformat()
    Path(CONFIG["history_file"]).write_text(
        json.dumps(history, indent=2, ensure_ascii=False)
    )


def generate_id(text):
    return hashlib.md5(text.encode()).hexdigest()[:12]


def is_relevant(title, summary=""):
    text = f"{title} {summary}".lower()
    has_tematico = any(kw.lower() in text for kw in KEYWORDS_TEMATICOS)
    has_tipo = any(kw.lower() in text for kw in KEYWORDS_TIPO_AYUDA)
    return has_tematico or has_tipo


def score_relevance(title, summary=""):
    text = f"{title} {summary}".lower()
    score = 0
    matches = []
    for kw in KEYWORDS_TEMATICOS:
        if kw.lower() in text:
            score += 10
            matches.append(kw)
    for kw in KEYWORDS_TIPO_AYUDA:
        if kw.lower() in text:
            score += 5
            matches.append(kw)
    return min(score, 100), matches


# ─────────────────────────────────────────────────────
# EXTRACCIÓN INTELIGENTE DE PRESUPUESTO Y DEADLINE
# ─────────────────────────────────────────────────────

# Patrones de dinero: "10M€", "500.000€", "hasta 2,5 millones", "EUR 1.000.000", etc.
BUDGET_PATTERNS = [
    # "10M€" / "10 M€" / "10M euros"
    r'(\d[\d.,]*)\s*M[€E]\b',
    r'(\d[\d.,]*)\s*[Mm]illones?\s*(?:de\s+)?(?:euros?|€|EUR)',
    # "hasta 500.000€" / "500.000 EUR"
    r'(?:hasta|up\s+to|max\.?)?\s*(\d[\d.,]+)\s*(?:€|EUR|euros?)',
    r'€\s*(\d[\d.,]+)',
    # "presupuesto: X" / "dotación: X" / "budget: X"
    r'(?:presupuesto|dotación|financiación|budget|funding|importe)[:\s]+(\d[\d.,]*\s*(?:M€|M|millones|€|EUR|euros?)[\d.,\s€EUReuros]*)',
]

# Meses en español e inglés
MONTH_MAP = {
    'enero': '01', 'january': '01', 'jan': '01', 'ene': '01',
    'febrero': '02', 'february': '02', 'feb': '02',
    'marzo': '03', 'march': '03', 'mar': '03',
    'abril': '04', 'april': '04', 'apr': '04', 'abr': '04',
    'mayo': '05', 'may': '05',
    'junio': '06', 'june': '06', 'jun': '06',
    'julio': '07', 'july': '07', 'jul': '07',
    'agosto': '08', 'august': '08', 'aug': '08', 'ago': '08',
    'septiembre': '09', 'september': '09', 'sep': '09', 'sept': '09',
    'octubre': '10', 'october': '10', 'oct': '10',
    'noviembre': '11', 'november': '11', 'nov': '11',
    'diciembre': '12', 'december': '12', 'dec': '12', 'dic': '12',
}

# Patrones de fecha: "17/03/2026", "17 de marzo de 2026", "March 17, 2026", "2026-03-17"
DATE_PATTERNS = [
    # dd/mm/yyyy o dd-mm-yyyy
    r'(\d{1,2})[/\-](\d{1,2})[/\-](20\d{2})',
    # "17 de marzo de 2026"
    r'(\d{1,2})\s+de\s+(\w+)\s+de\s+(20\d{2})',
    # "March 17, 2026"
    r'(\w+)\s+(\d{1,2}),?\s+(20\d{2})',
    # yyyy-mm-dd
    r'(20\d{2})-(\d{2})-(\d{2})',
]

# Palabras clave que indican un deadline
DEADLINE_KEYWORDS = [
    'plazo', 'deadline', 'cierre', 'fecha límite', 'fecha limite',
    'finaliza', 'hasta el', 'before', 'closes', 'submission',
    'presentación', 'solicitud', 'fin de plazo', 'vence',
]

# Palabras basura que indican que un texto NO es un título de convocatoria
GARBAGE_INDICATORS = [
    'cookie', 'privacy', 'newsletter', 'suscríbete', 'subscribe',
    'stay up to date', 'menú', 'menu', 'footer', 'header',
    'copyright', 'todos los derechos', 'all rights', 'política de',
    'terms of', 'condiciones de uso', 'aviso legal', 'legal notice',
    'iniciar sesión', 'log in', 'sign in', 'registrar',
    'twitter', 'facebook', 'instagram', 'linkedin', 'youtube',
    'buscar', 'search', 'compartir', 'share',
]


def extract_budget(text):
    """Extrae el presupuesto/importe de un texto."""
    if not text:
        return ""

    for pattern in BUDGET_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            # Extraer el contexto alrededor del match (±40 chars) para dar más info
            start = max(0, match.start() - 20)
            end = min(len(text), match.end() + 20)
            snippet = text[start:end].strip()
            # Limpiar el snippet
            snippet = re.sub(r'\s+', ' ', snippet)
            if len(snippet) > 80:
                snippet = snippet[:80] + "…"
            return snippet

    return ""


def parse_date_from_text(text):
    """Intenta extraer una fecha de un texto y devuelve en formato YYYY-MM-DD."""
    if not text:
        return ""

    # Primero buscar cerca de palabras clave de deadline
    text_lower = text.lower()

    for keyword in DEADLINE_KEYWORDS:
        idx = text_lower.find(keyword)
        if idx >= 0:
            # Buscar fecha en los 100 caracteres siguientes a la palabra clave
            nearby = text[idx:idx + 120]
            date = _extract_first_date(nearby)
            if date:
                return date

    # Si no encontró cerca de keywords, buscar cualquier fecha futura en el texto
    date = _extract_first_date(text)
    if date:
        try:
            d = datetime.strptime(date, "%Y-%m-%d")
            # Solo devolver si es futura o reciente (hasta 30 días pasados)
            if (d - datetime.now()).days >= -30:
                return date
        except ValueError:
            pass

    return ""


def _extract_first_date(text):
    """Extrae la primera fecha válida de un texto."""
    # dd/mm/yyyy o dd-mm-yyyy
    m = re.search(r'(\d{1,2})[/\-](\d{1,2})[/\-](20\d{2})', text)
    if m:
        day, month, year = m.group(1), m.group(2), m.group(3)
        try:
            d = datetime(int(year), int(month), int(day))
            return d.strftime("%Y-%m-%d")
        except ValueError:
            pass

    # "17 de marzo de 2026"
    m = re.search(r'(\d{1,2})\s+de\s+(\w+)\s+de\s+(20\d{2})', text, re.IGNORECASE)
    if m:
        day, month_name, year = m.group(1), m.group(2).lower(), m.group(3)
        month_num = MONTH_MAP.get(month_name)
        if month_num:
            try:
                d = datetime(int(year), int(month_num), int(day))
                return d.strftime("%Y-%m-%d")
            except ValueError:
                pass

    # "March 17, 2026"
    m = re.search(r'(\w+)\s+(\d{1,2}),?\s+(20\d{2})', text)
    if m:
        month_name, day, year = m.group(1).lower(), m.group(2), m.group(3)
        month_num = MONTH_MAP.get(month_name)
        if month_num:
            try:
                d = datetime(int(year), int(month_num), int(day))
                return d.strftime("%Y-%m-%d")
            except ValueError:
                pass

    # yyyy-mm-dd (ISO)
    m = re.search(r'(20\d{2})-(\d{2})-(\d{2})', text)
    if m:
        try:
            d = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            return d.strftime("%Y-%m-%d")
        except ValueError:
            pass

    return ""


def clean_title(raw_text):
    """Limpia un título crudo: quita navegación, newlines, texto excesivo."""
    if not raw_text:
        return ""
    # Quitar newlines y espacios múltiples
    title = re.sub(r'[\n\r\t]+', ' ', raw_text)
    title = re.sub(r'\s{2,}', ' ', title).strip()

    # Si tiene más de 200 chars, probablemente es un bloque de texto, no un título
    # Intentar extraer solo la primera frase/línea significativa
    if len(title) > 200:
        # Cortar en el primer punto seguido de espacio, o en los primeros 150 chars
        dot_idx = title.find('. ', 30)
        if 30 < dot_idx < 200:
            title = title[:dot_idx + 1]
        else:
            title = title[:150] + "…"

    return title


def is_garbage(text):
    """Detecta si un texto es basura (navegación, cookies, etc.)."""
    text_lower = text.lower()
    # Demasiado corto
    if len(text.strip()) < 15:
        return True
    # Contiene indicadores de basura
    garbage_count = sum(1 for g in GARBAGE_INDICATORS if g in text_lower)
    if garbage_count >= 2:
        return True
    # Demasiadas mayúsculas consecutivas (menú de navegación)
    if len(re.findall(r'[A-ZÁÉÍÓÚ]{3,}', text)) > 5:
        return True
    # Ratio texto/números muy bajo y muy corto (IDs, códigos de página)
    if len(text) < 30 and sum(c.isdigit() for c in text) > len(text) * 0.5:
        return True
    return False


def extract_requirements(text):
    """Extrae requisitos/elegibilidad principales de un texto."""
    if not text:
        return ""
    text_lower = text.lower()
    requisitos = []

    # Patrones de tipo de beneficiario
    BENEFICIARY_PATTERNS = [
        (r'(?:pyme|PYME|pymes)', "PYME"),
        (r'(?:empresa|empresas)\s*(?:privada|innovadora|tecnológica)?', "Empresa"),
        (r'(?:autónom[oa]s?|freelance)', "Autónomos"),
        (r'(?:centro|centros)\s*(?:de\s+)?(?:investigación|tecnológ)', "Centro de investigación"),
        (r'(?:universidad|universidades|académic)', "Universidad"),
        (r'(?:consorcio|consorcios|agrupaci[oó]n)', "Consorcio"),
        (r'(?:investigador|investigadora)\s*(?:principal)?', "Investigador principal"),
        (r'(?:hospital|clínica|centro\s+sanitario|SNS|servicio\s+nacional\s+de\s+salud)', "Centro sanitario/SNS"),
        (r'(?:doctorado|doctoral|tesis)', "Doctorado"),
        (r'(?:start-?up|emprendedor|emprendimiento)', "Startup/Emprendedor"),
        (r'(?:sin\s+(?:ánimo|animo)\s+de\s+lucro|ONG|asociaci[oó]n)', "Sin ánimo de lucro"),
        (r'(?:persona\s+física|particular)', "Persona física"),
    ]

    for pattern, label in BENEFICIARY_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            if label not in requisitos:
                requisitos.append(label)

    # Requisitos geográficos
    GEO_PATTERNS = [
        (r'(?:comunidad\s+de\s+madrid|CAM\b)', "Sede en Comunidad de Madrid"),
        (r'(?:sede\s+(?:en\s+)?España|territorio\s+(?:español|nacional))', "Sede en España"),
        (r'(?:pa[ií]ses?\s+(?:de\s+la\s+)?UE|Uni[oó]n\s+Europea|EU\s+member)', "País UE"),
    ]

    for pattern, label in GEO_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            if label not in requisitos:
                requisitos.append(label)

    # Requisitos de tamaño/antigüedad
    SIZE_PATTERNS = [
        (r'(?:menos\s+de\s+|<\s*)\d+\s*empleados', None),  # captura textual
        (r'(?:antigüedad|constituida|creada)\s*(?:mínima|de)?\s*(?:de\s*)?\d+\s*(?:año|mes)', None),
        (r'(?:facturación|ingresos)\s*(?:mínima|de)?\s*(?:de\s*)?\d', None),
    ]

    for pattern, label in SIZE_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            snippet = text[m.start():min(m.end() + 20, len(text))].strip()
            snippet = re.sub(r'\s+', ' ', snippet)[:60]
            if snippet not in requisitos:
                requisitos.append(snippet)

    # Si no encontramos nada estructurado, buscar sección "requisitos" o "beneficiarios"
    if not requisitos:
        req_match = re.search(
            r'(?:requisitos|beneficiarios|elegibilidad|eligibility|who\s+can\s+apply)[:\s]+(.*?)(?:\.|$)',
            text, re.IGNORECASE
        )
        if req_match:
            snippet = req_match.group(1).strip()[:120]
            if snippet and len(snippet) > 5:
                requisitos.append(snippet)

    return " · ".join(requisitos[:4]) if requisitos else ""


def extract_bases_url(soup, base_url):
    """Busca el enlace a las bases oficiales de la convocatoria."""
    if not soup:
        return ""

    # Palabras clave que indican un enlace a bases
    BASES_KEYWORDS = [
        'bases', 'convocatoria oficial', 'resolución', 'boletín oficial',
        'BOE', 'BOCM', 'DOUE', 'orden de bases', 'texto completo',
        'full text', 'call document', 'official call', 'legal basis',
        'descargar bases', 'ver convocatoria', 'acceder', 'PDF',
        'reguladoras', 'extracto',
    ]

    # Buscar en todos los enlaces de la página
    for a_tag in soup.find_all('a', href=True):
        link_text = a_tag.get_text(strip=True).lower()
        href = a_tag['href'].lower()

        for kw in BASES_KEYWORDS:
            if kw.lower() in link_text or kw.lower() in href:
                full_url = a_tag['href']
                if not full_url.startswith('http'):
                    full_url = urljoin(base_url, full_url)
                return full_url

    # Buscar enlaces a PDFs (suelen ser las bases)
    for a_tag in soup.find_all('a', href=True):
        if a_tag['href'].lower().endswith('.pdf'):
            full_url = a_tag['href']
            if not full_url.startswith('http'):
                full_url = urljoin(base_url, full_url)
            return full_url

    return ""


def fetch_detail_page(url, timeout=12):
    """Descarga una página de detalle para extraer info adicional."""
    headers = {"User-Agent": "Mozilla/5.0 (Funding Monitor; academic research)"}
    try:
        resp = requests.get(url, headers=headers, timeout=timeout)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        # Texto completo de la página (para extraer budget, deadline, requisitos)
        full_text = soup.get_text(separator=' ', strip=True)
        return soup, full_text
    except Exception as e:
        log.debug(f"No se pudo leer página de detalle {url}: {e}")
        return None, ""


def check_rss_feeds():
    results = []
    for feed_config in RSS_FEEDS:
        log.info(f"Revisando RSS: {feed_config['nombre']}")
        try:
            feed = feedparser.parse(feed_config["url"])
            for entry in feed.entries[:20]:
                title = entry.get("title", "")
                summary = entry.get("summary", "")
                link = entry.get("link", "")

                if not is_relevant(title, summary):
                    continue

                title = clean_title(title)
                if is_garbage(title):
                    continue

                score, matches = score_relevance(title, summary)
                full_text = f"{title} {summary}"

                # Intentar extraer deadline y budget del resumen RSS
                deadline = parse_date_from_text(full_text)
                budget = extract_budget(full_text)
                requirements = extract_requirements(full_text)

                # Si no hay suficiente info, intentar leer la página de detalle
                detail_soup = None
                if (not deadline or not budget) and link:
                    detail_soup, detail_text = fetch_detail_page(link)
                    if detail_text:
                        if not deadline:
                            deadline = parse_date_from_text(detail_text)
                        if not budget:
                            budget = extract_budget(detail_text)
                        if not requirements:
                            requirements = extract_requirements(detail_text)

                bases_url = ""
                if detail_soup:
                    bases_url = extract_bases_url(detail_soup, link)

                results.append({
                    "titulo": title,
                    "resumen": summary[:300],
                    "url": link,
                    "fecha": deadline if deadline else entry.get("published", ""),
                    "deadline_extracted": bool(deadline),
                    "organismo": feed_config["organismo"],
                    "tipo": feed_config["tipo"],
                    "fuente": feed_config["nombre"],
                    "score": score,
                    "keywords_encontrados": matches,
                    "budget": budget,
                    "requirements": requirements,
                    "bases_url": bases_url,
                    "id": generate_id(f"{title}{link}"),
                })
        except Exception as e:
            log.warning(f"Error en feed {feed_config['nombre']}: {e}")
    return results


def check_web_sources():
    results = []
    headers = {"User-Agent": "Mozilla/5.0 (Funding Monitor; academic research)"}
    for source in WEB_SOURCES:
        log.info(f"Revisando web: {source['nombre']}")
        try:
            resp = requests.get(source["url"], headers=headers, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            page_text = soup.get_text(separator=' ', strip=True)

            found_in_source = 0
            for selector in source["selector"].split(","):
                elements = soup.select(selector.strip())
                for el in elements[:10]:
                    if found_in_source >= 5:  # Max 5 resultados por fuente
                        break

                    raw_text = el.get_text(strip=True)
                    title = clean_title(raw_text)

                    if is_garbage(title):
                        continue
                    if not is_relevant(title) or len(title) < 20:
                        continue

                    # Extraer enlace
                    link_tag = el.find("a")
                    link = link_tag["href"] if link_tag and link_tag.get("href") else source["url"]
                    if not link.startswith("http"):
                        link = urljoin(source["url"], link)

                    score, matches = score_relevance(title)

                    # Extraer info del texto del elemento
                    el_text = raw_text
                    budget = extract_budget(el_text)
                    deadline = parse_date_from_text(el_text)
                    requirements = extract_requirements(el_text)
                    bases_url = ""

                    # Si no tenemos suficiente info y el enlace es diferente a la fuente,
                    # intentar leer la página de detalle de esa convocatoria
                    if link != source["url"] and (not deadline or not budget):
                        detail_soup, detail_text = fetch_detail_page(link)
                        if detail_text:
                            if not deadline:
                                deadline = parse_date_from_text(detail_text)
                            if not budget:
                                budget = extract_budget(detail_text)
                            if not requirements:
                                requirements = extract_requirements(detail_text)
                        if detail_soup:
                            bases_url = extract_bases_url(detail_soup, link)

                    results.append({
                        "titulo": title,
                        "resumen": "",
                        "url": link,
                        "fecha": deadline if deadline else "",
                        "deadline_extracted": bool(deadline),
                        "organismo": source["organismo"],
                        "tipo": source["tipo"],
                        "fuente": source["nombre"],
                        "score": score,
                        "keywords_encontrados": matches,
                        "budget": budget,
                        "requirements": requirements,
                        "bases_url": bases_url,
                        "id": generate_id(title),
                    })
                    found_in_source += 1
        except Exception as e:
            log.warning(f"Error en web {source['nombre']}: {e}")
    return results


def filter_new(results, history):
    new_results = []
    for r in results:
        if r["id"] not in history["seen_ids"]:
            new_results.append(r)
            history["seen_ids"].append(r["id"])
    if len(history["seen_ids"]) > 1000:
        history["seen_ids"] = history["seen_ids"][-1000:]
    return new_results


def build_email_html(new_results):
    new_results.sort(key=lambda x: x["score"], reverse=True)
    html = f"""
    <html><head><style>
        body {{ font-family: 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }}
        .container {{ max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }}
        .header {{ background: linear-gradient(135deg, #0d4f3c, #1a7a5c); padding: 24px 28px; color: white; }}
        .header h1 {{ margin: 0; font-size: 20px; }}
        .header p {{ margin: 6px 0 0; opacity: 0.8; font-size: 13px; }}
        .body {{ padding: 24px 28px; }}
        .card {{ border: 1px solid #e8e8e8; border-radius: 8px; padding: 16px; margin-bottom: 14px; border-left: 4px solid #10b981; }}
        .card h3 {{ margin: 0 0 6px; font-size: 15px; }}
        .meta {{ font-size: 12px; color: #6b7280; margin-bottom: 8px; }}
        .kw {{ font-size: 10px; background: #f0fdf4; color: #166534; padding: 2px 8px; border-radius: 4px; display: inline-block; margin: 2px; }}
        .score {{ float: right; font-size: 12px; font-weight: 600; color: #10b981; }}
        .link {{ color: #0d9488; text-decoration: none; font-size: 12px; }}
        .footer {{ padding: 16px 28px; background: #f9fafb; font-size: 11px; color: #9ca3af; text-align: center; }}
    </style></head><body><div class="container">
        <div class="header">
            <h1>🔬 Neuron · Funding Monitor</h1>
            <p>{datetime.now().strftime('%d/%m/%Y')} — {len(new_results)} nueva(s) convocatoria(s)</p>
        </div><div class="body">"""

    for r in new_results:
        html += f"""<div class="card">
            <span class="score">Relevancia: {r['score']}%</span>
            <h3>{r['titulo'][:120]}</h3>
            <div class="meta">{r['organismo']} · {r['tipo']} · {r['fecha']}</div>
            {f"<p style='font-size:13px;color:#4b5563;'>{r['resumen'][:200]}</p>" if r['resumen'] else ""}
            <a class="link" href="{r['url']}">Ver convocatoria ↗</a><br>
            {''.join(f'<span class="kw">{kw}</span>' for kw in r['keywords_encontrados'][:6])}
        </div>"""

    html += """</div><div class="footer">
        Generado por Funding Monitor · Neuron Rehabilitación
    </div></div></body></html>"""
    return html


def send_email(html_content, num_results):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🔬 Funding Monitor: {num_results} convocatoria(s) - {datetime.now().strftime('%d/%m/%Y')}"
        msg["From"] = CONFIG["email_from"]
        msg["To"] = ", ".join(CONFIG["email_to"])
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(CONFIG["smtp_server"], CONFIG["smtp_port"]) as server:
            server.starttls()
            server.login(CONFIG["email_from"], CONFIG["email_password"])
            server.send_message(msg)
        log.info(f"Email enviado a {CONFIG['email_to']}")
    except Exception as e:
        log.error(f"Error enviando email: {e}")
        raise


# ─────────────────────────────────────────────────────
# GENERACIÓN DE calls.json PARA EL DASHBOARD
# ─────────────────────────────────────────────────────

# Mapeo de organismo → source id del dashboard
ORGANISMO_TO_SOURCE = {
    # Nacionales
    "CDTI": "cdti",
    "AEI": "aei",
    "ISCIII": "isciii",
    "FECYT": "fecyt",
    "ENISA": "enisa",
    "Red.es": "redes",
    "ICEX": "redes",
    "SEEIC": "aei",  # SEEIC agrega convocatorias estatales, similar a AEI
    # Comunidad de Madrid
    "Comunidad de Madrid": "cm",
    "Madri+d": "cm",
    # Europeas
    "Horizon Europe": "horizon",
    "Euraxess": "horizon",
    "EIT Health": "eit",
    "AAL Programme": "eit",
    "COST": "eranet",
    "ERA-NET NEURON": "eranet",
    "OpenAIRE": "horizon",
    # Privadas
    "Fundación La Caixa": "fundacion",
    "Fundación BBVA": "fundacion",
    "Fundación Mapfre": "fundacion",
    "Fundación Ramón Areces": "fundacion",
    "Fundación Mutua Madrileña": "fundacion",
    "Fundación ONCE": "fundacion",
    # Agregadores
    "FundingBox": "agregador",
}


def classify_by_date(fecha_str):
    """Clasifica el estado de una convocatoria según su fecha."""
    if not fecha_str:
        return "open"  # Sin fecha → abierta por defecto
    try:
        deadline = datetime.strptime(fecha_str[:10], "%Y-%m-%d")
        days = (deadline - datetime.now()).days
        if days < 0:
            return "closed"
        elif days > 30:
            return "upcoming"
        else:
            return "open"  # ≤30 días, urgente se calcula en el dashboard
    except (ValueError, TypeError):
        return "open"


def convert_to_dashboard_format(result):
    """Convierte un resultado del monitor al formato del dashboard."""
    fecha = result.get("fecha", "")
    budget = result.get("budget", "")
    requirements = result.get("requirements", "")
    bases_url = result.get("bases_url", "")

    # Construir notas con la info extraída
    notes_parts = []
    if result.get("resumen"):
        notes_parts.append(result["resumen"][:150])
    notes_parts.append(
        f"[Auto-detectada] Organismo: {result['organismo']} · Tipo: {result['tipo']} · "
        f"Relevancia: {result['score']}% · Keywords: {', '.join(result['keywords_encontrados'][:5])}"
    )
    if not result.get("deadline_extracted"):
        notes_parts.append("⚠️ Fecha no confirmada (verificar en web)")

    return {
        "id": f"auto_{result['id']}",
        "title": result["titulo"][:200],
        "source": ORGANISMO_TO_SOURCE.get(result["organismo"], "otra"),
        "url": result["url"],
        "deadline": fecha,
        "status": classify_by_date(fecha),
        "elegibility": requirements,
        "budget": budget,
        "bases_url": bases_url,
        "notes": " | ".join(notes_parts),
        "starred": False,
        "auto_detected": True,
        "deadline_confirmed": result.get("deadline_extracted", False),
        "detected_date": datetime.now().strftime("%Y-%m-%d"),
    }


def load_user_edits():
    """
    Lee user_edits.json del repositorio para respetar los cambios del usuario
    (descartadas, eliminadas, modificaciones de estado, etc.).
    El dashboard guarda este archivo vía GitHub API.
    """
    edits = {"discarded": [], "deleted": [], "modified": {}, "added": []}
    # Buscar user_edits.json en varias ubicaciones posibles
    for path in ["user_edits.json", "public/user_edits.json"]:
        p = Path(path)
        if p.exists():
            try:
                data = json.loads(p.read_text())
                edits["discarded"] = data.get("discarded", [])
                edits["deleted"] = data.get("deleted", [])
                edits["modified"] = data.get("modified", {})
                edits["added"] = data.get("added", [])
                log.info(f"user_edits.json cargado: {len(edits['discarded'])} descartadas, "
                         f"{len(edits['deleted'])} eliminadas, {len(edits['modified'])} modificadas")
                return edits
            except (json.JSONDecodeError, KeyError) as e:
                log.warning(f"Error leyendo {path}: {e}")
    log.info("No se encontró user_edits.json — no hay ediciones del usuario")
    return edits


def generate_calls_json(all_results, output_path="public/calls.json"):
    """
    Genera/actualiza calls.json combinando convocatorias manuales existentes
    con las auto-detectadas por el monitor.
    Respeta user_edits.json para no pisar cambios del usuario.
    """
    output = Path(output_path)

    # Cargar ediciones del usuario (descartadas, eliminadas, etc.)
    user_edits = load_user_edits()
    discarded_ids = set(user_edits["discarded"])
    deleted_ids = set(user_edits["deleted"])
    modified_map = user_edits["modified"]  # {id: {status, starred, ...}}

    # Cargar calls.json existente (con convocatorias manuales)
    existing_calls = []
    if output.exists():
        try:
            data = json.loads(output.read_text())
            existing_calls = data.get("calls", [])
        except (json.JSONDecodeError, KeyError):
            log.warning("calls.json corrupto, se regenerará")

    # Separar manuales de auto-detectadas anteriores
    manual_calls = [c for c in existing_calls if not c.get("auto_detected", False)]
    old_auto_ids = {c["id"] for c in existing_calls if c.get("auto_detected", False)}

    # Eliminar las que el usuario eliminó definitivamente
    manual_calls = [c for c in manual_calls if c["id"] not in deleted_ids]

    # Convertir nuevos resultados
    new_auto_calls = []
    for r in all_results:
        call = convert_to_dashboard_format(r)
        if call["id"] not in old_auto_ids and call["id"] not in deleted_ids:
            new_auto_calls.append(call)

    # Mantener auto-detectadas anteriores (reclasificar por fecha) + añadir nuevas
    auto_calls = []
    for c in existing_calls:
        if c.get("auto_detected", False):
            cid = c["id"]
            # Eliminar si el usuario la borró definitivamente
            if cid in deleted_ids:
                continue
            # Respetar descartadas del usuario (tanto de calls.json como de user_edits)
            if cid in discarded_ids or c.get("status") == "descartada":
                c["status"] = "descartada"
            else:
                # Aplicar modificaciones del usuario (status, starred, etc.)
                if cid in modified_map:
                    user_mod = modified_map[cid]
                    if user_mod.get("status") == "descartada":
                        c["status"] = "descartada"
                    elif user_mod.get("status") == "applied":
                        c["status"] = "applied"
                    else:
                        # Reclasificar por fecha solo si el usuario no cambió el status manualmente
                        c["status"] = classify_by_date(c.get("deadline", ""))
                    if "starred" in user_mod:
                        c["starred"] = user_mod["starred"]
                else:
                    # Sin modificaciones del usuario → reclasificar por fecha
                    c["status"] = classify_by_date(c.get("deadline", ""))
            auto_calls.append(c)
    auto_calls.extend(new_auto_calls)

    # Limitar auto-detectadas a las últimas 50
    auto_calls = auto_calls[-50:]

    # Aplicar modificaciones del usuario a las manuales también
    for c in manual_calls:
        cid = c["id"]
        if cid in discarded_ids:
            c["status"] = "descartada"
        elif cid in modified_map:
            user_mod = modified_map[cid]
            if "status" in user_mod:
                c["status"] = user_mod["status"]
            if "starred" in user_mod:
                c["starred"] = user_mod["starred"]

    # Combinar todo
    all_calls = manual_calls + auto_calls

    calls_data = {
        "last_updated": datetime.now().isoformat(),
        "total": len(all_calls),
        "manual_count": len(manual_calls),
        "auto_count": len(auto_calls),
        "new_this_run": len(new_auto_calls),
        "calls": all_calls,
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(calls_data, indent=2, ensure_ascii=False))
    log.info(f"calls.json actualizado: {len(manual_calls)} manuales + {len(auto_calls)} auto ({len(new_auto_calls)} nuevas)")
    return calls_data


def validate_config():
    """Valida que las credenciales de email estén configuradas."""
    missing = []
    if not CONFIG["email_from"]:
        missing.append("EMAIL_FROM")
    if not CONFIG["email_password"]:
        missing.append("EMAIL_PASSWORD")
    if not CONFIG["email_to"]:
        missing.append("EMAIL_TO")
    if missing:
        log.error(
            f"Faltan variables de entorno: {', '.join(missing)}. "
            "Configúralas antes de ejecutar el script.\n"
            "  export EMAIL_FROM='tu.email@gmail.com'\n"
            "  export EMAIL_PASSWORD='tu-app-password'\n"
            "  export EMAIL_TO='destinatario@email.com'"
        )
        return False
    return True


def deduplicate_results(results):
    """Elimina resultados duplicados dentro de una misma ejecución."""
    seen_titles = set()
    unique = []
    for r in results:
        title_key = r["titulo"].lower().strip()[:80]
        if title_key not in seen_titles:
            seen_titles.add(title_key)
            unique.append(r)
    return unique


def main():
    log.info("=" * 50)
    log.info("FUNDING MONITOR - Inicio de chequeo")
    log.info("=" * 50)

    # Ruta al calls.json (se puede configurar por env var)
    calls_json_path = os.environ.get("CALLS_JSON_PATH", "public/calls.json")

    history = load_history()
    log.info(f"Historial: {len(history['seen_ids'])} ya vistas | Último: {history.get('last_check', 'Nunca')}")

    # Buscar convocatorias
    all_results = []
    all_results.extend(check_rss_feeds())
    all_results.extend(check_web_sources())
    log.info(f"Resultados relevantes (brutos): {len(all_results)}")

    all_results = deduplicate_results(all_results)
    log.info(f"Resultados tras deduplicar: {len(all_results)}")

    new_results = filter_new(all_results, history)
    log.info(f"Convocatorias NUEVAS: {len(new_results)}")

    save_history(history)

    # Siempre actualizar calls.json con TODOS los resultados relevantes
    # (no solo los nuevos, para que el dashboard tenga el catálogo completo)
    generate_calls_json(all_results, output_path=calls_json_path)

    # Enviar email solo si hay novedades Y las credenciales están configuradas
    if new_results and validate_config():
        html = build_email_html(new_results)
        send_email(html, len(new_results))
    elif new_results:
        log.info(f"Hay {len(new_results)} nuevas, pero email no configurado. Solo se actualiza calls.json.")
    else:
        log.info("Sin novedades.")

    log.info("Chequeo completado.")
    return new_results


if __name__ == "__main__":
    main()


# =============================================================================
# INSTRUCCIONES PARA GITHUB ACTIONS (ejecución automática gratuita)
# =============================================================================
#
# 1. Crea un repositorio PRIVADO en GitHub
# 2. Sube este archivo (funding_monitor.py) y un funding_history.json con: {}
# 3. Crea el archivo .github/workflows/funding_check.yml con:
#
# name: Funding Monitor
# on:
#   schedule:
#     - cron: '0 7 * * 1-5'    # L-V a las 9:00 hora Madrid
#   workflow_dispatch:           # Permite ejecución manual
#
# jobs:
#   check:
#     runs-on: ubuntu-latest
#     steps:
#       - uses: actions/checkout@v4
#       - uses: actions/setup-python@v5
#         with:
#           python-version: '3.11'
#       - run: pip install feedparser requests beautifulsoup4
#       - env:
#           EMAIL_FROM: ${{ secrets.EMAIL_FROM }}
#           EMAIL_PASSWORD: ${{ secrets.EMAIL_PASSWORD }}
#         run: python funding_monitor.py
#       - run: |
#           git config user.name "Funding Bot"
#           git config user.email "bot@neuron.com"
#           git add funding_history.json
#           git diff --staged --quiet || git commit -m "Update history"
#           git push
#
# 4. En Settings > Secrets > Actions, añade EMAIL_FROM y EMAIL_PASSWORD
# 5. ¡Listo! Se ejecuta solo de lunes a viernes.
# =============================================================================
