import { formCells, headToHead, venueSplit, type VenueSplit } from "../lib/history";
import type { HistMatch } from "../lib/types";

interface ResearchPageProps {
  matches: HistMatch[];
  teams: readonly string[];
  home: string;
  away: string;
  onTeams: (home: string, away: string) => void;
}

export function ResearchPage({ matches, teams, home, away, onTeams }: ResearchPageProps) {
  const options = [...new Set([...teams, home, away].filter(Boolean))].sort();
  const ready = Boolean(home && away && home !== away && matches.length);
  const h2h = ready ? headToHead(matches, home, away) : null;
  const recent = h2h ? [...h2h.meetings].slice(-6).reverse() : [];
  const draws = h2h ? h2h.meetings.length - h2h.homeWins - h2h.awayWins : 0;

  return (
    <section id="pgResearch">
      <h2>Research</h2>
      <p className="sub">Form, home and away splits, and head to head are read from j1_odds.csv.</p>
      <div className="card">
        <div className="row">
          <label className="field" htmlFor="resHome">
            Home
            <select id="resHome" value={home} onChange={(event) => onTeams(event.target.value, away)}>
              <option value="">Choose a team</option>
              {options.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor="resAway">
            Away
            <select id="resAway" value={away} onChange={(event) => onTeams(home, event.target.value)}>
              <option value="">Choose a team</option>
              {options.map((team) => (
                <option key={`away-${team}`} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {!matches.length ? <p className="small muted">No history loaded.</p> : null}
      {matches.length && (!home || !away) ? (
        <p className="small muted">Choose a home team and an away team.</p>
      ) : null}
      {matches.length && home && away && home === away ? (
        <p className="small muted">Pick two different teams.</p>
      ) : null}
      {ready && h2h ? (
        <div id="research">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Form, last 6</h2>
            <p className="small muted" style={{ margin: 0 }}>
              Oldest on the left.
            </p>
            <FormLine team={home} matches={matches} />
            <FormLine team={away} matches={matches} />
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Home and away, last 10</h2>
            <SplitBlock team={home} place="at home" split={venueSplit(matches, home, "home")} />
            <SplitBlock team={away} place="away" split={venueSplit(matches, away, "away")} />
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Head to head</h2>
            {h2h.meetings.length ? (
              <>
                <div className="score">
                  <div>
                    <div className="n">{h2h.homeWins}</div>
                    <div className="name">{home}</div>
                  </div>
                  <div className="mid">
                    <div className="n">{draws}</div>
                    <div className="name">Draws</div>
                  </div>
                  <div>
                    <div className="n">{h2h.awayWins}</div>
                    <div className="name">{away}</div>
                  </div>
                </div>
                <div className="stats three">
                  <div className="stat">
                    <span className="k">Meetings</span>
                    <span className="v">{h2h.meetings.length}</span>
                  </div>
                  <div className="stat">
                    <span className="k">Goals / game</span>
                    <span className="v">{h2h.goalsPerGame.toFixed(2)}</span>
                    <span className="s">both teams</span>
                  </div>
                  <div className="stat">
                    <span className="k">Over 2.5</span>
                    <span className="v">{(h2h.over25Rate * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <h3>Recent</h3>
                {recent.map((match, index) => (
                  <div className="result" key={`${match.date}-${match.home}-${index}`}>
                    <span className="small muted">{match.date}</span>
                    <span>
                      <span className={match.hg > match.ag ? "winner" : undefined}>{match.home}</span> {match.hg}-
                      {match.ag} <span className={match.ag > match.hg ? "winner" : undefined}>{match.away}</span>
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <p className="small muted" style={{ margin: ".2rem 0" }}>
                No meetings on record.
              </p>
            )}
            <p className="small muted" style={{ margin: "10px 0 0" }}>
              League baseline: 2.62 goals a game, over 2.5 hits 48.6%, home wins 41%.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function FormLine({ team, matches }: { team: string; matches: HistMatch[] }) {
  const cells = formCells(matches, team);
  return (
    <div className="formline">
      <span className="who">{team}</span>
      {cells.length ? (
        <span className="wl">
          {cells.map((cell, index) => (
            <span key={`${cell.title}-${index}`} className={cell.kind} title={cell.title}>
              {cell.kind.toUpperCase()}
            </span>
          ))}
        </span>
      ) : (
        <span className="small muted">No games</span>
      )}
    </div>
  );
}

function SplitBlock({ team, place, split }: { team: string; place: string; split: VenueSplit }) {
  const rate = split.played ? `${Math.round((split.wins / split.played) * 100)}%` : "No games";
  return (
    <div>
      <div className="who" style={{ fontWeight: 600, marginTop: 8 }}>
        {team} {place}
      </div>
      <div className="stats">
        <div className="stat">
          <span className="k">Won</span>
          <span className="v">
            {split.wins}/{split.played}
          </span>
          <span className="s">{rate}</span>
        </div>
        <div className="stat">
          <span className="k">Goals / game</span>
          <span className="v">{split.goalsPerGame.toFixed(2)}</span>
          <span className="s">both teams</span>
        </div>
      </div>
    </div>
  );
}
