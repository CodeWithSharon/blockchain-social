import { useState } from "react";
import { usePostRegistry } from "../hooks/useContract";

const short = a => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "";

export default function TipModal({ post, onClose, onSuccess }) {
  const { tipAuthor, loading } = usePostRegistry();
  const [amount, setAmount] = useState("0.001");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  async function send() {
    if (!amount || parseFloat(amount) <= 0) return setError("Enter a valid amount");
    setError(null);
    try {
      await tipAuthor(post.id, amount);
      setDone(true);
      setTimeout(() => { onClose(); if (onSuccess) onSuccess(); }, 1500);
    } catch (e) {
      setError(e.reason || e.message);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">💸 Tip Author</div>
        <div className="modal-sub">Sending ETH directly to {short(post.author)} — no platform cut</div>

        {done ? (
          <div className="alert alert-success">✅ Tip sent successfully!</div>
        ) : (
          <>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Amount (ETH)</label>
              <input
                type="number"
                className="form-input"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                step="0.001"
                min="0.001"
              />
              <div className="form-hint">Sepolia testnet — no real money involved</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={send} disabled={loading}>
                {loading
                  ? <><span className="spin" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "white" }} /> Sending…</>
                  : `Send ${amount} ETH`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
