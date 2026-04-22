import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchAllPosts, fetchTrendingTags } from "../utils/api";
import PostCard from "../components/PostCard";
import { useWallet } from "../context/WalletContext";

export default function Home() {
  const { address } = useWallet();
  const navigate    = useNavigate();
  const [posts, setPosts]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [activeTag, setActiveTag]   = useState(null);
  const [trendingTags, setTrendingTags] = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [allPosts, tags] = await Promise.all([
        fetchAllPosts(),
        fetchTrendingTags().catch(() => []),
      ]);
      setPosts(allPosts);
      setTrendingTags(tags);
    } catch {
      setError("Could not load posts. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000); // refresh every 60s
    return () => clearInterval(t);
  }, [load]);

  const visible = posts.filter(p => {
    if (!showHidden && p.isHidden) return false;
    if (activeTag && !(p.content?.tags || []).includes(activeTag)) return false;
    return true;
  });
  const hiddenCount = posts.filter(p => p.isHidden).length;

  return (
    <div>
      {/* Compose prompt */}
      {address && (
        <div className="compose-prompt" onClick={() => navigate("/compose")}>
          <div className="avatar" style={{ width: 38, height: 38, fontSize: "0.8rem" }}>
            {address.slice(2,4).toUpperCase()}
          </div>
          <div className="compose-placeholder">What's on your mind? (Use #hashtags)</div>
          <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); navigate("/compose"); }}>
            Post
          </button>
        </div>
      )}

      <div className="page-header page-header-row">
        <div>
          <div className="page-title">
            {activeTag
              ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {activeTag}
                  <button className="btn btn-xs btn-outline" onClick={() => setActiveTag(null)}>✕ Clear</button>
                </span>
              : "Feed"}
          </div>
          <div className="page-sub">{posts.length} posts · Sepolia Ethereum</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          {loading ? <span className="spin" /> : "↻"} Refresh
        </button>
      </div>

      {!address && (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          🔗 Connect MetaMask to post, like, tip, comment, and vote on content.
        </div>
      )}

      {/* Feature 16: Trending tags */}
      {trendingTags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text2)", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            🔥 Trending
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {trendingTags.map(({ tag, count }) => (
              <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                style={{
                  background: activeTag === tag ? "var(--primary)" : "var(--primary-bg)",
                  color: activeTag === tag ? "white" : "var(--primary)",
                  border: "none", borderRadius: 20, padding: "4px 12px",
                  fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                }}>
                {tag} <span style={{ opacity: 0.7 }}>{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {hiddenCount > 0 && (
        <div style={{ textAlign: "right", marginBottom: 8 }}>
          <button className="btn btn-ghost" style={{ fontSize: "0.75rem" }}
            onClick={() => setShowHidden(v => !v)}>
            {showHidden ? "Hide removed posts" : `Show ${hiddenCount} community-removed post${hiddenCount > 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {loading && <div className="loader"><span className="spin" /> Loading from blockchain…</div>}

      {!loading && !error && visible.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">{activeTag ? "🔍" : "📭"}</div>
          <div className="empty-text">
            {activeTag ? `No posts tagged ${activeTag}` : "No posts yet. Be the first to post on-chain!"}
          </div>
          {!activeTag && address && <Link to="/compose" className="btn btn-primary">Create First Post</Link>}
        </div>
      )}

      {!loading && visible.map(post => (
        <PostCard key={post.id} post={post} onRefresh={load} onTagClick={setActiveTag} />
      ))}
    </div>
  );
}
