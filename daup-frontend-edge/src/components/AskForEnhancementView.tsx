import React, { useMemo, useState } from 'react';
import { useUserProfile } from '../context/UserProfileContext';
import {
  ASK_ALL_APPS,
  ASK_BACK_LABEL,
  ASK_EMPTY,
  ASK_FOR_ENHANCEMENT_LABEL,
  ASK_KIND_ENHANCEMENT,
  ASK_KIND_LABEL,
  ASK_MORE_LABEL,
  ASK_NEEDED_LABEL,
  ASK_PAGE_BODY,
  ASK_PICK_AN_APP,
  ASK_RAISE_KICKER,
  ASK_REQUESTS_KICKER,
  ASK_SEND_LABEL,
  ASK_SHOW_LABEL,
  ASK_WHICH_APP_LABEL
} from '../hub/copy';
import {
  ASK_APP_CHOICES,
  ASK_KINDS,
  AskAppFilter,
  AskKind,
  askAppChoiceLabel,
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
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
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
      title,
      detail,
      houseName
    });
    if (!result.ok) {
      if (result.reason === 'app') setAppError(ASK_PICK_AN_APP);
      return;
    }
    setAppError('');
    setTitle('');
    setDetail('');
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
      <p className="caption">{ASK_PAGE_BODY}</p>

      <form className="card ask-raise" onSubmit={submit} data-testid="ask-raise-form">
        <div className="section-head">
          <span className="kicker">{ASK_RAISE_KICKER}</span>
          <span className="rule" />
        </div>

        <div className="owner-field">
          <label htmlFor="ask-which-app">{ASK_WHICH_APP_LABEL}</label>
          <select
            id="ask-which-app"
            data-testid="ask-which-app"
            required
            value={app}
            onChange={(event) => {
              setApp(event.target.value);
              if (event.target.value) setAppError('');
            }}
          >
            <option value="">{ASK_WHICH_APP_LABEL}</option>
            {ASK_APP_CHOICES.map(choice => (
              <option key={choice.id} value={choice.id}>
                {askAppChoiceLabel(choice.id)}
              </option>
            ))}
          </select>
          {appError ? (
            <p className="wizard-error" role="alert" data-testid="ask-app-error">
              {appError}
            </p>
          ) : null}
        </div>

        <div className="owner-field">
          <label htmlFor="ask-kind">{ASK_KIND_LABEL}</label>
          <select
            id="ask-kind"
            data-testid="ask-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as AskKind)}
          >
            {ASK_KINDS.map(row => (
              <option key={row} value={row}>{row}</option>
            ))}
          </select>
        </div>

        <div className="owner-field">
          <label htmlFor="ask-needed">{ASK_NEEDED_LABEL}</label>
          <input
            id="ask-needed"
            data-testid="ask-needed"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="owner-field">
          <label htmlFor="ask-more">{ASK_MORE_LABEL}</label>
          <textarea
            id="ask-more"
            data-testid="ask-more"
            rows={4}
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-wide" data-testid="ask-send">
          {ASK_SEND_LABEL}
        </button>
      </form>

      <section className="ask-list" data-testid="ask-list">
        <div className="section-head">
          <span className="kicker">{ASK_REQUESTS_KICKER}</span>
          <span className="rule" />
        </div>

        <div className="owner-field ask-filter">
          <label htmlFor="ask-app-filter">{ASK_SHOW_LABEL}</label>
          <select
            id="ask-app-filter"
            data-testid="ask-app-filter"
            value={filterApp}
            onChange={(event) => setFilterApp(event.target.value as AskAppFilter)}
          >
            <option value="all">{ASK_ALL_APPS}</option>
            {ASK_APP_CHOICES.map(choice => (
              <option key={choice.id} value={choice.id}>
                {choice.label}
              </option>
            ))}
          </select>
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
              {item.detail ? <p>{item.detail}</p> : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
};

export default AskForEnhancementView;
