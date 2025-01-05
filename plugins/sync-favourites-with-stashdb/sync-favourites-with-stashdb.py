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

def get_stashdb_api_key(stash):
  config = stash.get_configuration()
  return config["general"]["stashBoxes"]

def sync_performer(json_input, performer_id, is_favorite):
  stash = get_stash_interface(json_input)

  performer = stash.find_performer(performer_id)
  # log.debug("send_emp_url_to_torrent scene: %s " % (scene,))

  # Check if the scene has a StashDB ID.
  stashdb_id = [s for s in performer["stash_ids"] if t.get("endpoint") == STASHDB_ENDPOINT][0]

  if len(stashdb_id) > 0:
    get_stashdb_api_key(stash)
    log.debug("Performer has StashDB ID: %s " % (stashdb_id,))
  else:
    log.warning("Performer is missing StashDB ID. Skipping.")

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
    # is_favorite = json_input["args"]["hookContext"]["favorite"]

    log.debug("hookContext: %s " % (json_input["args"]["hookContext"],))
    log.debug("_id: %s " % (_id,))
    log.debug("_type: %s " % (_type,))

  # if settings["disableSyncHooks"] == False:
  #   if _type == "Studio.Update.Post":
  #     sync_studio(json_input, _id, is_favorite)
    # if _type == "Performer.Update.Post":
      # sync_performer(json_input, _id, is_favorite)

if __name__ == "__main__":
  main()