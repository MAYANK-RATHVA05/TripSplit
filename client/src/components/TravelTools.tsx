import React, { useState } from "react";
import {
  Calculator,
  Users,
  Receipt,
  Check,
  ArrowUpRight,
  Compass,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext.js";
import { CURRENCIES } from "../lib/currencies.js";
import { equalSplit } from "../lib/equalSplit.js";

export function QuickSplit() {
  const { t, language } = useLanguage();
  const [amount, setAmount] = useState("2400");
  const [people, setPeople] = useState("4");
  const [currency, setCurrency] = useState("INR");
  const decimals = CURRENCIES[currency].decimals;
  const result = equalSplit(amount, people, decimals);
  const money = (minor: number) =>
    new Intl.NumberFormat(language, { style: "currency", currency }).format(
      minor / 10 ** decimals,
    );
  return (
    <section className="card quick-split" aria-labelledby="split-title">
      <div className="section-title">
        <span className="icon-tile">
          <Calculator size={21} />
        </span>
        <div>
          <p className="eyebrow">{t("tools")}</p>
          <h2 id="split-title">{t("calculator")}</h2>
        </div>
      </div>
      <p className="text-muted">{t("calcIntro")}</p>
      <div className="calculator-fields">
        <label className="form-group">
          {t("amount")}
          <input
            className="form-input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="form-group">
          {t("currency")}
          <select
            className="form-select"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {Object.keys(CURRENCIES).map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </label>
        <label className="form-group">
          {t("people")}
          <input
            className="form-input"
            type="number"
            min="1"
            max="100"
            step="1"
            value={people}
            onChange={(e) => setPeople(e.target.value)}
          />
        </label>
      </div>
      <div className="split-result" aria-live="polite" aria-atomic="true">
        {result ? (
          <>
            <strong>{money(result.share)}</strong>
            <span>{t("each")}</span>
            {result.remainder > 0 && (
              <p className="text-sm">
                {t("remainder", {
                  count: result.remainder,
                  amount: money(result.share + 1),
                })}
              </p>
            )}
          </>
        ) : (
          <p>{t("invalid")}</p>
        )}
      </div>
      <p className="form-hint">{t("notSaved")}</p>
    </section>
  );
}

export function GettingStarted() {
  const { t } = useLanguage();
  return (
    <section className="getting-started" id="how-it-works">
      <div className="section-heading">
        <p className="eyebrow">{t("stepsEyebrow")}</p>
        <h2>{t("how")}</h2>
      </div>
      <div className="steps-grid">
        {([Users, Receipt, Check] as const).map((Icon, index) => (
          <article className="step-card" key={index}>
            <div className="step-top">
              <span className="icon-tile">
                <Icon size={22} />
              </span>
              <span className="step-number">0{index + 1}</span>
            </div>
            <h3>{t((["step1", "step2", "step3"] as const)[index])}</h3>
            <p className="text-muted">
              {t((["step1body", "step2body", "step3body"] as const)[index])}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TravelTips() {
  const { t } = useLanguage();
  return (
    <aside className="travel-tip">
      <Compass size={28} />
      <h2>{t("tip")}</h2>
      <p>{t("tipBody")}</p>
      <span className="tip-line" aria-hidden="true">
        <span>●</span>
        <span>✦</span>
        <ArrowUpRight size={26} />
      </span>
    </aside>
  );
}

export function TravelFAQ() {
  const { t } = useLanguage();
  return (
    <section className="faq">
      <h2>{t("faq")}</h2>
      {([1, 2, 3] as const).map((n) => (
        <details key={n}>
          <summary>{t(`faq${n}`)}</summary>
          <p className="text-muted">{t(`faq${n}body`)}</p>
        </details>
      ))}
    </section>
  );
}
