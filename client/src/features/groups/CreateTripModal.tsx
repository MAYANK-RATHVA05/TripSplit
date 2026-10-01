import React, { useState } from "react";
import { Modal } from "../../components/Modal.js";
import { CURRENCIES } from "../../lib/currencies.js";
import { api } from "../../lib/api.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { useAuth } from "../../context/AuthContext.js";

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (trip: any) => void;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onTripCreated,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseCurrency, setBaseCurrency] = useState(
    user?.preferredCurrency || "USD",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setError(t("dateError"));
      return;
    }
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const data = await api.groups.create({
        name: name.trim(),
        description: description.trim(),
        baseCurrency,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      onTripCreated(data.group);
      onClose();
      // Reset form
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
    } catch (err: any) {
      setError(err.message || t("createError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("newTrip")}
      footer={
        <>
          <button
            id="btn-cancel-trip"
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {t("cancel")}
          </button>
          <button
            id="btn-submit-trip"
            type="submit"
            form="create-trip-form"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? t("loading") : t("newTrip")}
          </button>
        </>
      }
    >
      <form id="create-trip-form" onSubmit={handleSubmit}>
        {error && (
          <div
            style={{
              backgroundColor: "var(--color-rose-light)",
              color: "var(--color-rose-text)",
              border: "1px solid var(--color-rose-border)",
              borderRadius: "var(--radius-md)",
              padding: "0.6rem 0.85rem",
              fontSize: "0.84rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="trip-name-input">
            {t("tripName")} *
          </label>
          <input
            id="trip-name-input"
            type="text"
            className="form-input"
            placeholder={t("tripExample")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="trip-desc-input">
            {t("description")}
          </label>
          <input
            id="trip-desc-input"
            type="text"
            className="form-input"

            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="trip-currency-select">
            {t("tripCurrency")} *
          </label>
          <select
            id="trip-currency-select"
            className="form-select"
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
          >
            {Object.values(CURRENCIES).map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name} ({c.symbol})
              </option>
            ))}
          </select>
          <span className="form-hint" style={{ marginTop: "0.25rem" }}>
            {t("currencyHint")}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
          }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="trip-start">
              {t("startDate")}
            </label>
            <input
              type="date"
              className="form-input"
              id="trip-start"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="trip-end">
              {t("endDate")}
            </label>
            <input
              type="date"
              className="form-input"
              id="trip-end"
              min={startDate || undefined}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
