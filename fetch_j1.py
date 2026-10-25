"""Collect J1 League data for the betting tracker.

Sources, all free:
  football-data.co.uk  - results plus CLOSING odds (Pinnacle, market max, market average)
                         for Japan, back to 2012. This is what lets us measure whether a
                         model beats the closing line.
  FBref                - results plus expected goals (xG), which predict goal volume far
                         better than results do. Essential for over/under work.
  ESPN scoreboard      - upcoming / in-progress fixtures so the app can show what's on
                         without anyone pasting a round by hand.

Writes:
  j1_odds.csv      every match with closing odds
  j1_xg.csv        every match with xG for both sides
  j1_merged.csv    the two joined on date and teams, which is what the analysis uses
  j1_fixtures.csv  upcoming and recent fixtures for the Round screen
  fetch_log.txt    what happened, including the exact columns each source gave us
"""
import csv, io, json, re, sys, time, urllib.request
from datetime import datetime, timedelta, timezone

UA = {"User-Agent": "Mozilla/5.0 (J1 tracker; results and odds for personal analysis)"}
LOG = []


def log(msg):
    print(msg)
    LOG.append(msg)


def get(url, tries=3):
    """Fetch a page. Never raises: a failure is logged and returns an empty string,
    so one bad source cannot take the whole run down."""
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                body = r.read().decode("utf-8", "replace")
            log(f"  ok   {r.status}  {len(body):>8,} bytes  {url}")
            return body
        except Exception as e:
            code = getattr(e, "code", "")
            log(f"  fail {code} attempt {i+1}/{tries}  {url}: {e}")
            if i == tries - 1:
                return ""
            time.sleep(8)


# ---------- 1. football-data.co.uk: results + closing odds ----------
raw = get("https://www.football-data.co.uk/new/JPN.csv")
odds_rows = []
if raw:
    rdr = csv.DictReader(io.StringIO(raw))
    cols = rdr.fieldnames or []
    log(f"football-data columns ({len(cols)}): {', '.join(cols)}")
    for r in rdr:
        if not r.get("Home") or not r.get("Date"):
            continue
        odds_rows.append(r)
    log(f"football-data rows: {len(odds_rows)}")
    if odds_rows:
        log(f"  date range: {odds_rows[0].get('Date')} to {odds_rows[-1].get('Date')}")
        # Tell us plainly whether totals prices are in there
        tot = [c for c in cols if "2.5" in c]
        log(f"  over/under 2.5 columns present: {tot if tot else 'NONE'}")
    with open("j1_odds.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(odds_rows)
else:
    log("football-data returned nothing; writing an empty j1_odds.csv")
    open("j1_odds.csv", "w", encoding="utf-8").write("")


# ---------- 2. FBref: results + xG ----------
# Season ids change, so read the seasons index and follow each schedule page.
def fbref_schedule(url, season):
    html = get(url)
    if not html:
        return []
    out = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html, flags=re.S):
        def cell(stat):
            m = re.search(r'data-stat="%s"[^>]*>(.*?)</t[dh]>' % stat, tr, flags=re.S)
            if not m:
                return ""
            return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip()
        date, home, away = cell("date"), cell("home_team"), cell("away_team")
        score = cell("score")
        if not (date and home and away and score):
            continue
        m = re.match(r"(\d+)\D+(\d+)", score)
        if not m:
            continue
        out.append(dict(season=season, date=date, home=home, away=away,
                        hg=m.group(1), ag=m.group(2),
                        home_xg=cell("home_xg"), away_xg=cell("away_xg")))
    return out


xg_rows = []
seasons = [
    ("2026-2027", "https://fbref.com/en/comps/25/schedule/J1-League-Scores-and-Fixtures"),
]
idx = get("https://fbref.com/en/comps/25/history/J1-League-Seasons")
for m in re.finditer(r'href="(/en/comps/25/(\d{4}(?:-\d{4})?)/schedule/[^"]+)"', idx):
    seasons.append((m.group(2), "https://fbref.com" + m.group(1)))
seen = set()
for season, url in seasons:
    if season in seen:
        continue
    seen.add(season)
    rows = fbref_schedule(url, season)
    xg_rows += rows
    log(f"FBref {season}: {len(rows)} matches, with xG on {sum(1 for r in rows if r['home_xg'])}")
    time.sleep(4)          # FBref asks for slow, polite requests

if not xg_rows:
    log("FBref returned nothing; writing an empty j1_xg.csv")
    open("j1_xg.csv", "w", encoding="utf-8").write("")
if xg_rows:
    with open("j1_xg.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(xg_rows[0].keys()))
        w.writeheader()
        w.writerows(xg_rows)
    log(f"FBref total: {len(xg_rows)} matches")


# ---------- 2b. fallback results if FBref blocked the runner ----------
# FBref sometimes refuses cloud IPs. This mirror lives on GitHub and always answers.
# It carries results only, no xG, but it keeps the pipeline useful either way.
if not xg_rows:
    log("trying the GitHub results mirror instead")
    for season in ("2024", "2025", "2026"):
        txt = get(f"https://raw.githubusercontent.com/footballcsv/cache.footballdata/master/JPN/{season}/jpn.1.csv")
        if not txt:
            continue
        for r in csv.DictReader(io.StringIO(txt)):
            h = r.get("Team 1") or r.get("HomeTeam") or ""
            a = r.get("Team 2") or r.get("AwayTeam") or ""
            sc = r.get("FT") or ""
            m = re.match(r"(\d+)\D+(\d+)", sc)
            if h and a and m:
                xg_rows.append(dict(season=season, date=r.get("Date", ""), home=h, away=a,
                                    hg=m.group(1), ag=m.group(2), home_xg="", away_xg=""))
        log(f"  mirror {season}: running total {len(xg_rows)}")


# ---------- 3. join them ----------
# Team names differ between the two sources, so match on date plus a loose name key.
def key_name(n):
    n = n.lower()
    for junk in ("fc ", " fc", "f.c.", "club crest", "."):
        n = n.replace(junk, " ")
    return re.sub(r"[^a-z]", "", n)[:7]


def key_date(d):
    for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d"):
        try:
            return datetime.strptime(d.strip(), fmt).date().isoformat()
        except ValueError:
            pass
    return ""


xg_by = {}
for r in xg_rows:
    xg_by[(key_date(r["date"]), key_name(r["home"]), key_name(r["away"]))] = r

merged, hit = [], 0
for r in odds_rows:
    k = (key_date(r.get("Date", "")), key_name(r.get("Home", "")), key_name(r.get("Away", "")))
    x = xg_by.get(k)
    if x:
        hit += 1
    merged.append({**r, "home_xg": (x or {}).get("home_xg", ""), "away_xg": (x or {}).get("away_xg", "")})
log(f"merged: {len(merged)} matches, {hit} with xG attached")

if not merged:
    log("nothing to merge; writing an empty j1_merged.csv")
    open("j1_merged.csv", "w", encoding="utf-8").write("")
if merged:
    with open("j1_merged.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(merged[0].keys()))
        w.writeheader()
        w.writerows(merged)


# ---------- 4. ESPN: upcoming fixtures for the Round screen ----------
# ESPN's public scoreboard API is CORS-friendly and carries kickoff times for J1.
# Names differ slightly from football-data; the app maps them on load.
ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/jpn.1/scoreboard"
ALIAS = {
    "fagiano okayama": "Okayama",
    "jef united ichihara-chiba": "Chiba",
    "jef united chiba": "Chiba",
    "tokyo verdy 1969": "Verdy",
    "tokyo verdy": "Verdy",
    "urawa red diamonds": "Urawa Reds",
    "kyoto sanga": "Kyoto",
    "machida zelvia": "Machida",
    "mito hollyhock": "Mito",
}


def espn_name(n):
    key = re.sub(r"\s+", " ", (n or "").strip().lower())
    return ALIAS.get(key, (n or "").strip())


def espn_day(ymd):
    body = get(f"{ESPN}?dates={ymd}")
    if not body:
        return []
    try:
        data = json.loads(body)
    except json.JSONDecodeError as e:
        log(f"  ESPN JSON error on {ymd}: {e}")
        return []
    out = []
    for ev in data.get("events") or []:
        comps = (ev.get("competitions") or [{}])[0]
        home = away = ""
        for c in comps.get("competitors") or []:
            name = espn_name((c.get("team") or {}).get("displayName", ""))
            if c.get("homeAway") == "home":
                home = name
            elif c.get("homeAway") == "away":
                away = name
        if not (home and away):
            continue
        when = ev.get("date") or ""
        st = ((ev.get("status") or {}).get("type") or {})
        out.append({
            "id": str(ev.get("id") or f"{ymd}-{home}-{away}"),
            "date": when[:10],
            "kickoff": when,
            "home": home,
            "away": away,
            "status": st.get("name") or "",
            "state": st.get("state") or "",
            "detail": st.get("shortDetail") or st.get("detail") or "",
        })
    return out


fix_rows = []
board = get(ESPN)
cal = []
if board:
    try:
        cal = (json.loads(board).get("leagues") or [{}])[0].get("calendar") or []
    except json.JSONDecodeError:
        cal = []
now = datetime.now(timezone.utc).date()
# Pull today through the next two weeks of calendar matchdays.
want = []
for c in cal:
    try:
        d = datetime.fromisoformat(c.replace("Z", "+00:00")).date()
    except ValueError:
        continue
    if now - timedelta(days=1) <= d <= now + timedelta(days=14):
        want.append(d.strftime("%Y%m%d"))
if not want:
    want = [(now + timedelta(days=i)).strftime("%Y%m%d") for i in range(0, 8)]
seen_ids = set()
for ymd in want:
    for row in espn_day(ymd):
        if row["id"] in seen_ids:
            continue
        seen_ids.add(row["id"])
        fix_rows.append(row)
    time.sleep(0.4)
log(f"ESPN fixtures: {len(fix_rows)} matches across {len(want)} days")

fields = ["id", "date", "kickoff", "home", "away", "status", "state", "detail"]
with open("j1_fixtures.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows(fix_rows)

open("fetch_log.txt", "w", encoding="utf-8").write(
    f"# run {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ')}\n" + "\n".join(LOG) + "\n")
