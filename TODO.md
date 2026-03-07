# TODO: Add Growth Features & Monetization

## Task
Transform "Roast or Toast" into a competition-ready app with viral loops and monetization.

## Growth Features (Step 2) - ✅ COMPLETED
- [x] Add share to social media buttons (Twitter/X, Instagram Stories, WhatsApp)
- [x] Create viral challenge system ("24h Fit Drop" challenges)
- [x] Add leaderboard for best drip scores
- [x] Add user accounts to track scores (auto-registration)
- [x] Add referral system (via /referral endpoint)

## Monetization (Step 3) - ✅ COMPLETED
- [x] Add freemium model (3 free roasts, premium for unlimited)
- [x] Add in-app purchase for "Pro Roast" (unlimited roasts)
- [x] Add "Super Toast" premium feature
- [x] Add subscription option for power users ("Monthly Pro")

## Files Edited
- `backend/main.py` - Added user accounts, store scores, new API endpoints
- `backend/models.py` - Added User, Purchase, Leaderboard, Challenge models
- `frontend/index.html` - Added modals, share buttons, challenge banner
- `frontend/app.js` - Added growth features, premium handling, share tracking
- `frontend/style.css` - Added modal, leaderboard, premium UI styles
- `backend/requirements.txt` - Updated google-generativeai version

## New API Endpoints
- `POST /register` - Register new user
- `GET /user/{user_id}` - Get user profile
- `POST /purchase` - Process purchase (simulated)
- `GET /leaderboard` - Get top drip scores
- `POST /share` - Track shares for rewards
- `POST /referral` - Apply referral code
- `GET /challenges` - Get active challenge
- `GET /products` - Get premium products

## Testing Results
- ✅ Products endpoint working
- ✅ Leaderboard endpoint working
- ✅ Challenges endpoint working
- ✅ Server running on http://localhost:8000

