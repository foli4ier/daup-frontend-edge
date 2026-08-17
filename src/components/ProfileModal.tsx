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
  const { did, seed } = useDIDWallet();

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(3, 6, 15, 0.88)',
      backdropFilter: 'blur(12px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '860px',
        maxHeight: '90vh',
        background: 'rgba(10, 16, 33, 0.96)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(139, 92, 246, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>

        {/* Modal Header */}
        <div style={{
          padding: '20px 25px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.01)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '18px',
              boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)'
            }}>
              {primaryWallet?.legalName ? primaryWallet.legalName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
                  Node Identity Profile & Multi-Wallets
                </h2>
                <span className="badge purple" style={{ fontSize: '9px', padding: '1px 7px' }}>
                  {primaryWallet?.legalName || 'Operator Node'}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Instance Header: <span style={{ color: 'var(--neon-cyan)' }}>DAUP Edge Hub // {instanceName}</span>
              </p>
              <p style={{ fontSize: '10px', color: 'var(--text-dark)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                Derived Seed: <span style={{ color: '#a78bfa' }}>"{seed}"</span> &bull; DID: <span style={{ color: 'var(--neon-cyan)' }}>{did ? `${did.slice(0, 18)}...${did.slice(-6)}` : 'Generating...'}</span>
              </p>
            </div>
          </div>

          <button 
            onClick={() => setIsProfileModalOpen(false)}
            className="glass-button"
            style={{ padding: '8px', borderRadius: '8px' }}
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-glass)',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '0 25px',
          gap: '10px'
        }}>
          <button
            onClick={() => setActiveTab('wallets')}
            className="glass-button"
            style={{
              padding: '12px 18px',
              borderRadius: '0',
              borderWidth: '0 0 2px 0',
              borderStyle: 'solid',
              borderTopColor: 'transparent',
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: activeTab === 'wallets' ? 'var(--neon-green)' : 'transparent',
              background: 'transparent',
              color: activeTab === 'wallets' ? 'var(--neon-green)' : 'var(--text-muted)'
            }}
          >
            <Wallet size={16} /> Multi-Wallet Registry ({profile.wallets.length})
          </button>

          <button
            onClick={() => setActiveTab('demographics')}
            className="glass-button"
            style={{
              padding: '12px 18px',
              borderRadius: '0',
              borderWidth: '0 0 2px 0',
              borderStyle: 'solid',
              borderTopColor: 'transparent',
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: activeTab === 'demographics' ? 'var(--neon-cyan)' : 'transparent',
              background: 'transparent',
              color: activeTab === 'demographics' ? 'var(--neon-cyan)' : 'var(--text-muted)'
            }}
          >
            <User size={16} /> Demographics & Contact
          </button>

          <button
            onClick={() => setActiveTab('location')}
            className="glass-button"
            style={{
              padding: '12px 18px',
              borderRadius: '0',
              borderWidth: '0 0 2px 0',
              borderStyle: 'solid',
              borderTopColor: 'transparent',
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: activeTab === 'location' ? 'var(--neon-purple)' : 'transparent',
              background: 'transparent',
              color: activeTab === 'location' ? 'var(--neon-purple)' : 'var(--text-muted)'
            }}
          >
            <MapPin size={16} /> Location & Socials
          </button>

          <button
            onClick={() => setActiveTab('subscription')}
            className="glass-button"
            style={{
              padding: '12px 18px',
              borderRadius: '0',
              borderWidth: '0 0 2px 0',
              borderStyle: 'solid',
              borderTopColor: 'transparent',
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: activeTab === 'subscription' ? 'var(--neon-amber)' : 'transparent',
              background: 'transparent',
              color: activeTab === 'subscription' ? 'var(--neon-amber)' : 'var(--text-muted)'
            }}
          >
            <Sparkles size={16} /> Free Trial & Subscriptions
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '25px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Success Banner */}
          {saveSuccessMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 16px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#34d399'
            }}>
              <CheckCircle2 size={16} />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: WALLETS REGISTRY */}
          {activeTab === 'wallets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>Registered Payout & Settlement Endpoints</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    New instances inherit the Active Primary Wallet's <strong>Legal Name</strong> &bull; Regional Settlement Currency: <strong style={{ color: 'var(--neon-green)' }}>{currency.code} ({currency.symbol} - {currency.name})</strong>
                  </p>
                </div>

                <button 
                  className="glass-button green"
                  onClick={() => {
                    setIsAddingWallet(true);
                    setWalletError(null);
                  }}
                  style={{ padding: '8px 14px', fontSize: '12px' }}
                >
                  <Plus size={14} /> Add Settlement Wallet
                </button>
              </div>

              {/* Wallets List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {profile.wallets.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-glass)', borderRadius: '8px' }}>
                    <Wallet size={32} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No settlement wallets registered yet.</div>
                  </div>
                ) : (
                  profile.wallets.map((w: WalletEntry) => {
                    const isPrimary = w.isPrimary || w.id === profile.primaryWalletId;
                    return (
                      <div 
                        key={w.id}
                        className="glass-panel"
                        style={{
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '15px',
                          borderColor: isPrimary ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-glass)',
                          background: isPrimary ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255, 255, 255, 0.01)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            padding: '10px',
                            borderRadius: '10px',
                            background: w.type === 'bank' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid var(--border-glass)'
                          }}>
                            {w.type === 'bank' ? (
                              <Landmark size={20} color="var(--neon-cyan)" />
                            ) : (
                              <CreditCard size={20} color="var(--neon-purple)" />
                            )}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                                {w.legalName}
                              </span>
                              <span className={`badge ${w.type === 'bank' ? 'cyan' : 'purple'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                                {w.type === 'bank' ? 'Fiat Bank' : 'Web3 Crypto'}
                              </span>
                              {isPrimary && (
                                <span className="badge green" style={{ fontSize: '9px', padding: '1px 6px' }}>
                                  Primary / Active Branding
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                              {w.type === 'bank' ? (
                                <>
                                  <span>Bank: {w.bankName}</span> &bull; <span>IBAN: {w.accountNumber}</span> {w.routingCode && <span>&bull; Routing: {w.routingCode}</span>}
                                </>
                              ) : (
                                <>
                                  <span>Chain: {w.chainId}</span> &bull; <span>Address: {w.address}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {!isPrimary && (
                            <button
                              className="glass-button"
                              onClick={() => setPrimaryWallet(w.id)}
                              style={{ padding: '6px 12px', fontSize: '11px', borderColor: 'var(--neon-green)', color: '#34d399' }}
                            >
                              <Check size={12} /> Set as Primary
                            </button>
                          )}
                          <button
                            className="glass-button red"
                            onClick={() => removeWallet(w.id)}
                            style={{ padding: '6px 10px', fontSize: '11px' }}
                            title="Remove wallet"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add New Wallet Sub-Form */}
              {isAddingWallet && (
                <form onSubmit={handleCreateWallet} className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderColor: 'var(--neon-green)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>Register New Settlement Wallet</h4>
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
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>Operator Demographics & Contact Settings</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Update your contact details, UI language, and verified node operator credentials.
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
                <button type="submit" className="glass-button cyan" style={{ padding: '8px 20px', fontSize: '13px' }}>
                  Save Demographics
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: LOCATION & SOCIALS */}
          {activeTab === 'location' && (
            <form onSubmit={handleSaveLocationAndSocials} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>Geolocation Enrichment & Social Presence</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Node jurisdiction, physical coordinates, and online profiles.
                  </p>
                </div>

                <button 
                  type="button" 
                  className="glass-button cyan" 
                  onClick={handleAutoDetect}
                  disabled={isDetectingLocation}
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                >
                  <Compass size={13} /> {isDetectingLocation ? 'Locating...' : 'Re-Detect Geolocation'}
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
                <button type="submit" className="glass-button purple" style={{ padding: '8px 20px', fontSize: '13px' }}>
                  Save Location & Socials
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: SUBSCRIPTIONS & TRIAL */}
          {activeTab === 'subscription' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>Free Trial & License Subscription Gateway</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Manage node license leases and verify active cryptographic status.
                </p>
              </div>

              {/* Status Banner */}
              <div className="glass-panel" style={{
                padding: '20px',
                background: trialState.isTrialActive 
                  ? 'linear-gradient(90deg, rgba(6, 182, 212, 0.08) 0%, rgba(13, 20, 38, 0.7) 100%)' 
                  : 'rgba(255, 255, 255, 0.01)',
                borderColor: trialState.isTrialActive ? 'rgba(6, 182, 212, 0.3)' : 'var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '15px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.1)' }}>
                    <Sparkles size={24} color="var(--neon-cyan)" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>
                        {trialState.isTrialActive ? '30-Day Free Trial Active' : 'No Active Free Trial'}
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
                    className="glass-button green"
                    onClick={() => {
                      startFreeTrial(30);
                      showSaveSuccess('30-day Free Trial successfully activated!');
                    }}
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    <Sparkles size={14} /> Start 30-Day Free Trial
                  </button>
                )}
              </div>

              {/* Developer Testing / Reset Utilities */}
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} color="var(--neon-amber)" /> Reset Demo Profile
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dark)' }}>
                    Clears local state to re-trigger the first-time launch onboarding wizard.
                  </div>
                </div>

                <button
                  className="glass-button red"
                  onClick={() => {
                    if (confirm('Reset your profile and trigger the onboarding wizard on next load?')) {
                      resetProfile();
                      setIsProfileModalOpen(false);
                    }
                  }}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  <RotateCcw size={12} /> Reset Profile State
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
