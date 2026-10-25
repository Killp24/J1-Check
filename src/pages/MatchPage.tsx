import { useState } from "react";
import { edgeBand, formatEdgePercent, marketOffers, selectionLabel, type MarketOffer } from "../lib/fixtures";
import { BOOKS, MARKETS, SOFT_BOOKS, marketTitle, type BookName, type MarketKey, type SoftBook } from "../lib/markets";
import { edge as edgeOf, fairProbabilities, formatDecimalAsAmerican, toDecimal } from "../lib/odds";
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

interface Pick {
  side: number;
  book: SoftBook;
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

function defaultPick(offers: readonly MarketOffer[]): Pick {
  const ranked = offers.filter((offer) => offer.edge != null);
  if (ranked.length) {
    const best = ranked.reduce((top, offer) => ((offer.edge ?? -Infinity) > (top.edge ?? -Infinity) ? offer : top));
    return { side: best.side, book: best.book };
  }
  const first = offers[0];
  if (first) return { side: first.side, book: first.book };
  return { side: 0, book: "Bet365" };
}

export function MatchPage({ fixture, market, onMarket, onChange, onBack, onResearch, onLogBet }: MatchPageProps) {
  const [noteState, setNoteState] = useState({ id: fixture.id, message: "" });
  if (noteState.id !== fixture.id) setNoteState({ id: fixture.id, message: "" });
  const noteMsg = noteState.message;
  const setNoteMsg = (message: string) => setNoteState({ id: fixture.id, message });

  const prices: MarketPrices = fixture.prices[market] ?? {};
  const spec = MARKETS[market];
  const offers = marketOffers(fixture, market);
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

  const [pickState, setPickState] = useState(() => ({
    id: fixture.id,
    market,
    pick: defaultPick(marketOffers(fixture, market)),
  }));
  const pickMatches = pickState.id === fixture.id && pickState.market === market;
  const pick = pickMatches ? pickState.pick : defaultPick(offers);
  if (!pickMatches) setPickState({ id: fixture.id, market, pick });
  const choose = (next: Pick) => setPickState({ id: fixture.id, market, pick: next });

  const [stakeState, setStakeState] = useState({ id: fixture.id, market, stake: "", message: "", ok: false });
  const stakeMatches = stakeState.id === fixture.id && stakeState.market === market;
  const stake = stakeMatches ? stakeState.stake : "";
  const logMessage = stakeMatches ? stakeState.message : "";
  const logOk = stakeMatches ? stakeState.ok : false;
  if (!stakeMatches) setStakeState({ id: fixture.id, market, stake: "", message: "", ok: false });

  const pinnacle = spec.labels.map((_, index) => toDecimal((prices.Pinnacle ?? [])[index] ?? ""));
  const fair = pinnacle.every((value) => value != null)
    ? fairProbabilities(pinnacle.filter((value): value is NonNullable<typeof value> => value != null))
    : null;

  const label = selectionLabel(market, pick.side, prices.line);
  const sideName = spec.labels[pick.side] ?? "";
  const chosen = toDecimal((prices[pick.book] ?? [])[pick.side] ?? "");
  const fairProb = fair ? (fair.probabilities[pick.side] ?? null) : null;
  const chosenEdge = chosen && fairProb != null ? edgeOf(fairProb, chosen) : null;

  const logBet = () => {
    const amount = Number.parseFloat(stake);
    if (!amount || amount <= 0) {
      setStakeState({ id: fixture.id, market, stake, message: "Enter a stake first.", ok: false });
      return;
    }
    if (!chosen) {
      setStakeState({
        id: fixture.id,
        market,
        stake,
        message: `Enter ${pick.book}'s price for ${label} first.`,
        ok: false,
      });
      return;
    }
    onLogBet({
      id: newId("b"),
      made: Date.now(),
      home: fixture.home,
      away: fixture.away,
      when: fixture.when,
      mkt: market,
      side: pick.side,
      line: prices.line || "",
      label,
      book: pick.book,
      dec: chosen,
      stake: amount,
      fair: fairProb,
      edge: chosenEdge ?? 0,
      status: "pending",
    });
    setStakeState({
      id: fixture.id,
      market,
      stake,
      message: `Logged $${amount.toFixed(2)} on ${sideName} at ${formatDecimalAsAmerican(chosen)}.`,
      ok: true,
    });
  };

  return (
    <section id="pgMatch">
      <button className="btn sm" id="backBtn" type="button" onClick={onBack}>
        ‹ Round
      </button>
      <div className="match-top">
      <div className="card">
        <h2 id="mTitle">
          {fixture.home} v {fixture.away}
        </h2>
        {fixture.when ? (
          <p className="sub" id="mWhen">
            {fixture.when}
          </p>
        ) : null}
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
          {spec.labels.map((name) => (
            <div key={name} className="lbl" style={{ textAlign: "center" }}>
              {name}
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
          Enter decimal (2.10) or American (+110, −130). Then use Add a bet. Pinnacle sets fair value; the other books
          are compared to it.
        </p>
      </div>

      <div className="card add-bet" id="addBet">
        <h2 style={{ margin: 0 }}>Add a bet</h2>
        <p className="small muted" style={{ margin: "6px 0 0" }}>
          Choose the selection and the book, check the price, then enter a stake.
        </p>
        <div className="choice" role="group" aria-label="Selection">
          {spec.labels.map((name, index) => (
            <button
              key={name}
              type="button"
              aria-pressed={pick.side === index}
              onClick={() => choose({ side: index, book: pick.book })}
            >
              {selectionLabel(market, index, prices.line)}
            </button>
          ))}
        </div>
        <div className="choice" role="group" aria-label="Book">
          {SOFT_BOOKS.map((book) => (
            <button key={book} type="button" aria-pressed={pick.book === book} onClick={() => choose({ side: pick.side, book })}>
              {book}
            </button>
          ))}
        </div>
        <p style={{ margin: "4px 0 0", fontWeight: 700 }}>
          {label} · {pick.book}
        </p>
        {chosen ? (
          <div className="stats">
            <div className="stat">
              <span className="k">Price</span>
              <span className="v">{formatDecimalAsAmerican(chosen)}</span>
              <span className="s">{chosen.toFixed(2)} decimal</span>
            </div>
            <div className="stat">
              <span className="k">Edge</span>
              <span className="v">{chosenEdge == null ? "–" : formatEdgePercent(chosenEdge)}</span>
              <span className="s">{chosenEdge == null ? "Needs Pinnacle" : "vs Pinnacle fair"}</span>
            </div>
          </div>
        ) : (
          <p className="small" style={{ margin: "8px 0 0" }}>
            Enter {pick.book}&apos;s price for {label} first.
          </p>
        )}
        {chosenEdge != null && chosenEdge < 0.02 ? (
          <p className="small muted" style={{ margin: "8px 0 0" }}>
            Under the 2% bar. You can still add it.
          </p>
        ) : null}
        <div className="row" style={{ marginTop: 8 }}>
          <input
            id="stake"
            inputMode="decimal"
            placeholder="Stake"
            aria-label="Stake"
            value={stake}
            onChange={(event) =>
              setStakeState({ id: fixture.id, market, stake: event.target.value, message: logMessage, ok: logOk })
            }
          />
          <button className="btn primary" id="logBet" type="button" onClick={logBet}>
            Add bet
          </button>
        </div>
        <div className={logMessage ? (logOk ? "msg ok" : "msg err") : "msg"} id="logMsg" role="status">
          {logMessage}
        </div>
      </div>
      </div>

      <div className="card" id="edgeOut" style={{ marginTop: 10 }}>
        <h2 style={{ marginTop: 0 }}>Compared with Pinnacle</h2>
        <p className="small muted" style={{ margin: "8px 0 0" }}>
          {fair
            ? `Pinnacle's margin on this market: ${(fair.margin * 100).toFixed(1)}%`
            : "Enter all of Pinnacle's prices to see fair value. You can still add a bet."}
        </p>
        {spec.labels.map((name, index) => {
          const row = offers.filter((offer) => offer.side === index);
          const shown = selectionLabel(market, index, prices.line);
          return (
            <div className="sel" key={name}>
              <div className="spread">
                <strong>{shown}</strong>
                {fair ? (
                  <span className="pill">{((fair.probabilities[index] ?? 0) * 100).toFixed(1)}%</span>
                ) : (
                  <span className="small muted">Fair not ready</span>
                )}
              </div>
              {row.length === 0 ? (
                <p className="small muted" style={{ margin: "6px 0 0" }}>
                  No price at Bet365, DraftKings, or FanDuel yet.
                </p>
              ) : (
                row.map((offer) => (
                  <div className="bookline" key={`${offer.book}-${offer.side}`}>
                    <span>{offer.book}</span>
                    {offer.edge == null ? (
                      <span className="tag flat">–</span>
                    ) : (
                      <span className={`tag ${edgeBand(offer.edge)}`}>{formatEdgePercent(offer.edge)}</span>
                    )}
                    <span className="pill">{formatDecimalAsAmerican(offer.dec)}</span>
                    <button
                      className="btn sm"
                      type="button"
                      onClick={() => {
                        choose({ side: offer.side, book: offer.book });
                        document.getElementById("addBet")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      Add bet
                    </button>
                  </div>
                ))
              )}
            </div>
          );
        })}
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
      {labels.map((name, index) => (
        <input
          key={`${book}-${name}`}
          value={values[index] ?? ""}
          inputMode="text"
          aria-label={`${book} ${name}`}
          onChange={(event) => onChange(index, event.target.value)}
        />
      ))}
    </>
  );
}
