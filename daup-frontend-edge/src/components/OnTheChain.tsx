import React, { useState } from 'react';
import {
  CHAIN_BACK_LABEL,
  ON_THE_CHAIN_EMPTY,
  ON_THE_CHAIN_KICKER,
  PUBLIC_PLACE_BODY,
  RESERVE_A_TABLE_LABEL,
  SAME_CHAIN_CAPTION,
  SEE_THE_MENU_LABEL
} from '../hub/copy';
import { buildEatOutPlaceUrl } from '../hub/eatoutUrls';
import {
  chainAppLabel,
  chainPlaceWhere,
  groupPlacesOnTheChain
} from '../hub/placeDirectory';
import { PlatformAppId, PlatformPlaceRecord } from '../stores/identityStore';

type ChainFocus =
  | { kind: 'tree' }
  | { kind: 'app'; app: PlatformAppId }
  | { kind: 'place'; place: PlatformPlaceRecord };

function PlaceTree({
  places,
  onOpenApp,
  onOpenPlace
}: {
  places: PlatformPlaceRecord[];
  onOpenApp: (app: PlatformAppId) => void;
  onOpenPlace: (place: PlatformPlaceRecord) => void;
}) {
  const groups = groupPlacesOnTheChain(places);

  return (
    <div className="chain-tree">
      {groups.map(appGroup => (
        <div
          key={appGroup.app}
          className="chain-app"
          data-testid={`chain-app-${appGroup.app}`}
        >
          <button
            type="button"
            className="chain-group-door"
            data-testid={`chain-app-door-${appGroup.app}`}
            onClick={() => onOpenApp(appGroup.app)}
          >
            {appGroup.appLabel}
          </button>
          {appGroup.countries.map(country => (
            <div key={country.country || 'country'} className="chain-country">
              {country.country ? (
                <p className="chain-group-label">{country.country}</p>
              ) : null}
              {country.regions.map(region => (
                <div key={region.region || 'region'} className="chain-region">
                  {region.region ? (
                    <p className="chain-group-label">{region.region}</p>
                  ) : null}
                  {region.cities.map(city => (
                    <div key={city.city || 'city'} className="chain-city">
                      {city.city ? (
                        <p className="chain-group-label">{city.city}</p>
                      ) : null}
                      {city.places.map(place => (
                        <article
                          key={`${place.app}-${place.placeName}`}
                          className="card chain-place"
                          data-testid="on-the-chain-place"
                          data-place-name={place.placeName}
                          data-app={place.app}
                        >
                          <button
                            type="button"
                            className="chain-place-door"
                            onClick={() => onOpenPlace(place)}
                          >
                            <h3>{place.placeName}</h3>
                            <p>
                              {[chainPlaceWhere(place), chainAppLabel(place.app)]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </button>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PublicPlaceCard({
  place,
  onBack
}: {
  place: PlatformPlaceRecord;
  onBack: () => void;
}) {
  const isEatery = place.app === 'eatery';
  const menuHref = isEatery ? buildEatOutPlaceUrl({ placeName: place.placeName, focus: 'menu' }) : '';
  const reserveHref = isEatery ? buildEatOutPlaceUrl({ placeName: place.placeName, focus: 'book' }) : '';

  return (
    <article className="card place-public-card" data-testid="place-public-card" data-place-name={place.placeName}>
      <button type="button" className="owner-quiet" data-testid="chain-back" onClick={onBack}>
        {CHAIN_BACK_LABEL}
      </button>
      <h3 data-testid="place-public-name">{place.placeName}</h3>
      <p>{[chainPlaceWhere(place), chainAppLabel(place.app)].filter(Boolean).join(' · ')}</p>
      {isEatery ? (
        <>
          <p className="caption">{PUBLIC_PLACE_BODY}</p>
          <div className="place-public-actions">
            <a
              className="btn btn-primary btn-wide"
              href={menuHref}
              data-testid="see-the-menu"
            >
              {SEE_THE_MENU_LABEL}
            </a>
            <a
              className="btn btn-outline btn-wide"
              href={reserveHref}
              data-testid="reserve-a-table"
            >
              {RESERVE_A_TABLE_LABEL}
            </a>
          </div>
        </>
      ) : (
        <p className="caption" data-testid="same-chain-caption">{SAME_CHAIN_CAPTION}</p>
      )}
    </article>
  );
}

export function OnTheChainSection({ places }: { places: PlatformPlaceRecord[] }) {
  const [focus, setFocus] = useState<ChainFocus>({ kind: 'tree' });
  const groups = groupPlacesOnTheChain(places);
  const appPlaces = focus.kind === 'app'
    ? places.filter(place => place.app === focus.app)
    : places;

  return (
    <section className="on-the-chain" data-testid="on-the-chain">
      <div className="section-head">
        <span className="kicker">{ON_THE_CHAIN_KICKER}</span>
        <span className="rule" />
      </div>

      {groups.length === 0 ? (
        <p className="caption" data-testid="on-the-chain-empty">{ON_THE_CHAIN_EMPTY}</p>
      ) : focus.kind === 'place' ? (
        <PublicPlaceCard
          place={focus.place}
          onBack={() => setFocus({ kind: 'app', app: focus.place.app })}
        />
      ) : focus.kind === 'app' ? (
        <>
          <button
            type="button"
            className="owner-quiet"
            data-testid="chain-back"
            onClick={() => setFocus({ kind: 'tree' })}
          >
            {CHAIN_BACK_LABEL}
          </button>
          <p className="chain-group-label">{chainAppLabel(focus.app)}</p>
          <PlaceTree
            places={appPlaces}
            onOpenApp={() => undefined}
            onOpenPlace={place => setFocus({ kind: 'place', place })}
          />
        </>
      ) : (
        <PlaceTree
          places={places}
          onOpenApp={app => setFocus({ kind: 'app', app })}
          onOpenPlace={place => setFocus({ kind: 'place', place })}
        />
      )}
    </section>
  );
}

export default OnTheChainSection;
