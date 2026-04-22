import { createContext, useContext, useState, useCallback } from "react";
import { ethers } from "ethers";
import { SEPOLIA_CHAIN_ID } from "../contracts";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [signature, setSignature] = useState(null);
  const [message, setMessage] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not found. Please install it from metamask.io");
      }

      // Request accounts
      await window.ethereum.request({ method: "eth_requestAccounts" });

      // Switch to Sepolia
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: SEPOLIA_CHAIN_ID,
              chainName: "Sepolia Testnet",
              nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            }],
          });
        }
      }

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const walletAddress = await web3Signer.getAddress();

      // Sign a message to prove ownership
      const signMessage = `Sign in to BlockchainSocial: ${Date.now()}`;
      const sig = await web3Signer.signMessage(signMessage);

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAddress(walletAddress);
      setSignature(sig);
      setMessage(signMessage);
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setProvider(null);
    setSigner(null);
    setSignature(null);
    setMessage(null);
  }, []);

  // Auth headers to attach to every protected API call
  const authHeaders = address && signature && message
    ? {
        "x-wallet-address": address,
        "x-signature": signature,
        "x-message": message,
      }
    : {};

  // Get a contract instance with the connected signer (for write operations)
  const getContract = useCallback(
    (address, abi) => {
      if (!signer) throw new Error("Wallet not connected");
      return new ethers.Contract(address, abi, signer);
    },
    [signer]
  );

  return (
    <WalletContext.Provider
      value={{ address, provider, signer, connecting, error, connect, disconnect, authHeaders, getContract }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
