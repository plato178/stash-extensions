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
  # log.debug("send_emp_url_to_torrent scene: %s " % (scene,))

  # Check if the scene has a StashDB ID.
  matching_stashdb_ids = [s for s in performer["stash_ids"] if s.get("endpoint") == STASHDB_ENDPOINT]
  stashdb_id = matching_stashdb_ids[0]["stash_id"]
  log.debug("sync_performer stashdb_id: %s " % (stashdb_id,))

  if len(stashdb_id) > 0:
    log.debug("sync_performer Performer has StashDB ID: %s " % (stashdb_id,))
    stashdb_config = get_stashdb_config(stash)
    log.debug("sync_performer stashdb_config: %s " % (stashdb_config,))

    mutation = """
    mutation SetFavourite($input: PerformerUpdateInput!) {
      performerUpdate(input: $input) {
        id
        favorite
      }
    }
    """

    sync_to_stashdb(mutation, stashdb_config, "performer" performer_id, is_favorite)
  else:
    log.warning("Performer is missing StashDB ID. Skipping.")

def sync_to_stashdb(query, stashdb_config, type, id, is_favorite):
  headers = {
    "Content-Type": "application/json",
    "ApiKey": stashdb_config["api_key"],
  }

  input_data = {
    "id": id,
    "favorite": is_favorite,
  }

  variables = {"input": input_data}
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
        created_count += 1
        log.info(f"Updated {type} ID {id} as favorite = {is_favorite} successfully.")
    else:
      log.warning(f"Failed to update {type} ID {id}. HTTP {response.status_code}: {response.text}")
  except requests.exceptions.RequestException as e:
    log.error(f"Exception while updating {type} ID {id}.: {e}")

def main():
  json_input = json.loads(sys.stdin.read())

  stash = get_stash_interface(json_input)
  config = stash.get_configuration()
  log.debug("config: %s " % (config,))

  settings = {
    "disableSyncHooks": False,
  }

  if "sync-favourites-with-stashdb" in config["plugins"]:
    settings.update(config["plugins"]["sync-favourites-with-stashdb"])

  log.debug("settings: %s " % (settings,))

  if settings["disableSyncHooks"] == True:
    log.warning("Hooks are disabled. Exiting.")
    return

  if "hookContext" in json_input["args"]:
    _id = json_input["args"]["hookContext"]["id"]
    _type = json_input["args"]["hookContext"]["type"]
    is_favorite = json_input["args"]["hookContext"]["input"]["favorite"]

    # log.debug("hookContext: %s " % (json_input["args"]["hookContext"],))
    log.debug("_id: %s " % (_id,))
    log.debug("_type: %s " % (_type,))

    if settings["disableSyncHooks"] == False:
    #   if _type == "Studio.Update.Post":
    #     sync_studio(json_input, _id, is_favorite)
      if _type == "Performer.Update.Post":
        sync_performer(json_input, _id, is_favorite)

if __name__ == "__main__":
  main()