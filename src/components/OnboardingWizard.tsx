import React, { useState } from 'react';
import { 
  Compass, MapPin, User, Wallet, Sparkles, ArrowRight, ArrowLeft, Check, 
  Building, Globe, Instagram, Facebook, ShieldCheck, Loader2, AlertCircle, 
  CreditCard, Landmark
} from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';
import { BankWalletConfig, CryptoWalletConfig, SexType, UserLocation, UserDemographics, SocialLinks } from '../types/profile';
import { getCurrencyForCountry } from '../utils/currency';

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English (US)' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文 (Mandarin)' },
  { code: 'ja', label: '日本語 (Japanese)' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية (Arabic)' }
];

const CRYPTO_CHAINS = [
  { id: '1', name: 'Ethereum Mainnet (EVM)' },
  { id: '137', name: 'Polygon PoS' },
  { id: '42161', name: 'Arbitrum One' },
  { id: 'solana', name: 'Solana Network' },
  { id: 'daup-edge', name: 'DAUP Native Edge Chain' }
];

export const OnboardingWizard: React.FC = () => {
  const { 
    profile, 
    completeOnboarding, 
    detectLocation, 
    isDetectingLocation,
    validateLegalName 
  } = useUserProfile();

  const [step, setStep] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form local state
  const [locationForm, setLocationForm] = useState<UserLocation>({
    country: profile.location.country || '',
    provinceState: profile.location.provinceState || '',
    city: profile.location.city || '',
    address: profile.location.address || '',
    latitude: profile.location.latitude,
    longitude: profile.location.longitude
  });

  const [socialsForm, setSocialsForm] = useState<SocialLinks>({
    website: profile.socials.website || '',
    instagram: profile.socials.instagram || '',
    facebook: profile.socials.facebook || ''
  });

  const [demographicsForm, setDemographicsForm] = useState<UserDemographics>({
    email: profile.demographics.email || '',
    contactNumber: profile.demographics.contactNumber || '',
    whatsappNumber: profile.demographics.whatsappNumber || '',
    language: profile.demographics.language || 'en',
    sex: profile.demographics.sex || 'prefer_not_to_say',
    birthdate: profile.demographics.birthdate || ''
  });

  // Wallet form state
  const [walletType, setWalletType] = useState<'bank' | 'crypto'>('bank');
  const [legalName, setLegalName] = useState<string>('');
  
  // Bank fields
  const [bankName, setBankName] = useState<string>('Standard Chartered Global');
  const [accountNumber, setAccountNumber] = useState<string>('GB82 WEST 1234 5678 9012 34');
  const [routingCode, setRoutingCode] = useState<string>('SCBLUS33XXX');
  
  // Crypto fields
  const [chainId, setChainId] = useState<string>('1');
  const [cryptoAddress, setCryptoAddress] = useState<string>('0x71C...849db2c918f8bb1a49fa81f4a9b6');

  // Handle Geolocation auto-detection
  const handleAutoDetectLocation = async () => {
    setErrorMsg(null);
    try {
      const loc = await detectLocation();
      setLocationForm(loc);
    } catch (e) {
      setErrorMsg('Could not detect location automatically. Please enter manually.');
    }
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!locationForm.country.trim()) {
      setErrorMsg('Please specify your Country.');
      return false;
    }
    if (!locationForm.city.trim()) {
      setErrorMsg('Please specify your City.');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    if (!demographicsForm.email.trim() || !demographicsForm.email.includes('@')) {
      setErrorMsg('Please provide a valid email address.');
      return false;
    }
    if (!demographicsForm.contactNumber.trim()) {
      setErrorMsg('Please provide a primary contact phone number.');
      return false;
    }
    if (!demographicsForm.birthdate) {
      setErrorMsg('Please select your birthdate.');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    if (!legalName.trim()) {
      setErrorMsg('Legal Name is strictly required for payout/settlement registration and node instance naming.');
      return false;
    }
    const check = validateLegalName(legalName);
    if (!check.isUnique) {
      setErrorMsg(check.reason || 'This Legal Name is already registered on the DAUP platform. Legal names must be unique to instantiate a node.');
      return false;
    }
    if (walletType === 'bank') {
      if (!bankName.trim() || !accountNumber.trim()) {
        setErrorMsg('Please enter Bank Name and Account/IBAN Number.');
        return false;
      }
    } else {
      if (!cryptoAddress.trim()) {
        setErrorMsg('Please provide a valid Public Key or Wallet Address.');
        return false;
      }
    }
    setErrorMsg(null);
    return true;
  };

  // Navigation handlers
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

  // Final submission and trial activation
  const handleFinishOnboarding = () => {
    const newWalletId = `wallet_${Date.now()}`;
    const initialWallet = walletType === 'bank' ? {
      id: newWalletId,
      type: 'bank' as const,
      legalName: legalName.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      routingCode: routingCode.trim(),
      isPrimary: true,
      createdAt: Date.now()
    } as BankWalletConfig : {
      id: newWalletId,
      type: 'crypto' as const,
      legalName: legalName.trim(),
      chainId,
      address: cryptoAddress.trim(),
      isPrimary: true,
      createdAt: Date.now()
    } as CryptoWalletConfig;

    completeOnboarding({
      location: locationForm,
      socials: socialsForm,
      demographics: demographicsForm,
      wallets: [initialWallet],
      primaryWalletId: newWalletId
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(4, 7, 18, 0.92)',
      backdropFilter: 'blur(16px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '780px',
        background: 'rgba(10, 16, 33, 0.95)',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(6, 182, 212, 0.1)',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative'
      }}>

        {/* Wizard Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
              <Compass size={28} color="var(--neon-cyan)" style={{ animation: 'pulse-glow 3s infinite ease-in-out' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  DAUP Node Setup Wizard
                </h2>
                <span className="badge cyan" style={{ fontSize: '9px', padding: '1px 7px' }}>First-Run Setup</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Initialize decentralized operator profile, multi-wallet registry, and free trial credentials.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Step {step} of 4</span>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>
              {step === 1 && 'Location & Discovery'}
              {step === 2 && 'Operator Profile'}
              {step === 3 && 'Multi-Wallet Setup'}
              {step === 4 && 'Trial & Instance'}
            </div>
          </div>
        </div>

        {/* Wizard Progress Bar */}
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          {[1, 2, 3, 4].map(idx => (
            <div 
              key={idx} 
              style={{ 
                flex: 1, 
                height: '4px', 
                borderRadius: '2px', 
                background: idx < step 
                  ? 'var(--neon-green)' 
                  : idx === step 
                  ? 'var(--neon-cyan)' 
                  : 'rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease'
              }} 
            />
          ))}
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#fb7185'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step Content */}
        <div style={{ minHeight: '340px' }}>

          {/* STEP 1: Geolocation & Social Discovery */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={18} color="var(--neon-cyan)" />
                    Geolocation Enrichment & Social Presence
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Auto-derive your node's edge routing jurisdiction or adjust details manually.
                  </p>
                </div>

                <button 
                  type="button" 
                  className="glass-button cyan" 
                  onClick={handleAutoDetectLocation}
                  disabled={isDetectingLocation}
                  style={{ padding: '8px 14px', fontSize: '12px' }}
                >
                  {isDetectingLocation ? (
                    <>
                      <Loader2 size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
                      Detecting Coordinates...
                    </>
                  ) : (
                    <>
                      <Compass size={14} /> Auto-Detect Geolocation
                    </>
                  )}
                </button>
              </div>

              {/* Location Fields */}
              <div className="grid-container two-col" style={{ gap: '15px', marginBottom: '0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>COUNTRY *</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="e.g. United States, Germany, Japan, South Africa"
                    value={locationForm.country}
                    onChange={(e) => setLocationForm({ ...locationForm, country: e.target.value })}
                  />
                  {locationForm.country.trim() && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--neon-cyan)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                      <Globe size={11} />
                      <span>Derived Currency: <strong>{getCurrencyForCountry(locationForm.country).code} ({getCurrencyForCountry(locationForm.country).symbol} - {getCurrencyForCountry(locationForm.country).name})</strong></span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>PROVINCE / STATE / REGION</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="e.g. California, Bavaria, Tokyo"
                    value={locationForm.provinceState}
                    onChange={(e) => setLocationForm({ ...locationForm, provinceState: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>CITY *</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="e.g. San Francisco, Munich, Tokyo"
                    value={locationForm.city}
                    onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>STREET ADDRESS</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="e.g. 500 Howard Street, Suite 400"
                    value={locationForm.address}
                    onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                  />
                </div>
              </div>

              {/* Social URLs */}
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '15px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                  ONLINE WEB & SOCIAL HANDLES (OPTIONAL)
                </span>
                <div className="grid-container three-col" style={{ gap: '15px', marginBottom: '0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dark)' }}>
                      <Globe size={12} /> Website URL
                    </div>
                    <input 
                      type="url" 
                      className="glass-input" 
                      placeholder="https://myenterprise.org"
                      value={socialsForm.website}
                      onChange={(e) => setSocialsForm({ ...socialsForm, website: e.target.value })}
                      style={{ fontSize: '12px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dark)' }}>
                      <Instagram size={12} /> Instagram Handle
                    </div>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="@daup_operator"
                      value={socialsForm.instagram}
                      onChange={(e) => setSocialsForm({ ...socialsForm, instagram: e.target.value })}
                      style={{ fontSize: '12px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dark)' }}>
                      <Facebook size={12} /> Facebook Page
                    </div>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="fb.com/daup.operator"
                      value={socialsForm.facebook}
                      onChange={(e) => setSocialsForm({ ...socialsForm, facebook: e.target.value })}
                      style={{ fontSize: '12px' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Demographics & Personal Info */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} color="var(--neon-purple)" />
                  Operator Contact & Demographics
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Specify your verified operator credentials, preferred communications, and interface language.
                </p>
              </div>

              <div className="grid-container two-col" style={{ gap: '15px', marginBottom: '0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>OPERATOR EMAIL ADDRESS *</label>
                  <input 
                    type="email" 
                    className="glass-input" 
                    placeholder="operator@daup-network.io"
                    value={demographicsForm.email}
                    onChange={(e) => setDemographicsForm({ ...demographicsForm, email: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>PRIMARY CONTACT PHONE *</label>
                  <input 
                    type="tel" 
                    className="glass-input" 
                    placeholder="+1 (555) 234-5678"
                    value={demographicsForm.contactNumber}
                    onChange={(e) => setDemographicsForm({ ...demographicsForm, contactNumber: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>WHATSAPP NUMBER</label>
                  <input 
                    type="tel" 
                    className="glass-input" 
                    placeholder="+1 (555) 234-5678 (or same as contact)"
                    value={demographicsForm.whatsappNumber}
                    onChange={(e) => setDemographicsForm({ ...demographicsForm, whatsappNumber: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>UI DISPLAY LANGUAGE *</label>
                  <select 
                    className="glass-select" 
                    value={demographicsForm.language}
                    onChange={(e) => setDemographicsForm({ ...demographicsForm, language: e.target.value })}
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>SEX / GENDER</label>
                  <select 
                    className="glass-select" 
                    value={demographicsForm.sex}
                    onChange={(e) => setDemographicsForm({ ...demographicsForm, sex: e.target.value as SexType })}
                  >
                    <option value="prefer_not_to_say">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / Non-Binary</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>BIRTHDATE *</label>
                  <input 
                    type="date" 
                    className="glass-input" 
                    value={demographicsForm.birthdate}
                    onChange={(e) => setDemographicsForm({ ...demographicsForm, birthdate: e.target.value })}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Multi-Wallet Registration & Legal Name */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wallet size={18} color="var(--neon-green)" />
                  Primary Settlement Wallet & Legal Identity
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Every wallet requires an authenticated Legal Name which will brand your node instance header and DID profile metadata.
                </p>
              </div>

              {/* Mandatory Legal Name input */}
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '14px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--neon-green)', fontWeight: 'bold' }}>
                  MANDATORY LEGAL NAME / REGISTERED ENTITY *
                </label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. Apex Agri-Holdings Ltd. or Johnathan Doe"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  style={{ borderColor: legalName.trim() ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  This new instance automatically inherits this active wallet's name: <strong style={{ color: 'var(--neon-cyan)' }}>{legalName.trim() || '[Your Legal Name]'}</strong> &bull; Currency: <strong style={{ color: 'var(--neon-green)' }}>{getCurrencyForCountry(locationForm.country).code} ({getCurrencyForCountry(locationForm.country).symbol})</strong>
                </span>
              </div>

              {/* Wallet Type Switcher */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="glass-button"
                  onClick={() => setWalletType('bank')}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    borderColor: walletType === 'bank' ? 'var(--neon-cyan)' : 'var(--border-glass)',
                    background: walletType === 'bank' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.02)',
                    color: walletType === 'bank' ? 'var(--neon-cyan)' : 'var(--text-muted)'
                  }}
                >
                  <Landmark size={16} /> Fiat Bank Account (IBAN)
                </button>

                <button
                  type="button"
                  className="glass-button"
                  onClick={() => setWalletType('crypto')}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    borderColor: walletType === 'crypto' ? 'var(--neon-purple)' : 'var(--border-glass)',
                    background: walletType === 'crypto' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                    color: walletType === 'crypto' ? 'var(--neon-purple)' : 'var(--text-muted)'
                  }}
                >
                  <CreditCard size={16} /> Web3 Multi-Chain Crypto Wallet
                </button>
              </div>

              {/* Dynamic form based on type */}
              {walletType === 'bank' ? (
                <div className="grid-container two-col" style={{ gap: '15px', marginBottom: '0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>BANK NAME *</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="e.g. Barclays, Chase, Standard Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>ACCOUNT NUMBER / IBAN *</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="e.g. GB82 WEST 1234 5678 9012 34"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>SWIFT / BIC / ROUTING CODE</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="e.g. SCBLUS33XXX"
                      value={routingCode}
                      onChange={(e) => setRoutingCode(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid-container two-col" style={{ gap: '15px', marginBottom: '0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>BLOCKCHAIN NETWORK *</label>
                    <select 
                      className="glass-select" 
                      value={chainId}
                      onChange={(e) => setChainId(e.target.value)}
                    >
                      {CRYPTO_CHAINS.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>WALLET / CONTRACT ADDRESS *</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="0x... or Base58 address"
                      value={cryptoAddress}
                      onChange={(e) => setCryptoAddress(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Free Trial Activation & Instance Preview */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="var(--neon-cyan)" />
                  Review & Initialize Node Instance
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Your profile and primary settlement endpoint are verified. All 4 vertical ecosystem suites are now ready to be unlocked.
                </p>
              </div>

              {/* Instance Branding Summary Card */}
              <div className="glass-panel" style={{ padding: '16px 20px', background: 'rgba(6, 182, 212, 0.04)', borderColor: 'rgba(6, 182, 212, 0.2)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dark)', fontWeight: 'bold' }}>INITIALIZED NODE INSTANCE TITLE (INHERITED FROM ACTIVE WALLET)</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>DAUP Edge Hub //</span>
                  <span style={{ color: 'var(--neon-cyan)' }}>{legalName.trim() || 'Decentralized Operator'}</span>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-glass)', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <div><strong>Location:</strong> {locationForm.city}, {locationForm.country}</div>
                  <div><strong>Derived Currency:</strong> <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>{getCurrencyForCountry(locationForm.country).code} ({getCurrencyForCountry(locationForm.country).symbol} - {getCurrencyForCountry(locationForm.country).name})</span></div>
                  <div><strong>Operator:</strong> {demographicsForm.email}</div>
                  <div><strong>Primary Settlement:</strong> {walletType === 'bank' ? `Bank (${bankName})` : `Crypto (${cryptoAddress.slice(0, 8)}...)`}</div>
                </div>
              </div>

              {/* 30-Day Free Trial Features */}
              <div className="grid-container two-col" style={{ gap: '12px', marginBottom: '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)' }}>
                  <ShieldCheck size={16} color="var(--neon-green)" />
                  <span>30 Days Full Pro Access for all 4 Workspaces</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)' }}>
                  <ShieldCheck size={16} color="var(--neon-green)" />
                  <span>Kademlia DHT & dCDN Edge Gateway Routing</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)' }}>
                  <ShieldCheck size={16} color="var(--neon-green)" />
                  <span>Zero upfront credit card or gas fees required</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)' }}>
                  <ShieldCheck size={16} color="var(--neon-green)" />
                  <span>Dynamic Smart Contract License Renewal</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Wizard Footer Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
          <div>
            {step > 1 && (
              <button 
                type="button" 
                className="glass-button" 
                onClick={handleBack}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {step < 4 ? (
              <button 
                type="button" 
                className="glass-button cyan" 
                onClick={handleNext}
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button 
                type="button" 
                className="glass-button green" 
                onClick={handleFinishOnboarding}
                style={{ 
                  padding: '10px 24px', 
                  fontSize: '14px', 
                  background: 'rgba(16, 185, 129, 0.2)', 
                  borderColor: 'var(--neon-green)', 
                  color: '#34d399',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
                }}
              >
                <Check size={16} /> Complete Setup & Start 30-Day Trial
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default OnboardingWizard;
