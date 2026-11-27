"""
Story HTML is cleaned on save (app/utils/story_html.py), and the cleaning must not
lose anything the editor, the AI writer or quick-add produce.

    cd backend && .venv/bin/python -m unittest tests.test_story_html -v

STORY_FIXTURES_JSON may point at a JSON list of {name, raw, editor} story bodies
(for example the landing sample stories, dumped through the TipTap editor) to check
those as well.
"""
import json
import os
import unittest
from html.parser import HTMLParser

import importlib.util

if importlib.util.find_spec("nh3") is None:  # pinned in requirements.txt; older venvs lack it
    raise unittest.SkipTest("nh3 is not installed: pip install -r requirements.txt")

from app.utils.story_html import clean_story_html, clean_style


class _Shape(HTMLParser):
    """The tags, attributes and text of a fragment, ignoring attribute order and quoting."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.items = []

    def handle_starttag(self, tag, attrs):
        # nh3 sets rel itself on every link
        self.items.append(("<", tag, tuple(sorted((k, v or "") for k, v in attrs if k != "rel"))))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        self.items.append((">", tag))

    def handle_data(self, data):
        if data:
            self.items.append(("t", data))


def shape(html):
    p = _Shape()
    p.feed(html)
    p.close()
    return p.items


MEDIA = "https://media.ourfamilysocials.com"
MARKER = (
    '<span locationname="Portland Head Light, Maine" latitude="43.6231" longitude="-70.2079" '
    'timestamp="2026-08-08T16:20:00" placeid="ChIJ123" data-location-marker="" '
    'data-location-name="Portland Head Light, Maine" data-latitude="43.6231" data-longitude="-70.2079" '
    'data-timestamp="2026-08-08T16:20:00" data-place-id="ChIJ123" class="location-marker" '
    'contenteditable="false">📍 Portland Head Light, Maine</span>'
)

# Exactly what the TipTap editor stores (generated with the app's extensions).
EDITOR_HTML = (
    "<h1>Day one</h1>"
    f"<p>We started at {MARKER} and <strong>walked</strong> <em>a lot</em>, <u>really</u> <s>slowly</s> with <code>snacks</code>.</p>"
    '<p>See <a target="_blank" rel="noopener noreferrer" class="editor-link" href="https://example.com/trail">the trail</a>.</p>'
    f'<img src="{MEDIA}/full/0f8fad5b-d9cb-469f-a165-70867728950e.jpg" alt="The lighthouse" width="1200" height="900">'
    f'<video src="{MEDIA}/videos/7c9e6679-7425-40de-944b-e07fc1f90ae7.mp4" controls="true" width="100%" maxwidth="600px"></video>'
    "<h2>Snacks</h2><ul><li><p>Crisps</p></li><li><p>Apples</p></li></ul><ol start=\"3\"><li><p>Third</p></li></ol>"
    '<blockquote><p>Are we there yet?</p></blockquote><pre><code class="language-js">let x = 1</code></pre><hr><p>Line<br>break</p><h3>Small</h3><p></p>'
    '<img src="data:image/jpeg;base64,/9j/4AAQSkZJRg==" alt="">'
)
AI_WRITER_HTML = (
    f"<h1>A day at the lake</h1><p>The kids ran ahead.</p><img src='{MEDIA}/full/9b2e1c3a-0000-4000-8000-000000000001.jpg'/>"
    "<h2>Lunch</h2><p>Sandwiches &amp; crisps.</p>"
)
QUICK_ADD_HTML = (
    "<p>Fun day</p>\n"
    f'<p><img src="{MEDIA}/full/9b2e1c3a-0000-4000-8000-000000000002.jpg" alt="Event photo" style="max-width: 100%;" /></p>\n'
    f'<p><video src="{MEDIA}/videos/9b2e1c3a-0000-4000-8000-000000000003.mp4" controls style="max-width: 100%;"></video></p>'
)
MIGRATED_HTML = f'<p><img src="{MEDIA}/cdn-cgi/image/width=1200,quality=82,format=auto/full/9b2e1c3a-0000-4000-8000-000000000004.jpg"></p>'


class StoryHtmlKeepsRealStoriesTest(unittest.TestCase):
    def assertLossless(self, html, name=""):
        self.assertEqual(shape(clean_story_html(html)), shape(html), name)

    def test_editor_output_is_unchanged(self):
        self.assertLossless(EDITOR_HTML)

    def test_ai_writer_output_is_unchanged(self):
        self.assertLossless(AI_WRITER_HTML)

    def test_quick_add_output_keeps_media_and_style(self):
        cleaned = clean_story_html(QUICK_ADD_HTML)
        self.assertIn('style="max-width: 100%"', cleaned)
        self.assertEqual(cleaned.count("<img"), 1)
        self.assertEqual(cleaned.count("<video"), 1)
        self.assertIn("controls", cleaned)

    def test_migrated_resizing_urls_are_kept(self):
        self.assertLossless(MIGRATED_HTML)

    def test_location_marker_is_still_extracted(self):
        from app.utils.location_validator import extract_location_markers
        markers = extract_location_markers(clean_story_html(EDITOR_HTML))
        self.assertEqual(len(markers), 1)
        self.assertEqual(markers[0]["location_name"], "Portland Head Light, Maine")
        self.assertAlmostEqual(markers[0]["latitude"], 43.6231)
        self.assertEqual(markers[0]["timestamp"], "2026-08-08T16:20:00")

    def test_story_page_caption_style_is_kept(self):
        style = "font-size: 0.85em; color: var(--text-tertiary); font-weight: 500; text-align: center; margin-top: 2px; margin-bottom: 48px; line-height: 1.4"
        self.assertEqual(clean_style(style), style)

    def test_fixture_stories(self):
        path = os.environ.get("STORY_FIXTURES_JSON")
        if not path:
            self.skipTest("STORY_FIXTURES_JSON not set")
        with open(path) as f:
            stories = json.load(f)
        self.assertTrue(stories)
        for story in stories:
            self.assertLossless(story["raw"], story["name"] + " (stored)")
            self.assertLossless(story["editor"], story["name"] + " (editor)")


class StoryHtmlRemovesAttacksTest(unittest.TestCase):
    def test_script_and_handlers(self):
        out = clean_story_html('<p onclick="x()">a</p><img src=x onerror="alert(1)"><script>alert(2)</script>')
        self.assertNotIn("onclick", out)
        self.assertNotIn("onerror", out)
        self.assertNotIn("alert", out)

    def test_forms_embeds_and_page_tags(self):
        out = clean_story_html(
            '<form action="https://evil.test"><input name="password"><button>Sign in</button></form>'
            '<style>body{display:none}</style><link rel="stylesheet" href="https://evil.test/x.css">'
            '<meta http-equiv="refresh" content="0"><base href="https://evil.test/">'
            '<iframe src="https://evil.test"></iframe><object data="x"></object><embed src="x">'
            '<svg><rect/></svg><dialog open>Session expired</dialog><textarea>t</textarea><select><option>o</option></select><p>ok</p>'
        )
        for tag in ("form", "input", "button", "style", "link", "meta", "base", "iframe", "object", "embed", "svg", "dialog", "textarea", "select", "option"):
            self.assertNotIn(f"<{tag}", out, tag)
        self.assertNotIn("Sign in", out)
        self.assertNotIn("Session expired", out)
        self.assertIn("<p>ok</p>", out)

    def test_dangerous_urls(self):
        out = clean_story_html('<a href="javascript:alert(1)">a</a><a href="data:text/html,x">b</a><video poster="data:image/png;base64,x"></video>')
        self.assertNotIn("javascript", out)
        self.assertNotIn("data:", out)

    def test_covering_css(self):
        out = clean_story_html('<div style="position:fixed;inset:0;z-index:9999;top:0;transform:scale(2);opacity:.9;box-shadow:0 0 0 9999px #fff;margin-top:-500px;background-image:url(x);color:red">x</div>')
        self.assertIn('style="color: red"', out)

    def test_escaped_or_url_css(self):
        self.assertEqual(clean_style("posi\\tion: fixed; color: blue"), "color: blue")
        self.assertEqual(clean_style("width: expression(alert(1)); color: url(x)"), "")

    def test_global_classes_and_attributes(self):
        out = clean_story_html('<div class="yarl__portal leaflet-pane image-caption" popover="manual" contenteditable="true">x</div><a href="https://x.test" target="_top">y</a>')
        self.assertIn('class="image-caption"', out)
        self.assertNotIn("popover", out)
        self.assertNotIn("contenteditable", out)
        self.assertNotIn("target", out)


if __name__ == "__main__":
    unittest.main()
