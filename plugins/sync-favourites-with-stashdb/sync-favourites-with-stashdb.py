import os
import requests
import stashapi.log as log  # Using stashapi log for structured logging
from stashapi.stashapp import StashInterface
import json
import sys

def get_stash_interface(json_input):
  FRAGMENT_SERVER = json_input["server_connection"]
  stash = StashInterface(FRAGMENT_SERVER)
  return stash

def send_emp_url_to_torrent(json_input, settings, scene_id):
  stash = get_stash_interface(json_input)

  scene = stash.find_scene(scene_id)
  # log.debug("send_emp_url_to_torrent scene: %s " % (scene,))

  # Check if the scene has the downloading tag or is Organized.
  downloading_tag_id = stash.find_tag(settings["downloadingTagName"])['id']
  matching_tags = [t for t in scene["tags"] if t.get("id") == downloading_tag_id]

  if any(matching_tags) == False and scene["organized"] == False:
    emp_url = [u for u in scene["urls"] if "empornium.is" in u.lower()][0]

    studio_id = scene["studio"]["id"]
    studio_name = stash.find_studio(studio_id)["name"]
    torrent_filename = studio_name + " - " + scene["date"] + " - " + scene["title"] + ".torrent"

    download_file(emp_url, settings["torrentFilesPath"] + "/" + torrent_filename)

    # Update scene with downloading tag.
    stash.update_scene({"id": scene_id, "tag_ids": [downloading_tag_id]})
  else:
      log.debug("Scene is already downloading or organized. Skipping.")

def main():
  json_input = json.loads(sys.stdin.read())

  stash = get_stash_interface(json_input)
  config = stash.get_configuration()

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

    log.debug("hookContext: %s " % (json_input["args"]["hookContext"],))
    log.debug("_id: %s " % (_id,))
    log.debug("_type: %s " % (_type,))

  # if settings["disableSyncHooks"] == False:
  #   if _type == "Studio.Update.Post":
  #     sync_studio(json_input, settings, _id)
  #   if _type == "Performer.Update.Post":
  #     sync_perfomer(json_input, settings, _id)

if __name__ == "__main__":
  main()