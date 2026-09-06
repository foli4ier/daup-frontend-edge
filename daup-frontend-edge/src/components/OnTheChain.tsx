import React from 'react';
import { ON_THE_CHAIN_EMPTY, ON_THE_CHAIN_KICKER } from '../hub/copy';
import {
  chainAppLabel,
  chainPlaceWhere,
  groupPlacesOnTheChain
} from '../hub/placeDirectory';
import { PlatformPlaceRecord } from '../stores/identityStore';

export function OnTheChainSection({ places }: { places: PlatformPlaceRecord[] }) {
  const groups = groupPlacesOnTheChain(places);

  return (
    <section className="on-the-chain" data-testid="on-the-chain">
      <div className="section-head">
        <span className="kicker">{ON_THE_CHAIN_KICKER}</span>
        <span className="rule" />
      </div>

      {groups.length === 0 ? (
        <p className="caption" data-testid="on-the-chain-empty">{ON_THE_CHAIN_EMPTY}</p>
      ) : (
        <div className="chain-tree">
          {groups.map(appGroup => (
            <div
              key={appGroup.app}
              className="chain-app"
              data-testid={`chain-app-${appGroup.app}`}
            >
              <p className="chain-group-label">{appGroup.appLabel}</p>
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
                              <h3>{place.placeName}</h3>
                              <p>
                                {[chainPlaceWhere(place), chainAppLabel(place.app)]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
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
      )}
    </section>
  );
}

export default OnTheChainSection;
