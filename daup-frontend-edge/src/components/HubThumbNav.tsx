import React from 'react';
import { Home, LayoutGrid, MapPin, User } from 'lucide-react';
import {
  NAV_APPS_LABEL,
  NAV_HOME_LABEL,
  NAV_PLACES_LABEL,
  NAV_YOU_LABEL
} from '../hub/copy';
import type { HubPane } from '../hub/hubPane';

const TABS: { pane: HubPane; label: string; Icon: typeof Home; testId: string }[] = [
  { pane: 'home', label: NAV_HOME_LABEL, Icon: Home, testId: 'hub-nav-home' },
  { pane: 'places', label: NAV_PLACES_LABEL, Icon: MapPin, testId: 'hub-nav-places' },
  { pane: 'apps', label: NAV_APPS_LABEL, Icon: LayoutGrid, testId: 'hub-nav-apps' },
  { pane: 'you', label: NAV_YOU_LABEL, Icon: User, testId: 'hub-nav-you' }
];

export function HubThumbNav({
  pane,
  onPane
}: {
  pane: HubPane;
  onPane: (pane: HubPane) => void;
}) {
  return (
    <nav className="hub-thumb-nav" data-testid="hub-thumb-nav" aria-label="Hub">
      {TABS.map(tab => {
        const current = pane === tab.pane;
        return (
          <button
            key={tab.pane}
            type="button"
            className={current ? 'hub-thumb-tab is-current' : 'hub-thumb-tab'}
            data-testid={tab.testId}
            aria-current={current ? 'page' : undefined}
            onClick={() => onPane(tab.pane)}
          >
            <tab.Icon size={20} aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

export default HubThumbNav;
