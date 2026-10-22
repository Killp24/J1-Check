import { useState } from "react";
import { summarizeBets } from "../lib/bets";
import { formatDecimalAsAmerican } from "../lib/odds";
import type { Bet, BetStatus } from "../lib/types";

interface BetsPageProps {
  bets: Bet[];
  onSettle: (id: string, status: BetStatus) => void;
  onDelete: (id: string) => void;
  onReplace: (bets: Bet[]) => void;
}

export function BetsPage({ bets, onSettle, onDelete, onReplace }: BetsPageProps) {
  const summary = summarizeBets(bets);
  const [backupOpen, setBackupOpen] = useState(false);
  const [backup, setBackup] = useState("");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"" | "ok" | "err">("");
  const list = [...bets].reverse();
  const pl = summary.profit;

  return (
    <section id="pgBets">
      <h2>Bets</h2>
      <div id="betSummary">
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Settled</th>
                <th className="num">W–L</th>
                <th className="num">Staked</th>
                <th className="num">P/L</th>
                <th className="num">ROI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{summary.settled}</td>
                <td className="num">
                  {summary.won}–{summary.lost}
                  <br />
                  <span className="small muted">exp {summary.expectedWins.toFixed(1)}</span>
                </td>
                <td className="num">${summary.stake.toFixed(2)}</td>
                <td className="num" style={{ color: pl >= 0 ? "var(--green)" : "var(--red)" }}>
                  {pl >= 0 ? "+" : "\u2212"}${Math.abs(pl).toFixed(2)}
                </td>
                <td className="num">{summary.roi == null ? "–" : `${summary.roi.toFixed(1)}%`}</td>
              </tr>
            </tbody>
          </table>
          <p className="small muted" style={{ margin: "8px 0 0" }}>
            Expected wins come from Pinnacle&apos;s fair value. Beating it is the sign the edge is real.
          </p>
        </div>
      </div>
      <div id="betList">
        {list.length === 0 ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              No bets logged yet.
            </p>
          </div>
        ) : (
          list.map((bet) => (
            <div className="card" key={bet.id}>
              <div className="spread">
                <strong>{bet.label}</strong>
                <span className={`tag ${bet.edge >= 0.04 ? "go" : "thin"}`}>+{(bet.edge * 100).toFixed(1)}%</span>
              </div>
              <div className="small muted">
                {bet.home} v {bet.away} · {bet.book} {formatDecimalAsAmerican(bet.dec)} · ${bet.stake.toFixed(2)}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                {bet.status === "pending" ? (
                  <>
                    <button className="btn sm" type="button" onClick={() => onSettle(bet.id, "won")}>
                      Won
                    </button>
                    <button className="btn sm" type="button" onClick={() => onSettle(bet.id, "lost")}>
                      Lost
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`tag ${bet.status === "won" ? "go" : "no"}`}>{bet.status}</span>
                    <button className="btn sm" type="button" onClick={() => onSettle(bet.id, "pending")}>
                      Undo
                    </button>
                  </>
                )}
                <button className="btn sm" type="button" onClick={() => onDelete(bet.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Backup</h3>
        <div className="row">
          <button
            className="btn"
            id="betCopy"
            type="button"
            onClick={() => {
              const text = JSON.stringify(bets);
              void navigator.clipboard
                .writeText(text)
                .then(() => {
                  setTone("ok");
                  setMessage("Copied.");
                })
                .catch(() => {
                  setBackupOpen(true);
                  setBackup(text);
                  setTone("");
                  setMessage("Copy it from the box.");
                });
            }}
          >
            Copy backup
          </button>
          <button
            className="btn"
            id="betPasteBtn"
            type="button"
            onClick={() => {
              if (!backupOpen) {
                setBackupOpen(true);
                setBackup("");
                setTone("");
                setMessage("Paste a backup, then tap Restore again.");
                return;
              }
              try {
                const parsed: unknown = JSON.parse(backup);
                if (!Array.isArray(parsed)) throw new Error("bad");
                onReplace(parsed as Bet[]);
                setBackupOpen(false);
                setTone("ok");
                setMessage(`Restored ${parsed.length} bets.`);
              } catch {
                setTone("err");
                setMessage("That wasn't a valid backup.");
              }
            }}
          >
            Restore
          </button>
        </div>
        <textarea
          id="betBackup"
          className={backupOpen ? undefined : "hide"}
          style={{ marginTop: 8 }}
          value={backup}
          onChange={(event) => setBackup(event.target.value)}
        />
        <div className={tone ? `msg ${tone}` : "msg"} id="betMsg" role="status">
          {message}
        </div>
      </div>
    </section>
  );
}
