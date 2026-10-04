import React, { useState } from 'react';
import { AppShelfMark } from './AppShelfTile';
import {
  ASK_ASK_LABEL,
  ASK_BODY_LABEL,
  ASKED_LABEL,
  CHAIN_BACK_LABEL,
  NO_APPS_YET
} from '../hub/copy';
import {
  ASK_APP_PAGES,
  AskPageNode,
  askPageStill,
  walkAsk
} from '../hub/askPages';
import { raiseAskRequest } from '../hub/askStore';
import type { ShopApp } from '../hub/places';

export const AskForEnhancementView: React.FC<{
  apps: ShopApp[];
  pages?: Record<string, AskPageNode[] | undefined>;
}> = ({ apps, pages }) => {
  const [appId, setAppId] = useState<string | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [asked, setAsked] = useState(false);

  const app = apps.find(row => row.id === appId) || null;
  const step = walkAsk({
    appId,
    appLabel: app?.title,
    path,
    pages: pages || ASK_APP_PAGES
  });

  const goBack = () => {
    setAsked(false);
    setBody('');
    if (path.length) {
      setPath(path.slice(0, -1));
      return;
    }
    setAppId(null);
  };

  const pickApp = (next: ShopApp) => {
    setAsked(false);
    setBody('');
    setPath([]);
    setAppId(next.id);
  };

  const pickChoice = (node: AskPageNode) => {
    setAsked(false);
    setBody('');
    setPath(current => [...current, node.id]);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (step.kind !== 'page' || !appId) return;
    const line = body.trim();
    if (!line) return;
    const result = raiseAskRequest({
      app: appId,
      title: line,
      pageId: step.page.id,
      pageLabel: step.page.label
    });
    if (!result.ok) return;
    setBody('');
    setAsked(true);
  };

  if (step.kind === 'apps') {
    return (
      <section className="ask-page" data-testid="ask-page">
        {apps.length === 0 ? (
          <p className="caption" data-testid="ask-no-apps">{NO_APPS_YET}</p>
        ) : (
          <div className="ask-app-grid" data-testid="ask-app-grid">
            {apps.map(row => (
              <button
                key={row.id}
                type="button"
                className="shelf-tile"
                data-testid={`ask-app-${row.id}`}
                data-app-id={row.id}
                onClick={() => pickApp(row)}
              >
                <AppShelfMark id={row.id} />
                <span className="shelf-tile-name">{row.title}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (step.kind === 'choices') {
    return (
      <section className="ask-page" data-testid="ask-page">
        <button type="button" className="owner-quiet ask-back" data-testid="ask-back" onClick={goBack}>
          {CHAIN_BACK_LABEL}
        </button>
        <div className="ask-choices" data-testid="ask-choices">
          {step.nodes.map(node => (
            <button
              key={node.id}
              type="button"
              className="ask-choice"
              data-testid={`ask-choice-${node.id}`}
              onClick={() => pickChoice(node)}
            >
              {node.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  const still = askPageStill(step.page);
  return (
    <section className="ask-page" data-testid="ask-page">
      <button type="button" className="owner-quiet ask-back" data-testid="ask-back" onClick={goBack}>
        {CHAIN_BACK_LABEL}
      </button>
      <h1 className="ask-title" data-testid="ask-page-title">{step.page.label}</h1>
      {still ? (
        <img className="ask-still" data-testid="ask-still" src={still} alt={step.page.label} />
      ) : null}
      <form className="ask-raise" data-testid="ask-raise-form" onSubmit={submit}>
        <div className="owner-field">
          <label htmlFor="ask-body">{ASK_BODY_LABEL}</label>
          <input
            id="ask-body"
            data-testid="ask-body"
            type="text"
            value={body}
            onChange={event => {
              setBody(event.target.value);
              if (asked) setAsked(false);
            }}
          />
        </div>
        <button type="submit" className="btn btn-primary ask-submit" data-testid="ask-ask">
          {ASK_ASK_LABEL}
        </button>
      </form>
      {asked ? <p className="caption" data-testid="ask-asked">{ASKED_LABEL}</p> : null}
    </section>
  );
};

export default AskForEnhancementView;
