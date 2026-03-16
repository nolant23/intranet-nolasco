import { LoginForm } from "./components/LoginForm";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="p-8 sm:p-12">
          <div className="flex justify-center mb-8">
            <Image 
              src="/images/logo.png" 
              alt="Nolasco Ascensori Logo" 
              width={220} 
              height={220} 
              className="object-contain" 
              priority 
            />
          </div>
          <h1 className="text-2xl font-black text-center text-slate-900 mb-2 uppercase tracking-tight">Accesso Intranet</h1>
          <p className="text-slate-500 text-center mb-8 font-medium">Inserisci le tue credenziali per continuare</p>
          
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
