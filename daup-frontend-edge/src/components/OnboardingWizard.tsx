import React, { useState } from 'react';
import {
  ArrowRight, ArrowLeft, Check, Loader2, AlertCircle, MapPin
} from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';
import { BankWalletConfig, CryptoWalletConfig, SexType, UserLocation, UserDemographics, SocialLinks } from '../types/profile';
import { getCurrencyForCountry } from '../utils/currency';

import {
  SEE_YOUR_APPS_LABEL,
  STAY_WITH_THE_HOUSE_LABEL,
  WHERE_IS_THE_EATERY,
  WHERE_IS_THE_EATERY_SUB
} from '../hub/copy';

const EATERY = 'https://eatery.daup.co.za/';

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' }
];

const CRYPTO_CHAINS = [
  { id: '1', name: 'Ethereum Mainnet (EVM)' },
  { id: '137', name: 'Polygon PoS' },
  { id: '42161', name: 'Arbitrum One' },
  { id: 'solana', name: 'Solana Network' },
  { id: 'daup-edge', name: 'DAUP Native Edge Chain' }
];

const STEP_COPY = [
  { title: WHERE_IS_THE_EATERY, sub: WHERE_IS_THE_EATERY_SUB },
  { title: 'Who should we reach?', sub: 'A phone for the house. WhatsApp is how staff join.' },
  { title: 'Invite tonight’s floor', sub: 'You send a WhatsApp. They never join as a new business.' },
  { title: 'You’re ready', sub: 'See your apps. Then open the house from the hub.' }
];

export const OnboardingWizard: React.FC = () => {
  const {
    profile,
    ownerSession,
    completeOnboarding,
    detectLocation,
    isDetectingLocation,
    validateLegalName,
    hasHouse,
    cancelNamingPlace
  } = useUserProfile();

  const [step, setStep] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [placeName, setPlaceName] = useState<string>('');

  const [locationForm, setLocationForm] = useState<UserLocation>({
    country: '',
    provinceState: '',
    city: '',
    address: '',
    latitude: undefined,
    longitude: undefined
  });

  const [socialsForm, setSocialsForm] = useState<SocialLinks>({
    website: profile.socials.website || '',
    instagram: profile.socials.instagram || '',
    facebook: profile.socials.facebook || ''
  });

  const [demographicsForm, setDemographicsForm] = useState<UserDemographics>({
    email: ownerSession?.email || profile.demographics.email || '',
    contactNumber: profile.demographics.contactNumber || '',
    whatsappNumber: profile.demographics.whatsappNumber || '',
    language: profile.demographics.language || 'en',
    sex: profile.demographics.sex || 'prefer_not_to_say',
    birthdate: profile.demographics.birthdate || ''
  });

  const [walletType, setWalletType] = useState<'bank' | 'crypto'>('bank');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [routingCode, setRoutingCode] = useState<string>('');
  const [chainId, setChainId] = useState<string>('1');
  const [cryptoAddress, setCryptoAddress] = useState<string>('');

  const houseLabel = placeName.trim() || 'the house';

  const inviteText = `You're on tonight's floor at ${houseLabel}. Open the eatery: ${EATERY}`;
  const inviteHref = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;

  const handleAutoDetectLocation = async () => {
    setErrorMsg(null);
    try {
      const loc = await detectLocation();
      setLocationForm(loc);
    } catch (e) {
      setErrorMsg('Could not use your location. Type the address.');
    }
  };

  const validateStep1 = () => {
    if (!placeName.trim()) {
      setErrorMsg('Name the place.');
      return false;
    }
    const check = validateLegalName(placeName);
    if (!check.isUnique) {
      setErrorMsg('That name is already in use. Try the town after it — like The Olive, Stellenbosch.');
      return false;
    }
    if (!locationForm.country.trim()) {
      setErrorMsg('Which country is the eatery in?');
      return false;
    }
    if (!locationForm.city.trim()) {
      setErrorMsg('Which city or town?');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep2 = () => {
    if (!demographicsForm.contactNumber.trim()) {
      setErrorMsg('Add a phone number.');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep3 = () => {
    if (!placeName.trim()) {
      setErrorMsg('Name the place.');
      return false;
    }
    if (showAdvanced) {
      if (walletType === 'bank') {
        if (!bankName.trim() || !accountNumber.trim()) {
          setErrorMsg('Add bank name and account number, or turn Advanced off.');
          return false;
        }
      } else if (!cryptoAddress.trim()) {
        setErrorMsg('Add a payout address, or turn Advanced off.');
        return false;
      }
    }
    setErrorMsg(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setErrorMsg(null);
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setErrorMsg(null);
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleFinishOnboarding = () => {
    const newWalletId = `wallet_${Date.now()}`;
    const legalName = placeName.trim();
    const initialWallet = (showAdvanced && walletType === 'crypto') ? {
      id: newWalletId,
      type: 'crypto' as const,
      legalName,
      chainId,
      address: cryptoAddress.trim(),
      isPrimary: true,
      createdAt: Date.now()
    } as CryptoWalletConfig : {
      id: newWalletId,
      type: 'bank' as const,
      legalName,
      bankName: showAdvanced ? bankName.trim() : '',
      accountNumber: showAdvanced ? accountNumber.trim() : '',
      routingCode: showAdvanced ? routingCode.trim() : '',
      isPrimary: true,
      createdAt: Date.now()
    } as BankWalletConfig;

    completeOnboarding({
      location: locationForm,
      socials: socialsForm,
      demographics: {
        ...demographicsForm,
        email: ownerSession?.email || demographicsForm.email
      },
      wallets: [initialWallet],
      primaryWalletId: newWalletId
    });
  };

  const copy = STEP_COPY[step - 1];
  const progress = (step / 4) * 100;

  return (
    <div className="owner-wizard">
      <header className="owner-top">
        <div className="wrap owner-nav">
          <div>
            <div className="logo">DAUP</div>
            <p className="owner-house">{placeName.trim() || 'Set up the house'}</p>
          </div>
          <div className="owner-nav-actions">
            {hasHouse ? (
              <button
                type="button"
                className="owner-quiet"
                data-testid="stay-with-this-house"
                onClick={cancelNamingPlace}
              >
                {STAY_WITH_THE_HOUSE_LABEL}
              </button>
            ) : null}
            <button
              type="button"
              className="owner-quiet"
              aria-pressed={showAdvanced}
              onClick={() => setShowAdvanced(v => !v)}
            >
              Advanced
            </button>
          </div>
        </div>
      </header>

      <div className="wizard-wrap" data-testid="hub-wizard">
        <p className="wizard-progress-label">Step {step} of 4</p>
        <div className="wizard-bar" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>

        <h1 className="wizard-title">{copy.title}</h1>
        <p className="wizard-sub">{copy.sub}</p>

        {errorMsg && (
          <div className="wizard-error" role="alert">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="wizard-card">
          {step === 1 && (
            <>
              <div className="owner-field">
                <label htmlFor="place-name">Place name</label>
                <input
                  id="place-name"
                  type="text"
                  placeholder="The Olive"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleAutoDetectLocation}
                  disabled={isDetectingLocation}
                >
                  {isDetectingLocation ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Finding you…
                    </>
                  ) : (
                    <>
                      <MapPin size={16} /> Use my location
                    </>
                  )}
                </button>
              </div>

              <div className="wizard-grid two">
                <div className="owner-field">
                  <label htmlFor="country">Country</label>
                  <input
                    id="country"
                    type="text"
                    placeholder="South Africa"
                    value={locationForm.country}
                    onChange={(e) => setLocationForm({ ...locationForm, country: e.target.value })}
                    autoComplete="off"
                  />
                </div>
                <div className="owner-field">
                  <label htmlFor="province">Province / region</label>
                  <input
                    id="province"
                    type="text"
                    placeholder="Western Cape"
                    value={locationForm.provinceState}
                    onChange={(e) => setLocationForm({ ...locationForm, provinceState: e.target.value })}
                    autoComplete="off"
                  />
                </div>
                <div className="owner-field">
                  <label htmlFor="city">City or town</label>
                  <input
                    id="city"
                    type="text"
                    placeholder="Stellenbosch"
                    value={locationForm.city}
                    onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                    autoComplete="off"
                  />
                </div>
                <div className="owner-field">
                  <label htmlFor="street">Street address</label>
                  <input
                    id="street"
                    type="text"
                    placeholder="12 Church Street"
                    value={locationForm.address}
                    onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                    autoComplete="off"
                  />
                </div>
              </div>

              {showAdvanced && (
                <div className="wizard-grid two">
                  <div className="owner-field">
                    <label htmlFor="website">Website (optional)</label>
                    <input
                      id="website"
                      type="url"
                      placeholder="https://"
                      value={socialsForm.website}
                      onChange={(e) => setSocialsForm({ ...socialsForm, website: e.target.value })}
                    />
                  </div>
                  <div className="owner-field">
                    <label htmlFor="ig">Instagram (optional)</label>
                    <input
                      id="ig"
                      type="text"
                      placeholder="theolive"
                      value={socialsForm.instagram}
                      onChange={(e) => setSocialsForm({ ...socialsForm, instagram: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="wizard-grid two">
                <div className="owner-field">
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+27 82 000 0000"
                    value={demographicsForm.contactNumber}
                    onChange={(e) => setDemographicsForm({ ...demographicsForm, contactNumber: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className="owner-field">
                  <label htmlFor="wa">WhatsApp</label>
                  <input
                    id="wa"
                    type="tel"
                    placeholder="Same as phone is fine"
                    value={demographicsForm.whatsappNumber}
                    onChange={(e) => setDemographicsForm({ ...demographicsForm, whatsappNumber: e.target.value })}
                  />
                </div>
                <div className="owner-field">
                  <label htmlFor="lang">Language</label>
                  <select
                    id="lang"
                    value={demographicsForm.language}
                    onChange={(e) => setDemographicsForm({ ...demographicsForm, language: e.target.value })}
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {showAdvanced && (
                <div className="wizard-grid two">
                  <div className="owner-field">
                    <label htmlFor="sex">Gender (optional)</label>
                    <select
                      id="sex"
                      value={demographicsForm.sex}
                      onChange={(e) => setDemographicsForm({ ...demographicsForm, sex: e.target.value as SexType })}
                    >
                      <option value="prefer_not_to_say">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="owner-field">
                    <label htmlFor="dob">Birthdate (optional)</label>
                    <input
                      id="dob"
                      type="date"
                      value={demographicsForm.birthdate}
                      onChange={(e) => setDemographicsForm({ ...demographicsForm, birthdate: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <p style={{ margin: 0 }}>
                Staff open a WhatsApp from you. That message is their login. They land on the floor for {houseLabel} — tables, tickets, kitchen.
              </p>
              <div className="owner-preview">{inviteText}</div>
              <a className="btn btn-outline" href={inviteHref} target="_blank" rel="noreferrer">
                Preview the WhatsApp
              </a>

              {showAdvanced && (
                <>
                  <p className="caption">Payout account — not shown to staff.</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={walletType === 'bank' ? 'btn btn-primary' : 'btn btn-outline'}
                      onClick={() => setWalletType('bank')}
                    >
                      Bank
                    </button>
                    <button
                      type="button"
                      className={walletType === 'crypto' ? 'btn btn-primary' : 'btn btn-outline'}
                      onClick={() => setWalletType('crypto')}
                    >
                      Crypto
                    </button>
                  </div>
                  {walletType === 'bank' ? (
                    <div className="wizard-grid two">
                      <div className="owner-field">
                        <label htmlFor="bank">Bank name</label>
                        <input id="bank" type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                      </div>
                      <div className="owner-field">
                        <label htmlFor="acct">Account number</label>
                        <input id="acct" type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                      </div>
                      <div className="owner-field" style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="route">Routing code</label>
                        <input id="route" type="text" value={routingCode} onChange={(e) => setRoutingCode(e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div className="wizard-grid two">
                      <div className="owner-field">
                        <label htmlFor="chain">Network</label>
                        <select id="chain" value={chainId} onChange={(e) => setChainId(e.target.value)}>
                          {CRYPTO_CHAINS.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="owner-field">
                        <label htmlFor="addr">Address</label>
                        <input id="addr" type="text" value={cryptoAddress} onChange={(e) => setCryptoAddress(e.target.value)} />
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <dl className="wizard-review">
                <dt>Place</dt>
                <dd>{placeName.trim()}</dd>
                <dt>Address</dt>
                <dd>
                  {[locationForm.address, locationForm.city, locationForm.provinceState, locationForm.country]
                    .filter(Boolean)
                    .join(', ')}
                </dd>
                <dt>Reach you</dt>
                <dd>{ownerSession?.email || demographicsForm.email} · {demographicsForm.contactNumber}</dd>
              </dl>
              <p className="caption" style={{ margin: 0 }}>
                After this, open the house from your hub. Invite tonight’s floor when you are ready.
              </p>
              {showAdvanced && (
                <p className="caption">
                  Currency from country: {getCurrencyForCountry(locationForm.country).code} ({getCurrencyForCountry(locationForm.country).symbol})
                </p>
              )}
            </>
          )}
        </div>

        <div className="wizard-nav">
          <div>
            {step > 1 && (
              <button type="button" className="btn btn-outline" onClick={handleBack}>
                <ArrowLeft size={16} /> Back
              </button>
            )}
          </div>
          <div>
            {step < 4 ? (
              <button type="button" className="btn btn-primary" onClick={handleNext}>
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={handleFinishOnboarding} data-testid="see-your-apps">
                <Check size={16} /> {SEE_YOUR_APPS_LABEL}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
