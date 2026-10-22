import { useState } from "react";
import { bestEdge, edgeBand, formatEdgePercent, selectionLabel } from "../lib/fixtures";
import type { Fixture } from "../lib/types";

interface RoundPageProps {
  fixtures: Fixture[];
  onAdd: (text: string) => number;
  onClear: () => void;
  onOpen: (id: string) => void;
}

export function RoundPage({ fixtures, onAdd, onClear, onOpen }: RoundPageProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState<boolean | null>(null);

  const ranked = fixtures
    .map((fixture) => ({ fixture, best: bestEdge(fixture) }))
    .sort((left, right) => (right.best ? right.best.edge : -9) - (left.best ? left.best.edge : -9));

  return (
    <section id="pgRound">
      <div className="spread" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>This round</h2>
        <button className="btn sm" id="addFixBtn" type="button" onClick={() => setOpen((value) => !value)}>
          Add matches
        </button>
      </div>
      <div id="fixList">
        {ranked.length === 0 ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              No matches yet. Tap <strong>Add matches</strong> and paste this week&apos;s fixtures.
            </p>
          </div>
        ) : (
          ranked.map(({ fixture, best }) => {
            const label = best
              ? `${formatEdgePercent(best.edge)} · ${selectionLabel(best.market, best.side, best.line)} · ${best.book}`
              : "";
            return (
              <button
                key={fixture.id}
                className={best && best.edge >= 0.02 ? "fix best" : "fix"}
                type="button"
                onClick={() => onOpen(fixture.id)}
              >
                <div className="spread">
                  <span className="teams">
                    {fixture.home} v {fixture.away}
                  </span>
                  <span className="when">{fixture.when || ""}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  {best ? (
                    <span className={`tag ${edgeBand(best.edge)}`}>{label}</span>
                  ) : (
                    <span className="tag flat">no prices yet</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
      <div className={open ? "card" : "card hide"} id="pasteCard">
        <h2>Add this week&apos;s matches</h2>
        <p className="small muted">
          One match per line: <code>Sat 19:00 | Kashima | Urawa</code>. The date is optional; anything the app can
          read as a time is enough.
        </p>
        <textarea
          id="fixPaste"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={"Sat 19:00 | Kashima Antlers | Urawa Red Diamonds\nSat 19:00 | FC Tokyo | Kawasaki Frontale"}
        />
        <div className="row" style={{ marginTop: 8 }}>
          <button
            className="btn primary"
            id="fixSave"
            type="button"
            onClick={() => {
              const count = onAdd(text);
              setMessageOk(count > 0);
              setMessage(count ? `Added ${count} match${count === 1 ? "" : "es"}.` : "Nothing read. Use: time | home | away");
              if (count) {
                setText("");
                setOpen(false);
              }
            }}
          >
            Add
          </button>
          <button
            className="btn"
            id="fixClear"
            type="button"
            onClick={() => {
              onClear();
              setMessageOk(null);
              setMessage("Round cleared.");
            }}
          >
            Clear the round
          </button>
          <button className="btn" id="pasteCancel" type="button" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
        <div className={messageOk == null ? "msg" : messageOk ? "msg ok" : "msg err"} id="fixMsg" role="status">
          {message}
        </div>
      </div>
    </section>
  );
}
