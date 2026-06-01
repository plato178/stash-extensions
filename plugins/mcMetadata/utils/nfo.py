import os
import utils.logger as log
from xml.sax.saxutils import escape


def escape_xml(text):
    """Escape special XML characters in text.

    Handles: & < > " '

    Args:
        text: String to escape (can be None)

    Returns:
        str: Escaped string, or empty string if input is None
    """
    if text is None:
        return ""
    return escape(str(text), {'"': '&quot;', "'": '&apos;'})


def _get_actor_thumb_path(performer_name, settings):
    """Get the local actor image path for NFO <thumb> tags.

    Only returns a path when actor images are enabled and the media server
    supports external performer images.

    Args:
        performer_name: Performer name (unescaped)
        settings: Plugin settings dict

    Returns:
        str or None: Local path to performer image, or None
    """
    if not settings:
        return None
    if not settings.get("enable_actor_images", False):
        return None

    # Import here to avoid circular imports
    from performer import get_actor_image_path

    # Use the NFO-specific path if configured, otherwise fall back to the write path
    nfo_base_path = settings.get("actor_metadata_path_nfo") or settings.get("actor_metadata_path", "")
    log.debug(f"Using base path for actor images: {nfo_base_path}")
    return get_actor_image_path(performer_name, settings, base_path=nfo_base_path)


def build_nfo_xml(scene, settings=None, video_path=None):
    """Build NFO XML for a scene.

    Args:
        scene: Scene dict from Stash API
        settings: Plugin settings dict (optional, enables artwork references and field exclusion)
        video_path: Path to the video file (optional, enables poster thumb tag)

    Returns:
        str: NFO XML content
    """
    exclude = set()
    if settings:
        exclude = set(settings.get("nfo_exclude_fields") or [])

    id = scene["id"]
    details = scene["details"] or ""

    title = ""
    if scene["title"] is not None and scene["title"] != "":
        title = escape_xml(scene["title"])
    else:
        title = escape_xml(os.path.basename(os.path.normpath(scene["files"][0]["path"])))

    custom_rating = ""
    rating = ""
    if scene["rating100"] is not None:
        rating = round(int(scene["rating100"]) / 10)
        custom_rating = scene["rating100"]

    date = ""
    year = ""
    if scene["date"] is not None:
        date = scene["date"]
        year = scene["date"].split("-")[0]

    studio = ""
    if scene["studio"] is not None:
        studio = escape_xml(scene["studio"]["name"])

    # Build XML lines, filtering excluded fields
    lines = ['<?xml version="1.0" encoding="utf-8" standalone="yes"?>', '<movie>']

    field_lines = {
        "name": f"    <name>{title}</name>",
        "title": f"    <title>{title}</title>",
        "originaltitle": f"    <originaltitle>{title}</originaltitle>",
        "sorttitle": f"    <sorttitle>{title}</sorttitle>",
        "criticrating": f"    <criticrating>{custom_rating}</criticrating>",
        "rating": f"    <rating>{rating}</rating>",
        "userrating": f"    <userrating>{rating}</userrating>",
        "plot": f"    <plot><![CDATA[{details}]]></plot>",
        "premiered": f"    <premiered>{date}</premiered>",
        "releasedate": f"    <releasedate>{date}</releasedate>",
        "year": f"    <year>{year}</year>",
        "studio": f"    <studio>{studio}</studio>",
    }

    for field_name, line in field_lines.items():
        if field_name not in exclude:
            lines.append(line)

    # Poster thumb (always included if video_path provided)
    if video_path:
        base = os.path.splitext(os.path.basename(video_path))[0]
        poster_filename = f"{base}-poster.jpg"
        backdrop_filename = f"{base}-fanart.jpg"
        # Build the full poster path so the media server can locate the file.
        # By default this is the full Stash filesystem path alongside the video.
        # When nfo_poster_path_rewrite_from/to are both set, swap the path prefix
        # so the path reflects where the media server mounts the same library.
        poster_dir = os.path.dirname(video_path)

        poster_full_path = os.path.join(poster_dir, poster_filename)
        log.debug(f"Poster file path for {poster_filename}: {poster_full_path}")

        backdrop_full_path = os.path.join(poster_dir, backdrop_filename)
        log.debug(f"Backdrop file path for {backdrop_filename}: {backdrop_full_path}")

        rewrite_from = (settings or {}).get("nfo_poster_path_rewrite_from", "")
        rewrite_to = (settings or {}).get("nfo_poster_path_rewrite_to", "")

        if rewrite_from and rewrite_to and poster_full_path.startswith(rewrite_from):
            poster_full_path = rewrite_to + poster_full_path[len(rewrite_from):]
            log.debug(f"Poster full file path for {poster_filename}: {poster_full_path}")
        lines.append(f'    <thumb aspect="poster">{escape_xml(poster_full_path)}</thumb>')

        if rewrite_from and rewrite_to and backdrop_full_path.startswith(rewrite_from):
            backdrop_full_path = rewrite_to + backdrop_full_path[len(rewrite_from):]
            log.debug(f"Backdrop full file path for {backdrop_filename}: {backdrop_full_path}")
        lines.append(f'    <fanart><thumb>{escape_xml(backdrop_full_path)}</thumb></fanart>')

    # Performers (always included)
    for i, p in enumerate(scene["performers"]):
        performer_name = escape_xml(p["name"])
        actor_thumb = ""
        actor_image_path = _get_actor_thumb_path(p["name"], settings)
        log.debug(f"Actor file path for {performer_name}: {actor_image_path}")
        if actor_image_path:
            actor_thumb = f"\n        <thumb>{escape_xml(actor_image_path)}</thumb>"

        lines.append(f"""    <actor>
        <name>{performer_name}</name>
        <role>{performer_name}</role>
        <order>{i}</order>
        <type>Actor</type>{actor_thumb}
    </actor>""")

    # Genre (excludable)
    if "genre" not in exclude:
        lines.append("    <genre>Adult</genre>")

    # Tags (always included)
    for t in scene["tags"]:
        lines.append(f"    <tag>{escape_xml(t['name'])}</tag>")

    # Unique ID (excludable)
    if "uniqueid" not in exclude:
        lines.append(f'    <uniqueid type="stash">{id}</uniqueid>')

    lines.append("</movie>")

    return "\n".join(lines)
