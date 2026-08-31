import React, { useState } from 'react';
import { 
  X, User, MapPin, Wallet, Sparkles, Plus, Trash2, Check, 
  Landmark, CreditCard, Compass, Globe, Instagram, Facebook, 
  ShieldCheck, Clock, CheckCircle2, RotateCcw, AlertTriangle
} from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';
import { useDIDWallet } from './DIDWalletProvider';
import { BankWalletConfig, CryptoWalletConfig, SexType, WalletEntry, UserDemographics, UserLocation, SocialLinks } from '../types/profile';
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

export const ProfileModal: React.FC = () => {
  const { 
    profile, 
    trialState, 
    trialDaysRemaining,
    primaryWallet, 
    instanceName, 
    currency,
    validateLegalName,
    updateDemographics, 
    updateLocation, 
    updateSocials, 
    addWallet, 
    removeWallet, 
    setPrimaryWallet, 
    detectLocation, 
    isDetectingLocation,
    startFreeTrial,
    resetProfile,
    isProfileModalOpen, 
    setIsProfileModalOpen 
  } = useUserProfile();
  const { did } = useDIDWallet();

  const [activeTab, setActiveTab] = useState<'wallets' | 'demographics' | 'location' | 'subscription'>('wallets');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Demographics form
  const [demographics, setDemographics] = useState<UserDemographics>({ ...profile.demographics });

  // Location & Socials form
  const [location, setLocation] = useState<UserLocation>({ ...profile.location });
  const [socials, setSocials] = useState<SocialLinks>({ ...profile.socials });

  // New Wallet form modal state
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [newWalletType, setNewWalletType] = useState<'bank' | 'crypto'>('bank');
  const [newLegalName, setNewLegalName] = useState(primaryWallet?.legalName || '');
  const [newBankName, setNewBankName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newRoutingCode, setNewRoutingCode] = useState('');
  const [newChainId, setNewChainId] = useState('1');
  const [newCryptoAddress, setNewCryptoAddress] = useState('');
  const [walletError, setWalletError] = useState<string | null>(null);

  // Sync form states whenever profile updates or modal opens
  React.useEffect(() => {
    if (isProfileModalOpen) {
      setDemographics({ ...profile.demographics });
      setLocation({ ...profile.location });
      setSocials({ ...profile.socials });
      setNewLegalName(primaryWallet?.legalName || '');
    }
  }, [isProfileModalOpen, profile, primaryWallet?.legalName]);

  if (!isProfileModalOpen) return null;

  const showSaveSuccess = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleSaveDemographics = (e: React.FormEvent) => {
    e.preventDefault();
    updateDemographics(demographics);
    showSaveSuccess('Demographics and contact credentials saved successfully.');
  };

  const handleSaveLocationAndSocials = (e: React.FormEvent) => {
    e.preventDefault();
    updateLocation(location);
    updateSocials(socials);
    showSaveSuccess('Location and social media profiles updated.');
  };

  const handleAutoDetect = async () => {
    try {
      const loc = await detectLocation();
      setLocation(loc);
      showSaveSuccess('Geolocation coordinates auto-populated.');
    } catch {
      // handled in context
    }
  };

  const handleCreateWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLegalName.trim()) {
      setWalletError('Legal Name is mandatory for all settlement wallets.');
      return;
    }

    const check = validateLegalName(newLegalName);
    if (!check.isUnique) {
      setWalletError(check.reason || 'This Legal Name is already registered on the DAUP platform. Legal names must be unique.');
      return;
    }

    if (newWalletType === 'bank') {
      if (!newBankName.trim() || !newAccountNumber.trim()) {
        setWalletError('Bank Name and Account/IBAN Number are required.');
        return;
      }
      addWallet({
        type: 'bank',
        legalName: newLegalName.trim(),
        bankName: newBankName.trim(),
        accountNumber: newAccountNumber.trim(),
        routingCode: newRoutingCode.trim(),
        isPrimary: profile.wallets.length === 0
      });
    } else {
      if (!newCryptoAddress.trim()) {
        setWalletError('Wallet Address / Public Key is required.');
        return;
      }
      addWallet({
        type: 'crypto',
        legalName: newLegalName.trim(),
        chainId: newChainId,
        address: newCryptoAddress.trim(),
        isPrimary: profile.wallets.length === 0
      });
    }

    setWalletError(null);
    setIsAddingWallet(false);
    // Clear form
    setNewBankName('');
    setNewAccountNumber('');
    setNewRoutingCode('');
    setNewCryptoAddress('');
    showSaveSuccess('New settlement wallet registered successfully.');
  };

  return (
    <div className="owner-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsProfileModalOpen(false); }}>
      <div className="owner-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">

        <div className="owner-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="avatar">
              {primaryWallet?.legalName ? primaryWallet.legalName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 id="profile-modal-title">Profile & wallets</h2>
                <span className="badge">
                  {primaryWallet?.legalName || instanceName}
                </span>
              </div>
              <p className="caption">
                {instanceName} &bull; {did ? `${did.slice(0, 18)}...${did.slice(-6)}` : 'Setting up your hub'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsProfileModalOpen(false)}
            className="btn btn-outline"
            style={{ minHeight: '40px', padding: '0 12px' }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="owner-modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'wallets'}
            onClick={() => setActiveTab('wallets')}
            className="owner-modal-tab"
          >
            <Wallet size={16} /> Wallets ({profile.wallets.length})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'demographics'}
            onClick={() => setActiveTab('demographics')}
            className="owner-modal-tab"
          >
            <User size={16} /> Contact
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'location'}
            onClick={() => setActiveTab('location')}
            className="owner-modal-tab"
          >
            <MapPin size={16} /> Location
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'subscription'}
            onClick={() => setActiveTab('subscription')}
            className="owner-modal-tab"
          >
            <Sparkles size={16} /> Trial
          </button>
        </div>

        <div className="owner-modal-body">

          {saveSuccessMsg && (
            <div className="owner-success-banner">
              <CheckCircle2 size={16} />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: WALLETS REGISTRY */}
          {activeTab === 'wallets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3>Settlement wallets</h3>
                  <p className="caption" style={{ marginTop: '4px' }}>
                    Active wallet sets the house name &bull; Currency: <strong>{currency.code} ({currency.symbol})</strong>
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setIsAddingWallet(true);
                    setWalletError(null);
                  }}
                >
                  <Plus size={14} /> Add wallet
                </button>
              </div>

              {/* Wallets List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {profile.wallets.length === 0 ? (
                  <div className="wizard-card" style={{ textAlign: 'center', padding: '30px' }}>
                    <Wallet size={32} color="var(--muted)" style={{ marginBottom: '8px' }} />
                    <p className="caption">No wallets yet.</p>
                  </div>
                ) : (
                  profile.wallets.map((w: WalletEntry) => {
                    const isPrimary = w.isPrimary || w.id === profile.primaryWalletId;
                    return (
                      <div
                        key={w.id}
                        className={`owner-wallet-row${isPrimary ? ' is-primary' : ''}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div className="ico-sq" style={{ width: '40px', height: '40px' }}>
                            {w.type === 'bank' ? (
                              <Landmark size={18} />
                            ) : (
                              <CreditCard size={18} />
                            )}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '14px', fontWeight: 700 }}>
                                {w.legalName}
                              </span>
                              <span className="badge">
                                {w.type === 'bank' ? 'Bank' : 'Crypto'}
                              </span>
                              {isPrimary && (
                                <span className="badge green">Primary</span>
                              )}
                            </div>

                            <p className="caption" style={{ marginTop: '4px' }}>
                              {w.type === 'bank' ? (
                                <>
                                  {w.bankName} &bull; {w.accountNumber}{w.routingCode ? ` &bull; ${w.routingCode}` : ''}
                                </>
                              ) : (
                                <>
                                  Chain {w.chainId} &bull; {w.address}
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {!isPrimary && (
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={() => setPrimaryWallet(w.id)}
                              style={{ minHeight: '40px', fontSize: '13px' }}
                            >
                              <Check size={12} /> Set primary
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => removeWallet(w.id)}
                            style={{ minHeight: '40px', padding: '0 12px' }}
                            title="Remove wallet"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add New Wallet Sub-Form */}
              {isAddingWallet && (
                <form onSubmit={handleCreateWallet} className="wizard-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontFamily: 'var(--serif)' }}>Add wallet</h4>
                    <button type="button" onClick={() => setIsAddingWallet(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>🗙</button>
                  </div>

                  {walletError && (
                    <div style={{ fontSize: '11px', color: '#fb7185' }}>{walletError}</div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--neon-green)', fontWeight: 'bold' }}>MANDATORY LEGAL NAME *</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="e.g. Apex Agri-Holdings Ltd." 
                      value={newLegalName}
                      onChange={(e) => setNewLegalName(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      className="glass-button"
                      onClick={() => setNewWalletType('bank')}
                      style={{
                        flex: 1,
                        borderColor: newWalletType === 'bank' ? 'var(--neon-cyan)' : 'var(--border-glass)',
                        background: newWalletType === 'bank' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                        color: newWalletType === 'bank' ? 'var(--neon-cyan)' : 'var(--text-muted)',
                        justifyContent: 'center',
                        fontSize: '12px'
                      }}
                    >
                      <Landmark size={14} /> Fiat Bank Account
                    </button>
                    <button
                      type="button"
                      className="glass-button"
                      onClick={() => setNewWalletType('crypto')}
                      style={{
                        flex: 1,
                        borderColor: newWalletType === 'crypto' ? 'var(--neon-purple)' : 'var(--border-glass)',
                        background: newWalletType === 'crypto' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                        color: newWalletType === 'crypto' ? 'var(--neon-purple)' : 'var(--text-muted)',
                        justifyContent: 'center',
                        fontSize: '12px'
                      }}
                    >
                      <CreditCard size={14} /> Crypto Wallet
                    </button>
                  </div>

                  {newWalletType === 'bank' ? (
                    <div className="grid-container two-col" style={{ gap: '10px', marginBottom: '0' }}>
                      <input 
                        type="text" 
                        className="glass-input" 
                        placeholder="Bank Name"
                        value={newBankName}
                        onChange={(e) => setNewBankName(e.target.value)}
                      />
                      <input 
                        type="text" 
                        className="glass-input" 
                        placeholder="Routing / SWIFT Code"
                        value={newRoutingCode}
                        onChange={(e) => setNewRoutingCode(e.target.value)}
                      />
                      <input 
                        type="text" 
                        className="glass-input" 
                        placeholder="IBAN / Account Number"
                        style={{ gridColumn: 'span 2' }}
                        value={newAccountNumber}
                        onChange={(e) => setNewAccountNumber(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="grid-container two-col" style={{ gap: '10px', marginBottom: '0' }}>
                      <select 
                        className="glass-select"
                        value={newChainId}
                        onChange={(e) => setNewChainId(e.target.value)}
                      >
                        {CRYPTO_CHAINS.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <input 
                        type="text" 
                        className="glass-input" 
                        placeholder="Public Key / Address (0x...)"
                        value={newCryptoAddress}
                        onChange={(e) => setNewCryptoAddress(e.target.value)}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button type="button" className="glass-button" onClick={() => setIsAddingWallet(false)} style={{ fontSize: '12px' }}>
                      Cancel
                    </button>
                    <button type="submit" className="glass-button green" style={{ fontSize: '12px' }}>
                      <Plus size={14} /> Confirm Registration
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: DEMOGRAPHICS & CONTACT */}
          {activeTab === 'demographics' && (
            <form onSubmit={handleSaveDemographics} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3>Contact details</h3>
                <p className="caption" style={{ marginTop: '4px' }}>
                  Phone, email, and language for the house.
                </p>
              </div>

              <div className="grid-container two-col" style={{ gap: '15px', marginBottom: '0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>OPERATOR EMAIL ADDRESS *</label>
                  <input 
                    type="email" 
                    className="glass-input" 
                    value={demographics.email}
                    onChange={(e) => setDemographics({ ...demographics, email: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>PRIMARY PHONE *</label>
                  <input 
                    type="tel" 
                    className="glass-input" 
                    value={demographics.contactNumber}
                    onChange={(e) => setDemographics({ ...demographics, contactNumber: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>WHATSAPP NUMBER</label>
                  <input 
                    type="tel" 
                    className="glass-input" 
                    value={demographics.whatsappNumber}
                    onChange={(e) => setDemographics({ ...demographics, whatsappNumber: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>UI DISPLAY LANGUAGE</label>
                  <select 
                    className="glass-select"
                    value={demographics.language}
                    onChange={(e) => setDemographics({ ...demographics, language: e.target.value })}
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
                    value={demographics.sex}
                    onChange={(e) => setDemographics({ ...demographics, sex: e.target.value as SexType })}
                  >
                    <option value="prefer_not_to_say">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / Non-Binary</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>BIRTHDATE</label>
                  <input 
                    type="date" 
                    className="glass-input" 
                    value={demographics.birthdate}
                    onChange={(e) => setDemographics({ ...demographics, birthdate: e.target.value })}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
                <button type="submit" className="btn btn-primary">
                  Save contact details
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: LOCATION & SOCIALS */}
          {activeTab === 'location' && (
            <form onSubmit={handleSaveLocationAndSocials} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3>Location & socials</h3>
                  <p className="caption" style={{ marginTop: '4px' }}>
                    Where the house is and how people find you online.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleAutoDetect}
                  disabled={isDetectingLocation}
                  style={{ minHeight: '40px', fontSize: '14px' }}
                >
                  <Compass size={13} /> {isDetectingLocation ? 'Locating…' : 'Detect location'}
                </button>
              </div>

              <div className="grid-container two-col" style={{ gap: '15px', marginBottom: '0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>COUNTRY</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    value={location.country}
                    onChange={(e) => setLocation({ ...location, country: e.target.value })}
                  />
                  {location.country.trim() && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--neon-green)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                      <Globe size={11} />
                      <span>Derived Currency: <strong>{getCurrencyForCountry(location.country).code} ({getCurrencyForCountry(location.country).symbol} - {getCurrencyForCountry(location.country).name})</strong></span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>PROVINCE / STATE</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    value={location.provinceState}
                    onChange={(e) => setLocation({ ...location, provinceState: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>CITY</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    value={location.city}
                    onChange={(e) => setLocation({ ...location, city: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>STREET ADDRESS</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    value={location.address}
                    onChange={(e) => setLocation({ ...location, address: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '15px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                  ONLINE SOCIAL CHANNELS
                </span>
                <div className="grid-container three-col" style={{ gap: '15px', marginBottom: '0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Globe size={12} /> Website URL
                    </span>
                    <input 
                      type="url" 
                      className="glass-input" 
                      value={socials.website}
                      onChange={(e) => setSocials({ ...socials, website: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Instagram size={12} /> Instagram Handle
                    </span>
                    <input 
                      type="text" 
                      className="glass-input" 
                      value={socials.instagram}
                      onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Facebook size={12} /> Facebook
                    </span>
                    <input 
                      type="text" 
                      className="glass-input" 
                      value={socials.facebook}
                      onChange={(e) => setSocials({ ...socials, facebook: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
                <button type="submit" className="btn btn-primary">
                  Save location
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: SUBSCRIPTIONS & TRIAL */}
          {activeTab === 'subscription' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3>Free trial</h3>
                <p className="caption" style={{ marginTop: '4px' }}>
                  Try the full platform for 30 days.
                </p>
              </div>

              <div className="wizard-card" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '15px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="ico-sq">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700 }}>
                        {trialState.isTrialActive ? '30-day trial active' : 'No active trial'}
                      </span>
                      <span className={`badge ${trialState.isTrialActive ? 'green' : 'amber'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                        {trialState.isTrialActive ? `${trialDaysRemaining} Days Left` : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {trialState.isTrialActive && trialState.trialExpiresAt ? (
                        <span>Expires on {new Date(trialState.trialExpiresAt).toLocaleDateString()} &bull; Full Pro tier unlocked for all workspaces</span>
                      ) : (
                        <span>Initiate your 30-day all-inclusive ecosystem trial.</span>
                      )}
                    </div>
                  </div>
                </div>

                {!trialState.isTrialActive && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      startFreeTrial(30);
                      showSaveSuccess('30-day trial started.');
                    }}
                  >
                    <Sparkles size={14} /> Start 30-day trial
                  </button>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 650, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} color="var(--terracotta)" /> Reset profile
                  </div>
                  <p className="caption">Clears your setup and runs the wizard again.</p>
                </div>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    if (confirm('Reset your profile and start setup again?')) {
                      resetProfile();
                      setIsProfileModalOpen(false);
                    }
                  }}
                  style={{ color: 'var(--terracotta)', borderColor: 'var(--terracotta)' }}
                >
                  <RotateCcw size={12} /> Reset profile
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default ProfileModal;

