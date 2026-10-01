import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import {
  Plus,
  Calendar,
  Users,
  Receipt,
  ArrowUpRight,
  Search,
  Compass,
} from "lucide-react";
import {
  QuickSplit,
  GettingStarted,
  TravelTips,
} from "../../components/TravelTools.js";

interface TripItem {
  id: string;
  name: string;
  description?: string;
  baseCurrency: string;
  startDate?: string;
  endDate?: string;
  status: string;
  role: string;
  memberCount: number;
  expenseCount: number;
}
interface TripListProps {
  trips: TripItem[];
  onSelectTrip: (tripId: string) => void;
  onCreateTripClick: () => void;
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export const TripList: React.FC<TripListProps> = ({
  trips,
  onSelectTrip,
  onCreateTripClick,
  loading,
  error,
  onRetry,
}) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");
  const filtered = trips.filter((trip) =>
    `${trip.name} ${trip.description || ""}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  const date = (value: string) => {
    const parsed = new Date(value.slice(0, 10) + "T12:00:00");
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString(language, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };
  return (
    <div className="content-inner dashboard">
      <section className="dashboard-welcome">
        <div>
          <p className="eyebrow">{t("home")}</p>
          <h1>{t("welcome", { name: user?.name.split(" ")[0] || "" })}</h1>
          <p className="text-muted">{t("dashboardIntro")}</p>
        </div>
        <button
          id="btn-create-trip"
          className="btn btn-primary"
          onClick={onCreateTripClick}
        >
          <Plus size={18} />
          {t("newTrip")}
        </button>
      </section>
      <div className="dashboard-layout">
        <section className="trip-section">
          <div className="section-heading trip-heading">
            <h2>
              {t("trips")} <span className="count-badge">{trips.length}</span>
            </h2>
            <label className="search-field">
              <Search size={18} />
              <input
                aria-label={t("search")}
                placeholder={t("search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          {loading ? (
            <div className="trip-grid" role="status" aria-label={t("loading")}>
              {[1, 2].map((i) => (
                <div key={i} className="card skeleton" />
              ))}
            </div>
          ) : error ? (
            <div className="card empty-trip" role="alert">
              <p>{t("loadError")}</p>
              <button className="btn btn-secondary" onClick={onRetry}>
                {t("retry")}
              </button>
            </div>
          ) : !trips.length ? (
            <div className="empty-trip">
              <div className="empty-art" aria-hidden="true">
                <Compass size={44} />
                <span>✦</span>
              </div>
              <h3>{t("empty")}</h3>
              <p className="text-muted">{t("emptyBody")}</p>
              <button
                id="btn-create-first-trip"
                className="btn btn-primary"
                onClick={onCreateTripClick}
              >
                <Plus size={17} />
                {t("start")}
              </button>
              <div className="empty-steps">
                <span>01 · {t("trips")}</span>
                <span>02 · {t("members")}</span>
                <span>03 · {t("expenses")}</span>
              </div>
            </div>
          ) : !filtered.length ? (
            <div className="card empty-trip">
              <Search size={28} />
              <h3>{t("noResults")}</h3>
              <button
                className="btn btn-secondary"
                onClick={() => setQuery("")}
              >
                {t("clear")}
              </button>
            </div>
          ) : (
            <div className="trip-grid">
              {filtered.map((trip, index) => (
                <button
                  type="button"
                  key={trip.id}
                  className={`trip-card`}
                  onClick={() => onSelectTrip(trip.id)}
                >
                  <div className={`trip-cover cover-${index % 3}`}>
                    <Compass size={36} />
                    <span className="badge badge-neutral">
                      {trip.baseCurrency}
                    </span>
                  </div>
                  <div className="trip-card-body">
                    <h3>
                      {trip.name}
                      <ArrowUpRight size={19} />
                    </h3>
                    {trip.description && (
                      <p className="text-muted trip-description">
                        {trip.description}
                      </p>
                    )}
                    {trip.startDate && (
                      <p className="trip-date">
                        <Calendar size={14} />
                        {date(trip.startDate)}
                        {trip.endDate ? ` – ${date(trip.endDate)}` : ""}
                      </p>
                    )}
                    <div className="trip-meta">
                      <span>
                        <Users size={15} />
                        {trip.memberCount} {t("members")}
                      </span>
                      <span>
                        <Receipt size={15} />
                        {trip.expenseCount} {t("expenses")}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
        <TravelTips />
      </div>
      <GettingStarted />
      <QuickSplit />
      {language !== "en" && <p className="form-hint">{t("languageNote")}</p>}
    </div>
  );
};
