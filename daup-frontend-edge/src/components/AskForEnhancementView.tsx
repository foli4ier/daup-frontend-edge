import React, { useMemo, useState } from 'react';
import { useUserProfile } from '../context/UserProfileContext';
import {
  ASK_ALL_APPS,
  ASK_BACK_LABEL,
  ASK_BODY_LABEL,
  ASK_EMPTY,
  ASK_FOR_ENHANCEMENT_LABEL,
  ASK_KIND_ENHANCEMENT,
  ASK_KIND_WRONG,
  ASK_PICK_AN_APP,
  ASK_SEND_LABEL,
  ASK_WHICH_APP_LABEL
} from '../hub/copy';
import {
  ASK_APP_CHOICES,
  ASK_KINDS,
  AskAppFilter,
  AskAppId,
  AskKind,
  askAppLabel,
  canRaiseAsk,
  filterAsksByApp,
  loadAskRequests,
  raiseAskRequest
} from '../hub/askStore';

interface AskForEnhancementViewProps {
  onBack: () => void;
}

export const AskForEnhancementView: React.FC<AskForEnhancementViewProps> = ({ onBack }) => {
  const { activeWallet, instanceName } = useUserProfile();
  const houseName = (activeWallet?.legalName || instanceName || '').trim();

  const [app, setApp] = useState('');
  const [kind, setKind] = useState<AskKind>(ASK_KIND_ENHANCEMENT);
  const [body, setBody] = useState('');
  const [appError, setAppError] = useState('');
  const [filterApp, setFilterApp] = useState<AskAppFilter>('all');
  const [items, setItems] = useState(() => loadAskRequests());

  const visible = useMemo(() => filterAsksByApp(items, filterApp), [items, filterApp]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canRaiseAsk({ app })) {
      setAppError(ASK_PICK_AN_APP);
      return;
    }
    const result = raiseAskRequest({
      app,
      kind,
      title: body,
      houseName
    });
    if (!result.ok) {
      if (result.reason === 'app') setAppError(ASK_PICK_AN_APP);
      return;
    }
    setAppError('');
    setBody('');
    setKind(ASK_KIND_ENHANCEMENT);
    setApp('');
    setItems(loadAskRequests());
  };

  return (
    <div className="ask-page" data-testid="ask-page">
      <button
        type="button"
        className="owner-quiet ask-back"
        data-testid="ask-back"
        onClick={onBack}
      >
        {ASK_BACK_LABEL}
      </button>

      <h1 className="ask-title">{ASK_FOR_ENHANCEMENT_LABEL}</h1>

      <form className="card ask-raise" onSubmit={submit} data-testid="ask-raise-form">
        <fieldset className="ask-fieldset" data-testid="ask-which-app">
          <legend>{ASK_WHICH_APP_LABEL}</legend>
          <div className="ask-chips">
            {ASK_APP_CHOICES.map(choice => (
              <button
                key={choice.id}
                type="button"
                className="ask-chip"
                data-testid={`ask-app-${choice.id}`}
                aria-pressed={app === choice.id}
                onClick={() => {
                  setApp(choice.id);
                  setAppError('');
                }}
              >
                {choice.label}
              </button>
            ))}
          </div>
          {appError ? (
            <p className="wizard-error" role="alert" data-testid="ask-app-error">
              {appError}
            </p>
          ) : null}
        </fieldset>

        <div className="ask-chips" data-testid="ask-kinds">
          {ASK_KINDS.map(row => (
            <button
              key={row}
              type="button"
              className="ask-chip"
              data-testid={`ask-kind-${row === ASK_KIND_ENHANCEMENT ? 'enhancement' : row === ASK_KIND_WRONG ? 'wrong' : 'help'}`}
              aria-pressed={kind === row}
              onClick={() => setKind(row)}
            >
              {row}
            </button>
          ))}
        </div>

        <div className="owner-field">
          <label htmlFor="ask-body">{ASK_BODY_LABEL}</label>
          <textarea
            id="ask-body"
            data-testid="ask-body"
            rows={4}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-wide" data-testid="ask-send">
          {ASK_SEND_LABEL}
        </button>
      </form>

      <section className="ask-list" data-testid="ask-list">
        <div className="ask-chips" data-testid="ask-app-filter">
          <button
            type="button"
            className="ask-chip"
            data-testid="ask-filter-all"
            aria-pressed={filterApp === 'all'}
            onClick={() => setFilterApp('all')}
          >
            {ASK_ALL_APPS}
          </button>
          {ASK_APP_CHOICES.map(choice => (
            <button
              key={choice.id}
              type="button"
              className="ask-chip"
              data-testid={`ask-filter-${choice.id}`}
              aria-pressed={filterApp === choice.id}
              onClick={() => setFilterApp(choice.id as AskAppId)}
            >
              {choice.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="caption" data-testid="ask-empty">{ASK_EMPTY}</p>
        ) : (
          visible.map(item => (
            <article
              key={item.id}
              className="card ask-request"
              data-testid="ask-request"
              data-app={item.app}
              data-kind={item.kind}
            >
              <div className="ask-request-meta">
                <span className="ask-app-flag" data-testid="ask-request-app">
                  {askAppLabel(item.app)}
                </span>
                <span className="coming-flag">{item.kind}</span>
              </div>
              <h3>{item.title}</h3>
            </article>
          ))
        )}
      </section>
    </div>
  );
};

export default AskForEnhancementView;
