import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { CONTRACT_ADDRESSES, POST_REGISTRY_ABI, USER_REGISTRY_ABI } from "../contracts";
import axios from "axios";

async function invalidateUserCache(address, authHeaders) {
  try { await axios.post("/api/users/invalidate-cache", {}, { headers: authHeaders }); } catch {}
}

async function invalidatePostsCache(authHeaders) {
  try { await axios.post("/api/posts/invalidate", {}, { headers: authHeaders }); } catch {}
}

export function usePostRegistry() {
  const { getContract, address, authHeaders } = useWallet();
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash]   = useState(null);
  const [error, setError]     = useState(null);

  const c = () => getContract(CONTRACT_ADDRESSES.PostRegistry, POST_REGISTRY_ABI);

  const createPost = useCallback(async (contentCID, contentHash) => {
    setLoading(true); setError(null); setTxHash(null);
    try {
      const tx = await c().createPost(contentCID, contentHash);
      setTxHash(tx.hash); await tx.wait();
      return tx.hash;
    } catch (err) { setError(err.reason || err.message); throw err; }
    finally { setLoading(false); }
  }, [getContract]);

  const likePost = useCallback(async (postId) => {
    setLoading(true); setError(null);
    try { const tx = await c().likePost(postId); setTxHash(tx.hash); await tx.wait(); }
    catch (err) { setError(err.reason || err.message); throw err; }
    finally { setLoading(false); }
  }, [getContract]);

  const flagPost = useCallback(async (postId) => {
    setLoading(true); setError(null);
    try { const tx = await c().flagPost(postId); await tx.wait(); }
    catch (err) { setError(err.reason || err.message); throw err; }
    finally { setLoading(false); }
  }, [getContract]);

  const votePost = useCallback(async (postId, hideVote) => {
    setLoading(true); setError(null);
    try { const tx = await c().vote(postId, hideVote); await tx.wait(); }
    catch (err) { setError(err.reason || err.message); throw err; }
    finally { setLoading(false); }
  }, [getContract]);

  const tipAuthor = useCallback(async (postId, ethAmount) => {
    setLoading(true); setError(null);
    try {
      const tx = await c().tipAuthor(postId, { value: ethers.parseEther(ethAmount.toString()) });
      setTxHash(tx.hash); await tx.wait();
    } catch (err) { setError(err.reason || err.message); throw err; }
    finally { setLoading(false); }
  }, [getContract]);

  // DELETE POST — invalidates backend cache so post disappears immediately
  const deletePost = useCallback(async (postId) => {
    setLoading(true); setError(null);
    try {
      const contract = c();
      if (typeof contract.deletePost !== "function") {
        throw new Error("deletePost not available — contact Person 1 to confirm deployment");
      }
      const tx = await contract.deletePost(postId);
      await tx.wait();
      // Invalidate cache immediately so feed refreshes without the deleted post
      await invalidatePostsCache(authHeaders);
    } catch (err) { setError(err.reason || err.message); throw err; }
    finally { setLoading(false); }
  }, [getContract, authHeaders]);

  // ON-CHAIN COMMENT
  const addCommentOnChain = useCallback(async (postId, text) => {
    setLoading(true); setError(null);
    try { const tx = await c().addComment(postId, text); await tx.wait(); }
    catch (err) { setError(err.reason || err.message); throw err; }
    finally { setLoading(false); }
  }, [getContract]);

  const likeCommentOnChain = useCallback(async (postId, commentId) => {
    setLoading(true); setError(null);
    try { const tx = await c().likeComment(postId, commentId); await tx.wait(); }
    catch (err) { setError(err.reason || err.message); throw err; }
    finally { setLoading(false); }
  }, [getContract]);

  // ON-CHAIN REPOST
  const repostOnChain = useCallback(async (originalPostId) => {
    setLoading(true); setError(null);
    try {
      const tx = await c().repost(originalPostId);
      await tx.wait();
      return tx.hash;
    } catch (err) { setError(err.reason || err.message); throw err; }
    finally { setLoading(false); }
  }, [getContract]);

  return {
    createPost, likePost, flagPost, votePost, tipAuthor, deletePost,
    addCommentOnChain, likeCommentOnChain, repostOnChain,
    loading, txHash, error,
  };
}

export function useUserRegistry() {
  const { getContract, address, authHeaders } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const c = () => getContract(CONTRACT_ADDRESSES.UserRegistry, USER_REGISTRY_ABI);

  const registerUser = useCallback(async (username, profileCID) => {
    setLoading(true); setError(null);
    try {
      const tx = await c().registerUser(username, profileCID);
      await tx.wait();
      await invalidateUserCache(address, authHeaders);
      return tx.hash;
    } catch (err) { setError(err.reason || err.message); throw err; }
    finally { setLoading(false); }
  }, [getContract, address, authHeaders]);

  const updateProfile = useCallback(async (username, profileCID) => {
    setLoading(true); setError(null);
    try {
      const tx = await c().updateProfile(username, profileCID);
      await tx.wait();
      await invalidateUserCache(address, authHeaders);
    } catch (err) { setError(err.reason || err.message); throw err; }
    finally { setLoading(false); }
  }, [getContract, address, authHeaders]);

  const toggleVisibility = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const tx = await c().toggleVisibility();
      await tx.wait();
      await invalidateUserCache(address, authHeaders);
    } catch (err) { setError(err.reason || err.message); throw err; }
    finally { setLoading(false); }
  }, [getContract, address, authHeaders]);

  const deleteAccount = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const tx = await c().deleteAccount();
      await tx.wait();
      await invalidateUserCache(address, authHeaders);
    } catch (err) { setError(err.reason || err.message); throw err; }
    finally { setLoading(false); }
  }, [getContract, address, authHeaders]);

  return { registerUser, updateProfile, toggleVisibility, deleteAccount, loading, error };
}
