import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchLeaderboard, fetchTokenInfo } from "../utils/api";

const short = a => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "";
const rankClass = i => i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
const rankEmoji = i => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`;

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [lb, ti] = await Promise.all([fetchLeaderboard(), fetchTokenInfo()]);
        setLeaders(lb);
        setTokenInfo(ti);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">🏆 Leaderboard</div>
        <div className="page-sub">Top contributors ranked by CLINK earned</div>
      </div>

      {tokenInfo && (
        <div className="card" style={{ marginBottom: 16, display: "flex", gap: 28, flexWrap: "wrap" }}>
          <div>
            <div className="text-xs text-muted" style={{ marginBottom: 2 }}>TOKEN</div>
            <div className="font-bold">{tokenInfo.name} <span style={{ color: "var(--amber)", background: "var(--amber-bg)", padding: "2px 8px", borderRadius: 20, fontSize: "0.78rem" }}>{tokenInfo.symbol}</span></div>
          </div>
          <div>
            <div className="text-xs text-muted" style={{ marginBottom: 2 }}>TOTAL SUPPLY</div>
            <div className="font-bold">{parseFloat(tokenInfo.totalSupply).toLocaleString()} CLINK</div>
          </div>
          <div>
            <div className="text-xs text-muted" style={{ marginBottom: 2 }}>NETWORK</div>
            <div className="font-bold">🔵 Sepolia Testnet</div>
          </div>
        </div>
      )}

      {loading && <div className="loader"><span className="spin" /> Loading leaderboard…</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && leaders.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">🏅</div>
          <div className="empty-text">No data yet — start posting and earning CLINK!</div>
        </div>
      )}

      {leaders.map((entry, i) => (
        <Link key={entry.address} to={"/profile/" + entry.address} className="lb-row">
          <div className={"lb-rank " + rankClass(i)}>{rankEmoji(i)}</div>
          <div className="avatar" style={{ width: 36, height: 36, fontSize: "0.75rem", flexShrink: 0 }}>
            {entry.address.slice(2, 4).toUpperCase()}
          </div>
          <div className="lb-info">
            <div className="lb-name">{short(entry.address)}</div>
            <div className="lb-stats">{entry.postCount} posts · {entry.totalLikes} likes received</div>
          </div>
          <div>
            <div className="lb-balance">🪙 {parseFloat(entry.clinkBalance).toFixed(2)}</div>
            <div className="text-xs text-muted" style={{ textAlign: "right" }}>CLINK</div>
          </div>
        </Link>
      ))}

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>💡 How CLINK works</div>
        <p className="text-sm text-dim" style={{ lineHeight: 1.7 }}>
          Every like on a post automatically mints <strong>1 CLINK token</strong> to the author via the{" "}
          <code style={{ background: "var(--bg3)", padding: "1px 6px", borderRadius: 4, fontSize: "0.8rem" }}>ContentToken</code>{" "}
          smart contract on Ethereum. CLINK is ERC-20 and your balance equals your voting power in content moderation.
        </p>
      </div>
    </div>
  );
}
