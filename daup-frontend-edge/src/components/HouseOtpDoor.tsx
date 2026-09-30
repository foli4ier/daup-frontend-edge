import React, { useState } from 'react';
import {
  CHAIN_BACK_LABEL,
  CODE_LABEL,
  HOUSE_OTP_BODY,
  HOUSE_OTP_CODE_HINT,
  HOUSE_OTP_MOCK_BODY,
  HOUSE_OTP_MOCK_FILL,
  HOUSE_OTP_MOCK_TITLE,
  HOUSE_OTP_MOCK_TYPE,
  HOUSE_OTP_TITLE,
  OPEN_LABEL,
  SEND_CODE_LABEL,
  YOUR_WHATSAPP_LABEL
} from '../hub/copy';

export interface HouseOtpDoorProps {
  appTitle: string;
  placeName: string;
  step: 'phone' | 'code';
  phone: string;
  error: string;
  busy: boolean;
  mockCode?: string;
  onSendCode: (phone: string) => void;
  onSubmitCode: (code: string) => void;
  onCancel: () => void;
}

export const HouseOtpDoor: React.FC<HouseOtpDoorProps> = ({
  appTitle,
  placeName,
  step,
  phone,
  error,
  busy,
  mockCode = '',
  onSendCode,
  onSubmitCode,
  onCancel
}) => {
  const [draftPhone, setDraftPhone] = useState(phone);
  const [code, setCode] = useState('');
  const [showMock, setShowMock] = useState(Boolean(mockCode));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (step === 'phone') onSendCode(draftPhone);
    else onSubmitCode(code);
  };

  const fillMockCode = () => {
    if (!mockCode) return;
    setCode(mockCode);
    setShowMock(false);
  };

  return (
    <section className="card house-otp-door" data-testid="house-otp-door">
      {step === 'code' && mockCode && showMock ? (
        <div className="owner-modal-overlay" data-testid="house-otp-mock">
          <div
            className="owner-modal owner-modal-narrow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="house-otp-mock-title"
          >
            <div className="owner-modal-header">
              <h2 id="house-otp-mock-title">{HOUSE_OTP_MOCK_TITLE}</h2>
            </div>
            <div className="owner-modal-body">
              <p data-testid="house-otp-mock-body">{HOUSE_OTP_MOCK_BODY}</p>
              <p className="house-otp-mock-code" data-testid="house-otp-mock-code">{mockCode}</p>
              <div className="owner-modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  data-testid="house-otp-mock-type"
                  onClick={() => setShowMock(false)}
                >
                  {HOUSE_OTP_MOCK_TYPE}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  data-testid="house-otp-mock-fill"
                  onClick={fillMockCode}
                >
                  {HOUSE_OTP_MOCK_FILL}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <h2 className="hub-door-title">{HOUSE_OTP_TITLE}</h2>
      <p className="hub-door-body" data-testid="house-otp-body">{HOUSE_OTP_BODY}</p>
      <p className="caption" data-testid="house-otp-target">{appTitle}. {placeName}.</p>
      <form className="hub-door-card" onSubmit={submit} data-testid="house-otp-form">
        {step === 'phone' ? (
          <div className="owner-field">
            <label htmlFor="house-whatsapp">{YOUR_WHATSAPP_LABEL}</label>
            <input
              id="house-whatsapp"
              data-testid="house-whatsapp"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={draftPhone}
              onChange={event => setDraftPhone(event.target.value)}
              disabled={busy}
            />
          </div>
        ) : (
          <div className="owner-field">
            <label htmlFor="house-code">{CODE_LABEL}</label>
            <input
              id="house-code"
              data-testid="house-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={event => setCode(event.target.value)}
              disabled={busy}
            />
            <p className="caption" data-testid="house-otp-code-hint">{HOUSE_OTP_CODE_HINT}</p>
          </div>
        )}
        {error ? (
          <p className="wizard-error" role="alert" data-testid="house-otp-error">{error}</p>
        ) : null}
        <button type="submit" className="btn btn-primary btn-wide" data-testid="house-otp-submit" disabled={busy}>
          {step === 'phone' ? SEND_CODE_LABEL : OPEN_LABEL}
        </button>
        {step === 'code' ? (
          <button
            type="button"
            className="btn btn-outline btn-wide"
            data-testid="house-otp-resend"
            disabled={busy}
            onClick={() => onSendCode(phone)}
          >
            {SEND_CODE_LABEL}
          </button>
        ) : null}
        <button
          type="button"
          className="owner-quiet"
          data-testid="house-otp-cancel"
          onClick={onCancel}
          disabled={busy}
        >
          {CHAIN_BACK_LABEL}
        </button>
      </form>
    </section>
  );
};

export default HouseOtpDoor;
