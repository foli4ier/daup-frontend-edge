import React, { useEffect, useState } from 'react';
import { useUserProfile } from '../context/UserProfileContext';
import {
  ADD_YOUR_ADDRESS,
  ADD_YOUR_BIRTHDATE,
  ADD_YOUR_NAME,
  ADD_YOUR_WHATSAPP,
  CANCEL_LABEL,
  EDIT_LABEL,
  HOUSE_OTP_BAD_PHONE,
  INVALID_EMAIL_MESSAGE,
  LOG_OFF_LABEL,
  SAVE_LABEL,
  USE_THIS_EMAIL,
  USE_THIS_WHATSAPP,
  YOU_ADDRESS_LINE,
  YOU_BIRTHDATE_LINE,
  YOU_EMAIL_LINE,
  YOU_LANGUAGE_LINE,
  YOU_WHATSAPP_LINE
} from '../hub/copy';
import { isRegisteredOwnerEmail } from '../hub/ownerSession';
import { toWhatsappE164 } from '../hub/whatsappE164';
import { formatBirthdate } from '../hub/zaFormat';
import { youLanguageChoices, youLanguageLabel } from '../hub/youLanguages';

export const HubYouView: React.FC<{
  onToggleAdvanced?: () => void;
  isAdvanced?: boolean;
}> = ({ onToggleAdvanced, isAdvanced }) => {
  const {
    ownerSession,
    logOffHub,
    profile,
    updateDemographics,
    updateLocation,
    updateSignedInEmail
  } = useUserProfile();
  const email = ownerSession?.email || profile.demographics.email || '';
  const name = (profile.demographics.name || '').trim();
  const whatsapp = toWhatsappE164(profile.demographics.whatsappNumber);
  const language = profile.demographics.language || 'en';
  const birthdate = (profile.demographics.birthdate || '').trim();
  const birthLine = formatBirthdate(birthdate);
  const address = (profile.location?.address || '').trim();

  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [nameDraft, setNameDraft] = useState(name);
  const [emailDraft, setEmailDraft] = useState(email);
  const [whatsappDraft, setWhatsappDraft] = useState(whatsapp);
  const [languageDraft, setLanguageDraft] = useState(language);
  const [birthDraft, setBirthDraft] = useState(birthdate);
  const [addressDraft, setAddressDraft] = useState(address);

  useEffect(() => {
    if (editing) return;
    setNameDraft(name);
    setEmailDraft(email);
    setWhatsappDraft(whatsapp);
    setLanguageDraft(language);
    setBirthDraft(birthdate);
    setAddressDraft(address);
  }, [editing, name, email, whatsapp, language, birthdate, address]);

  const nextEmail = emailDraft.trim().toLowerCase();
  const typedWhatsapp = whatsappDraft.trim();
  const nextWhatsapp = typedWhatsapp ? toWhatsappE164(typedWhatsapp) : '';
  const emailChanged = nextEmail !== email;
  const whatsappChanged = nextWhatsapp !== whatsapp;

  const beginEdit = () => {
    setNameDraft(name);
    setEmailDraft(email);
    setWhatsappDraft(whatsapp);
    setLanguageDraft(language);
    setBirthDraft(birthdate);
    setAddressDraft(address);
    setError('');
    setConfirming(false);
    setEditing(true);
  };

  const cancel = () => {
    setError('');
    setConfirming(false);
    setEditing(false);
  };

  const touch = () => {
    if (confirming) setConfirming(false);
    if (error) setError('');
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isRegisteredOwnerEmail(nextEmail)) {
      setError(INVALID_EMAIL_MESSAGE);
      setConfirming(false);
      return;
    }
    if (typedWhatsapp && !nextWhatsapp) {
      setError(HOUSE_OTP_BAD_PHONE);
      setConfirming(false);
      return;
    }
    setError('');
    if ((emailChanged || whatsappChanged) && !confirming) {
      setConfirming(true);
      return;
    }
    updateDemographics({
      name: nameDraft.trim(),
      language: languageDraft || 'en',
      birthdate: birthDraft.trim(),
      ...(whatsappChanged ? { whatsappNumber: nextWhatsapp } : {})
    });
    updateLocation({ address: addressDraft.trim() });
    if (emailChanged) updateSignedInEmail(nextEmail);
    setConfirming(false);
    setEditing(false);
  };

  return (
    <section className="hub-you" data-testid="hub-you">
      <form className="hub-you-card" data-testid="hub-you-form" onSubmit={save}>
        <div className="hub-you-title place-card-name">
          {editing ? (
            <input
              className="place-rename-field"
              data-testid="hub-you-name-input"
              aria-label={ADD_YOUR_NAME}
              value={nameDraft}
              placeholder={ADD_YOUR_NAME}
              onChange={event => {
                setNameDraft(event.target.value);
                touch();
              }}
            />
          ) : (
            <h1
              className={name ? 'hub-you-name' : 'hub-you-name is-prompt'}
              data-testid="hub-you-name"
              data-prompt={name ? undefined : 'true'}
            >
              {name || ADD_YOUR_NAME}
            </h1>
          )}
          {editing ? null : (
            <button
              type="button"
              className="place-text-action"
              data-testid="hub-you-edit"
              onClick={beginEdit}
            >
              {EDIT_LABEL}
            </button>
          )}
        </div>

        <div className="hub-you-lines">
          <div className="hub-you-line" data-testid="hub-you-email-line">
            <span className="hub-you-key">{YOU_EMAIL_LINE}</span>
            {editing ? (
              <input
                data-testid="hub-you-email-input"
                type="email"
                autoComplete="email"
                value={emailDraft}
                onChange={event => {
                  setEmailDraft(event.target.value);
                  touch();
                }}
              />
            ) : (
              <span className="hub-you-value" data-testid="hub-you-email">{email}</span>
            )}
          </div>

          <div className="hub-you-line" data-testid="hub-you-whatsapp-line">
            <span className="hub-you-key">{YOU_WHATSAPP_LINE}</span>
            {editing ? (
              <input
                data-testid="hub-you-whatsapp-input"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={whatsappDraft}
                placeholder={ADD_YOUR_WHATSAPP}
                onChange={event => {
                  setWhatsappDraft(event.target.value);
                  touch();
                }}
              />
            ) : (
              <span
                className={whatsapp ? 'hub-you-value' : 'hub-you-value is-prompt'}
                data-testid="hub-you-whatsapp"
                data-prompt={whatsapp ? undefined : 'true'}
              >
                {whatsapp || ADD_YOUR_WHATSAPP}
              </span>
            )}
          </div>

          <div className="hub-you-line" data-testid="hub-you-language-line">
            <span className="hub-you-key">{YOU_LANGUAGE_LINE}</span>
            {editing ? (
              <select
                data-testid="hub-you-language-input"
                aria-label={YOU_LANGUAGE_LINE}
                value={youLanguageChoices(languageDraft).some(row => row.code === languageDraft) ? languageDraft : 'en'}
                onChange={event => {
                  setLanguageDraft(event.target.value);
                  touch();
                }}
              >
                {youLanguageChoices(languageDraft).map(row => (
                  <option key={row.code} value={row.code}>{row.label}</option>
                ))}
              </select>
            ) : (
              <span className="hub-you-value" data-testid="hub-you-language">{youLanguageLabel(language)}</span>
            )}
          </div>

          <div className="hub-you-line" data-testid="hub-you-birthdate-line">
            <span className="hub-you-key">{YOU_BIRTHDATE_LINE}</span>
            {editing ? (
              <input
                data-testid="hub-you-birthdate-input"
                type="date"
                value={birthDraft}
                aria-label={YOU_BIRTHDATE_LINE}
                onChange={event => {
                  setBirthDraft(event.target.value);
                  touch();
                }}
              />
            ) : (
              <span
                className={birthLine ? 'hub-you-value' : 'hub-you-value is-prompt'}
                data-testid="hub-you-birthdate"
                data-prompt={birthLine ? undefined : 'true'}
              >
                {birthLine || ADD_YOUR_BIRTHDATE}
              </span>
            )}
          </div>

          <div className="hub-you-line" data-testid="hub-you-address-line">
            <span className="hub-you-key">{YOU_ADDRESS_LINE}</span>
            {editing ? (
              <input
                data-testid="hub-you-address-input"
                type="text"
                autoComplete="street-address"
                value={addressDraft}
                placeholder={ADD_YOUR_ADDRESS}
                onChange={event => {
                  setAddressDraft(event.target.value);
                  touch();
                }}
              />
            ) : (
              <span
                className={address ? 'hub-you-value' : 'hub-you-value is-prompt'}
                data-testid="hub-you-address"
                data-prompt={address ? undefined : 'true'}
              >
                {address || ADD_YOUR_ADDRESS}
              </span>
            )}
          </div>
        </div>

        {error ? (
          <p className="wizard-error" role="alert" data-testid="hub-you-error">{error}</p>
        ) : null}

        {confirming ? (
          <div data-testid="hub-you-confirm">
            {emailChanged ? <p data-testid="hub-you-confirm-email">{USE_THIS_EMAIL}</p> : null}
            {whatsappChanged ? <p data-testid="hub-you-confirm-whatsapp">{USE_THIS_WHATSAPP}</p> : null}
          </div>
        ) : null}

        {editing ? (
          <div className="hub-you-actions">
            <button type="submit" className="btn btn-primary" data-testid="hub-you-save">
              {SAVE_LABEL}
            </button>
            <button type="button" className="btn btn-outline" data-testid="hub-you-cancel" onClick={cancel}>
              {CANCEL_LABEL}
            </button>
          </div>
        ) : null}
      </form>

      <button
        type="button"
        className="owner-quiet hub-you-log-off"
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
    </section>
  );
};

export default HubYouView;
