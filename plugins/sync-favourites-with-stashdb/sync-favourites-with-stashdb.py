import os
import requests
import stashapi.log as log  # Using stashapi log for structured logging
from stashapi.stashapp import StashInterface
import json
import sys

STASHDB_ENDPOINT = "https://stashdb.org/graphql"

def get_stash_interface(json_input):
  FRAGMENT_SERVER = json_input["server_connection"]
  stash = StashInterface(FRAGMENT_SERVER)
  return stash

def get_stashdb_config(stash):
  config = stash.get_configuration()
  stash_boxes = config["general"]["stashBoxes"] 
  return [a for a in stash_boxes if a.get("endpoint") == STASHDB_ENDPOINT][0]

def sync_performer(json_input, performer_id, is_favorite):
  stash = get_stash_interface(json_input)

  performer = stash.find_performer(performer_id)

  # Check if the performer has a StashDB ID.
  matching_stashdb_ids = [s for s in performer["stash_ids"] if s.get("endpoint") == STASHDB_ENDPOINT]
  stashdb_id = matching_stashdb_ids[0]["stash_id"]

  if len(stashdb_id) > 0:
    stashdb_config = get_stashdb_config(stash)

    mutation = """
    mutation FavoritePerformer($id: ID!, $favorite: Boolean!) {
      favoritePerformer(id: $id, favorite: $favorite)
    }
    """

    sync_to_stashdb(mutation, stashdb_config, "performer", stashdb_id, is_favorite)
  else:
    log.warning("Performer is missing StashDB ID. Skipping.")

def sync_studio(json_input, studio_id, is_favorite):
  stash = get_stash_interface(json_input)

  studio = stash.find_studio(studio_id)

  # Check if the studio has a StashDB ID.
  matching_stashdb_ids = [s for s in studio["stash_ids"] if s.get("endpoint") == STASHDB_ENDPOINT]
  stashdb_id = matching_stashdb_ids[0]["stash_id"]
  log.debug("sync_studio stashdb_id: %s " % (stashdb_id,))

  if len(stashdb_id) > 0:
    log.debug("sync_studio Performer has StashDB ID: %s " % (stashdb_id,))
    stashdb_config = get_stashdb_config(stash)
    log.debug("sync_studio stashdb_config: %s " % (stashdb_config,))

    mutation = """
    mutation FavoriteStudio($id: ID!, $favorite: Boolean!) {
      favoriteStudio(id: $id, favorite: $favorite)
    }
    """

    sync_to_stashdb(mutation, stashdb_config, "studio", stashdb_id, is_favorite)
  else:
    log.warning("Studio is missing StashDB ID. Skipping.")

def sync_to_stashdb(mutation, stashdb_config, type, id, is_favorite):
  headers = {
    "Content-Type": "application/json",
    "ApiKey": stashdb_config["api_key"],
  }

  variables = {
    "id": id,
    "favorite": is_favorite,
  }

  try:
    response = requests.post(
      stashdb_config["endpoint"],
      json={"query": mutation, "variables": variables},
      headers=headers,
    )
    if response.status_code == 200:
      result = response.json()
      if "errors" in result:
        log.warning(f"Failed to update {type} ID {id}: {result['errors']}")
      else:
        log.info(f"Updated {type} ID {id} as favorite = {is_favorite} successfully.")
    else:
      log.warning(f"Failed to update {type} ID {id}. HTTP {response.status_code}: {response.text}")
  except requests.exceptions.RequestException as e:
    log.error(f"Exception while updating {type} ID {id}.: {e}")

def main():
  json_input = json.loads(sys.stdin.read())

  stash = get_stash_interface(json_input)
  config = stash.get_configuration()

  settings = {
    "disablePerformerSyncHook": False,
    "disableStudioSyncHook": False,
  }

  if "sync-favourites-with-stashdb" in config["plugins"]:
    settings.update(config["plugins"]["sync-favourites-with-stashdb"])

  log.debug("settings: %s " % (settings,))

  if "hookContext" in json_input["args"]:
    _id = json_input["args"]["hookContext"]["id"]
    _type = json_input["args"]["hookContext"]["type"]
    is_favorite = json_input["args"]["hookContext"]["input"]["favorite"]

    log.debug("_id: %s " % (_id,))
    log.debug("_type: %s " % (_type,))

    if _type == "Performer.Update.Post" and settings["disablePerformerSyncHook"] == False:
      sync_performer(json_input, _id, is_favorite)
    if _type == "Studio.Update.Post" and settings["disableStudioSyncHook"] == False:
      sync_studio(json_input, _id, is_favorite)
    else:
      log.debug("One or more hooks are disabled. Skipping.")

if __name__ == "__main__":
  main()