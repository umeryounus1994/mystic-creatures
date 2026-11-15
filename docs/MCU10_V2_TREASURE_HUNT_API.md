# MCU-10 - Treasure Hunt / Map Hunt (API v2)

**Audience:** Unity / mobile app developers  
**Ticket:** MCU-10 - Treasure Hunt entry, QR Hunt, Map Hunt list, purchase, pause  
**Backend branch:** `feature/mcu-10-v2-treasure-hunt`  
**Base URL:** `{API_HOST}/api/v2`

---

## 0. Compatibility rule (read first)

| App build | API |
|-----------|-----|
| **Live / current store build** | Keep using **`/api/v1/*` only** - behaviour unchanged |
| **New MCU-10 build** | Use **`/api/v2/*`** for Treasure Hunt / Map Hunt / purchase / start |

Do **not** point the live app at v2. Do **not** remove v1 calls from the live build.

Auth on v2 player endpoints is the same as v1 (user JWT / existing auth middleware).

---

## 1. Product behaviour (what the new app must do)

### 1.1 Navigation

| Entry | Opens |
|-------|--------|
| Main menu **“Abenteuer starten” / Start adventure** | **Treasure Hunt** page (2 large buttons + tip line) |
| Main menu **treasure chest** icon | **Map Hunt list** directly |

**Removed from this flow:** tabs “Missionen” / “Entdeckerpunkte”, dice icon hiding the scanner.

Discovery spots stay on the **map** (map UI = separate ticket). Tip line under the two buttons is plain text, not tappable.

### 1.2 Treasure Hunt page (client-only)

Two buttons + tip (texts in §8):

1. **QR Hunt** → open camera immediately  
2. **Map Hunt** → call `POST /adventure/map_hunt` and show the list  

### 1.3 QR Hunt

- Open the **camera directly** (no tabs, no dice).
- Scan **quest QR** → start quest as today (existing quest APIs / flow).
- Scan **QR tour payment QR** → unlock tour as today.
- Scan **treasure hunt QR** → call v2 unlock (see §4.6). Backend **pauses** any other running hunt/mission; do **not** show the old “Please Terminate…” popup.

### 1.4 Map Hunt list

- Shows **treasure hunts + missions** that are:
  - `active`
  - language matches app language (`german` / `english`)
  - start/end date includes **today**
  - start coordinates within **50 km** of the player  
- Sorted by distance (nearest first).
- Missions appear like **free** hunts (badge Free / Start), but `type` stays `"mission"` - on completion screens still say **mission** vs **treasure hunt**.

### 1.5 Purchase

- Badge shows the **store price** for the hunt’s price level (local currency from the store).
- Button label is only **Buy** / **Kaufen** (not “Buy – 4,99 €”).
- Tap Buy → open the store purchase for `store_product_id` **directly** (no in-app confirm dialog).
- After store success → call `POST /hunt/purchase/:id`.
- Then show **Unlocked** + **Start**. **Never** show a popup with the technical product ID.

### 1.6 Start / Continue / Pause

- **Start** / **Continue** → `POST /hunt/start/:id` or `POST /mission/start/:id`.
- If another hunt or mission is `inprogress`, backend sets it to **`paused`** (progress kept).
- Show a short toast (~3 s) from `paused_hint` (card style). Texts in §8.
- **Remove** old popup: *“Please Terminate the In Progress Mission to Start This One.”*
- **No** terminate / end / X button on list cards.

### 1.7 After Start / Continue

Leads to **map choice → map with stations**. Map choice and map = **separate ticket** (out of scope here). This ticket ends when Start/Continue is called successfully.

---

## 2. In-app products (final IDs)

Use these store product IDs (App Store + Play Store). One product per price level; one purchase unlocks **exactly that hunt**.

| `price_level` | `store_product_id` |
|---------------|--------------------|
| `"1.99"` | `com.usquaresolution.mysticalcreatures.treasurehunt199` |
| `"2.99"` | `com.usquaresolution.mysticalcreatures.treasurehunt299` |
| `"4.99"` | `com.usquaresolution.mysticalcreatures.treasurehunt499` |
| `"6.99"` | `com.usquaresolution.mysticalcreatures.treasurehunt699` |
| `"9.99"` | `com.usquaresolution.mysticalcreatures.treasurehunt999` |

Prefer the `store_product_id` returned on each list item / purchase response over hardcoding, but the table above is the source of truth.

Legacy Bronze / Silver / Gold packages are **not** used by the new app for pricing.

---

## 3. Images & defaults

| Field | Meaning |
|-------|---------|
| `image` | Custom uploaded URL, or `null` |
| `default_image` | `"chest"` \| `"map"` \| `"compass"` \| `"door"` |
| `has_custom_image` | `true` if `image` should be shown |

**Client rule:** if `image == null` (or `has_custom_image == false`), show the **bundled** default asset for `default_image`. Do not use the old stock Depositphotos URL.

List UI: square image, rounded corners (~14 px per design).

---

## 4. Endpoints

Common success envelope:

```json
{
  "success": true,
  "message": "…",
  "data": { }
}
```

Errors use the existing API error helpers (`success: false` / status codes as elsewhere).

---

### 4.1 `GET /adventure/meta`

**Auth:** same as other “origins” / generic authenticated routes  
**Purpose:** optional bootstrap for languages, defaults, price levels, product IDs, radius.

**Example response `data`:**

```json
{
  "languages": ["german", "english"],
  "default_images": ["chest", "map", "compass", "door"],
  "price_levels": [
    {
      "price_level": "1.99",
      "store_product_id": "com.usquaresolution.mysticalcreatures.treasurehunt199"
    },
    {
      "price_level": "2.99",
      "store_product_id": "com.usquaresolution.mysticalcreatures.treasurehunt299"
    },
    {
      "price_level": "4.99",
      "store_product_id": "com.usquaresolution.mysticalcreatures.treasurehunt499"
    },
    {
      "price_level": "6.99",
      "store_product_id": "com.usquaresolution.mysticalcreatures.treasurehunt699"
    },
    {
      "price_level": "9.99",
      "store_product_id": "com.usquaresolution.mysticalcreatures.treasurehunt999"
    }
  ],
  "radius_km": 50
}
```

---

### 4.2 `POST /adventure/map_hunt`  ★ main Map Hunt list

**Auth:** user  
**Body:**

```json
{
  "latitude": 52.52,
  "longitude": 13.405,
  "language": "german"
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `latitude` | yes | Player position |
| `longitude` | yes | Player position |
| `language` | recommended | `"german"` or `"english"` = **app language**. Also accepts `de` / `en`. Default if omitted: german |

**Filters applied server-side:** active + language + date window includes today + distance ≤ 50 km. Sorted nearest first.

**Example response `data`:**

```json
{
  "count": 2,
  "radius_km": 50,
  "language": "german",
  "items": [
    {
      "id": "665f0a1b2c3d4e5f67890123",
      "type": "treasure_hunt",
      "name": "Goldene Truhe Berlin",
      "language": "german",
      "distance_km": 0.8,
      "stations_total": 5,
      "stations_completed": 0,
      "premium_hunt": true,
      "price_level": "4.99",
      "store_product_id": "com.usquaresolution.mysticalcreatures.treasurehunt499",
      "hunt_package": "Gold",
      "purchased": false,
      "user_status": "open",
      "image": null,
      "default_image": "chest",
      "has_custom_image": false,
      "list_state": "premium_locked",
      "badge": "price",
      "button": "buy",
      "start_latitude": 52.52,
      "start_longitude": 13.40,
      "have_qr": false
    },
    {
      "id": "665f0a1b2c3d4e5f67890199",
      "type": "mission",
      "name": "Stadtspaziergang",
      "language": "german",
      "distance_km": 1.2,
      "stations_total": 3,
      "stations_completed": 1,
      "premium_hunt": false,
      "price_level": null,
      "store_product_id": null,
      "hunt_package": null,
      "purchased": false,
      "user_status": "paused",
      "image": "https://…/custom.jpg",
      "default_image": "map",
      "has_custom_image": true,
      "list_state": "paused",
      "badge": "progress",
      "button": "continue",
      "start_latitude": 52.51,
      "start_longitude": 13.39,
      "have_qr": false
    }
  ]
}
```

If `count` is `0` and location was granted → show “nothing nearby” empty state (§8).  
If location permission denied → do **not** call this API; show “allow location” UI (§8).

---

### 4.3 List item fields (reference)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Hunt or mission Mongo id |
| `type` | string | `"treasure_hunt"` or `"mission"` |
| `name` | string | Title |
| `language` | string | `german` / `english` |
| `distance_km` | number | Rounded to 1 decimal |
| `stations_total` | number | Number of quiz stations |
| `stations_completed` | number | Answered stations (progress) |
| `premium_hunt` | bool | Paid hunt? Missions always false |
| `price_level` | string \| null | e.g. `"4.99"` |
| `store_product_id` | string \| null | IAP product for Buy |
| `purchased` | bool | Account already unlocked this hunt |
| `user_status` | string | `open` / `purchased` / `inprogress` / `paused` / `completed` / `claimed` / … |
| `image` | string \| null | Custom list image URL |
| `default_image` | string | Fallback key for bundled art |
| `has_custom_image` | bool | Use `image` when true |
| `list_state` | string | See §5 |
| `badge` | string | See §5 |
| `button` | string \| null | See §5 |
| `start_latitude` / `start_longitude` | number \| null | Hunt/mission start point |
| `have_qr` | bool | Hunt has QR stations (info only) |

---

### 4.4 `POST /hunt/get_all` · `POST /mission/get_all`

Same auth/body idea as map hunt (`latitude`, `longitude`, `language`).  
Same item shape, but **hunts only** or **missions only**.

Prefer **`/adventure/map_hunt`** for the Map Hunt screen (combined list).

**Response `data`:**

```json
{
  "count": 1,
  "items": [ /* same entry shape as map_hunt items */ ]
}
```

---

### 4.5 Start / Continue

#### `POST /hunt/start/:id`  
#### `GET /hunt/start/:id`  
#### `POST /mission/start/:id`  
#### `GET /mission/start/:id`

**Auth:** user  

- Premium hunt without purchase → error: `"Purchase required to start this treasure hunt"`.
- Already `completed` / `claimed` → error.
- Any other `inprogress` hunt **or** mission → set to `paused`, progress kept.
- Target item → `inprogress`.

**Example success `data` (hunt):**

```json
{
  "hunt_id": "665f0a1b2c3d4e5f67890123",
  "type": "treasure_hunt",
  "user_status": "inprogress",
  "paused": [
    {
      "type": "mission",
      "id": "665f0a1b2c3d4e5f67890199",
      "name": "Stadtspaziergang"
    }
  ],
  "paused_hint": {
    "type": "mission",
    "id": "665f0a1b2c3d4e5f67890199",
    "name": "Stadtspaziergang"
  }
}
```

**Client:**

- If `paused_hint` is not null → show toast with hunt/mission **name** (§8), ~3 seconds.
- If `paused` is empty / `paused_hint` is null → no toast.
- Then navigate to map choice / map (separate ticket).

Mission start returns `mission_id` instead of `hunt_id`.

---

### 4.6 `POST /hunt/unlock_hunt` (QR)

**Auth:** user  
**Body:**

```json
{
  "qr_code": "THE_SCANNED_CODE"
}
```

Same pause behaviour as start. Same success shape as hunt start (`hunt_id`, `paused`, `paused_hint`, …).

Premium + not purchased → purchase required error.

---

### 4.7 Purchase

#### `POST /hunt/purchase/:id`  
#### `GET /hunt/purchase/:id`

**Auth:** user  

**Recommended flow:**

1. User taps **Buy** on a `badge: "price"` / `button: "buy"` item.  
2. App opens native IAP for `item.store_product_id`.  
3. On store success, call this endpoint.  
4. Refresh list row → expect Unlocked / Start.  
5. **Do not** show product ID in any popup.

**Optional body:**

```json
{
  "purchase_token": "store-transaction-or-receipt-id",
  "store_product_id": "com.usquaresolution.mysticalcreatures.treasurehunt499"
}
```

If `store_product_id` is sent and does not match the hunt’s price level → error.

**Example success `data` (new purchase):**

```json
{
  "hunt_id": "665f0a1b2c3d4e5f67890123",
  "already_purchased": false,
  "purchase_id": "…",
  "price_level": "4.99",
  "store_product_id": "com.usquaresolution.mysticalcreatures.treasurehunt499",
  "list_state": "unlocked",
  "badge": "unlocked",
  "button": "start"
}
```

If already purchased, same shape with `"already_purchased": true` (still success - safe to treat as unlocked).

Unlock is stored on the **user account** (survives reinstall / other device when logged in).

---

## 5. Badge / button mapping (UI)

Drive UI from `badge` + `button` (and progress counts when needed):

| `list_state` | `badge` | `button` | UI |
|--------------|---------|----------|-----|
| `free` | `free` | `start` | Badge Free → **Start** |
| `premium_locked` | `price` | `buy` | Badge = **localized store price** → **Buy** |
| `unlocked` | `unlocked` | `start` | Badge Unlocked → **Start** |
| `started` or `paused` | `progress` | `continue` | Badge `[x] of [y] stations` using `stations_completed` / `stations_total` → **Continue** |
| `completed` | `completed` | `null` | Badge Completed → **no button** |

No other action buttons on the card (especially no terminate).

---

## 6. Suggested client flows

```
Abenteuer starten
  → Treasure Hunt screen (2 buttons + tip)
       ├─ QR Hunt → Camera
       │     ├─ Quest QR     → existing quest flow
       │     ├─ Tour pay QR  → existing tour unlock
       │     └─ Hunt QR      → POST /hunt/unlock_hunt → map (later ticket)
       └─ Map Hunt → POST /adventure/map_hunt
              ├─ Buy      → Store(store_product_id) → POST /hunt/purchase/:id → refresh row
              ├─ Start    → POST /hunt/start/:id or /mission/start/:id → map (later ticket)
              └─ Continue → same start endpoints

Treasure chest icon → Map Hunt list (same as Map Hunt button)
```

---

## 7. Empty / permission states (client)

These are **client UI** states (API not always called):

| Situation | Behaviour |
|-----------|-----------|
| Location permission denied | Show “allow location” text + button that opens system permission dialog. Do not call map_hunt until granted. |
| Location OK, `count == 0` | Show “nothing nearby” text. |
| List loaded | Show count line: “[n] adventures”. |

---

## 8. Fixed app texts (DE / EN)

Use Du-form. Mockups may show German; follow this table.

| Element | Deutsch | English |
|---------|---------|---------|
| Page overline | Abenteuer | Adventure |
| Page title | Schnitzeljagd | Treasure Hunt |
| Button 1 | QR-Jagd | QR Hunt |
| Button 1 subline | Scanne einen QR-Code vor Ort | Scan a QR code on site |
| Button 2 | Karten-Jagd | Map Hunt |
| Button 2 subline | Finde Schnitzeljagden in deiner Nähe | Find treasure hunts near you |
| Tip under buttons | Tipp: Auf der Karte warten Entdeckerpunkte – geh hin und entdecke sie. | Tip: Discovery spots are waiting on the map – go there and discover them. |
| Scanner title | QR-Jagd | QR Hunt |
| Scanner hint | Halte die Kamera auf den QR-Code | Point your camera at the QR code |
| List overline | Schnitzeljagd | Treasure Hunt |
| List title | Karten-Jagd | Map Hunt |
| List heading | In deiner Nähe | Near you |
| List count | [Anzahl] Abenteuer | [number] adventures |
| Distance | [x] km entfernt | [x] km away |
| Stations | [Anzahl] Stationen | [number] stations |
| Badge free | Kostenlos | Free |
| Badge price | [store price] | [store price] |
| Badge bought | Freigeschaltet | Unlocked |
| Badge progress | [x] von [y] Stationen | [x] of [y] stations |
| Badge completed | Abgeschlossen | Completed |
| Button buy | Kaufen | Buy |
| Button start | Starten | Start |
| Button continue | Weiterspielen | Continue |
| Hunt paused | Deine Jagd „[Name]“ ist pausiert. Du kannst sie jederzeit weiterspielen. | Your hunt „[name]“ is paused. You can continue it any time. |
| Nothing nearby | Hier gibt es noch keine Schnitzeljagd. Schau bald wieder vorbei! | There's no treasure hunt near you yet. Check back soon! |
| No location | Erlaube den Standortzugriff, um Schnitzeljagden in deiner Nähe zu finden. | Allow location access to find treasure hunts near you. |
| Allow location button | Standort freigeben | Allow location |

For `paused_hint` when `type == "mission"`, still use the same toast pattern with the returned `name` (ticket focuses on hunt wording; name comes from API).

---

## 9. Design notes (app)

Style values from the ticket (approximate):

- Background gradient `#1B1030` → `#2A1748`
- Accent / titles gold `#F2C14E`
- Cards `#3A2366` @ 85% opacity, 1 px gold border, radius ~20 px
- Images in cards radius ~14 px
- Primary button coral `#E8806E`, fully rounded, height ~58 px, white bold text
- Badges gold `#F2C14E`, dark text, fully rounded
- Tip: “Tipp:” / “Tip:” in gold; rest light lilac; ~13 px; centred
- Close button: coral ring + coral X, ~52 px, bottom centre
- Font: rounded bold (e.g. Nunito); title ~24 px; body 13–16 px

Mockup vs ticket: **ticket wins** (e.g. Buy button text without price; distance includes “away” / “entfernt”).

---

## 10. Out of scope (do not implement in this ticket)

- Map choice (3D / 2D) and everything on the map  
- Arrival at a station, questions, rewards / completion UI details beyond naming  
- Start screen after scanning a **quest** QR (separate ticket)  
- Admin panel (already handled separately)

---

## 11. Backend / admin notes (FYI for app)

- Admin can set per hunt/mission: optional image, `default_image`, `language`; premium hunts also `price_level`.
- Existing content defaults: `language = german`, `default_image = chest`.
- Migration: `npm run mcu10-backfill` on the API server DB.
- v1 endpoints remain for the live app; purchasing on v1 still uses old package flow.

---

## 12. Quick checklist for app QA

- [ ] Live build still on v1 only  
- [ ] New build: Abenteuer starten → 2 buttons + tip; chest → Map Hunt  
- [ ] QR Hunt opens camera; hunt QR uses v2 unlock + pause toast  
- [ ] Map Hunt: 50 km, language filter, sort by distance  
- [ ] Image fallback via `default_image`  
- [ ] Badge/button states match §5  
- [ ] Buy → store → purchase API → Unlocked/Start, no product-ID popup  
- [ ] Start second hunt pauses first; Continue works; no Terminate popup; no end button on cards  
- [ ] Empty + no-location states  
- [ ] DE/EN texts from §8  
- [ ] Start/Continue only navigates toward map (map ticket follows)
