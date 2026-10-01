import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { CURRENCIES } from "../../lib/currencies.js";
import { Eye, EyeOff } from "lucide-react";
import { Modal } from "../../components/Modal.js";

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: "login" | "register";
  onClose: () => void;
}
export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = "login",
  onClose,
}) => {
  const { login, register } = useAuth();
  const { t } = useLanguage();
  const [isRegister, setIsRegister] = useState(initialMode === "register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState("INR");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      if (isRegister)
        await register(name.trim(), email.trim(), password, preferredCurrency);
      else await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isRegister ? t("register") : t("signIn")}
      maxWidth="440px"
    >
      <p className="text-muted" style={{ marginBottom: 20 }}>
        {t("home")}
      </p>
      <div className="tab-nav" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`tab-btn ${!isRegister ? "active" : ""}`}
          aria-pressed={!isRegister}
          onClick={() => {
            setIsRegister(false);
            setError(null);
          }}
        >
          {t("signIn")}
        </button>
        <button
          type="button"
          className={`tab-btn ${isRegister ? "active" : ""}`}
          aria-pressed={isRegister}
          onClick={() => {
            setIsRegister(true);
            setError(null);
          }}
        >
          {t("register")}
        </button>
      </div>
      {error && (
        <p role="alert" className="form-error" style={{ marginBottom: 16 }}>
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        {isRegister && (
          <label className="form-group">
            {t("name")}
            <input
              className="form-input"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              pattern=".*\S.*"
            />
          </label>
        )}
        <label className="form-group">
          {t("email")}
          <input
            className="form-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="form-group" htmlFor="auth-password">
          {t("password")}
        </label>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            id="auth-password"
            className="form-input"
            type={showPassword ? "text" : "password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder={t("passwordHint")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isRegister ? 6 : undefined}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={t(showPassword ? "hidePassword" : "showPassword")}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {isRegister && (
          <label className="form-group">
            {t("currency")}
            <select
              className="form-select"
              value={preferredCurrency}
              onChange={(e) => setPreferredCurrency(e.target.value)}
            >
              {Object.values(CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.symbol}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: "100%", marginTop: 8 }}
        >
          {loading ? t("loading") : t(isRegister ? "register" : "signIn")}
        </button>
      </form>
    </Modal>
  );
};
