import React, { useState } from "react";
import { ArrowRight, Compass, Globe2, Users, Check } from "lucide-react";
import { LanguageSelect, useLanguage } from "../../context/LanguageContext.js";
import {
  QuickSplit,
  GettingStarted,
  TravelTips,
  TravelFAQ,
} from "../../components/TravelTools.js";
import { AuthModal } from "../auth/AuthModal.js";

export function WelcomePage() {
  const { t, language } = useLanguage();
  const [auth, setAuth] = useState<"login" | "register" | null>(() =>
    window.location.pathname.startsWith("/join/") ? "login" : null,
  );
  return (
    <>
      <a className="skip-link" href="#main">
        {t("home")}
      </a>
      <header className="app-header">
        <a className="brand" href="/">
          <span className="brand-icon">
            <Compass size={23} />
          </span>
          TripSplit<span className="brand-dot">.</span>
        </a>
        <div className="header-actions">
          <LanguageSelect />
          <button
            className="btn btn-secondary"
            onClick={() => setAuth("login")}
          >
            {t("signIn")}
            <ArrowRight size={16} />
          </button>
        </div>
      </header>
      <main id="main" className="content-inner welcome-page">
        <section className="welcome-hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-dot" />
              {t("home")}
            </p>
            <h1>{t("headline")}</h1>
            <p className="hero-description">{t("intro")}</p>
            <div className="hero-actions">
              <button
                className="btn btn-primary"
                onClick={() => setAuth("register")}
              >
                {t("start")}
                <ArrowRight size={18} />
              </button>
              <a className="btn btn-ghost" href="#how-it-works">
                {t("how")} ↓
              </a>
            </div>
            <div className="hero-benefits">
              <span>
                <Users size={16} />
                {t("step1")}
              </span>
              <span>
                <Globe2 size={16} />
                30 {t("currencies")}
              </span>
            </div>
          </div>
          <div className="journey-art" aria-hidden="true">
            <div className="sun" />
            <div className="mountain mountain-back" />
            <div className="mountain mountain-front" />
            <div className="journey-path" />
            <div className="journey-label">
              THE GOOD KIND OF SHARED BAGGAGE.
            </div>
            <div className="postcard">
              <span className="eyebrow">TRIPSPLIT</span>
              <Compass size={36} />
              <strong>
                GO PLACES.
                <br />
                STAY CLOSE.
              </strong>
              <div className="postcard-bottom">
                <span>YOU + YOUR PEOPLE</span>
                <Check size={18} />
              </div>
            </div>
            <div className="floating-stamp">
              <Globe2 size={22} />
              <span>
                LESS MATH
                <br />
                MORE MEMORIES
              </span>
            </div>
          </div>
        </section>
        <GettingStarted />
        <div className="tools-grid">
          <QuickSplit />
          <TravelTips />
        </div>
        <TravelFAQ />
        <footer className="page-footer">
          <span className="brand">TripSplit.</span>
          <span>{t("home")}</span>
          {language !== "en" && <p>{t("languageNote")}</p>}
        </footer>
      </main>
      {auth && (
        <AuthModal isOpen initialMode={auth} onClose={() => setAuth(null)} />
      )}
    </>
  );
}
