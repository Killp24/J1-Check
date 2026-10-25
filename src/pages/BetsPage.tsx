import { useState } from "react";
import { summarizeBets } from "../lib/bets";
import { edgeBand, formatEdgePercent } from "../lib/fixtures";
import { formatDecimalAsAmerican } from "../lib/odds";
import type { Bet, BetStatus } from "../lib/types";

interface BetsPageProps {
  bets: Bet[];
  onSettle: (id: string, status: BetStatus) => void;
  onDelete: (id: string) => void;
  onReplace: (bets: Bet[]) => void;
  onShowRound: () => void;
}

function money(value: number): string {
  const sign = value < 0 ? "\u2212" : "+";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function BetsPage({ bets, onSettle, onDelete, onReplace, onShowRound }: BetsPageProps) {
  const summary = summarizeBets(bets);
  const [backupOpen, setBackupOpen] = useState(false);
  const [backup, setBackup] = useState("");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"" | "ok" | "err">("");
  const list = [...bets].reverse();

  return (
    <section id="pgBets">
      <h2>Bets</h2>
      <div className="card add-bet">
        <h2 style={{ marginTop: 0 }}>Add a bet</h2>
        <ol className="steps">
          <li>Open a match from the round.</li>
          <li>Enter the price at your book.</li>
          <li>Use Add a bet on that match.</li>
        </ol>
        <button className="btn primary" id="goRound" type="button" onClick={onShowRound}>
          Go to the round
        </button>
      </div>
      <div id="betSummary">
        <div className="card">
          <div className="stats">
            <div className="stat">
              <span className="k">Record</span>
              <span className="v">
                {summary.won}–{summary.lost}
              </span>
              <span className="s">
                {summary.settled} settled · exp {summary.expectedWins.toFixed(1)}
              </span>
            </div>
            <div className="stat">
              <span className="k">Profit</span>
              <span className="v" style={{ color: summary.profit >= 0 ? "var(--green)" : "var(--red)" }}>
                {money(summary.profit)}
              </span>
              <span className="s">
                {summary.roi == null ? "–" : `${summary.roi.toFixed(1)}% ROI`} · ${summary.stake.toFixed(2)} staked
              </span>
            </div>
          </div>
          <p className="small muted" style={{ margin: "8px 0 0" }}>
            Expected wins come from Pinnacle&apos;s fair value. Beating it is the sign the edge is real.
          </p>
        </div>
      </div>
      <div id="betList">
        {list.length === 0 ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              Nothing logged yet.
            </p>
          </div>
        ) : (
          list.map((bet) => (
            <div className="card" key={bet.id}>
              <div className="spread">
                <strong>
                  {bet.home} v {bet.away}
                </strong>
                {bet.fair == null ? (
                  <span className="tag flat">No fair</span>
                ) : (
                  <span className={`tag ${edgeBand(bet.edge)}`}>{formatEdgePercent(bet.edge)}</span>
                )}
              </div>
              <div className="small muted" style={{ marginTop: 2 }}>
                {bet.label} · {bet.book}
              </div>
              <div className="stats">
                <div className="stat">
                  <span className="k">Stake</span>
                  <span className="v">${bet.stake.toFixed(2)}</span>
                </div>
                <div className="stat">
                  <span className="k">Price</span>
                  <span className="v">{formatDecimalAsAmerican(bet.dec)}</span>
                  <span className="s">{bet.dec.toFixed(2)} decimal</span>
                </div>
              </div>
              <div className="row">
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
