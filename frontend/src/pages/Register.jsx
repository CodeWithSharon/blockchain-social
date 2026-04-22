import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useEffect } from "react";

// Register page simply redirects to own profile which handles registration
export default function Register() {
  const { address } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (address) navigate(`/profile/${address}`);
    else navigate("/");
  }, [address, navigate]);

  return null;
}
