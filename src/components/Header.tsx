
import { Link } from "react-router-dom";
import WalletConnectButton from "./WalletConnectButton";

const Header = () => {
  return (
    <header className="bg-gradient-to-r from-bichi-orange to-bichi-light-orange p-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <img 
          src="/lovable-uploads/7ca7c629-e231-4762-8cd9-27664b7d3a98.png" 
          alt="Bichi Logo" 
          className="h-10 w-10 object-contain" 
        />
        <h1 className="font-bold text-2xl text-white">BICHI</h1>
      </Link>
      <WalletConnectButton />
    </header>
  );
};

export default Header;
