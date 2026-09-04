import React, { useEffect, useState } from 'react';
import {
  DELETE_HOUSE_BODY,
  DELETE_HOUSE_CANCEL_LABEL,
  DELETE_HOUSE_CONFIRM_LABEL,
  DELETE_HOUSE_TITLE,
  TYPE_THE_PLACE_NAME,
  houseNameMatchesConfirm
} from '../hub/copy';

export interface DeleteHouseModalProps {
  isOpen: boolean;
  houseName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteHouseModal: React.FC<DeleteHouseModalProps> = ({
  isOpen,
  houseName,
  onClose,
  onConfirm
}) => {
  const [typedName, setTypedName] = useState('');

  useEffect(() => {
    if (isOpen) setTypedName('');
  }, [isOpen]);

  if (!isOpen) return null;

  const targetName = (houseName || '').trim();
  const isMatch = houseNameMatchesConfirm(typedName, targetName);

  const confirmDelete = () => {
    if (!isMatch) return;
    onConfirm();
  };

  return (
    <div
      className="owner-modal-overlay"
      data-testid="delete-house-modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="owner-modal owner-modal-narrow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-house-title"
      >
        <div className="owner-modal-header">
          <div>
            <h2 id="delete-house-title">{DELETE_HOUSE_TITLE}</h2>
            <p className="caption">
              This takes {targetName} off your hub. Type the exact place name to confirm.
            </p>
          </div>
        </div>

        <div className="owner-modal-body">
          <div className="owner-field">
            <label htmlFor="delete-house-name">{TYPE_THE_PLACE_NAME}</label>
            <input
              id="delete-house-name"
              data-testid="delete-house-name"
              type="text"
              value={typedName}
              onChange={(event) => setTypedName(event.target.value)}
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="owner-modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              data-testid="delete-house-cancel"
              onClick={onClose}
            >
              {DELETE_HOUSE_CANCEL_LABEL}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              data-testid="delete-house-confirm"
              onClick={confirmDelete}
              disabled={!isMatch}
            >
              {DELETE_HOUSE_CONFIRM_LABEL}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteHouseModal;
