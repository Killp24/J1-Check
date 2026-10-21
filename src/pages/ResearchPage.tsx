import { formCells, headToHead, venueSplit } from "../lib/history";
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
        <div className="card" id="research">
          <h3 style={{ marginTop: 0 }}>Form, last 6</h3>
          <FormLine team={home} matches={matches} />
          <FormLine team={away} matches={matches} />
          <h3>Home and away, last 10 each</h3>
          <table>
            <thead>
              <tr>
                <th />
                <th className="num">Won</th>
                <th className="num">Goals per game</th>
              </tr>
            </thead>
            <tbody>
              <SplitRow team={`${home} at home`} split={venueSplit(matches, home, "home")} />
              <SplitRow team={`${away} away`} split={venueSplit(matches, away, "away")} />
            </tbody>
          </table>
          <h3>Head to head</h3>
          {h2h.meetings.length ? (
            <>
              <p style={{ margin: ".2rem 0" }}>
                {home} {h2h.homeWins} — {h2h.awayWins} {away} in {h2h.meetings.length} meetings. Average{" "}
                {h2h.goalsPerGame.toFixed(2)} goals, over 2.5 in {(h2h.over25Rate * 100).toFixed(0)}%.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((match, index) => (
                    <tr key={`${match.date}-${match.home}-${index}`}>
                      <td>{match.date}</td>
                      <td>
                        {match.home} {match.hg}-{match.ag} {match.away}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
      ) : null}
    </section>
  );
}

function FormLine({ team, matches }: { team: string; matches: HistMatch[] }) {
  return (
    <p style={{ margin: ".2rem 0" }}>
      {team}{" "}
      <span className="wl">
        {formCells(matches, team).map((cell, index) => (
          <span key={`${cell.title}-${index}`} className={cell.kind} title={cell.title}>
            {cell.kind.toUpperCase()}
          </span>
        ))}
      </span>
    </p>
  );
}

function SplitRow({
  team,
  split,
}: {
  team: string;
  split: { wins: number; played: number; goalsPerGame: number };
}) {
  return (
    <tr>
      <td>{team}</td>
      <td className="num">
        {split.wins}/{split.played}
      </td>
      <td className="num">{split.goalsPerGame.toFixed(2)}</td>
    </tr>
  );
}
