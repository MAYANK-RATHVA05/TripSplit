import React from "react";
import { useAuth } from "../context/AuthContext.js";
import { LanguageSelect, useLanguage } from "../context/LanguageContext.js";
import { Avatar } from "./Avatar.js";
import {
  Compass,
  CreditCard,
  Scale,
  Users,
  History,
  Plus,
  LogOut,
  ChevronLeft,
} from "lucide-react";
export type ActiveTab =
  "overview" | "expenses" | "balances" | "members" | "activity";
interface NavbarProps {
  currentTrip?: {
    id: string;
    name: string;
    baseCurrency: string;
    role: string;
  } | null;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onBackToTrips: () => void;
  onAddExpenseClick: () => void;
}
const tabs = [
  { key: "overview", icon: Compass },
  { key: "expenses", icon: CreditCard },
  { key: "balances", icon: Scale },
  { key: "members", icon: Users },
  { key: "activity", icon: History },
] as const;
export const Navbar: React.FC<NavbarProps> = ({
  currentTrip,
  activeTab,
  onTabChange,
  onBackToTrips,
  onAddExpenseClick,
}) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  return (
    <>
      <a className="skip-link" href="#main">
        {t("overview")}
      </a>
      <header className="app-header">
        <button className="brand brand-button" onClick={onBackToTrips}>
          <span className="brand-icon">
            <Compass size={23} />
          </span>
          TripSplit<span className="brand-dot">.</span>
        </button>
        <div className="header-actions">
          <LanguageSelect />
          {user && (
            <>
              <span className="header-avatar">
                <Avatar name={user.name} size="sm" />
              </span>
              <button
                id="btn-logout"
                className="btn btn-ghost"
                aria-label={t("logout")}
                title={t("logout")}
                onClick={logout}
              >
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </header>
      {currentTrip && (
        <>
          <div className="trip-toolbar content-inner">
            <div className="trip-breadcrumb">
              <button className="btn btn-ghost" onClick={onBackToTrips}>
                <ChevronLeft size={16} />
                {t("trips")}
              </button>
              <h1>{currentTrip.name}</h1>
              <span className="badge badge-indigo">
                {currentTrip.baseCurrency}
              </span>
            </div>
            <button
              id="btn-header-add-expense"
              className="btn btn-primary"
              onClick={onAddExpenseClick}
            >
              <Plus size={17} />
              {t("addExpense")}
            </button>
          </div>
          <nav className="desktop-tabs" aria-label={t("trips")}>
            <div className="tab-nav">
              {tabs.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  id={`nav-tab-${key}`}
                  className={`tab-btn ${activeTab === key ? "active" : ""}`}
                  aria-current={activeTab === key ? "page" : undefined}
                  onClick={() => onTabChange(key)}
                >
                  <Icon size={17} />
                  {t(key)}
                </button>
              ))}
            </div>
          </nav>
          <nav className="bottom-nav" aria-label={t("trips")}>
            {tabs.map(({ key, icon: Icon }) => (
              <button
                key={key}
                className={`bottom-nav-item ${activeTab === key ? "active" : ""}`}
                aria-current={activeTab === key ? "page" : undefined}
                onClick={() => onTabChange(key)}
              >
                <Icon size={20} />
                <span>{t(key)}</span>
              </button>
            ))}
          </nav>
        </>
      )}
    </>
  );
};
