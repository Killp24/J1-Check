import { useEffect, useState } from "react";
import { BetsPage } from "./pages/BetsPage";
import { MatchPage } from "./pages/MatchPage";
import { ResearchPage } from "./pages/ResearchPage";
import { RoundPage } from "./pages/RoundPage";
import { parseFixtureLines } from "./lib/fixtures";
import { currentTeams, fetchHistory, seasonList } from "./lib/history";
import type { MarketKey } from "./lib/markets";
import { BET_KEY, FIXTURE_KEY, loadArray, newId, saveJson } from "./lib/storage";
import type { Bet, Fixture, HistMatch } from "./lib/types";

export type Page = { name: "round" } | { name: "match"; id: string } | { name: "research" } | { name: "bets" };

export function App() {
  const [fixtures, setFixtures] = useState<Fixture[]>(() => loadArray<Fixture>(FIXTURE_KEY));
  const [bets, setBets] = useState<Bet[]>(() => loadArray<Bet>(BET_KEY));
  const [matches, setMatches] = useState<HistMatch[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [srcInfo, setSrcInfo] = useState("Loading history…");
  const [page, setPage] = useState<Page>({ name: "round" });
  const [market, setMarket] = useState<MarketKey>("1x2");
  const [researchTeams, setResearchTeams] = useState({ home: "", away: "" });

  useEffect(() => {
    saveJson(FIXTURE_KEY, fixtures);
  }, [fixtures]);

  useEffect(() => {
    saveJson(BET_KEY, bets);
  }, [bets]);

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}j1_odds.csv`;
    let cancelled = false;
    fetchHistory(url)
      .then((rows) => {
        if (cancelled) return;
        const seasons = seasonList(rows);
        const live = currentTeams(rows);
        setMatches(rows);
        setTeams(live);
        setSrcInfo(
          `${rows.length.toLocaleString()} matches on record, ${seasons[0]} to ${seasons[seasons.length - 1]}. ${live.length} current teams.`,
        );
      })
      .catch(() => {
        if (cancelled) return;
        setSrcInfo("Couldn't load the match history. Prices still work; research will be empty.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pageKey = page.name === "match" ? `match:${page.id}` : page.name;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pageKey]);

  useEffect(() => {
    if (page.name === "match" && !fixtures.some((fixture) => fixture.id === page.id)) {
      setPage({ name: "round" });
    }
  }, [page, fixtures]);

  const updateFixture = (id: string, update: (fixture: Fixture) => Fixture) => {
    setFixtures((current) => current.map((fixture) => (fixture.id === id ? update(fixture) : fixture)));
  };

  const openMatch = fixtures.find((fixture) => page.name === "match" && fixture.id === page.id) ?? null;

  return (
    <>
      <div className="wrap">
        <header id="head">
          <h1>J1 Check</h1>
          <p className="sub" id="srcInfo">
            {srcInfo}
          </p>
        </header>
        {page.name === "round" ? (
          <RoundPage
            fixtures={fixtures}
            onAdd={(text) => {
              const added = parseFixtureLines(text, teams, () => newId("f"));
              if (added.length) setFixtures((current) => [...current, ...added]);
              return added.length;
            }}
            onClear={() => setFixtures([])}
            onOpen={(id) => setPage({ name: "match", id })}
          />
        ) : null}
        {page.name === "match" && openMatch ? (
          <MatchPage
            fixture={openMatch}
            market={market}
            onMarket={setMarket}
            onChange={updateFixture}
            onBack={() => setPage({ name: "round" })}
            onResearch={() => {
              setResearchTeams({ home: openMatch.home, away: openMatch.away });
              setPage({ name: "research" });
            }}
            onLogBet={(bet) => setBets((current) => [...current, bet])}
          />
        ) : null}
        {page.name === "research" ? (
          <ResearchPage
            matches={matches}
            teams={teams}
            home={researchTeams.home}
            away={researchTeams.away}
            onTeams={(home, away) => setResearchTeams({ home, away })}
          />
        ) : null}
        {page.name === "bets" ? (
          <BetsPage
            bets={bets}
            onSettle={(id, status) =>
              setBets((current) => current.map((bet) => (bet.id === id ? { ...bet, status } : bet)))
            }
            onDelete={(id) => setBets((current) => current.filter((bet) => bet.id !== id))}
            onReplace={setBets}
          />
        ) : null}
      </div>
      <nav className="navbar" role="tablist">
        <button
          id="navRound"
          type="button"
          aria-current={page.name === "round" ? "page" : undefined}
          onClick={() => setPage({ name: "round" })}
        >
          Round
        </button>
        <button
          id="navResearch"
          type="button"
          aria-current={page.name === "research" ? "page" : undefined}
          onClick={() => {
            if (page.name === "match" && openMatch) {
              setResearchTeams({ home: openMatch.home, away: openMatch.away });
            }
            setPage({ name: "research" });
          }}
        >
          Research
        </button>
        <button
          id="navBets"
          type="button"
          aria-current={page.name === "bets" ? "page" : undefined}
          onClick={() => setPage({ name: "bets" })}
        >
          Bets
        </button>
      </nav>
    </>
  );
}
