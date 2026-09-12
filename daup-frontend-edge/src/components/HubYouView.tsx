import React, { useState } from 'react';
import { useUserProfile } from '../context/UserProfileContext';
import {
  ASK_FOR_ENHANCEMENT_LABEL,
  DELETE_THE_HOUSE_LABEL,
  LOG_OFF_LABEL,
  MONEY_IN_R_LABEL,
  REGISTER_A_NEW_HOUSE_LABEL,
  SETTINGS_KICKER,
  YOU_KICKER
} from '../hub/copy';
import { ASKS_PATH } from '../hub/asksPath';
import { formatTrialEndsOn } from '../hub/zaFormat';
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
    currency
  } = useUserProfile();
  const houseName = (activeWallet?.legalName || '').trim();
  const email = ownerSession?.email || '';
  const [deleteOpen, setDeleteOpen] = useState(false);
  const trialEnds = trialState.isTrialActive && trialState.trialExpiresAt
    ? formatTrialEndsOn(trialState.trialExpiresAt)
    : '';

  return (
    <section className="hub-you" data-testid="hub-you">
      <div className="section-head">
        <span className="kicker">{YOU_KICKER}</span>
        <span className="rule" />
      </div>

      <article className="card hub-you-card">
        {email ? <p className="hub-you-email" data-testid="hub-you-email">{email}</p> : null}
        {houseName ? <p className="hub-you-house">{houseName}</p> : null}
        {trialEnds ? (
          <p className="caption" data-testid="hub-you-date">{trialEnds}</p>
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
