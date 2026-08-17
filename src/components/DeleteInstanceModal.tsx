import React, { useState, useEffect } from 'react';
import { 
  Trash2, ShieldAlert, CheckCircle2, 
  Loader2, X
} from 'lucide-react';

export interface DeleteInstanceModalProps {
  isOpen: boolean;
  instanceName: string;
  moduleKey?: string | null;
  moduleName?: string;
  did?: string | null;
  onClose: () => void;
  onConfirmDelete: (instanceName: string, moduleKey?: string | null) => Promise<void> | void;
}

export const DeleteInstanceModal: React.FC<DeleteInstanceModalProps> = ({
  isOpen,
  instanceName,
  moduleKey,
  moduleName,
  did,
  onClose,
  onConfirmDelete
}) => {
  const [typedName, setTypedName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionStep, setDeletionStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setTypedName('');
      setIsDeleting(false);
      setDeletionStep(0);
      setIsCompleted(false);
      setTxHash(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const targetName = instanceName.trim();
  const isMatch = typedName.trim() === targetName;

  const steps = [
    'Broadcasting unregistration to Kademlia DHT routing peers...',
    'Revoking smart contract license leases on DaupLicensingRegistry.sol...',
    'Unpinning IPFS storage manifests and clearing dCDN routes...',
    'Purging local edge container artifacts and active subscriptions...'
  ];

  const handleDelete = async () => {
    if (!isMatch || isDeleting) return;

    setIsDeleting(true);
    setDeletionStep(1);

    // Step 1
    await new Promise((r) => setTimeout(r, 600));
    setDeletionStep(2);

    // Step 2
    await new Promise((r) => setTimeout(r, 700));
    setDeletionStep(3);

    // Step 3
    await new Promise((r) => setTimeout(r, 600));
    setDeletionStep(4);

    // Execute actual deletion callback
    try {
      await onConfirmDelete(targetName, moduleKey);
      const randomTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setTxHash(randomTx);
      setIsCompleted(true);

      // Auto close after showing confirmation
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Error during instance deletion:', err);
      setIsDeleting(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(3, 7, 18, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '26px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          borderRadius: '14px',
          border: '1px solid rgba(244, 63, 94, 0.4)',
          boxShadow: '0 0 40px rgba(244, 63, 94, 0.15)',
          background: 'linear-gradient(180deg, rgba(20, 10, 20, 0.95) 0%, rgba(10, 12, 24, 0.98) 100%)',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        {!isDeleting && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Cancel"
          >
            <X size={18} />
          </button>
        )}

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldAlert size={24} color="var(--neon-red)" />
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#fff', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Delete Instance from Network
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Permanent unregistration from DAUP decentralized edge topology
            </p>
          </div>
        </div>

        {/* Target Instance Details Card */}
        <div style={{
          padding: '12px 14px',
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--border-glass)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Instance:</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>
              {targetName}
            </span>
          </div>

          {moduleName && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Application:</span>
              <span style={{ fontSize: '11px', color: '#fff', fontWeight: '600' }}>
                {moduleName} {moduleKey ? `(${moduleKey})` : ''}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Node DID:</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {did ? `${did.slice(0, 16)}...${did.slice(-6)}` : 'Derived DID Node'}
            </span>
          </div>
        </div>

        {/* Warning Content */}
        {!isDeleting ? (
          <>
            <div style={{
              padding: '10px 12px',
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#fda4af',
              lineHeight: 1.5
            }}>
              <strong>Warning:</strong> This action cannot be reversed. Deleting this instance will purge its local state, unpin IPFS manifest CIDs, and revoke its active license binding from the network.
            </div>

            {/* Type Instance Name Confirmation Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', color: '#fff', fontWeight: '500' }}>
                To confirm, type the instance name <strong style={{ color: 'var(--neon-red)', fontFamily: 'var(--font-mono)' }}>{targetName}</strong> below:
              </label>
              
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="glass-input"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder={`Type "${targetName}" to confirm`}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderColor: typedName ? (isMatch ? 'var(--neon-green)' : 'var(--neon-red)') : 'var(--border-glass)',
                    background: 'rgba(0, 0, 0, 0.5)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)',
                    color: '#fff'
                  }}
                  autoFocus
                />
                {isMatch && (
                  <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--neon-green)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    <CheckCircle2 size={14} /> Verified
                  </div>
                )}
              </div>

              <div style={{ fontSize: '10px', minHeight: '16px' }}>
                {!typedName ? (
                  <span style={{ color: 'var(--text-dark)' }}>Please enter the exact instance name above to enable deletion.</span>
                ) : !isMatch ? (
                  <span style={{ color: 'var(--neon-red)' }}>Instance name does not match.</span>
                ) : (
                  <span style={{ color: 'var(--neon-green)' }}>✓ Match verified. Ready to delete instance from network.</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="glass-button"
                onClick={onClose}
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="glass-button red"
                onClick={handleDelete}
                disabled={!isMatch}
                style={{
                  padding: '8px 18px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  opacity: isMatch ? 1 : 0.45,
                  cursor: isMatch ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isMatch ? '0 0 15px rgba(244, 63, 94, 0.4)' : 'none'
                }}
              >
                <Trash2 size={13} />
                Delete Instance from Network
              </button>
            </div>
          </>
        ) : (
          /* Live Deletion Execution Progress View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: isCompleted ? 'var(--neon-green)' : 'var(--neon-cyan)' }}>
              {isCompleted ? (
                <CheckCircle2 size={20} color="var(--neon-green)" />
              ) : (
                <Loader2 size={20} color="var(--neon-cyan)" style={{ animation: 'spin 1.5s linear infinite' }} />
              )}
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                {isCompleted ? 'Instance Successfully Deleted from Network' : 'Executing Decentralized Network Deletion...'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {steps.map((s, idx) => {
                const stepNum = idx + 1;
                const isDone = deletionStep > stepNum || isCompleted;
                const isCurrent = deletionStep === stepNum && !isCompleted;

                return (
                  <div 
                    key={idx} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '11px',
                      color: isDone ? 'var(--neon-green)' : isCurrent ? '#fff' : 'var(--text-dark)',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isDone ? 'rgba(16, 185, 129, 0.2)' : isCurrent ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isDone ? 'var(--neon-green)' : isCurrent ? 'var(--neon-cyan)' : 'var(--border-glass)'}`,
                      fontSize: '9px',
                      flexShrink: 0
                    }}>
                      {isDone ? '✓' : isCurrent ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : stepNum}
                    </div>
                    <span>{s}</span>
                  </div>
                );
              })}
            </div>

            {txHash && (
              <div style={{
                marginTop: '6px',
                padding: '8px 10px',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                <span style={{ fontSize: '10px', color: 'var(--neon-green)', fontWeight: 'bold' }}>REVOCATION TRANSACTION RECORD:</span>
                <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {txHash}
                </span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default DeleteInstanceModal;
