import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { usePostRegistry } from "../hooks/useContract";
import { fetchComments, addComment, likeComment, deleteComment } from "../utils/api";

const short = a => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "";
function timeAgo(ts) {
  const d = Date.now() / 1000 - ts;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

export default function CommentSection({ postId }) {
  const { address, authHeaders } = useWallet();
  const { addCommentOnChain } = usePostRegistry();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchComments(postId);
      setComments(data);
      setCount(data.length);
    } catch { setComments([]); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    // Always load count (even when collapsed)
    fetchComments(postId).then(d => setCount(d.length)).catch(() => {});
  }, [postId]);

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function submit() {
    if (!text.trim()) return;
    if (!address) return alert("Connect your wallet first");
    setSubmitting(true);
    setError(null);
    try {
      // Try on-chain first (Person 1's addComment)
      try {
        await addCommentOnChain(postId, text.trim());
      } catch {
        // If on-chain fails (contract doesn't support yet), save off-chain
        await addComment(postId, text.trim(), authHeaders);
      }
      setText("");
      load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(comment) {
    if (!address) return alert("Connect your wallet first");
    try { await likeComment(postId, comment.id, authHeaders); load(); }
    catch {}
  }

  async function handleDelete(commentId) {
    if (!window.confirm("Delete this comment?")) return;
    try { await deleteComment(postId, commentId, authHeaders); load(); }
    catch (e) { alert(e.response?.data?.error || e.message); }
  }

  return (
    <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
      <button className="btn btn-ghost btn-sm"
        onClick={() => setOpen(v => !v)}
        style={{ fontSize: "0.8rem", color: "var(--text2)" }}>
        💬 {count > 0 ? `${count} Comment${count !== 1 ? "s" : ""}` : "Comment"} {open ? "▲" : "▼"}
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          {/* Input */}
          {address && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <div className="avatar" style={{ width: 30, height: 30, fontSize: "0.65rem", flexShrink: 0 }}>
                {address.slice(2,4).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <textarea className="form-textarea" rows={2} value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Write a comment… (Ctrl+Enter to post)"
                  style={{ fontSize: "0.85rem", marginBottom: 5 }}
                  disabled={submitting}
                  onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); }}
                />
                {error && <div className="alert alert-error" style={{ marginBottom: 5, fontSize: "0.75rem" }}>{error}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text3)" }}>{text.length}/500</span>
                  <button className="btn btn-primary btn-sm" onClick={submit} disabled={submitting || !text.trim()}>
                    {submitting ? <span className="spin" style={{ width: 11, height: 11, borderWidth: 2, borderTopColor: "white" }} /> : "Post"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading && <div style={{ textAlign: "center", padding: "10px 0", color: "var(--text3)", fontSize: "0.82rem" }}>Loading…</div>}

          {!loading && comments.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--text3)", fontSize: "0.82rem", padding: "8px 0" }}>
              No comments yet. Be the first!
            </p>
          )}

          {comments.map(comment => {
            const isOwn    = address && comment.author.toLowerCase() === address.toLowerCase();
            const hasLiked = address && Array.isArray(comment.likes)
              ? comment.likes.includes(address.toLowerCase())
              : false;
            const likeCount = Array.isArray(comment.likes) ? comment.likes.length : (comment.likes || 0);

            return (
              <div key={comment.id} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <Link to={`/profile/${comment.author}`}>
                  <div className="avatar" style={{ width: 30, height: 30, fontSize: "0.65rem", flexShrink: 0 }}>
                    {comment.author.slice(2,4).toUpperCase()}
                  </div>
                </Link>
                <div style={{ flex: 1, background: "var(--bg3)", borderRadius: 10, padding: "8px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <Link to={`/profile/${comment.author}`} style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)", textDecoration: "none" }}>
                      {short(comment.author)}
                    </Link>
                    <span style={{ fontSize: "0.7rem", color: "var(--text3)" }}>{timeAgo(comment.timestamp)}</span>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text)", marginBottom: 5, wordBreak: "break-word" }}>{comment.text}</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => handleLike(comment)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem",
                        color: hasLiked ? "var(--red)" : "var(--text3)", fontWeight: 600, padding: 0 }}>
                      ❤️ {likeCount}
                    </button>
                    {isOwn && (
                      <button onClick={() => handleDelete(comment.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--red)", padding: 0 }}>
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
