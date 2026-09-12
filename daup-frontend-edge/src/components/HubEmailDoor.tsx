import React, { useState } from 'react';
import {
  DAUP_HOME_HREF,
  HUB_DOOR_BODY,
  HUB_DOOR_TITLE,
  INVALID_EMAIL_MESSAGE,
  OPEN_YOUR_HUB_LABEL,
  STAFF_INVITE_HREF,
  STAFF_INVITE_LABEL,
  YOUR_EMAIL_LABEL
} from '../hub/copy';
import { signInWithEmail, type OwnerSession } from '../hub/ownerSession';

interface HubEmailDoorProps {
  onOpenHub: (session: OwnerSession) => void | Promise<void>;
}

export const HubEmailDoor: React.FC<HubEmailDoorProps> = ({ onOpenHub }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = signInWithEmail(email);
    if (!result.ok) {
      setError(result.reason || INVALID_EMAIL_MESSAGE);
      return;
    }
    setError('');
    setOpening(true);
    try {
      await onOpenHub(result.session);
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="hub-door" data-testid="hub-email-door">
      <header className="hub-door-nav">
        <a className="logo" href={DAUP_HOME_HREF}>DAUP</a>
      </header>

      <main className="hub-door-main">
        <div className="hub-door-island" data-testid="hub-door-island">
          <h1 className="hub-door-title">{HUB_DOOR_TITLE}</h1>
          <p className="hub-door-body">{HUB_DOOR_BODY}</p>

          <form className="hub-door-card" onSubmit={submit} data-testid="hub-email-form">
            <div className="owner-field">
              <label htmlFor="hub-email">{YOUR_EMAIL_LABEL}</label>
              <input
                id="hub-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                autoFocus
                disabled={opening}
              />
            </div>
            {error && (
              <p className="wizard-error" role="alert" data-testid="hub-email-error">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-wide" data-testid="open-your-hub" disabled={opening}>
              {OPEN_YOUR_HUB_LABEL}
            </button>
            <a
              className="btn btn-outline btn-wide"
              href={STAFF_INVITE_HREF}
              data-testid="hub-staff-invite"
            >
              {STAFF_INVITE_LABEL}
            </a>
          </form>
        </div>
      </main>
    </div>
  );
};

export default HubEmailDoor;
