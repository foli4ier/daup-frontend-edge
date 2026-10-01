import React, { useEffect, useState } from 'react';
import { useUserProfile } from '../context/UserProfileContext';
import {
  ASK_FOR_ENHANCEMENT_LABEL,
  CHAIN_BACK_LABEL,
  CHANGE_WHATSAPP_LABEL,
  DELETE_THE_HOUSE_LABEL,
  HOUSE_OTP_BAD_PHONE,
  LOG_OFF_LABEL,
  MONEY_IN_R_LABEL,
  PLACE_PAUSED,
  PLACE_PAYMENT_DUE,
  REGISTER_A_NEW_HOUSE_LABEL,
  SAVE_WHATSAPP_LABEL,
  SETTINGS_KICKER,
  WHATSAPP_ONE_CODE_HINT,
  YOU_KICKER,
  YOUR_WHATSAPP_LABEL
} from '../hub/copy';
import { toWhatsappE164 } from '../hub/whatsappE164';
import { ASKS_PATH } from '../hub/asksPath';
import { formatTrialEndsOn } from '../hub/zaFormat';
import { resolveNodeSubscriptionStatus } from '../hub/entitlements';
import { DeleteHouseModal } from './DeleteHouseModal';

export const HubYouView: React.FC<{
  onOpenAsk?: () => void;
  onToggleAdvanced?: () => void;
  onHouseCleared?: () => void;
  isAdvanced?: boolean;
}> = ({ onOpenAsk, onToggleAdvanced, onHouseCleared, isAdvanced }) => {
  const {
    activeWallet,
    hasHouse,
    ownerSession,
    beginNamingPlace,
    clearHouse,
    logOffHub,
    trialState,
    currency,
    nodeEntitlement,
    profile,
    updateDemographics
  } = useUserProfile();
  const houseName = (activeWallet?.legalName || '').trim();
  const email = ownerSession?.email || '';
  const whatsapp = toWhatsappE164(profile.demographics.whatsappNumber);
  const suggested = whatsapp || toWhatsappE164(profile.demographics.contactNumber);
  const [editingWhatsapp, setEditingWhatsapp] = useState(false);
  const [whatsappDraft, setWhatsappDraft] = useState(suggested);
  const [whatsappError, setWhatsappError] = useState('');
  const showWhatsappEditor = editingWhatsapp || !whatsapp;

  useEffect(() => {
    if (!editingWhatsapp) setWhatsappDraft(suggested);
  }, [editingWhatsapp, suggested]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const nodeStatus = nodeEntitlement
    ? resolveNodeSubscriptionStatus(nodeEntitlement)
    : null;
  const trialEnds = (nodeStatus === 'trial' && nodeEntitlement?.trial_ends_at)
    ? formatTrialEndsOn(nodeEntitlement.trial_ends_at)
    : (!nodeEntitlement && trialState.isTrialActive && trialState.trialExpiresAt
      ? formatTrialEndsOn(trialState.trialExpiresAt)
      : '');
  const placeStatus = nodeStatus === 'past_due'
    ? PLACE_PAYMENT_DUE
    : nodeStatus === 'suspended'
      ? PLACE_PAUSED
      : '';

  const saveWhatsapp = (event: React.FormEvent) => {
    event.preventDefault();
    const next = toWhatsappE164(whatsappDraft);
    if (!next) {
      setWhatsappError(HOUSE_OTP_BAD_PHONE);
      return;
    }
    setWhatsappError('');
    updateDemographics({ whatsappNumber: next });
    setEditingWhatsapp(false);
  };

  return (
    <section className="hub-you" data-testid="hub-you">
      <div className="section-head">
        <span className="kicker">{YOU_KICKER}</span>
        <span className="rule" />
      </div>

      <article className="card hub-you-card">
        <div className="hub-you-identity" data-testid="hub-you-identity">
          {email ? <p className="hub-you-email" data-testid="hub-you-email">{email}</p> : null}
          {whatsapp && !editingWhatsapp ? (
            <p className="hub-you-whatsapp">
              <span data-testid="hub-you-whatsapp">{whatsapp}</span>
              <button
                type="button"
                className="owner-quiet hub-you-whatsapp-change"
                data-testid="hub-you-whatsapp-change"
                onClick={() => {
                  setWhatsappDraft(whatsapp);
                  setWhatsappError('');
                  setEditingWhatsapp(true);
                }}
              >
                {CHANGE_WHATSAPP_LABEL}
              </button>
            </p>
          ) : null}
        </div>
        <p className="caption" data-testid="hub-you-whatsapp-hint">{WHATSAPP_ONE_CODE_HINT}</p>
        {showWhatsappEditor ? (
          <form className="hub-you-whatsapp-form" data-testid="hub-you-whatsapp-form" onSubmit={saveWhatsapp}>
            <div className="owner-field">
              <label htmlFor="hub-you-whatsapp-input">{YOUR_WHATSAPP_LABEL}</label>
              <input
                id="hub-you-whatsapp-input"
                data-testid="hub-you-whatsapp-input"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={whatsappDraft}
                onChange={event => {
                  setWhatsappDraft(event.target.value);
                  if (whatsappError) setWhatsappError('');
                }}
              />
            </div>
            {whatsappError ? (
              <p className="wizard-error" role="alert" data-testid="hub-you-whatsapp-error">{whatsappError}</p>
            ) : null}
            <div className="hub-you-whatsapp-actions">
              <button type="submit" className="btn btn-primary" data-testid="hub-you-whatsapp-save">
                {SAVE_WHATSAPP_LABEL}
              </button>
              {whatsapp ? (
                <button
                  type="button"
                  className="owner-quiet"
                  data-testid="hub-you-whatsapp-back"
                  onClick={() => {
                    setWhatsappError('');
                    setEditingWhatsapp(false);
                  }}
                >
                  {CHAIN_BACK_LABEL}
                </button>
              ) : null}
            </div>
          </form>
        ) : null}
        {houseName ? <p className="hub-you-house">{houseName}</p> : null}
        {trialEnds ? (
          <p className="caption" data-testid="hub-you-date">{trialEnds}</p>
        ) : null}
        {placeStatus ? (
          <p className="caption" data-testid="hub-you-place-status">{placeStatus}</p>
        ) : null}
        {currency.symbol === 'R' ? (
          <p className="caption" data-testid="hub-you-money">{MONEY_IN_R_LABEL}</p>
        ) : null}
      </article>

      <section className="hub-settings" data-testid="hub-settings">
        <div className="section-head">
          <span className="kicker">{SETTINGS_KICKER}</span>
          <span className="rule" />
        </div>
        <div className="hub-settings-list">
          <button
            type="button"
            className="hub-settings-row"
            data-testid="register-new-house"
            onClick={beginNamingPlace}
          >
            {REGISTER_A_NEW_HOUSE_LABEL}
          </button>
          {hasHouse ? (
            <button
              type="button"
              className="hub-settings-row"
              data-testid="delete-the-house"
              onClick={() => setDeleteOpen(true)}
            >
              {DELETE_THE_HOUSE_LABEL}
            </button>
          ) : null}
          <a
            className="hub-settings-row"
            href={ASKS_PATH}
            data-testid="ask-for-enhancement"
            onClick={(event) => {
              event.preventDefault();
              onOpenAsk?.();
            }}
          >
            {ASK_FOR_ENHANCEMENT_LABEL}
          </a>
        </div>
      </section>

      <button
        type="button"
        className="btn btn-outline btn-wide"
        data-testid="hub-log-off"
        onClick={logOffHub}
      >
        {LOG_OFF_LABEL}
      </button>

      <button
        type="button"
        className="owner-quiet hub-you-advanced"
        aria-pressed={isAdvanced}
        data-testid="hub-advanced"
        onClick={onToggleAdvanced}
        title="Advanced tools — off by default"
      >
        Advanced
      </button>

      <DeleteHouseModal
        isOpen={deleteOpen}
        houseName={houseName}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          clearHouse();
          onHouseCleared?.();
        }}
      />
    </section>
  );
};

export default HubYouView;
