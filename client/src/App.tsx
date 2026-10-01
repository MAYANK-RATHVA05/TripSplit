import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./context/AuthContext.js";
import { Navbar, ActiveTab } from "./components/Navbar.js";
import { WelcomePage } from "./features/groups/WelcomePage.js";
import { useLanguage } from "./context/LanguageContext.js";
import { TripList } from "./features/groups/TripList.js";
import { CreateTripModal } from "./features/groups/CreateTripModal.js";
import { TripOverviewTab } from "./features/overview/TripOverviewTab.js";
import { ExpenseList } from "./features/expenses/ExpenseList.js";
import { AddExpenseModal } from "./features/expenses/AddExpenseModal.js";
import { BalancesTab } from "./features/balances/BalancesTab.js";
import { MembersTab } from "./features/members/MembersTab.js";
import { ActivityTab } from "./features/activity/ActivityTab.js";
import { api } from "./lib/api.js";

export function App() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [tripsError, setTripsError] = useState(false);
  const [tripError, setTripError] = useState(false);
  const tripRequest = useRef(0);
  const listRequest = useRef(0);

  // Trips state
  const [trips, setTrips] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  // Active Trip Data
  const [currentTrip, setCurrentTrip] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [balancesData, setBalancesData] = useState<any | null>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [loadingTripData, setLoadingTripData] = useState(false);

  // Modals & Navigation filters
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [expenseCategoryFilter, setExpenseCategoryFilter] =
    useState<string>("ALL");

  // Load Trips
  const loadTrips = async () => {
    if (!user) return;
    const request = ++listRequest.current;
    setTripsError(false);
    setLoadingTrips(true);
    try {
      const data = await api.groups.list();
      if (request === listRequest.current) setTrips(data.groups);
    } catch (err) {
      console.error("Failed to load trips:", err);
      if (request === listRequest.current) setTripsError(true);
    } finally {
      if (request === listRequest.current) setLoadingTrips(false);
    }
  };

  useEffect(() => {
    setTrips([]);
    setActiveTripId(null);
    setCurrentTrip(null);
    setCreateTripOpen(false);
    setAddExpenseOpen(false);
    if (user) {
      loadTrips();
    }
    return () => {
      listRequest.current++;
      tripRequest.current++;
    };
  }, [user]);

  // Handle invitation claim route if URL is /join/:token
  useEffect(() => {
    const path = window.location.pathname;
    if (user && path.startsWith("/join/")) {
      const token = path.replace("/join/", "").trim();
      if (token) {
        api.members
          .claimInvite(token)
          .then((res) => {
            window.history.pushState({}, "", "/");
            loadTrips();
            setActiveTripId(res.groupId);
          })
          .catch((err) => {
            console.error("Invite claim error:", err);
            alert(err.message || "Failed to claim invitation.");
            window.history.pushState({}, "", "/");
          });
      }
    }
  }, [user]);

  // Load Active Trip Complete Data
  const loadTripData = async (groupId: string) => {
    const request = ++tripRequest.current;
    setTripError(false);
    setLoadingTripData(true);
    try {
      const [groupRes, expRes, balRes, setRes, analRes, actRes] =
        await Promise.all([
          api.groups.get(groupId),
          api.expenses.list(groupId),
          api.balances.get(groupId),
          api.settlements.list(groupId),
          api.analytics.get(groupId),
          api.activity.list(groupId),
        ]);

      if (request !== tripRequest.current) return;
      setCurrentTrip(groupRes.group);
      setExpenses(expRes.expenses);
      setBalancesData(balRes);
      setSettlements(setRes.settlements);
      setAnalyticsData(analRes);
      setActivityData(actRes.activity);
    } catch (err) {
      console.error("Failed to load trip details:", err);
      if (request === tripRequest.current) setTripError(true);
    } finally {
      if (request === tripRequest.current) setLoadingTripData(false);
    }
  };

  useEffect(() => {
    setExpenseCategoryFilter("ALL");
    setCurrentTrip(null);
    if (activeTripId) {
      loadTripData(activeTripId);
    } else {
      setCurrentTrip(null);
    }
    return () => {
      tripRequest.current++;
    };
  }, [activeTripId]);

  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p className="text-muted font-medium" role="status">
          {t("loading")}
        </p>
      </div>
    );
  }

  // Let visitors explore the product before opening authentication.
  if (!user) {
    return <WelcomePage />;
  }

  // Current user's balance metrics for the active trip
  const currentMemberId = currentTrip?.currentMember?.memberId;
  const myBalance = balancesData?.memberBalances?.find(
    (m: any) => m.memberId === currentMemberId,
  );

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Navbar
        currentTrip={
          currentTrip
            ? {
                id: currentTrip.id,
                name: currentTrip.name,
                baseCurrency: currentTrip.baseCurrency,
                role: currentTrip.currentMember?.role || "member",
              }
            : null
        }
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBackToTrips={() => {
          setActiveTripId(null);
          loadTrips();
        }}
        onAddExpenseClick={() => setAddExpenseOpen(true)}
      />

      <main id="main" className="main-content">
        {!activeTripId ? (
          /* Trips Dashboard */
          <TripList
            trips={trips}
            onSelectTrip={(id) => {
              setActiveTripId(id);
              setActiveTab("overview");
            }}
            onCreateTripClick={() => setCreateTripOpen(true)}
            loading={loadingTrips}
            error={tripsError}
            onRetry={loadTrips}
          />
        ) : loadingTripData ? (
          /* Trip Loading State */
          <div
            className="content-inner"
            style={{ textAlign: "center", padding: "4rem 1rem" }}
          >
            <p className="text-muted font-medium" role="status">
              {t("loading")}
            </p>
          </div>
        ) : tripError ? (
          <div className="content-inner">
            <div className="card" role="alert">
              <p>{t("detailError")}</p>
              <button
                className="btn btn-primary"
                onClick={() => loadTripData(activeTripId)}
              >
                {t("retry")}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setActiveTripId(null)}
              >
                {t("trips")}
              </button>
            </div>
          </div>
        ) : currentTrip ? (
          /* Active Trip Tabs */
          <div className="content-inner">
            {activeTab === "overview" && expenses.length === 0 && (
              <section className="setup-guide card">
                <div>
                  <p className="eyebrow">{t("setup")}</p>
                  <p className="text-muted">{t("setupBody")}</p>
                </div>
                <div className="hero-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setActiveTab("members")}
                  >
                    {t("addFriends")}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setAddExpenseOpen(true)}
                  >
                    {t("addExpense")}
                  </button>
                </div>
              </section>
            )}
            {activeTab === "overview" && (
              <TripOverviewTab
                groupId={currentTrip.id}
                tripName={currentTrip.name}
                baseCurrency={currentTrip.baseCurrency}
                totalSpendDecimal={balancesData?.totalSpendDecimal || "0.00"}
                myPaidDecimal={myBalance?.totalPaidDecimal || "0.00"}
                myShareDecimal={myBalance?.totalShareDecimal || "0.00"}
                myNetBalanceDecimal={myBalance?.netBalanceDecimal || "0.00"}
                myStatus={myBalance?.status || "settled"}
                friendSpending={analyticsData?.spendingByFriend || []}
                categorySpending={analyticsData?.spendingByCategory || []}
                recentExpenses={expenses}
                onAddExpenseClick={() => setAddExpenseOpen(true)}
                onViewExpensesTab={() => setActiveTab("expenses")}
                onCategorySelected={(cat) => setExpenseCategoryFilter(cat)}
              />
            )}

            {activeTab === "expenses" && (
              <ExpenseList
                groupId={currentTrip.id}
                baseCurrency={currentTrip.baseCurrency}
                expenses={expenses}
                members={currentTrip.members}
                currentMemberId={currentMemberId}
                onRefresh={() => loadTripData(currentTrip.id)}
                onAddExpenseClick={() => setAddExpenseOpen(true)}
                initialCategoryFilter={expenseCategoryFilter}
              />
            )}

            {activeTab === "balances" && (
              <BalancesTab
                groupId={currentTrip.id}
                baseCurrency={currentTrip.baseCurrency}
                memberBalances={balancesData?.memberBalances || []}
                suggestions={balancesData?.suggestions || []}
                settlements={settlements}
                members={currentTrip.members}
                currentMemberId={currentMemberId}
                onRefresh={() => loadTripData(currentTrip.id)}
              />
            )}

            {activeTab === "members" && (
              <MembersTab
                groupId={currentTrip.id}
                members={currentTrip.members}
                currentMemberId={currentMemberId}
                onRefresh={() => loadTripData(currentTrip.id)}
              />
            )}

            {activeTab === "activity" && (
              <ActivityTab activities={activityData} />
            )}
          </div>
        ) : null}
      </main>

      {/* Create Trip Modal */}
      {createTripOpen && (
        <CreateTripModal
          isOpen={createTripOpen}
          onClose={() => setCreateTripOpen(false)}
          onTripCreated={(newTrip) => {
            loadTrips();
            setActiveTripId(newTrip.id);
          }}
        />
      )}

      {/* Add Expense Modal */}
      {addExpenseOpen && currentTrip && (
        <AddExpenseModal
          isOpen={addExpenseOpen}
          onClose={() => setAddExpenseOpen(false)}
          groupId={currentTrip.id}
          baseCurrency={currentTrip.baseCurrency}
          members={currentTrip.members}
          currentMemberId={currentMemberId}
          onExpenseAdded={() => {
            loadTripData(currentTrip.id);
          }}
        />
      )}
    </div>
  );
}
