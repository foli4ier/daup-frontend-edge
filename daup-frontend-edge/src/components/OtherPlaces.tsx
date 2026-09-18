import React, { useMemo, useState } from 'react';
import {
  CHAIN_APP_CHAT,
  CHAIN_BACK_LABEL,
  COMING_DOT_LABEL,
  COMING_KICKER,
  FILTER_ALL_LABEL,
  FILTER_COUNTRY_LABEL,
  FILTER_REGION_LABEL,
  FILTER_TOWN_LABEL,
  OTHER_PLACES_EMPTY,
  OTHER_PLACES_KICKER,
  RESERVE_A_TABLE_LABEL,
  SEE_THE_MENU_LABEL,
  otherPlacesSourceLabel,
  subscribedCountLabel
} from '../hub/copy';
import { eatoutPlaceHrefs } from '../hub/eatoutUrls';
import {
  chainAppLabel,
  chainPlaceWhere,
  filterOtherPlaces,
  listOtherPlacesAppCards,
  listOtherPlacesForApp,
  uniqueFilterValues,
  type OtherPlaceRecord,
  type OtherPlacesAppId
} from '../hub/placeDirectory';

type OtherFocus =
  | { kind: 'apps' }
  | { kind: 'app'; app: OtherPlacesAppId }
  | { kind: 'place'; place: OtherPlaceRecord };

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="other-places-filter" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        data-testid={id}
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        <option value="">{FILTER_ALL_LABEL}</option>
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function PublicPlaceCard({
  place,
  onBack
}: {
  place: OtherPlaceRecord;
  onBack: () => void;
}) {
  const isEatery = place.app === 'eatery';
  const hrefs = isEatery ? eatoutPlaceHrefs(place.placeName) : null;
  const source = place.source === 'sample' ? 'Sample.' : 'On this hub.';

  return (
    <article className="card place-public-card" data-testid="place-public-card" data-place-name={place.placeName}>
      <button type="button" className="owner-quiet" data-testid="other-places-back" onClick={onBack}>
        {CHAIN_BACK_LABEL}
      </button>
      <h3 data-testid="place-public-name">{place.placeName}</h3>
      <p>{[chainPlaceWhere(place), chainAppLabel(place.app)].filter(Boolean).join(' · ')}</p>
      <p className="caption" data-testid="place-public-source">{source}</p>
      {isEatery ? (
        <>
          <div className="place-public-actions">
            <a
              className="btn btn-primary btn-wide"
              href={hrefs?.menu || ''}
              data-testid="see-the-menu"
              data-eatout-id={hrefs?.id}
              title={hrefs?.menu}
            >
              {SEE_THE_MENU_LABEL}
            </a>
            <a
              className="btn btn-outline btn-wide"
              href={hrefs?.book || ''}
              data-testid="reserve-a-table"
              data-eatout-id={hrefs?.id}
              title={hrefs?.book}
            >
              {RESERVE_A_TABLE_LABEL}
            </a>
          </div>
          <div className="place-public-chat">
            <button
              type="button"
              className="btn btn-outline btn-wide"
              data-testid="place-chat-coming"
              disabled
            >
              {CHAIN_APP_CHAT}
            </button>
            <p className="caption" data-testid="place-chat-coming-copy">{COMING_DOT_LABEL}</p>
          </div>
        </>
      ) : (
        <p className="caption" data-testid="other-place-coming">{COMING_DOT_LABEL}</p>
      )}
    </article>
  );
}

export function OtherPlacesView({
  ownerEmail,
  ownerPlaceNames
}: {
  ownerEmail?: string;
  ownerPlaceNames?: readonly string[];
}) {
  const owner = { email: ownerEmail, placeNames: ownerPlaceNames };
  const [focus, setFocus] = useState<OtherFocus>({ kind: 'apps' });
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [town, setTown] = useState('');
  const cards = listOtherPlacesAppCards(owner);
  const appPlaces = focus.kind === 'apps'
    ? []
    : listOtherPlacesForApp(focus.kind === 'place' ? focus.place.app : focus.app, owner);
  const countries = uniqueFilterValues(appPlaces, 'country');
  const regionPlaces = country ? appPlaces.filter(place => place.country === country) : appPlaces;
  const regions = uniqueFilterValues(regionPlaces, 'region');
  const townPlaces = region
    ? regionPlaces.filter(place => place.region === region)
    : regionPlaces;
  const towns = uniqueFilterValues(townPlaces, 'city');
  const filtered = useMemo(
    () => filterOtherPlaces(appPlaces, { country, region, town }),
    [appPlaces, country, region, town]
  );

  const openApp = (app: OtherPlacesAppId) => {
    setCountry('');
    setRegion('');
    setTown('');
    setFocus({ kind: 'app', app });
  };

  return (
    <section className="other-places" data-testid="other-places">
      <div className="section-head">
        <span className="kicker">{OTHER_PLACES_KICKER}</span>
        <span className="rule" />
      </div>

      {focus.kind === 'place' ? (
        <PublicPlaceCard
          place={focus.place}
          onBack={() => setFocus({ kind: 'app', app: focus.place.app })}
        />
      ) : focus.kind === 'app' ? (
        <>
          <button
            type="button"
            className="owner-quiet"
            data-testid="other-places-back"
            onClick={() => setFocus({ kind: 'apps' })}
          >
            {CHAIN_BACK_LABEL}
          </button>
          <p className="chain-group-label" data-testid="other-places-app-label">
            {cards.find(card => card.id === focus.app)?.title}
          </p>
          {!cards.find(card => card.id === focus.app)?.publicSurface ? (
            <p className="caption" data-testid="other-places-coming">{COMING_DOT_LABEL}</p>
          ) : (
            <>
              <div className="other-places-filters" data-testid="other-places-filters">
                <FilterSelect
                  id="filter-country"
                  label={FILTER_COUNTRY_LABEL}
                  value={country}
                  options={countries}
                  onChange={next => {
                    setCountry(next);
                    setRegion('');
                    setTown('');
                  }}
                />
                <FilterSelect
                  id="filter-region"
                  label={FILTER_REGION_LABEL}
                  value={region}
                  options={regions}
                  onChange={next => {
                    setRegion(next);
                    setTown('');
                  }}
                />
                <FilterSelect
                  id="filter-town"
                  label={FILTER_TOWN_LABEL}
                  value={town}
                  options={towns}
                  onChange={setTown}
                />
              </div>
              {filtered.length === 0 ? (
                <p className="caption" data-testid="other-places-empty">{OTHER_PLACES_EMPTY}</p>
              ) : (
                <div className="other-places-list" data-testid="other-places-list">
                  {filtered.map(place => (
                    <article
                      key={`${place.app}-${place.placeName}`}
                      className="card chain-place"
                      data-testid="other-places-place"
                      data-place-name={place.placeName}
                      data-app={place.app}
                      data-source={place.source}
                    >
                      <button
                        type="button"
                        className="chain-place-door"
                        onClick={() => setFocus({ kind: 'place', place })}
                      >
                        <h3>{place.placeName}</h3>
                        <p>{chainPlaceWhere(place)}</p>
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="other-places-apps" data-testid="other-places-apps">
          {cards.map(card => {
            const source = otherPlacesSourceLabel(card.liveCount, card.sampleCount);
            const body = card.publicSurface
              ? (
                <>
                  <p data-testid={`other-app-count-${card.id}`}>{subscribedCountLabel(card.total)}</p>
                  {source ? (
                    <p className="caption" data-testid={`other-app-source-${card.id}`}>{source}</p>
                  ) : null}
                </>
              )
              : (
                <p className="caption" data-testid={`other-app-coming-${card.id}`}>{COMING_DOT_LABEL}</p>
              );
            if (!card.publicSurface) {
              return (
                <article
                  className="card coming-card"
                  key={card.id}
                  data-testid={`other-app-${card.id}`}
                  data-public="false"
                >
                  <div className="card-top">
                    <div>
                      <h3>
                        {card.title} <span className="coming-flag">{COMING_KICKER}</span>
                      </h3>
                    </div>
                  </div>
                  {body}
                </article>
              );
            }
            return (
              <button
                type="button"
                className="card other-app-door"
                key={card.id}
                data-testid={`other-app-${card.id}`}
                data-public="true"
                onClick={() => openApp(card.id)}
              >
                <div className="card-top">
                  <div>
                    <h3>{card.title}</h3>
                  </div>
                </div>
                {body}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default OtherPlacesView;
