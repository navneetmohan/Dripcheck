# Roast or Toast - Technical Writeup

## Backend Architecture Overview

### Project Structure

```
Dripcheck/
├── backend/
│   ├── main.py           # FastAPI server, all endpoints
│   ├── ai.py             # Gemini Vision API integration
│   ├── meme_generator.py # PIL-based meme card creation
│   ├── models.py         # Pydantic data models
│   ├── requirements.txt  # Python dependencies
│   ├── routes/
│   │   └── outfit_generator.py  # Outfit suggestion API
│   └── services/
│       ├── image_generator.py   # Outfit image generation
│       ├── outfit_generator.py  # AI outfit suggestions
│       └── style_analyzer.py    # Style analysis
├── frontend/
│   ├── index.html        # Main UI
│   ├── app.js            # Frontend logic
│   └── style.css         # Styling
└── generated/            # AI-generated outfit images
```

---

## Core Components Explained

### 1. main.py - The API Server

**Purpose**: Main FastAPI application handling all HTTP requests.

**Key Design Decisions**:

| Component | Approach | Reasoning |
|-----------|----------|-----------|
| **CORS** | `allow_origins=["*"]` | Enables frontend on any domain during development |
| **Static Files** | Mount `/memes` and `/generated` directories | Serves generated images directly |
| **User Storage** | JSON file (`users.json`) | Simple, zero-config persistence without database setup |
| **Error Handling** | Try-catch with typed responses | Graceful degradation, no crashes |

**API Endpoints**:

```python
# Core Analysis
POST /analyze          # Analyze outfit image → drip score + meme
GET  /memes/{file}    # Serve generated meme images

# Growth Features
POST /register         # Create user account
GET  /user/{id}       # Get user profile
GET  /leaderboard     # Top drip scores
POST /share           # Track sharing for rewards
POST /referral        # Apply referral code

# Monetization
GET  /products        # Premium product catalog
POST /purchase        # Process purchase
GET  /challenges     # Active viral challenge

# Outfit Generation
POST /generate-outfits  # AI-powered outfit suggestions
```

---

### 2. ai.py - AI Integration Layer

**Purpose**: Interface with Google Gemini Vision API for outfit analysis.

**Approach**:

```python
def analyze_outfit(image_path: str) -> Dict[str, Any]:
    """
    1. Load image with PIL
    2. Convert to RGB if needed
    3. Send to Gemini with fashion critique prompt
    4. Parse JSON response
    5. Return validated analysis
    """
```

**Why This Approach**:

1. **Gemini over GPT-4 Vision**: 
   - Google's Gemini has generous free tier
   - Native multi-modal support (image + text)
   - Faster for image analysis tasks

2. **Strict Prompt Engineering**:
   ```python
   prompt = """You are a harsh but funny fashion critic.
   Return ONLY valid JSON with:
   - drip_score: integer 0-100
   - archetype: string
   - strengths: array
   - mistakes: array"""
   ```
   - Forces JSON-only response for reliable parsing
   - Sets tone (harsh but funny) for engaging results

3. **Fallback Logic**:
   ```python
   except Exception:
       analysis = {"drip_score": 50, "archetype": "Mystery", ...}
   ```
   - API failures don't crash the app
   - Users still get a response

---

### 3. meme_generator.py - Image Processing

**Purpose**: Create shareable meme cards with analysis results overlay.

**Technical Approach**:

```
┌─────────────────────────────────────┐
│         User's Outfit Photo         │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│     Resize (640-1080px width)       │  ← Performance optimization
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│   Create RGBA canvas (photo +       │
│   extra height for overlay)         │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│   Draw gradient overlay (dark)      │  ← Readability
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│   Render:                           │
│   - Drip score (large, colored)     │
│   - Archetype badge                 │
│   - ROAST/TOAST verdict             │
│   - Commentary                      │
│   - Watermark                        │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│   Convert to PNG → Base64           │
│   Return to frontend                 │
└─────────────────────────────────────┘
```

**Design Decisions**:

| Feature | Implementation | Reason |
|---------|---------------|--------|
| **Dynamic sizing** | `clamp()` function | Works on mobile + desktop |
| **Font fallback** | Try Segoe UI → Arial → default | Windows compatibility |
| **Color coding** | Red (<45) / Yellow (45-70) / Green (>70) | Instant visual feedback |
| **Gradient overlay** | Alpha gradient from 0→220 | Text readable on any image |
| **Rounded corners** | Try `rounded_rectangle` → fallback | Pillow version compatibility |

---

### 4. image_generator.py - Outfit Suggestions

**Purpose**: Generate visual outfit recommendations.

**Current Implementation** (Text Overlay):
- Reuses user's photo
- Overlays outfit items as text cards
- Creates branded "lookbook" style output

**Why Not Real AI Generation**:
- Original comment: "In production, call diffusion model... to keep self-contained, we build branded cards"
- No DALL-E/Stable Diffusion API key required
- Zero per-image API costs
- Works offline (after initial analysis)

---

### 5. Growth & Monetization Architecture

#### User System

```python
# In-memory user model
class User:
    user_id: str
    username: str
    total_roasts: int      # Track usage
    best_drip_score: int    # For leaderboard
    is_premium: bool       # Monetization flag
    referral_code: str     # Viral loop
    referrals: int         # Count
```

**Why This Model**:

1. **Auto-registration**: Users get account without signup friction
   ```javascript
   // Frontend auto-creates on first visit
   fetch('/register', { username: 'User' + random })
   ```

2. **Referral Codes**: `ROAST{user_id[:6]}` format
   - Easy to read/type
   - Unique per user
   - Tracks viral growth

3. **Usage Tracking**: `total_roasts` enables freemium

#### Freemium Model

```
Free Tier     → 3 roasts total
Premium       → Unlimited (is_premium = true)
```

**Why 3 Free Roasts**:
- Enough to try the app fully
- Creates desire for more ("hook")
- Low enough to encourage upgrade

#### Challenge System

```python
Challenge:
    challenge_id: str
    title: str           # "24-Hour Fit Drop Challenge"
    description: str     # Engagement hook
    participants: int   # Social proof
    ends_at: datetime   # Urgency
```

**Why Challenges**:
- Creates time-limited urgency
- Generates user content
- Viral sharing opportunity

---

## API Design Philosophy

### 1. RESTful Conventions

| Action | Method | Example |
|--------|--------|---------|
| Get data | GET | `/leaderboard` |
| Create | POST | `/register` |
| Modify | POST | `/purchase` |

### 2. Response Format

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

**Why this format**:
- `success` → Easy frontend branching
- `data` → Typed response object
- `error` → Human-readable failure message

### 3. Error Handling

```python
try:
    result = analyze_outfit(path)
except ValueError as e:
    return AnalysisResponse(success=False, error=str(e))
except Exception as e:
    return AnalysisResponse(success=False, error="Analysis failed")
```

**Philosophy**: Never let server crash. Always return JSON.

---

## Performance Optimizations

### 1. Image Processing

- **Max width**: 1080px (prevents huge memory usage)
- **Format**: JPEG with quality 90 (smaller than PNG)
- **Lazy loading**: Images served on-demand, not stored in RAM

### 2. CORS Configuration

- Simple `allow_origins=["*"]` for development
- (Would restrict in production)

### 3. Static File Mounting

```python
app.mount("/generated", StaticFiles(directory=...))
```

- Direct file serving (no Python overhead)
- Browser caching enabled

---

## Security Considerations

### Current (Development):

| Area | Status | Notes |
|------|--------|-------|
| **API Keys** | In `.env` | Not committed to repo |
| **File Upload** | Type validation | JPEG/PNG only |
| **File Size** | Frontend check | 10MB max |

### Production Recommendations:

1. **Rate limiting**: Prevent API abuse
2. **Authentication**: Real user accounts
3. **Image scanning**: Virus/malware detection
4. **Stripe integration**: Real payment processing

---

## Why These Technologies?

### FastAPI over Flask/Django

| Factor | FastAPI | Flask | Django |
|--------|---------|-------|--------|
| **Speed** | ⚡⚡⚡ | ⚡⚡ | ⚡ |
| **Auto-docs** | ✅ OpenAPI | ❌ | ✅ |
| **Type safety** | ✅ Pydantic | ❌ | ✅ |
| **Async** | ✅ Native | ⚠️ | ✅ |

**Decision**: FastAPI for modern, fast, type-safe API development.

### PIL over OpenCV

- **Simpler**: Higher-level API
- **Text rendering**: Better for meme generation
- **Sufficient**: No ML/Computer vision needed

### Vanilla JS over React/Vue

- **No build step**: Edit → refresh
- **Smaller bundle**: Faster initial load
- **Scope**: Single-page app, not complex state

---

## Scaling Path

### Current (MVP):
- JSON file storage
- Single server
- Synchronous AI calls

### Production Ready:
```
┌─────────────────┐     ┌─────────────────┐
│   CDN (Cloud)  │────▶│  Load Balancer  │
└─────────────────┘     └────────┬────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
        ┌──────────┐     ┌──────────┐     ┌──────────┐
        │ Server 1 │     │ Server 2 │     │ Server 3 │
        └────┬─────┘     └────┬─────┘     └────┬─────┘
             │                │                │
             └────────────────┼────────────────┘
                              ▼
                    ┌─────────────────┐
                    │  PostgreSQL DB  │
                    └─────────────────┘
```

### Database (Future):
```python
# Replace JSON with SQLAlchemy
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    user_id = Column(String, unique=True)
    is_premium = Column(Boolean)
    # ... etc
```

---

## Summary

This backend architecture balances:
- **Simplicity**: Easy to understand/modify
- **Scalability**: Clean separation for future growth  
- **User Experience**: Fast, engaging interactions
- **Monetization**: Built-in freemium + premium features
- **Viral Loops**: Referrals + challenges + sharing

The tech choices (FastAPI, PIL, Gemini) prioritize development speed and zero infrastructure cost while maintaining professional code quality.

