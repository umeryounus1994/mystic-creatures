# MyCre Backend API Handoff — Chat Security & Client Features

**Date:** 2026-10-20  
**Audience:** Unity / mobile developers integrating with Mystic-Backend  
**Base URL:** `{API_HOST}/api/v1`  
**Auth:** All endpoints below require:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

(Except where multipart/form-data is noted.)

---

## Table of Contents

1. [Chat Security APIs](#1-chat-security-apis)
2. [Avatar Customization API](#2-avatar-customization-api)
3. [Magic Art (Collected Drawings) API](#3-magic-art-collected-drawings-api)
4. [Exploring Spot History API](#4-exploring-spot-history-api)
5. [Existing API Modifications](#5-existing-api-modifications)
6. [Profile / Leaderboard / Friends — `avatar_data`](#6-profile--leaderboard--friends--avatar_data)
7. [Unity Integration Notes](#7-unity-integration-notes)
8. [Admin Moderation (optional)](#8-admin-moderation-optional)
9. [Quick Endpoint Index](#9-quick-endpoint-index)

---

## 1. Chat Security APIs

Client-side filtering (EN/DE abusive words, phone numbers, emails, links) stays in Unity. Backend handles **report**, **block/unblock**, and **blocked list sync**.

### 1.1 Report User / Message

| | |
|---|---|
| **Method** | `POST` |
| **Endpoint** | `/api/v1/chat/report` |
| **When to call** | User taps ⋮ on a chat message / profile → **Report** |

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reported_user_id` | string (ObjectId) | Yes | User being reported |
| `message_text` | string | No | Reported message content |
| `reason` | string | No | e.g. abusive language, bullying, personal info |
| `photon_message_id` | string | No | Photon message id (if available) |
| `channel_id` | string | No | Photon channel / room id |

```json
{
  "reported_user_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "message_text": "Give me your phone number!",
  "reason": "personal information / phone number request",
  "photon_message_id": "msg_12345",
  "channel_id": "global_chat"
}
```

**Success response** `200`

```json
{
  "success": true,
  "message": "Your report has been submitted to moderators.",
  "data": {
    "report_id": "671a...",
    "status": "pending",
    "email_sent": true
  }
}
```

**App UX copy:** show  
`"Your report has been submitted to moderators."`

**Backend behavior**
- Saves report in DB for admin review.
- Sends moderation email to **`thorben@mycreapp.com`** (override via env `CHAT_MODERATION_EMAIL`) with reporter, reported user, message text, reason, and timestamp.

**Error examples**
- `400` — missing/invalid `reported_user_id`, or reporting yourself
- `404` — reported user not found

---

### 1.2 Block / Unblock User

| | |
|---|---|
| **Method** | `POST` |
| **Endpoint** | `/api/v1/chat/block` |
| **When to call** | User taps **Block** or **Unblock** on chat/profile |

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target_user_id` | string (ObjectId) | Yes | User to block/unblock |
| `action` | string | Recommended | `"block"` or `"unblock"` |
| `block` | boolean | Alternative | `true` = block, `false` = unblock |

```json
{
  "target_user_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "action": "block"
}
```

Unblock:

```json
{
  "target_user_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "action": "unblock"
}
```

**Success response** `200`

```json
{
  "success": true,
  "message": "User blocked successfully",
  "data": {
    "action": "block",
    "target_user_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "blocked_users": [
      "64f1a2b3c4d5e6f7a8b9c0d1",
      "65a2b3c4d5e6f7a8b9c0d1e2"
    ]
  }
}
```

**App behavior:** replace local blocked list with `data.blocked_users` (array of user id strings).

---

### 1.3 Get Blocked Users List

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/api/v1/chat/blocked-users` |
| **When to call** | App open / login / session restore |

**Request:** no body.

**Success response** `200`

```json
{
  "success": true,
  "message": "Blocked users retrieved",
  "data": {
    "blocked_users": [
      {
        "user_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "username": "BadPlayer",
        "image": "",
        "profile_picture_id": 1,
        "avatar_data": {
          "base_character": "wizard",
          "outfit_id": 2,
          "hat_id": 1,
          "wand_id": 3,
          "color_tint": "#4A90E2"
        },
        "status": "active"
      }
    ],
    "blocked_user_ids": [
      "64f1a2b3c4d5e6f7a8b9c0d1"
    ]
  }
}
```

**Photon Chat filtering (client):**
1. Keep `blocked_user_ids` in memory.
2. On every incoming message, if `senderId` is in the list → **do not display** the message.

Blocked list is stored on the user account, so it survives reinstall / new device after login.

---

## 2. Avatar Customization API

| | |
|---|---|
| **Method** | `POST` |
| **Endpoint** | `/api/v1/user/avatar-customization` |
| **When to call** | Child taps **Save** in Avatar Studio |

**Request body**

```json
{
  "avatar_data": {
    "base_character": "magician_boy",
    "outfit_id": 2,
    "hat_id": 1,
    "wand_id": 3,
    "color_tint": "#4A90E2"
  }
}
```

| Field | Type | Notes |
|-------|------|--------|
| `base_character` | string | Required. e.g. `magician_boy`, `magician_girl`, `wizard`, `elf`, `creature` |
| `outfit_id` | number | Optional |
| `hat_id` | number | Optional |
| `wand_id` | number | Optional |
| `color_tint` | string | Optional hex color |

**Success response** `200`

```json
{
  "status": true,
  "success": true,
  "message": "Avatar updated successfully",
  "data": {
    "avatar_data": {
      "base_character": "magician_boy",
      "outfit_id": 2,
      "hat_id": 1,
      "wand_id": 3,
      "color_tint": "#4A90E2"
    },
    "profile_picture_id": 1
  }
}
```

**Note:** Legacy `profile_picture_id` is unchanged and still returned alongside `avatar_data`.

---

## 3. Magic Art (Collected Drawings) API

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/api/v1/magicArt/collected` |
| **When to call** | Magic Art Gallery screen |

Returns drawings the logged-in user **collected from the map** (other players’ mystery bags with `drawing_file`), not their own creations.

**Success response** `200`

```json
{
  "status": true,
  "success": true,
  "message": "Collected magic art retrieved",
  "collected_arts": [
    {
      "art_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "drawing_file_url": "https://mysticcrts.nyc3.digitaloceanspaces.com/...",
      "creator_username": "SarahWizard",
      "collected_at": "2026-10-14T12:00:00.000Z",
      "reward_points": 0,
      "reward_file": "https://...",
      "bag_title": "Forest Drawing",
      "bag_type": "collectible"
    }
  ],
  "data": [ /* same array */ ]
}
```

Use either `collected_arts` or `data` — both contain the same list.

---

## 4. Exploring Spot History API

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/api/v1/exploringSpot/history` |
| **When to call** | Guidebook / Visited Spots screen |

Returns spots the user has already visited/claimed (`checked_in`), so they can re-read photo, address, and facts after the spot leaves the live map.

**Success response** `200`

```json
{
  "status": true,
  "success": true,
  "message": "Exploring spot history retrieved",
  "history": [
    {
      "spot_id": "65e2a2b3c4d5e6f7a8b9c0d1",
      "title": "Old Town Castle",
      "spot_name": "Old Town Castle",
      "description": "Built in 1450, this castle was used as a...",
      "address": "Castle Street 12, Munich",
      "city": "Munich",
      "image_url": "https://...",
      "Imageurl": "https://...",
      "visited_at": "2026-10-10",
      "visited_at_iso": "2026-10-10T14:22:00.000Z",
      "points_awarded": 1,
      "latitude": 48.137,
      "longitude": 11.575
    }
  ],
  "data": [ /* same array */ ]
}
```

| Field | Notes |
|-------|--------|
| `title` / `spot_name` | Same display name |
| `address` | Spot address if set; otherwise falls back to `city` |
| `visited_at` | Date only `YYYY-MM-DD` |
| `image_url` / `Imageurl` | Same image URL (legacy alias) |

---

## 5. Existing API Modifications

### 5.1 Mystery Bag Create — `is_collectible`

| | |
|---|---|
| **Method** | `POST` |
| **Endpoint** | `/api/v1/mysteryBag/create` |
| **Content-Type** | `multipart/form-data` |

**New field**

| Field | Type | Description |
|-------|------|-------------|
| `is_collectible` | boolean / string `"true"` \| `"false"` | `true` → collectible (can be taken from map). `false` → view-only / exhibition (stays on map). |

Maps internally to existing `bag_type`:
- `is_collectible=true` → `bag_type: "collectible"`
- `is_collectible=false` → `bag_type: "view-only"`

You may still send `bag_type` directly; `is_collectible` is the Unity-friendly alias.

**Example form fields**

```
bag_title=My Drawing
latitude=48.13
longitude=11.57
is_collectible=false
drawing_file=<file>
reward_file=<file>   // optional
```

View-only bags remain on the map for exhibition after interaction; collectible bags are for collect flow.

---

### 5.2 Exploring Spot Collect — information spots (no quiz)

| | |
|---|---|
| **Method** | `POST` |
| **Endpoint** | `/api/v1/exploringSpot/collect/:id` |
| **Alias** | `/api/v1/exploringSpot/checkin/:id` |

**Change:** Quiz/answer is **not** required for information spots (spots without quiz data).  
User only needs to be inside the spot radius with valid `latitude` / `longitude`; points are awarded as usual.

**Request body (typical)**

```json
{
  "latitude": 48.137154,
  "longitude": 11.576124
}
```

If a spot later has quiz data (`has_quiz` / `questions`), then `quiz_answer` / `user_answer` becomes required.

---

### 5.3 Quest Complete — optional mystic (`has_mystic`)

| | |
|---|---|
| **Method** | `POST` |
| **Endpoint** | `/api/v1/quest/complete_quest/:id` |

> **Important:** There is no `/api/v1/quest/claim/` route. Use **`complete_quest`**.

**Quest flag (create / update)**

On quest create (`POST /api/v1/quest/createQuest`) or update (`POST /api/v1/quest/updateQuest/:id`), send:

```json
{
  "has_mystic": false
}
```

| `has_mystic` | Behavior |
|--------------|----------|
| `true` | Quest involves creature/mystic; completion may award mystic distinguisher |
| `false` (or no `mythica_ID`) | Complete and award XP/rewards **without** creature capture verification |

Unlock / player quest payloads now include `has_mystic` so Unity can skip mystic capture UI when `false`.

**Complete response (example)**

```json
{
  "success": true,
  "message": "Quest completed",
  "data": {
    "has_mystic": false,
    "mystic_awarded": false
  }
}
```

---

## 6. Profile / Leaderboard / Friends — `avatar_data`

These existing endpoints now return `avatar_data` **in addition to** `profile_picture_id`.

### 6.1 Current user profile

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/api/v1/user/` |

> Not `/user/me`. Profile is `GET /api/v1/user/`.

User object in `data` includes:

```json
{
  "profile_picture_id": 1,
  "avatar_data": {
    "base_character": "magician_boy",
    "outfit_id": 2,
    "hat_id": 1,
    "wand_id": 3,
    "color_tint": "#4A90E2"
  }
}
```

### 6.2 Quest leaderboard

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/api/v1/quest/top_10` |

Each entry includes `profile_picture_id` and `avatar_data`.

### 6.3 Friends list

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/api/v1/friend/get_all/:status` |

`:status` = `all` | `accepted` | `requested`

Each friend entry includes `profile_picture_id` and `avatar_data`.

Use `avatar_data` to render customized characters on Leaderboard and Friends List.

---

## 7. Unity Integration Notes

### Chat security flow

```
Login / App start
  → GET /chat/blocked-users
  → cache blocked_user_ids

On Photon message received
  → if senderId ∈ blocked_user_ids → hide message

Report
  → POST /chat/report
  → show confirmation toast

Block / Unblock
  → POST /chat/block
  → replace local list with response.blocked_users
```

### Recommended screens ↔ APIs

| Screen | API |
|--------|-----|
| Avatar Studio (Save) | `POST /user/avatar-customization` |
| Magic Art Gallery | `GET /magicArt/collected` |
| Spots Guidebook | `GET /exploringSpot/history` |
| Drop drawing on map | `POST /mysteryBag/create` + `is_collectible` |
| Info spot check-in | `POST /exploringSpot/collect/:id` |
| Quest finish (no mystic) | Quest with `has_mystic: false` + `POST /quest/complete_quest/:id` |

### Response shape tip

Some newer endpoints return both:
- Legacy-friendly: `success` / `message` / `data` (via `apiResponse`)
- Client-requested: top-level `status`, `collected_arts`, `history`

Prefer the documented fields in this handoff; treat `data` as a duplicate where noted.

---

## 8. Admin Moderation (optional)

For admin panel review of chat reports (not required for Unity):

| Method | Endpoint | Auth |
|--------|----------|------|
| `GET` | `/api/v1/chat/reports?status=pending` | Admin JWT |
| `PATCH` | `/api/v1/chat/reports/:id` | Admin JWT |

```json
{
  "status": "action_taken",
  "admin_notes": "User blocked from admin panel"
}
```

Allowed statuses: `pending` | `reviewed` | `action_taken` | `dismissed`

Admin can still block a player account via existing user status APIs (`status: "blocked"`).

---

## 9. Quick Endpoint Index

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | POST | `/chat/report` | Report message/user + email moderators |
| 2 | POST | `/chat/block` | Block or unblock user |
| 3 | GET | `/chat/blocked-users` | Sync blocked list |
| 4 | POST | `/user/avatar-customization` | Save avatar config |
| 5 | GET | `/magicArt/collected` | Collected drawings gallery |
| 6 | GET | `/exploringSpot/history` | Visited spots guidebook |
| 7 | POST | `/mysteryBag/create` | + `is_collectible` field |
| 8 | POST | `/exploringSpot/collect/:id` | Claim (quiz optional) |
| 9 | POST | `/quest/complete_quest/:id` | Claim rewards; mystic optional via `has_mystic` |
| 10 | GET | `/user/` | Profile includes `avatar_data` |
| 11 | GET | `/quest/top_10` | Leaderboard includes `avatar_data` |
| 12 | GET | `/friend/get_all/:status` | Friends include `avatar_data` |

---

## Contact / Backend ownership

- Moderation inbox: `thorben@mycreapp.com`
- Optional env: `CHAT_MODERATION_EMAIL`
- Repo: `Mystic-Backend` (`mystic-rest-api`)

If anything is missing for Unity (extra fields, error codes, or sample C# models), request a follow-up from the backend team with the screen name and expected payload.
