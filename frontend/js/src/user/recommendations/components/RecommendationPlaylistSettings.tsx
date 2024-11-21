import * as React from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCode,
  faCog,
  faPlayCircle,
  faRss,
  faSave,
} from "@fortawesome/free-solid-svg-icons";
import { sanitize } from "dompurify";
import NiceModal from "@ebay/nice-modal-react";
import { Link } from "react-router-dom";
import { getPlaylistExtension, getPlaylistId } from "../../../playlists/utils";
import { getBaseUrl, preciseTimestamp } from "../../../utils/utils";
import GlobalAppContext from "../../../utils/GlobalAppContext";
import ListenPayloadModal from "../../../common/listens/ListenPayloadModal";
import PlaylistMenu from "../../../playlists/components/PlaylistMenu";
import SyndicationFeedModal from "../../../components/SyndicationFeedModal";

export type RecommendationPlaylistSettingsProps = {
  playlist: JSPFPlaylist;
};

export default function RecommendationPlaylistSettings({
  playlist,
}: RecommendationPlaylistSettingsProps) {
  const { APIService, currentUser } = React.useContext(GlobalAppContext);
  const playlistId = getPlaylistId(playlist);
  const extension = getPlaylistExtension(playlist);
  const { track } = playlist;
  const [firstListen, ...otherListens] = track;
  const { copyPlaylist } = APIService;

  const onCopyPlaylist = React.useCallback(async (): Promise<void> => {
    if (!currentUser?.auth_token) {
      toast.error("You must be logged in for this operation");
      return;
    }
    if (!playlistId?.length) {
      toast.error("No playlist to copy; missing a playlist ID");
      return;
    }
    try {
      const newPlaylistId = await copyPlaylist(
        currentUser.auth_token,
        playlistId
      );
      toast.success(
        <>
          Saved as playlist&ensp;
          <Link to={`/playlist/${newPlaylistId}/`}>{newPlaylistId}</Link>
        </>
      );
    } catch (error) {
      toast.error(error.message);
    }
  }, [playlistId, currentUser, copyPlaylist]);

  const play = React.useCallback(() => {
    window.postMessage(
      { brainzplayer_event: "play-listen", payload: firstListen },
      window.location.origin
    );
  }, [firstListen]);

  return (
    <div className="playlist-settings card">
      <div className="playlist-settings-header">
        <div className="title">{playlist.title}</div>
        <div>
          {track.length} tracks | Updated {preciseTimestamp(playlist.date)}
          {extension?.additional_metadata?.expires_at &&
            ` | Deleted in ${preciseTimestamp(
              extension?.additional_metadata?.expires_at,
              "timeAgo"
            )}`}
        </div>
      </div>
      <div>
        <div className="buttons">
          <button
            className="btn btn-icon btn-info"
            onClick={play}
            type="button"
          >
            <FontAwesomeIcon icon={faPlayCircle} title="Play this playlists" />
          </button>
          <button
            className="btn btn-icon btn-info"
            onClick={onCopyPlaylist}
            type="button"
          >
            <FontAwesomeIcon icon={faSave} title="Save to my playlists" />
          </button>
          <button
            className="btn btn-icon btn-info"
            onClick={() => {
              NiceModal.show(ListenPayloadModal, {
                listen: playlist,
              });
            }}
            data-toggle="modal"
            data-target="#ListenPayloadModal"
            type="button"
          >
            <FontAwesomeIcon icon={faCode} title="Inspect playlist" />
          </button>
          <span className="dropdown">
            <button
              className="dropdown-toggle btn btn-icon btn-info"
              type="button"
              id="playlistOptionsDropdown"
              data-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="true"
            >
              <FontAwesomeIcon icon={faCog} title="More options" />
            </button>
            <PlaylistMenu playlist={playlist} />
          </span>
          <button
            type="button"
            className="btn btn-icon btn-info rss-button"
            data-toggle="modal"
            data-target="#SyndicationFeedModal"
            title="Subscribe to syndication feed (RSS)"
            onClick={() => {
              const sourcePatch =
                extension?.additional_metadata?.algorithm_metadata.source_patch;

              NiceModal.show(SyndicationFeedModal, {
                feedTitle: `Recommendations`,
                options: [],
                baseUrl: `${getBaseUrl()}/syndication-feed/user/${
                  currentUser?.name
                }/recommendations?recommendation_type=${sourcePatch}`,
              });
            }}
          >
            <FontAwesomeIcon icon={faRss} size="sm" />
          </button>
        </div>
        <div>
          {extension?.public ? "Public" : "Private"} playlist by&nbsp;
          {playlist.creator} |{" "}
          {extension?.created_for && `For ${extension?.created_for}`}
          <br />
          <Link to={`/playlist/${playlistId}/`}>Link to this playlist</Link>
        </div>
        <hr />
        {playlist.annotation && (
          <>
            <div
              // Sanitize the HTML string before passing it to dangerouslySetInnerHTML
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: sanitize(playlist.annotation),
              }}
            />
            {/* <hr /> */}
          </>
        )}
      </div>
    </div>
  );
}
