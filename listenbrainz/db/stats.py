"""This module contains functions to insert and retrieve statistics
   calculated from Apache Spark into the database.
"""

# listenbrainz-server - Server for the ListenBrainz project.
#
# Copyright (C) 2017 MetaBrainz Foundation Inc.
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License along
# with this program; if not, write to the Free Software Foundation, Inc.,
# 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA


import json
from datetime import datetime
from typing import Optional

import sqlalchemy

import psycopg2
import ujson
from psycopg2 import sql
from psycopg2.extras import execute_values
from requests import HTTPError
from sentry_sdk import start_span

from data.model.common_stat import StatRange, StatApi
from data.model.user_artist_map import UserArtistMapRecord
from data.model.user_daily_activity import DailyActivityRecord
from data.model.user_entity import EntityRecord
from data.model.user_listening_activity import ListeningActivityRecord
from flask import current_app
from listenbrainz import db
from pydantic import ValidationError

from listenbrainz.db import couchdb


# sitewide statistics are stored in the user statistics table
# as statistics for a special user with the following user_id.
# Note: this is the id from LB's "user" table and *not musicbrainz_row_id*.
SITEWIDE_STATS_USER_ID = 15753


def insert_stats_in_couchdb(database: str, from_ts: int, to_ts: int, values: list[dict]):
    """ Insert stats in couchdb.

        Args:
            database: the name of the database to insert the stat in
            from_ts: the start of the time period for which the stat is
            to_ts: the end of the time period for which the stat is
            values: list with each item as stat for 1 user
    """
    with start_span(op="processing", description="add _id, from_ts, to_ts and last_updated to docs"):
        for doc in values:
            doc["_id"] = str(doc["user_id"])
            doc["from_ts"] = from_ts
            doc["to_ts"] = to_ts
            doc["last_updated"] = datetime.now().isoformat()

    couchdb.insert_data(database, values)


def get_entity_stats(user_id, stats_type, stats_range, stats_model) -> Optional[StatApi]:
    """ Retrieve stats for the given user, stats range and stats type.

        Args:
            user_id: ListenBrainz id of the user
            stats_range: time period to retrieve stats for
            stats_type: the stat to retrieve
            stats_model: the pydantic model for the stats
    """
    prefix = f"{stats_type}_{stats_range}"
    try:
        data = couchdb.fetch_data(prefix, user_id)
        if data is not None:
            return StatApi[stats_model](
                user_id=int(user_id),
                from_ts=data["from_ts"],
                to_ts=data["to_ts"],
                count=data.get("count"),  # all stats may not have a count field
                stats_range=stats_range,
                data=data["data"],
                last_updated=data["last_updated"]
            )
    except HTTPError as e:
        current_app.logger.error(f"{e}. Response: %s", e.response.json(), exc_info=True)
    except (ValidationError, KeyError) as e:
        current_app.logger.error(
            f"{e}. Occurred while processing {stats_range} top artists for user_id: {user_id}"
            f" and data: {ujson.dumps(data, indent=4)}", exc_info=True)
    return None


def insert_sitewide_stats(database: str, from_ts: int, to_ts: int, data: dict):
    """ Insert sitewide stats in couchdb.

        Args:
            database: the name of the database to insert the stat in
            from_ts: the start of the time period for which the stat is
            to_ts: the end of the time period for which the stat is
            data: sitewide stat to insert
    """
    data["user_id"] = SITEWIDE_STATS_USER_ID
    insert_stats_in_couchdb(database, from_ts, to_ts, [data])
