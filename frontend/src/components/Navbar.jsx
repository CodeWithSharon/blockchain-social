import { Link, useLocation } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { fetchTokenBalance } from "../utils/api";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { address, connect, disconnect, connecting } = useWallet();
  const location = useLocation();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (!address) { setBalance(null); return; }
    fetchTokenBalance(address)
      .then(d => setBalance(parseFloat(d.balance).toFixed(1)))
      .catch(() => setBalance("0"));
  }, [address]);

  const short = a => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "";
  const isActive = path => location.pathname === path;

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        🔗 ChainSocial
      </Link>

      <div className="navbar-links">
        <Link to="/" className="nav-link" style={isActive("/") ? { color: "var(--primary)", background: "var(--primary-bg)" } : {}}>
          Feed
        </Link>
        <Link to="/leaderboard" className="nav-link" style={isActive("/leaderboard") ? { color: "var(--primary)", background: "var(--primary-bg)" } : {}}>
          Leaderboard
        </Link>

        {address && (
          <>
            <Link to={`/profile/${address}`} className="nav-link" style={location.pathname.includes("/profile") ? { color: "var(--primary)", background: "var(--primary-bg)" } : {}}>
              Profile
            </Link>
            {balance !== null && (
              <span className="clink-badge">🪙 {balance} CLINK</span>
            )}
          </>
        )}

        <button
          className={`wallet-btn ${address ? "connected" : ""}`}
          onClick={address ? disconnect : connect}
          disabled={connecting}
        >
          <span className={`dot ${address ? "" : "off"}`} />
          {connecting ? "Connecting…" : address ? short(address) : "Connect Wallet"}
        </button>
      </div>
    </nav>
  );
}
