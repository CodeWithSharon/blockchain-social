import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { usePostRegistry } from "../hooks/useContract";
import { preparePost } from "../utils/api";

export default function Compose() {
  const navigate = useNavigate();
  const { address, authHeaders } = useWallet();
  const { createPost } = usePostRegistry();

  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [anonymous, setAnonymous] = useState(false); // Feature 15
  const [step, setStep] = useState("idle");
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);

  // Feature 16: detect hashtags in text
  const detectedTags = [...new Set((text.match(/#\w+/g) || []).map(t => t.toLowerCase()))];

  async function submit() {
    if (!text.trim() && !image) return setError("Write something or attach an image");
    setError(null);
    setStep("uploading");

    let cid, contentHash;
    try {
      const fd = new FormData();
      fd.append("text", text);
      fd.append("anonymous", anonymous ? "true" : "false");
      if (image) fd.append("image", image);
      const r = await preparePost(fd, authHeaders);
      cid = r.cid;
      contentHash = r.contentHash;
    } catch (e) {
      setError("Upload failed: " + e.message);
      return setStep("idle");
    }

    setStep("signing");
    try {
      const hash = await createPost(cid, contentHash);
      setTxHash(hash);
      setStep("done");
    } catch (e) {
      setError("Transaction failed: " + (e.reason || e.message));
      setStep("idle");
    }
  }

  if (step === "done") {
    return (
      <div>
        <div className="page-title" style={{ marginBottom: 16 }}>Post Published! 🎉</div>
        <div className="card success-screen">
          <div className="success-icon">✅</div>
          <p className="text-dim" style={{ marginBottom: 6 }}>Your post is now permanently on Ethereum</p>
          <a href={"https://sepolia.etherscan.io/tx/" + txHash} target="_blank" rel="noreferrer"
            className="etherscan-link" style={{ display: "inline-block", marginBottom: 24 }}>
            View transaction on Etherscan ↗
          </a>
          <div className="flex gap-2" style={{ justifyContent: "center" }}>
            <button className="btn btn-outline" onClick={() => navigate("/")}>Back to Feed</button>
            <button className="btn btn-primary" onClick={() => { setText(""); setImage(null); setPreview(null); setStep("idle"); setTxHash(null); setAnonymous(false); }}>
              New Post
            </button>
          </div>
        </div>
      </div>
    );
  }

  const busy = step === "uploading" || step === "signing";

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Create Post</div>
        <div className="page-sub">Content stored on IPFS · ownership proof on Ethereum</div>
      </div>

      <div className="card">
        {busy && (
          <div className="step-bar" style={{ marginBottom: 16 }}>
            <div className={"step-item " + (step === "uploading" ? "active" : step === "signing" ? "done" : "")}>
              <div className="step-num">1</div>
              <span>Upload to IPFS</span>
            </div>
            <div className={"step-line " + (step === "signing" ? "done" : "")} />
            <div className={"step-item " + (step === "signing" ? "active" : "")}>
              <div className="step-num">2</div>
              <span>Confirm on blockchain</span>
            </div>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {/* Feature 15: Anonymous toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", background: "var(--bg3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1, fontSize: "0.88rem", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={anonymous}
              onChange={e => setAnonymous(e.target.checked)}
              disabled={busy}
              style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
            />
            🎭 Post anonymously
          </label>
          <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>
            {anonymous ? "Your wallet will be hidden — shown as Anonymous" : "Your wallet address will be visible"}
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">What's on your mind?</label>
          <textarea
            className="form-textarea"
            rows={5}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={"Share something with the world…\n\nTip: Use #hashtags to categorize your post"}
            disabled={busy}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
              {/* Feature 16: show detected tags */}
              {detectedTags.length > 0 && (
                <span>Tags detected: {detectedTags.map(t => (
                  <span key={t} style={{ background: "var(--primary-bg)", color: "var(--primary)", borderRadius: 10, padding: "1px 7px", marginRight: 4, fontSize: "0.72rem", fontWeight: 600 }}>{t}</span>
                ))}</span>
              )}
            </span>
            <span className="char-count" style={{ margin: 0 }}>{text.length} chars</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Attach Image (optional)</label>
          <input type="file" accept="image/*" disabled={busy}
            style={{ color: "var(--text2)", fontSize: "0.85rem" }}
            onChange={e => {
              const f = e.target.files[0];
              setImage(f);
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          {preview && (
            <div style={{ marginTop: 10, position: "relative", display: "inline-block" }}>
              <img src={preview} alt="" style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 10, border: "1px solid var(--border)" }} />
              <button className="btn btn-sm btn-outline"
                style={{ position: "absolute", top: 6, right: 6, padding: "2px 8px" }}
                onClick={() => { setImage(null); setPreview(null); }}>
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="alert alert-info" style={{ fontSize: "0.8rem" }}>
          ℹ️ Two steps: IPFS upload (free) → MetaMask transaction (tiny gas on Sepolia testnet)
        </div>

        <div className="divider" />

        <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-outline" onClick={() => navigate("/")} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy || (!text.trim() && !image)}>
            {busy
              ? <><span className="spin" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "white" }} /> {step === "uploading" ? "Uploading…" : "Waiting for MetaMask…"}</>
              : (anonymous ? "🎭 Publish Anonymously" : "🚀 Publish Post")}
          </button>
        </div>
      </div>
    </div>
  );
}
