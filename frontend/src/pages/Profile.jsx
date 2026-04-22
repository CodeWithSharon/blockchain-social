import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { useUserRegistry } from "../hooks/useContract";
import {
  fetchUser, fetchUserPosts, fetchTokenBalance, fetchReputation,
  prepareProfile, uploadAvatar, invalidateUserCache,
  fetchFollowing, fetchFollowers, checkIsFollowing, followUser, unfollowUser,
  fetchUserReposts,
} from "../utils/api";
import PostCard from "../components/PostCard";

const short = a => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "";
const initials = (u, a) => u ? u.slice(0,2).toUpperCase() : a ? a.slice(2,4).toUpperCase() : "??";

function ReputationBar({ score }) {
  const color = score >= 70 ? "#16a34a" : score >= 40 ? "#d97706" : "#dc2626";
  return (
    <div style={{ marginTop: 8, marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text3)", marginBottom: 4 }}>
        <span>Reputation Score</span>
        <span style={{ fontWeight: 700, color }}>{score}/100</span>
      </div>
      <div style={{ height: 6, background: "var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(score, 100)}%`, background: color, borderRadius: 10, transition: "width 0.6s ease" }} />
      </div>
      <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: 3 }}>
        Calculated from likes received, posts, and CLINK earned
      </div>
    </div>
  );
}

export default function Profile() {
  const { address: profileAddress } = useParams();
  const { address: myAddress, authHeaders } = useWallet();
  const navigate = useNavigate();
  const { registerUser, updateProfile, toggleVisibility, deleteAccount, loading: contractLoading } = useUserRegistry();

  const isOwner = myAddress && profileAddress && myAddress.toLowerCase() === profileAddress.toLowerCase();

  const [user, setUser]               = useState(null);
  const [posts, setPosts]             = useState([]);
  const [reposts, setReposts]         = useState([]);
  const [balance, setBalance]         = useState(null);
  const [reputation, setReputation]   = useState(null);
  const [followers, setFollowers]     = useState([]);
  const [following, setFollowing]     = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState("posts");
  const [editing, setEditing]         = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio]         = useState("");
  const [editAvatarFile, setEditAvatarFile]     = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState(null);
  const [saveStep, setSaveStep]       = useState("idle"); // idle | uploading | signing | confirming
  const [saveError, setSaveError]     = useState(null);

  const load = useCallback(async () => {
    if (!profileAddress) return;
    setLoading(true);
    try {
      const [userData, userPosts, tokenData, repData, followerData, followingData, userReposts] = await Promise.all([
        fetchUser(profileAddress).catch(() => null),
        fetchUserPosts(profileAddress).catch(() => []),
        fetchTokenBalance(profileAddress).catch(() => ({ balance: "0" })),
        fetchReputation(profileAddress).catch(() => ({ score: 0 })),
        fetchFollowers(profileAddress).catch(() => ({ followers: [] })),
        fetchFollowing(profileAddress).catch(() => ({ following: [] })),
        fetchUserReposts(profileAddress).catch(() => []),
      ]);
      setUser(userData);
      setPosts(userPosts.sort((a, b) => b.timestamp - a.timestamp));
      setReposts(userReposts);
      setBalance(parseFloat(tokenData.balance).toFixed(2));
      setReputation(repData);
      setFollowers(followerData.followers || []);
      setFollowing(followingData.following || []);
      if (userData) { setEditUsername(userData.username || ""); setEditBio(userData.bio || ""); }
      if (myAddress && !isOwner) {
        checkIsFollowing(myAddress, profileAddress).then(setIsFollowing).catch(() => {});
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [profileAddress, myAddress, isOwner]);

  useEffect(() => { load(); }, [load]);

  async function handleFollowToggle() {
    if (!myAddress) return alert("Connect your wallet first");
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(profileAddress, authHeaders);
        setIsFollowing(false);
        setFollowers(f => f.filter(a => a !== myAddress.toLowerCase()));
      } else {
        await followUser(profileAddress, authHeaders);
        setIsFollowing(true);
        setFollowers(f => [...f, myAddress.toLowerCase()]);
      }
    } catch (e) { alert(e.response?.data?.error || e.message); }
    finally { setFollowLoading(false); }
  }

  async function handleSave() {
    if (!authHeaders["x-signature"]) return alert("Please reconnect your wallet first");
    setSaveError(null); setSaveStep("uploading");
    try {
      const provider  = new ethers.BrowserProvider(window.ethereum);
      const signer    = await provider.getSigner();
      const message   = "Sign to update ChainSocial profile: " + Date.now();
      const signature = await signer.signMessage(message);
      const headers   = { "x-wallet-address": myAddress, "x-signature": signature, "x-message": message };

      let newAvatarCID = null;
      if (editAvatarFile) {
        const r = await uploadAvatar(editAvatarFile, headers);
        newAvatarCID = r.cid;
      }
      const { cid: profileCID } = await prepareProfile(editBio, newAvatarCID || user?.profileCID || "", headers);

      setSaveStep("signing");
      if (!user?.exists) await registerUser(editUsername, profileCID);
      else await updateProfile(editUsername, profileCID);

      setSaveStep("confirming");
      setEditing(false);
      // Wait for blockchain + cache to sync
      setTimeout(() => { setSaveStep("idle"); load(); }, 3000);
    } catch (e) { setSaveError(e.reason || e.message); setSaveStep("idle"); }
  }

  if (loading) return <div className="loader"><span className="spin" /> Loading profile…</div>;

  const notRegistered = !user || !user.exists;
  const totalLikes    = posts.reduce((s, p) => s + p.likes, 0);
  const displayPosts  = activeTab === "posts" ? posts : reposts;

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        {notRegistered ? (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>👤</div>
            <p className="text-dim" style={{ marginBottom: 4 }}>
              {isOwner ? "You haven't registered yet." : "This wallet hasn't registered."}
            </p>
            <p style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text3)", marginBottom: 20 }}>{profileAddress}</p>
            {isOwner && <button className="btn btn-primary" onClick={() => setEditing(true)}>Create Profile</button>}
          </div>
        ) : (
          <>
            <div className="profile-header">
              <div className="avatar avatar-lg">
                {user.profileImageUrl ? <img src={user.profileImageUrl} alt="" /> : initials(user.username, profileAddress)}
              </div>
              <div className="profile-info">
                <div className="profile-name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {user.username}
                  {/* Feature 18: verified badge */}
                  {user.isVerified && (
                    <span title="Verified — registered user with username"
                      style={{ background: "var(--primary)", color: "white", borderRadius: "50%", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>✓</span>
                  )}
                </div>
                <div className="profile-addr">{profileAddress}</div>
                {user.bio && <div className="profile-bio">{user.bio}</div>}
                {!user.isVisible && (
                  <span style={{ display: "inline-block", marginTop: 6, fontSize: "0.75rem", color: "var(--text3)", background: "var(--bg3)", padding: "2px 10px", borderRadius: 20 }}>
                    🔒 Private account
                  </span>
                )}
              </div>
            </div>

            {/* Feature 21: Reputation score */}
            {reputation && <ReputationBar score={reputation.score} />}

            {/* Stats row */}
            <div className="profile-stats">
              <div><span className="stat-val">{posts.length}</span><span className="stat-label">Posts</span></div>
              <div><span className="stat-val">{totalLikes}</span><span className="stat-label">Likes</span></div>
              <div><span className="stat-val" style={{ color: "#b45309" }}>🪙 {balance}</span><span className="stat-label">CLINK</span></div>
              {/* Feature 11: follower/following counts */}
              <div><span className="stat-val">{followers.length}</span><span className="stat-label">Followers</span></div>
              <div><span className="stat-val">{following.length}</span><span className="stat-label">Following</span></div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {/* Feature 11: Follow/Unfollow button */}
              {!isOwner && myAddress && (
                <button
                  className={`btn btn-sm ${isFollowing ? "btn-outline" : "btn-primary"}`}
                  onClick={handleFollowToggle} disabled={followLoading}>
                  {followLoading
                    ? <span className="spin" style={{ width: 12, height: 12, borderWidth: 2, borderTopColor: isFollowing ? "var(--primary)" : "white" }} />
                    : isFollowing ? "✓ Following" : "+ Follow"}
                </button>
              )}

              {isOwner && !editing && (
                <>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>✏️ Edit Profile</button>
                  <button className="btn btn-outline btn-sm" onClick={async () => { try { await toggleVisibility(); load(); } catch (e) { alert(e.reason || e.message); }}} disabled={contractLoading}>
                    {user.isVisible ? "🔒 Make Private" : "🌐 Make Public"}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={async () => {
                    if (window.confirm("Permanently delete your account from the blockchain? This cannot be undone.")) {
                      try { await deleteAccount(); navigate("/"); } catch (e) { alert(e.reason || e.message); }
                    }
                  }} disabled={contractLoading}>
                    🗑️ Delete Account
                  </button>
                </>
              )}

              <a href={`https://sepolia.etherscan.io/address/${profileAddress}`} target="_blank" rel="noreferrer"
                className="etherscan-link" style={{ marginLeft: "auto" }}>
                Etherscan ↗
              </a>
            </div>
          </>
        )}

        {/* Edit / Register form */}
        {editing && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 16 }}>
              {notRegistered ? "👋 Create Your Profile" : "✏️ Edit Profile"}
            </div>

            {saveError && <div className="alert alert-error">{saveError}</div>}

            {saveStep !== "idle" && (
              <div className="alert alert-info">
                <span className="spin" style={{ width: 14, height: 14, borderWidth: 2 }} />
                {saveStep === "uploading"   && "Uploading profile to IPFS…"}
                {saveStep === "signing"     && "Please confirm transaction in MetaMask…"}
                {saveStep === "confirming"  && "✓ Transaction confirmed! Refreshing profile in a moment…"}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" value={editUsername} onChange={e => setEditUsername(e.target.value)}
                placeholder="yourname" disabled={saveStep !== "idle"} />
              <div className="form-hint">✓ Verified badge is automatically awarded to all registered users</div>
            </div>

            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea className="form-textarea" rows={3} value={editBio} onChange={e => setEditBio(e.target.value)}
                placeholder="Tell the world about yourself…" disabled={saveStep !== "idle"} />
            </div>

            <div className="form-group">
              <label className="form-label">Profile Picture</label>
              <input type="file" accept="image/*" disabled={saveStep !== "idle"}
                style={{ color: "var(--text2)", fontSize: "0.85rem" }}
                onChange={e => {
                  const f = e.target.files[0];
                  setEditAvatarFile(f);
                  setEditAvatarPreview(f ? URL.createObjectURL(f) : null);
                }} />
              {editAvatarPreview && <img src={editAvatarPreview} alt="" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", marginTop: 8 }} />}
            </div>

            <div className="flex gap-2">
              <button className="btn btn-outline" onClick={() => { setEditing(false); setSaveError(null); }} disabled={saveStep !== "idle"}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saveStep !== "idle" || !editUsername.trim()}>
                {saveStep === "uploading"  ? "Uploading…"   :
                 saveStep === "signing"    ? "Confirming…"  :
                 saveStep === "confirming" ? "Refreshing…"  : "Save Profile"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Posts / Reposts tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: 14 }}>
        {["posts", "reposts"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 20px", background: "none", border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: "0.85rem",
              color: activeTab === tab ? "var(--primary)" : "var(--text3)",
              borderBottom: activeTab === tab ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: -2, transition: "all 0.15s", textTransform: "capitalize",
            }}>
            {tab === "posts" ? `Posts (${posts.length})` : `Reposts (${reposts.length})`}
          </button>
        ))}
      </div>

      {displayPosts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{activeTab === "posts" ? "📝" : "🔁"}</div>
          <div className="empty-text">{activeTab === "posts" ? "No posts yet." : "No reposts yet."}</div>
          {isOwner && activeTab === "posts" && (
            <Link to="/compose" className="btn btn-primary" style={{ textDecoration: "none" }}>Create First Post</Link>
          )}
        </div>
      ) : (
        displayPosts.map(post => (
          <PostCard key={`${post.id}${post.isRepost ? "-r" : ""}`}
            post={{ ...post, authorProfile: user }}
            onRefresh={load} />
        ))
      )}
    </div>
  );
}
