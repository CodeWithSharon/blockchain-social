import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider, useWallet } from "./context/WalletContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Compose from "./pages/Compose";
import Register from "./pages/Register";
import Leaderboard from "./pages/Leaderboard";
import "./index.css";

function AppRoutes() {
  const { address } = useWallet();
  return (
    <>
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile/:address" element={<Profile />} />
          <Route path="/compose" element={address ? <Compose /> : <Navigate to="/" />} />
          <Route path="/register" element={address ? <Register /> : <Navigate to="/" />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </WalletProvider>
  );
}
