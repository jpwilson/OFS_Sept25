"""
Server-side cleaning of story HTML (events.description).

The browser sanitizes story HTML before showing it (frontend/src/utils/sanitizeHtml.js),
but the API can be called directly, so stories are also cleaned when they are saved.
The allowlist matches the frontend one: what the TipTap editor, the AI writer and
quick-add produce (headings, text formatting, lists, links, images, videos, location
markers with their data-* attributes and the plain attributes TipTap reads them back
from), plus plain text markup. Scripts, event handlers, javascript: URLs, forms,
embedded pages, SVG and CSS that could cover the app are removed.
"""
import re

import nh3

TAGS = {
    "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "strike", "del", "ins", "mark", "sub", "sup", "small",
    "code", "pre", "kbd", "samp", "blockquote", "q", "cite", "abbr", "time",
    "ul", "ol", "li", "dl", "dt", "dd",
    "a", "span", "div",
    "img", "picture", "source", "video", "track", "figure", "figcaption",
    "table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td", "colgroup", "col",
    "details", "summary",
}

# Removed together with everything inside them.
CLEAN_CONTENT_TAGS = {
    "script", "style", "template", "noscript", "iframe", "object", "embed", "svg", "math",
    "select", "textarea", "button", "form", "dialog", "title", "noembed", "noframes", "xmp",
}

_GENERIC_ATTRS = {"class", "id", "style", "title", "dir", "lang"}
ATTRIBUTES = {
    "*": _GENERIC_ATTRS,
    "a": {"href", "target"},
    "img": {"src", "alt", "width", "height", "srcset", "sizes"},
    "source": {"src", "srcset", "sizes", "type", "media"},
    "video": {"src", "poster", "controls", "width", "height", "preload", "playsinline", "muted", "loop",
              # VideoNode reads this back from the HTML
              "maxwidth"},
    "track": {"src", "kind", "srclang", "label"},
    # The location marker: TipTap reads its node attributes back from these plain
    # attributes; the server and the story pages read the data-* copies.
    "span": {"contenteditable", "locationname", "latitude", "longitude", "timestamp", "placeid"},
    "ol": {"start", "reversed", "type"},
    "li": {"value"},
    "blockquote": {"cite"}, "q": {"cite"}, "del": {"cite", "datetime"}, "ins": {"cite", "datetime"},
    "time": {"datetime"},
    "td": {"colspan", "rowspan"}, "th": {"colspan", "rowspan", "scope"},
    "col": {"span"}, "colgroup": {"span"},
    "details": {"open"},
}

# data: is allowed only for inline images (the editor's pending-upload previews);
# the attribute filter refuses it everywhere else.
URL_SCHEMES = {"http", "https", "mailto", "tel", "data"}

ALLOWED_CLASSES = {"location-marker", "editor-link", "image-caption", "video-caption", "image-wrapper"}
_CLASS_PATTERN = re.compile(r"^language-[\w+#-]{1,40}$")

_LENGTH_PROPS = {
    "width", "max-width", "min-width", "height", "max-height", "min-height",
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
}
_MARGIN_PROPS = {"margin", "margin-top", "margin-right", "margin-bottom", "margin-left"}
ALLOWED_CSS = {
    "color", "background-color", "font-size", "font-weight", "font-style", "font-family",
    "text-align", "text-decoration", "text-decoration-line", "text-transform", "line-height", "letter-spacing",
    "white-space", "vertical-align", "list-style-type", "border-radius", "display", "float", "clear",
    "justify-content", "align-items", "gap", "cursor", "user-select", "object-fit",
} | _LENGTH_PROPS | _MARGIN_PROPS
_ALLOWED_DISPLAY = {"block", "inline", "inline-block", "flex", "inline-flex", "list-item", "none"}
_CSS_FUNCTION = re.compile(r"\b(?:var|rgba?|hsla?|calc)\(\s*[-\w.,%\s+*/]*\)", re.I)
_CSS_PLAIN_VALUE = re.compile(r"^[-#\w.,%\s'\"]*$")
_CSS_FORBIDDEN = re.compile(r"url|expression|javascript|@|\\|/\*|[<>{}]", re.I)
_IMPORTANT = re.compile(r"!\s*important\s*$", re.I)


def clean_style(style: str) -> str:
    """Keep only allowlisted, in-flow declarations (same rules as the frontend)."""
    kept = []
    for declaration in (style or "").split(";"):
        prop, colon, value = declaration.partition(":")
        if not colon:
            continue
        prop = prop.strip().lower()
        value = _IMPORTANT.sub("", value).strip()
        if prop not in ALLOWED_CSS or not value or len(value) > 200:
            continue
        if _CSS_FORBIDDEN.search(value):
            continue
        if not _CSS_PLAIN_VALUE.match(_CSS_FUNCTION.sub("", value)):
            continue
        if prop == "display" and value.lower() not in _ALLOWED_DISPLAY:
            continue
        if prop in _MARGIN_PROPS and re.search(r"-\s*[\d.]", value):
            continue
        kept.append(f"{prop}: {value}")
    return "; ".join(kept)


def _clean_classes(value: str) -> str:
    return " ".join(c for c in (value or "").split() if c in ALLOWED_CLASSES or _CLASS_PATTERN.match(c))


def _attribute_filter(tag: str, attr: str, value: str):
    if attr == "style":
        return clean_style(value) or None
    if attr == "class":
        return _clean_classes(value) or None
    if attr == "contenteditable":
        return "false" if value == "false" else None
    if attr == "target":
        return "_blank" if value == "_blank" else None
    if attr in ("href", "src", "srcset", "poster"):
        scheme = value.strip().lower()
        if scheme.startswith("data:") and not (tag == "img" and attr == "src" and scheme.startswith("data:image/")):
            return None
    return value


def clean_story_html(html):
    """Return story HTML with everything outside the allowlist removed."""
    if not html:
        return html
    return nh3.clean(
        html,
        tags=TAGS,
        clean_content_tags=CLEAN_CONTENT_TAGS,
        attributes=ATTRIBUTES,
        attribute_filter=_attribute_filter,
        generic_attribute_prefixes={"data-", "aria-"},
        url_schemes=URL_SCHEMES,
        link_rel="noopener noreferrer",
        strip_comments=True,
    )
