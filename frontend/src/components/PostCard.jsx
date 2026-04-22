import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { usePostRegistry } from "../hooks/useContract";
import { repostPost, unrepostPost, fetchRepostCount } from "../utils/api";
import TipModal from "./TipModal";
import CommentSection from "./CommentSection";

function timeAgo(ts) {
  const d = Date.now() / 1000 - ts;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}
const short = a => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "";
const initials = (u, a) => u ? u.slice(0,2).toUpperCase() : a ? a.slice(2,4).toUpperCase() : "??";

// Feature 16: clickable hashtags
function PostText({ text, onTagClick }) {
  if (!text) return null;
  return (
    <p className="post-text">
      {text.split(/(#\w+)/g).map((p, i) =>
        p.startsWith("#")
          ? <span key={i} onClick={() => onTagClick && onTagClick(p.toLowerCase())} style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}>{p}</span>
          : p
      )}
    </p>
  );
}

// Feature 17: ownership proof export
function exportProof(post) {
  const proof = {
    platform: "ChainSocial — Decentralized Social Media",
    postId:   post.id,
    author:   post.author,
    anonymous: post.content?.anonymous || false,
    contentCID:  post.contentCID,
    contentHash: post.contentHash,
    timestamp:   post.timestamp,
    publishedAt: new Date(post.timestamp * 1000).toISOString(),
    integrityVerified: post.isIntact,
    tags:   post.content?.tags || [],
    links: {
      ipfs:       `https://ipfs.io/ipfs/${post.contentCID}`,
      etherscan:  `https://sepolia.etherscan.io/address/${post.author}`,
    },
    verificationSteps: [
      "1. Fetch content from links.ipfs",
      "2. Compute keccak256(JSON.stringify(content))",
      "3. Compare to contentHash — exact match = untampered original",
      "4. author field = Ethereum wallet that signed the transaction",
    ],
  };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(proof, null, 2)], { type: "application/json" }));
  a.download = `chainsocial-proof-${post.id}.json`;
  a.click();
}

export default function PostCard({ post, onRefresh, onTagClick }) {
  const { address, authHeaders } = useWallet();
  const { likePost, flagPost, votePost, deletePost, repostOnChain } = usePostRegistry();
  const [showTip, setShowTip]       = useState(false);
  const [pending, setPending]       = useState(null);
  const [err, setErr]               = useState(null);
  const [repostCount, setRepostCount] = useState(0);
  const [hasReposted, setHasReposted] = useState(false);

  if (!post) return null;

  const isOwner   = address && post.author.toLowerCase() === address.toLowerCase();
  const isFlagged = post.flags >= 3;
  const isAnon    = post.content?.anonymous;
  const displayName = isAnon ? "Anonymous" : (post.authorProfile?.username || short(post.author));
  const isVerified  = !isAnon && post.authorProfile?.isVerified;

  useEffect(() => {
    fetchRepostCount(post.id)
      .then(d => {
        setRepostCount(d.count);
        setHasReposted(address ? (d.reposters || []).includes(address.toLowerCase()) : false);
      })
      .catch(() => {});
  }, [post.id, address]);

  async function run(key, fn) {
    if (!address) return alert("Connect your wallet first");
    setErr(null); setPending(key);
    try { await fn(); if (onRefresh) onRefresh(); }
    catch (e) { setErr(e.reason || e.message); }
    finally { setPending(null); }
  }

  async function handleRepost() {
    if (!address) return alert("Connect your wallet first");
    if (isOwner) return alert("Can't repost your own post");
    try {
      if (hasReposted) {
        await unrepostPost(post.id, authHeaders);
        setHasReposted(false);
        setRepostCount(c => Math.max(0, c - 1));
      } else {
        // Try on-chain first, fallback to off-chain store
        try { await repostOnChain(post.id); } catch {}
        await repostPost(post.id, authHeaders);
        setHasReposted(true);
        setRepostCount(c => c + 1);
      }
    } catch (e) { alert(e.response?.data?.error || e.message); }
  }

  // Feature 6: tamper detection badge
  const IntegrityBadge = () => {
    if (post.isIntact === true)  return <span className="badge badge-verified">✓ verified</span>;
    if (post.ipfsFetchFailed || post.isIntact === null) return <span className="badge badge-loading">⏳ syncing</span>;
    return <span className="badge badge-tampered">⚠ tampered</span>;
  };

  return (
    <>
      <div className={`post-card ${post.isHidden ? "hidden-post" : ""} ${isFlagged && !post.isHidden ? "flagged-post" : ""}`}>

        {/* Repost label */}
        {post.isRepost && (
          <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
            🔁 <span>Reposted</span>
          </div>
        )}

        {/* Feature 9: hidden by community vote */}
        {post.isHidden && <div className="notice notice-error">🚫 Hidden by community vote (51% threshold reached)</div>}

        {/* Feature 8: flagged warning + vote buttons */}
        {isFlagged && !post.isHidden && (
          <div className="notice notice-warn">
            <span>⚑ Under review · {post.flags} flag{post.flags !== 1 ? "s" : ""}</span>
            {address && !isOwner && (
              <div className="notice-actions">
                <button className="btn btn-xs btn-outline" onClick={() => run("vote", () => votePost(post.id, true))}  disabled={!!pending}>Hide</button>
                <button className="btn btn-xs btn-outline" onClick={() => run("vote", () => votePost(post.id, false))} disabled={!!pending}>Keep</button>
              </div>
            )}
          </div>
        )}

        {/* Post header */}
        <div className="post-header">
          {/* Feature 15: anonymous posts */}
          {isAnon ? (
            <div className="post-author-link" style={{ cursor: "default" }}>
              <div className="avatar" style={{ background: "linear-gradient(135deg,#6b7280,#374151)" }}>🎭</div>
              <div>
                <div className="author-name">Anonymous</div>
                <div className="author-addr">Identity hidden — content still on-chain</div>
              </div>
            </div>
          ) : (
            <Link to={`/profile/${post.author}`} className="post-author-link">
              <div className="avatar">
                {post.authorProfile?.profileImageUrl
                  ? <img src={post.authorProfile.profileImageUrl} alt="" />
                  : initials(post.authorProfile?.username, post.author)}
              </div>
              <div>
                <div className="author-name" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {displayName}
                  {/* Feature 18: verified badge */}
                  {isVerified && (
                    <span title="Verified registered user" style={{ background: "var(--primary)", color: "white", borderRadius: "50%", width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700 }}>✓</span>
                  )}
                </div>
                <div className="author-addr">{short(post.author)}</div>
              </div>
            </Link>
          )}

          <div className="post-meta">
            <span className="post-time">{timeAgo(post.timestamp)}</span>
            <IntegrityBadge />
          </div>
        </div>

        {/* Content */}
        <PostText text={post.content?.text} onTagClick={onTagClick} />
        {post.content?.imageUrl && <img src={post.content.imageUrl} alt="Post" className="post-image" />}

        {/* Feature 16: tag pills */}
        {post.content?.tags?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
            {post.content.tags.map(tag => (
              <span key={tag} onClick={() => onTagClick && onTagClick(tag)}
                style={{ background: "var(--primary-bg)", color: "var(--primary)", borderRadius: 20, padding: "2px 10px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {err && <div className="alert alert-error" style={{ marginBottom: 8, fontSize: "0.78rem" }}>{err}</div>}

        {/* Action bar */}
        <div className="post-actions">

          {/* Feature 4: Like → mints 1 CLINK to author */}
          <button className={`action-btn ${pending === "like" ? "like-active" : ""}`}
            onClick={() => run("like", () => likePost(post.id))}
            disabled={!!pending || isOwner}
            title={isOwner ? "Can't like your own post" : "Like — author earns 1 CLINK"}>
            {pending === "like" ? <span className="spin" style={{ width: 12, height: 12, borderWidth: 2 }} /> : "❤️"} {post.likes}
          </button>

          {/* Feature 13: Repost */}
          {!isOwner && (
            <button className={`action-btn`}
              onClick={handleRepost} disabled={pending === "like" || pending === "delete"}
              title={hasReposted ? "Undo repost" : "Repost — original author gets credit"}
              style={{ color: hasReposted ? "var(--green)" : undefined }}>
              🔁 {repostCount}
            </button>
          )}

          {/* Feature 8: Flag */}
          {!isOwner && (
            <button className={`action-btn ${pending === "flag" ? "flag-active" : ""}`}
              onClick={() => { if (window.confirm("Flag this post as harmful content?")) run("flag", () => flagPost(post.id)); }}
              disabled={!!pending}
              title="Flag as harmful — 3 flags triggers community review">
              {pending === "flag" ? <span className="spin" style={{ width: 12, height: 12, borderWidth: 2 }} /> : "🚩"} {post.flags}
            </button>
          )}

          {/* Feature 7: Tip ETH */}
          {!isOwner && (
            <button className="action-btn" onClick={() => setShowTip(true)} disabled={!!pending}
              title="Send ETH tip — peer to peer, no platform fee">
              💸 Tip
            </button>
          )}

          {/* Feature 17: Ownership proof export (interoperability) */}
          <button className="action-btn" onClick={() => exportProof(post)}
            title="Export cryptographic ownership proof as JSON">
            📄 Proof
          </button>

          {/* Feature 2: Delete own post */}
          {isOwner && (
            <button className="action-btn" style={{ color: "var(--red)" }}
              onClick={() => { if (window.confirm("Delete this post from the blockchain?")) run("delete", () => deletePost(post.id)); }}
              disabled={!!pending}
              title="Delete post — removes from chain">
              {pending === "delete" ? <span className="spin" style={{ width: 12, height: 12, borderWidth: 2 }} /> : "🗑️"}
            </button>
          )}

          <a href={`https://sepolia.etherscan.io/address/${post.author}`} target="_blank" rel="noreferrer"
            className="etherscan-link action-right" title="View on Etherscan — blockchain transparency">
            Etherscan ↗
          </a>
        </div>

        {/* Feature 5: On-chain proof expandable */}
        <details className="chain-drawer">
          <summary>🔍 On-chain proof & ownership</summary>
          <div className="chain-data">
            <div><strong>Post ID:</strong> #{post.id}</div>
            <div><strong>Author wallet:</strong> {post.author}</div>
            <div><strong>Anonymous:</strong> {post.content?.anonymous ? "Yes — wallet hidden in metadata" : "No"}</div>
            <div><strong>IPFS CID:</strong> {post.contentCID}</div>
            <div><strong>Content hash:</strong> {post.contentHash}</div>
            <div><strong>Published:</strong> {new Date(post.timestamp * 1000).toLocaleString()}</div>
            <div><strong>Tags:</strong> {post.content?.tags?.join(", ") || "none"}</div>
            <div>
              <strong>Integrity:</strong>{" "}
              {post.isIntact === true  && <span style={{ color: "var(--green)" }}>✓ Content matches on-chain hash — original</span>}
              {post.isIntact === false && !post.ipfsFetchFailed && <span style={{ color: "var(--red)" }}>✗ Hash mismatch — content altered</span>}
              {(post.isIntact === null || post.ipfsFetchFailed) && <span>Syncing from IPFS…</span>}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href={`https://ipfs.io/ipfs/${post.contentCID}`} target="_blank" rel="noreferrer" className="etherscan-link">View on IPFS ↗</a>
              <a href={`https://sepolia.etherscan.io/address/${post.author}`} target="_blank" rel="noreferrer" className="etherscan-link">View on Etherscan ↗</a>
            </div>
          </div>
        </details>

        {/* Feature 12: Comments */}
        <CommentSection postId={post.id} />
      </div>

      {showTip && <TipModal post={post} onClose={() => setShowTip(false)} onSuccess={onRefresh} />}
    </>
  );
}
