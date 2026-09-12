import React, { useState } from 'react';
import { useUserProfile } from '../context/UserProfileContext';
import {
  ASK_FOR_ENHANCEMENT_LABEL,
  DELETE_THE_HOUSE_LABEL,
  LOG_OFF_LABEL,
  MONEY_IN_R_LABEL,
  REGISTER_A_NEW_HOUSE_LABEL,
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
    setIsProfileModalOpen,
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

      <div className="hub-you-actions">
        <button
          type="button"
          className="btn btn-outline btn-wide"
          data-testid="hub-you-profile"
          onClick={() => setIsProfileModalOpen(true)}
        >
          Profile
        </button>
        <button
          type="button"
          className="btn btn-primary btn-wide"
          data-testid="hub-log-off"
          onClick={logOffHub}
        >
          {LOG_OFF_LABEL}
        </button>
        <button
          type="button"
          className="btn btn-outline btn-wide"
          data-testid="register-new-house"
          onClick={beginNamingPlace}
        >
          {REGISTER_A_NEW_HOUSE_LABEL}
        </button>
        {hasHouse ? (
          <button
            type="button"
            className="owner-quiet"
            data-testid="delete-the-house"
            onClick={() => setDeleteOpen(true)}
          >
            {DELETE_THE_HOUSE_LABEL}
          </button>
        ) : null}
        <a
          className="owner-quiet"
          href={ASKS_PATH}
          data-testid="ask-for-enhancement"
          onClick={(event) => {
            event.preventDefault();
            onOpenAsk?.();
          }}
        >
          {ASK_FOR_ENHANCEMENT_LABEL}
        </a>
        <button
          type="button"
          className="owner-quiet"
          aria-pressed={isAdvanced}
          data-testid="hub-advanced"
          onClick={onToggleAdvanced}
          title="Advanced tools — off by default"
        >
          Advanced
        </button>
      </div>

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
