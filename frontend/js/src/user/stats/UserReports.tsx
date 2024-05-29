import * as React from "react";

import {
  faGlobe,
  faInfoCircle,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useLoaderData, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";

import Pill from "../../components/Pill";
import UserListeningActivity from "./components/UserListeningActivity";
import UserTopEntity from "./components/UserTopEntity";
import UserDailyActivity from "./components/UserDailyActivity";
import UserArtistMap from "./components/UserArtistMap";
import { getAllStatRanges } from "./utils";
import GlobalAppContext from "../../utils/GlobalAppContext";

export type UserReportsProps = {
  user?: ListenBrainzUser;
};

export type UserReportsState = {
  range: UserStatsAPIRange;
  user?: ListenBrainzUser;
};

type UserReportsLoaderData = UserReportsProps;

export default function UserReports(props: UserReportsProps) {
  const { user = undefined } = props;

  // Context
  const { APIService, currentUser } = React.useContext(GlobalAppContext);

  // Router
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const range = searchParams.get("range") as UserStatsAPIRange;

  React.useEffect(() => {
    if (!range || !getAllStatRanges().has(range)) {
      setSearchParams({ range: "week" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const handleRangeChange = (newRange: UserStatsAPIRange) => {
    setSearchParams({ range: newRange });
  };

  const ranges = getAllStatRanges();
  const userOrLoggedInUser: string | undefined =
    user?.name ?? currentUser?.name;

  const userStatsTitle =
    user?.name === currentUser?.name ? "Your" : `${userOrLoggedInUser}'s`;

  const apiUrl = APIService.APIBaseURI;

  return (
    <div>
      <Helmet>
        <title>{userOrLoggedInUser ? userStatsTitle : "Sitewide"} Stats</title>
      </Helmet>
      <div className="tertiary-nav dragscroll">
        <div>
          {Array.from(ranges, ([stat_type, stat_name]) => {
            return (
              <Pill
                key={`${stat_type}-${stat_name}`}
                active={range === stat_type}
                type="secondary"
                onClick={() => handleRangeChange(stat_type)}
              >
                {stat_name}
              </Pill>
            );
          })}
        </div>
        <div>
          {Boolean(userOrLoggedInUser) && (
            <button
              type="button"
              onClick={() => {
                navigate(
                  `/user/${
                    user?.name ?? currentUser?.name
                  }/stats/?range=${range}`
                );
              }}
              className={`pill secondary ${user ? "active" : ""}`}
            >
              <FontAwesomeIcon icon={faUser} />{" "}
              {user?.name ?? currentUser?.name}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              navigate(`/statistics/?range=${range}`);
            }}
            className={`pill secondary ${!user ? "active" : ""}`}
          >
            <FontAwesomeIcon icon={faGlobe} /> Global
          </button>
        </div>
      </div>
      <small>
        <FontAwesomeIcon icon={faInfoCircle} />
        &nbsp;
        <a
          href="https://listenbrainz.readthedocs.io/en/latest/general/data-update-intervals.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          How often are my stats updated?
        </a>
      </small>
      <section id="listening-activity">
        <UserListeningActivity range={range} apiUrl={apiUrl} user={user} />
      </section>
      <section id="top-entity">
        <div className="row">
          <div className="col-md-4">
            <UserTopEntity
              range={range}
              entity="artist"
              apiUrl={apiUrl}
              user={user}
              terminology="artist"
            />
          </div>
          <div className="col-md-4">
            <UserTopEntity
              range={range}
              entity="release-group"
              apiUrl={apiUrl}
              user={user}
              terminology="album"
            />
          </div>
          <div className="col-md-4">
            <UserTopEntity
              range={range}
              entity="recording"
              apiUrl={apiUrl}
              user={user}
              terminology="track"
            />
          </div>
        </div>
      </section>
      {user && (
        <section id="daily-activity">
          <UserDailyActivity range={range} apiUrl={apiUrl} user={user} />
        </section>
      )}
      <section id="artist-origin">
        <UserArtistMap range={range} apiUrl={apiUrl} user={user} />
      </section>
    </div>
  );
}

export function UserReportsWrapper() {
  const data = useLoaderData() as UserReportsLoaderData;
  return <UserReports user={data?.user} />;
}
