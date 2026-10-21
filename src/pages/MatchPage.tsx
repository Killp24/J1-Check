import { useState } from "react";
import { bestEdge, edgeBand, formatEdgePercent, selectionLabel } from "../lib/fixtures";
import { BOOKS, MARKETS, SOFT_BOOKS, marketTitle, type BookName, type MarketKey } from "../lib/markets";
import { fairProbabilities, formatDecimalAsAmerican, toDecimal, edge as edgeOf } from "../lib/odds";
import { newId } from "../lib/storage";
import type { Bet, Fixture, MarketPrices } from "../lib/types";

interface MatchPageProps {
  fixture: Fixture;
  market: MarketKey;
  onMarket: (market: MarketKey) => void;
  onChange: (id: string, update: (fixture: Fixture) => Fixture) => void;
  onBack: () => void;
  onResearch: () => void;
  onLogBet: (bet: Bet) => void;
}

function withBookPrice(fixture: Fixture, market: MarketKey, book: BookName, index: number, value: string): Fixture {
  const count = MARKETS[market].labels.length;
  const current = fixture.prices[market] ?? {};
  const cells = Array.from({ length: count }, (_, cell) => current[book]?.[cell] ?? "");
  cells[index] = value;
  return {
    ...fixture,
    prices: { ...fixture.prices, [market]: { ...current, [book]: cells } },
  };
}

export function MatchPage({ fixture, market, onMarket, onChange, onBack, onResearch, onLogBet }: MatchPageProps) {
  const [noteState, setNoteState] = useState({ id: fixture.id, message: "" });
  if (noteState.id !== fixture.id) setNoteState({ id: fixture.id, message: "" });
  const noteMsg = noteState.message;
  const setNoteMsg = (message: string) => setNoteState({ id: fixture.id, message });

  const prices: MarketPrices = fixture.prices[market] ?? {};
  const spec = MARKETS[market];
  const defaultLine = market === "ou" ? "2.5" : "-0.5";
  const [lineState, setLineState] = useState({
    id: fixture.id,
    market,
    value: prices.line || defaultLine,
  });
  if (lineState.id !== fixture.id || lineState.market !== market) {
    setLineState({ id: fixture.id, market, value: prices.line || defaultLine });
  }
  const lineDraft = lineState.value;
  const setLineDraft = (value: string) => setLineState({ id: fixture.id, market, value });

  const pinnacle = spec.labels.map((_, index) => toDecimal((prices.Pinnacle ?? [])[index] ?? ""));
  const fair = pinnacle.every((value) => value != null)
    ? fairProbabilities(pinnacle.filter((value): value is NonNullable<typeof value> => value != null))
    : null;
  const best = bestEdge(fixture);
  const verdict = best && best.market === market ? best : null;

  return (
    <section id="pgMatch">
      <button className="btn sm" id="backBtn" type="button" onClick={onBack}>
        ‹ Round
      </button>
      <div className="card" style={{ marginTop: 10 }}>
        <h2 id="mTitle">
          {fixture.home} v {fixture.away}
        </h2>
        <p className="sub" id="mWhen">
          {fixture.when || ""}
        </p>
        <div className="tabs" role="tablist" id="mktTabs">
          {(Object.keys(MARKETS) as MarketKey[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              data-mkt={key}
              aria-selected={market === key}
              onClick={() => onMarket(key)}
            >
              {marketTitle(key)}
            </button>
          ))}
        </div>
        <div id="lineRow" className={market === "1x2" ? "row hide" : "row"} style={{ marginBottom: 10 }}>
          <label className="small muted" htmlFor="lineVal" id="lineLbl">
            {market === "ou" ? "Goals line" : "Home handicap"}
          </label>
          <input
            id="lineVal"
            style={{ width: 90 }}
            inputMode="decimal"
            value={lineDraft}
            onChange={(event) => {
              const value = event.target.value;
              setLineDraft(value);
              onChange(fixture.id, (current) => {
                const prev = current.prices[market] ?? {};
                return { ...current, prices: { ...current.prices, [market]: { ...prev, line: value } } };
              });
            }}
          />
        </div>
        <div id="priceGrid" className="grid" style={{ gridTemplateColumns: `auto repeat(${spec.labels.length}, 1fr)` }}>
          <div />
          {spec.labels.map((label) => (
            <div key={label} className="lbl" style={{ textAlign: "center" }}>
              {label}
            </div>
          ))}
          {BOOKS.map((book) => (
            <BookRow
              key={book}
              book={book}
              labels={spec.labels}
              values={prices[book] ?? []}
              onChange={(index, value) => onChange(fixture.id, (current) => withBookPrice(current, market, book, index, value))}
            />
          ))}
        </div>
        <p className="small muted" style={{ margin: "10px 0 0" }}>
          Enter decimal (2.10) or American (+110, −130). Pinnacle sets fair value; your books are compared to it.
        </p>
        <div id="edgeOut" style={{ marginTop: 12 }}>
          {!fair ? (
            <p className="small muted" style={{ margin: 0 }}>
              Enter all of Pinnacle&apos;s prices to see fair value and edges.
            </p>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Selection</th>
                    <th className="num">Pinnacle fair</th>
                    {SOFT_BOOKS.map((book) => (
                      <th key={book} className="num">
                        {book}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {spec.labels.map((label, index) => (
                    <tr key={label}>
                      <td>
                        {label}
                        {market !== "1x2" && prices.line ? ` ${prices.line}` : ""}
                      </td>
                      <td className="num pill">{((fair.probabilities[index] ?? 0) * 100).toFixed(1)}%</td>
                      {SOFT_BOOKS.map((book) => {
                        const decimal = toDecimal((prices[book] ?? [])[index] ?? "");
                        if (!decimal) {
                          return (
                            <td key={book} className="num muted">
                              –
                            </td>
                          );
                        }
                        const value = edgeOf(fair.probabilities[index] ?? 0, decimal);
                        return (
                          <td key={book} className="num">
                            <span className={`tag ${edgeBand(value)}`}>{formatEdgePercent(value)}</span>
                            <br />
                            <span className="small muted">{formatDecimalAsAmerican(decimal)}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="small muted" style={{ margin: "8px 0 0" }}>
                Pinnacle&apos;s margin on this market: {(fair.margin * 100).toFixed(1)}%
              </p>
              {verdict && verdict.edge >= 0.02 ? (
                <LogBet
                  key={`${verdict.book}:${verdict.market}:${verdict.side}:${verdict.line ?? ""}:${verdict.dec}`}
                  label={selectionLabel(verdict.market, verdict.side, prices.line)}
                  book={verdict.book}
                  edgeValue={verdict.edge}
                  onLog={(stakeText) => {
                    const stake = Number.parseFloat(stakeText);
                    if (!stake || stake <= 0) return "Enter a stake first.";
                    const sideName = MARKETS[verdict.market].labels[verdict.side] ?? "";
                    onLogBet({
                      id: newId("b"),
                      made: Date.now(),
                      home: fixture.home,
                      away: fixture.away,
                      when: fixture.when,
                      mkt: verdict.market,
                      side: verdict.side,
                      line: prices.line || "",
                      label: selectionLabel(verdict.market, verdict.side, prices.line),
                      book: verdict.book,
                      dec: verdict.dec,
                      stake,
                      fair: fair?.probabilities[verdict.side] ?? null,
                      edge: verdict.edge,
                      status: "pending",
                    });
                    return `Logged $${stake.toFixed(2)} on ${sideName} at ${formatDecimalAsAmerican(verdict.dec)}.`;
                  }}
                />
              ) : null}
              {verdict && verdict.edge < 0.02 ? (
                <p className="small muted" style={{ margin: "10px 0 0" }}>
                  Best available is {(verdict.edge * 100).toFixed(1)}%, under the 2% bar. Nothing here.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="spread">
          <h2 style={{ margin: 0 }}>Research</h2>
          <button className="btn sm" id="openResearch" type="button" onClick={onResearch}>
            Open
          </button>
        </div>
        <p className="small muted" style={{ margin: "8px 0 0" }}>
          Form, home and away splits, and head to head from j1_odds.csv.
        </p>
      </div>

      <div className="card">
        <h2>Notes</h2>
        <textarea
          id="mNotes"
          value={fixture.notes}
          placeholder="Team news, suspensions, anything you want to remember."
          onChange={(event) => {
            const value = event.target.value;
            onChange(fixture.id, (current) => ({ ...current, notes: value }));
            setNoteMsg("Saved.");
          }}
        />
        <div className={noteMsg ? "msg ok" : "msg"} id="noteMsg" role="status">
          {noteMsg}
        </div>
      </div>
    </section>
  );
}

function BookRow({
  book,
  labels,
  values,
  onChange,
}: {
  book: BookName;
  labels: readonly string[];
  values: readonly string[];
  onChange: (index: number, value: string) => void;
}) {
  return (
    <>
      <div className="lbl">{book}</div>
      {labels.map((label, index) => (
        <input
          key={`${book}-${label}`}
          value={values[index] ?? ""}
          inputMode="text"
          aria-label={`${book} ${label}`}
          onChange={(event) => onChange(index, event.target.value)}
        />
      ))}
    </>
  );
}

function LogBet({
  label,
  book,
  edgeValue,
  onLog,
}: {
  label: string;
  book: string;
  edgeValue: number;
  onLog: (stake: string) => string;
}) {
  const [stake, setStake] = useState("");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  return (
    <div className="card" style={{ margin: "10px 0 0", background: "var(--greenbg)", borderColor: "var(--green)" }}>
      <strong>
        {label} at {book}
      </strong>
      <br />
      <span className="small">
        {(edgeValue * 100).toFixed(1)}% better than Pinnacle&apos;s fair value. Away selections have historically been
        where this edge is real.
      </span>
      <div className="row" style={{ marginTop: 8 }}>
        <input
          id="stake"
          style={{ width: 90 }}
          inputMode="decimal"
          placeholder="Stake"
          value={stake}
          onChange={(event) => setStake(event.target.value)}
        />
        <button
          className="btn primary sm"
          id="logBet"
          type="button"
          onClick={() => {
            const next = onLog(stake);
            const failed = next === "Enter a stake first.";
            setOk(!failed);
            setMessage(next);
          }}
        >
          Log bet
        </button>
      </div>
      <div className={message ? (ok ? "msg ok" : "msg err") : "msg"} id="logMsg" role="status">
        {message}
      </div>
    </div>
  );
}
