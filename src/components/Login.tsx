import React, { useState, useEffect } from "react";
import { Lock, User, Droplet, ArrowRight } from "lucide-react";

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [nomPrenom, setNomPrenom] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Load saved credentials if "remember me" was checked
  useEffect(() => {
    const isRemembered = localStorage.getItem("rememberMe") === "true";
    if (isRemembered) {
      setRememberMe(true);
      setNomPrenom(localStorage.getItem("rememberedUser") || "");
      setPassword(localStorage.getItem("rememberedPass") || "");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom_prenom: nomPrenom, password })
      });

      const data = await response.json();
      if (data.success && data.user) {
        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
          localStorage.setItem("rememberedUser", nomPrenom);
          localStorage.setItem("rememberedPass", password);
        } else {
          localStorage.removeItem("rememberMe");
          localStorage.removeItem("rememberedUser");
          localStorage.removeItem("rememberedPass");
        }
        onLogin(data.user);
      } else {
        setError(data.error || "Échec de connexion");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex font-sans bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('https://lavoiedalgerie.dz/wp-content/uploads/2025/01/raffinage-sonatrach-800x500.jpeg')" }}
    >
      {/* Dark Transparent Overlay for the entire background */}
      <div className="absolute inset-0 bg-[#0c1222]/70 backdrop-blur-[2px]"></div>

      <div className="relative z-10 w-full flex flex-col lg:flex-row">
        {/* Left Side - Visual / Branding */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
          {/* Background Decorative Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M0 40L40 0H20L0 20M40 40V20L20 40" stroke="white" strokeWidth="1" fill="none" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern)" />
            </svg>
          </div>
          
          <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-[#f97316] blur-[150px] opacity-30 pointer-events-none"></div>

          <div className="relative z-10 flex items-center gap-3">
            <img src="/logo.svg" className="w-10 h-10 object-contain rounded-xl shadow-lg" alt="Logo" />
            <span className="text-xl font-black text-white tracking-tight">Wellbore Pro</span>
          </div>

          <div className="relative z-10 max-w-md">
            <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight mb-6">
              Wellbore Pro Studio.
            </h1>
            <p className="text-lg text-slate-300 font-medium leading-relaxed">
              Plateforme unifiée pour la gestion des puits, le suivi des complétions et l'historisation des données techniques.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-4 text-sm text-slate-400 font-medium">
            <span>© {new Date().getFullYear()} ENP. Tous droits réservés.</span>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 xl:p-24 relative">
          <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-2xl space-y-10 border border-slate-100">
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <img src="/logo.svg" className="w-10 h-10 object-contain rounded-xl shadow-lg" alt="Logo" />
            <span className="text-xl font-black text-slate-900 tracking-tight">Wellbore Pro</span>
          </div>

          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Accès sécurisé</h2>
            <p className="text-slate-500 mt-2 text-sm font-medium">
              Veuillez vous connecter avec vos identifiants pour accéder à votre espace de travail.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-semibold flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></div>
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">
                  Nom & Prénom
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={nomPrenom}
                    onChange={(e) => setNomPrenom(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-all"
                    placeholder="Ex: A.BOUZAHRI"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-all"
                    placeholder="Votre mot de passe"
                    required
                  />
                </div>
              </div>

              {/* Remember Me Option */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#f97316] focus:ring-[#f97316] focus:ring-offset-0 cursor-pointer"
                  />
                  <span>Se souvenir de moi</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`group w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#f97316] hover:bg-[#ea580c] active:scale-[0.98] transition-all shadow-lg shadow-[#f97316]/25 ${
                isLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? "Connexion en cours..." : "Se connecter"}
              {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
