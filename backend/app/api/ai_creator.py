from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import json
import logging

from ..core.config import settings
from ..core.deps import get_current_superuser
from ..models.user import User

logger = logging.getLogger("ofs")

router = APIRouter(prefix="/admin/ai", tags=["ai-creator"])

ALLOWED_CATEGORIES = [
    "Birthday", "Anniversary", "Vacation", "Family Gathering", "Holiday",
    "Graduation", "Wedding", "Baby", "Achievement", "Project",
    "Daily Life", "Milestone", "Custom"
]


# --- Schemas ---

class PhotoData(BaseModel):
    image_url: str
    place_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: Optional[str] = None


class GenerateStoryRequest(BaseModel):
    photos: List[PhotoData]
    user_text: str = ""


class GenerateStoryResponse(BaseModel):
    suggested_title: str
    story_html: str
    photo_captions: List[dict]
    suggested_category: str
    location_name: Optional[str] = None
    original_text: str


# --- Endpoints ---

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_superuser)
):
    """Transcribe audio using OpenAI Whisper API."""
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    try:
        import openai

        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

        # Read the uploaded audio file
        audio_bytes = await file.read()

        # Whisper expects a file-like object with a name
        import io
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = file.filename or "recording.webm"

        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )

        return {"text": transcription.text}

    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/generate-story", response_model=GenerateStoryResponse)
async def generate_story(
    request: GenerateStoryRequest,
    current_user: User = Depends(get_current_superuser)
):
    """Generate an AI story from photos and optional text using Claude."""
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        # Sort photos: those with timestamps first (chronologically), then those without
        photos_with_ts = []
        photos_without_ts = []
        for p in request.photos:
            if p.timestamp:
                photos_with_ts.append(p)
            else:
                photos_without_ts.append(p)

        photos_with_ts.sort(key=lambda p: p.timestamp)
        sorted_photos = photos_with_ts + photos_without_ts

        # Collect unique place names for the prompt
        place_names = [p.place_name for p in sorted_photos if p.place_name]
        unique_places = list(dict.fromkeys(place_names))  # preserve order, deduplicate

        # Build the photo descriptions for the text prompt
        photo_descriptions = []
        for i, p in enumerate(sorted_photos, 1):
            ts = p.timestamp or "no timestamp"
            place = p.place_name or "unknown location"
            photo_descriptions.append(f"{i}. [{ts}] - [{place}]")

        places_text = ""
        if unique_places:
            places_text = f" from a trip visiting: {', '.join(unique_places)}"

        user_text_section = f'The user described the event:\n"{request.user_text}"' if request.user_text.strip() else "No description provided - generate from photos only."

        categories_list = ", ".join(ALLOWED_CATEGORIES)

        text_prompt = f"""You are creating a family event post for "Our Family Socials", a private family social network.

{len(sorted_photos)} photos were provided{places_text}.

Photos (sorted chronologically where timestamps available):
{chr(10).join(photo_descriptions)}

{user_text_section}

Instructions:
- Generate a warm, personal family narrative
- Use <h1> tags for main story sections (these become the table of contents)
- Use <h2> tags for subsections within each main section
- Include <img src="url"> tags to place photos inline where they fit the story
- If GPS locations show a journey (multiple places), narrate in chronological order
- If no GPS data, describe what you see in the photos
- Pick the best category from: {categories_list}
- Write in a warm, conversational tone as if the family member is sharing their story
- Each photo MUST be included as an <img> tag exactly once in the story_html

Return ONLY valid JSON (no markdown, no code blocks):
{{
  "title": "Event title",
  "story_html": "<h1>...</h1><p>...</p><img src='...'/>...",
  "captions": [{{"image_url": "...", "caption": "..."}}],
  "category": "one from the allowed list",
  "location_name": "primary location or null"
}}"""

        # Build message content with images
        content = []

        # Add each photo as an image block
        for p in sorted_photos:
            content.append({
                "type": "image",
                "source": {
                    "type": "url",
                    "url": p.image_url
                }
            })

        # Add the text prompt
        content.append({
            "type": "text",
            "text": text_prompt
        })

        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": content
            }]
        )

        # Parse the response
        response_text = response.content[0].text.strip()

        # Try to extract JSON from the response (handle potential markdown wrapping)
        if response_text.startswith("```"):
            # Strip markdown code block
            lines = response_text.split("\n")
            json_lines = []
            in_block = False
            for line in lines:
                if line.startswith("```") and not in_block:
                    in_block = True
                    continue
                elif line.startswith("```") and in_block:
                    break
                elif in_block:
                    json_lines.append(line)
            response_text = "\n".join(json_lines)

        result = json.loads(response_text)

        # Validate category
        suggested_category = result.get("category", "Daily Life")
        if suggested_category not in ALLOWED_CATEGORIES:
            suggested_category = "Daily Life"

        # Build photo captions list
        captions = result.get("captions", [])
        photo_captions = []
        for cap in captions:
            photo_captions.append({
                "image_url": cap.get("image_url", ""),
                "caption": cap.get("caption", "")
            })

        return GenerateStoryResponse(
            suggested_title=result.get("title", "Untitled Event"),
            story_html=result.get("story_html", ""),
            photo_captions=photo_captions,
            suggested_category=suggested_category,
            location_name=result.get("location_name"),
            original_text=request.user_text
        )

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        logger.error(f"Raw response: {response_text[:500]}")
        raise HTTPException(status_code=500, detail="AI generated invalid response. Please try again.")
    except Exception as e:
        logger.error(f"Story generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Story generation failed: {str(e)}")
