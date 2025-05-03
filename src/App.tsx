
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import { WalletProvider } from './contexts/WalletContext';
import { Toaster } from "@/components/ui/toaster";

const App = () => (
  <WalletProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  </WalletProvider>
);

export default App;
