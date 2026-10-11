# Tactile Deck Swipe Interactions & Floating AI Studio Redesign

A comprehensive upgrade to Recall's user experience featuring elastic swipe gesture animations on deck cards, a redesigned floating modern AI composer with embedded audio & deck tools, non-blocking background audio recording with live soundwave visualization, and persistent conversation history.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following design directions were confirmed during interactive clarification and are locked into this plan:

- **Confirmed Decision 1 (Swipe Interaction)**: Elastic drag with dynamic color reveal and smooth snap back / threshold triggers (`cubic-bezier(0.16, 1, 0.3, 1)`). Swiping right triggers Review/Study (emerald/teal reveal); swiping left triggers Delete confirmation (rose/coral reveal).
- **Confirmed Decision 2 (AI Composer Layout)**: Floating modern composer docked at the bottom of the AI Studio view with embedded action buttons, elevated surface, and high visual contrast.
- **Confirmed Decision 3 (Highlighted Quick Controls)**: Embedded voice recorder trigger, flashcard deck generator shortcut, and quick-prompt chips (`"Generate 5 cards on..."`, `"Summarize key concepts"`, `"Quiz me"`).
- **Confirmed Decision 4 (Tab Persistence & Background Recording)**: Chat messages and audio recording state are maintained across tab switches so navigating between Decks, Review, and AI Studio never destroys active chats or aborts ongoing recordings.
- **Confirmed Decision 5 (Deck Privacy Default)**: All decks created manually or via AI default to `isPublic: false`. A dedicated "Share to Community" action provides opt-in sharing, and community-imported decks grant full local ownership to the user.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Tactile Deck Cards**: Enables intuitive horizontal swipe gestures on deck cards in `DeckListView`. Dragging reveals semantic action colors and icons with elastic resistance and smooth spring settling.
  2. **Floating AI Composer**: Replaces the basic bottom textarea with a floating command bar featuring integrated quick-prompt chips, inline voice toggle, search grounding switch, and instant deck generator trigger.
  3. **"Recorder" Module & Soundwave Visualizer**: Rebrands "Class Recorder" to "Recorder", adds a multi-band soundwave frequency visualizer, and lifts recording state so audio capture continues while the user studies or navigates decks.
  4. **AI Deck Proposal & Privacy Architecture**: Prompts users with an explicit "Save to Decks" confirmation whenever AI drafts a deck, ensures all decks remain strictly private by default, and guarantees imported community decks belong to the user.
  5. **Session Continuity**: Chat messages persist across app tab switches in browser storage.
- **Target Audience / Persona**: Students, medical/STEM learners, and professionals conducting intensive spaced-repetition study sessions on mobile and desktop devices.
- **Key Value**: Low-friction card management via tactile gestures, distraction-free multimodal AI prompting, and uninterrupted lecture recording.

---

### 2. User Experience & Visual Design

#### Key User Flows

1. **Tactile Deck Swipe Flow**:
   - User touches or clicks a deck card and drags horizontally.
   - Dragging Right ($> 0\text{px}$): Reveals an Emerald gradient background with a glowing `PlayCircle` icon and "Study" label. Resistance kicks in as offset passes threshold ($80\text{px}$). Releasing past threshold smoothly springs and opens the study session.
   - Dragging Left ($< 0\text{px}$): Reveals a Rose gradient background with a `Trash2` icon and "Delete" label. Releasing past threshold opens the permanent delete confirmation dialog.
   - Releasing before threshold smoothly snaps the card back to center ($0\text{px}$) in $< 180\text{ms}$.
   - Standard taps on "Study", "Edit Cards", and card titles continue to function instantly without gesture interference.

2. **Floating Modern Composer Flow**:
   - In AI Studio, the conversation message thread scrolls smoothly above a floating composer card docked with subtle shadow elevation.
   - Above the input, quick-prompt chips allow one-tap prompt insertion.
   - Inside the composer:
     - Left icon strip: Embedded microphone toggle (one-tap voice recording) and Deck Generator trigger.
     - Center: Auto-resizing single/multi-line prompt input.
     - Right: Web search grounding toggle (`Globe`) and Send button (`Send` / `Loader2`).
   - When AI responds with card proposals, an action bar prompts: *"Save these cards into a new deck or existing deck?"* with a 1-tap "Save Deck" button.

3. **Background Recording & Soundwave Flow**:
   - User starts recording inside the "Recorder" tab or from the floating composer mic button.
   - Live soundwave visualizer renders dynamic frequency bars using `AudioContext` / `AnalyserNode`.
   - User switches to "Decks" or "Review" tab: Recording continues seamlessly. A persistent compact top pill displays recording elapsed time and an active audio wave indicator with a "Stop & Save" shortcut.

#### Visual Identity & Theme

- **Aesthetic Direction**: Clean, tactile, high-contrast dark/light mode following the existing `Skin` theme tokens (`surface`, `surfaceHover`, `accent`, `border`).
- **Typography & Scale**: Neo-grotesque sans (`system-ui`, `Outfit`/`Plus Jakarta Sans`), tabular numerals (`font-mono tabular-nums`) for timestamps and card counts.
- **Color Allocation (60-30-10 Rule)**:
  - 60% Dominant canvas (`activeSkin.colors.bg`).
  - 30% Structural surfaces (`activeSkin.colors.surface`, `activeSkin.colors.surfaceHover`).
  - 10% Accents: Emerald (`#10B981`) for review triggers, Rose (`#F43F5E`) for delete actions, Theme Accent for AI actions.
- **Motion & Micro-interactions**:
  - Drag translation: `transform: translateX(${offset}px)` with hardware-accelerated compositor.
  - Snap-back animation: `transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1)`.
  - Soundwave bars: dynamic heights between $4\text{px}$ and $28\text{px}$ with smooth interpolation.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Gesture Implementation via Pointer Events vs Third-Party Library**:
  - *Chosen Approach*: Native HTML5 `PointerEvents` (`onPointerDown`, `onPointerMove`, `onPointerUp`) with threshold detection and touch-action css.
  - *Why*: Eliminates bundle bloat, ensures zero latency, and provides cross-platform compatibility across iOS touch, Android touch, and desktop mouse dragging without extra npm dependencies.
- **Decision 2: Audio Recording State Architecture**:
  - *Chosen Approach*: Lift active recorder state (`isRecording`, `recordSeconds`, `recorderRef`, `analyserNode`) to `App.tsx` or a shared state context, and pass controller hooks down to both `AiStudioView` and a persistent floating banner.
  - *Why*: Solves the user's explicit requirement that switching tabs must not interrupt recording or prevent working with the app.
- **Decision 3: AI Chat Persistence**:
  - *Chosen Approach*: Lift `chatMessages` to `App.tsx` with fallback persistence in `localStorage` (`recall_ai_chat_history`).
  - *Why*: Ensures seamless continuity when users switch between studying decks, checking community materials, and chatting with AI.
- **Decision 4: Private-by-Default Deck Sharing**:
  - *Chosen Approach*: Every deck created via manual creation or AI generation receives `sharingControl: { isPublic: false }`. Community decks imported by the user are cloned with the user as owner and default to private until explicitly shared.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                                App.tsx                                 │
│  • Global State: decks, cards, resources, appearance, currentUser      │
│  • Lifted States: chatMessages, isRecording, recordSeconds, audioRec   │
│  • Persistent Mini-Recorder Bar (visible when recording on other tabs) │
└───────┬──────────────────────────────────┬─────────────────────┬───────┘
        │                                  │                     │
        ▼                                  ▼                     ▼
┌───────────────────┐            ┌───────────────────┐ ┌─────────────────┐
│  DeckListView.tsx │            │  AiStudioView.tsx │ │ ReviewTabView   │
│  • SwipeableDeck- │            │  • Sub-tabs:      │ │ & Community     │
│    Item Component │            │    - AI Chat      │ │ • Full local    │
│  • Pointer events │            │    - Resources    │ │   deck ownership│
│  • Elastic offset │            │    - Recorder     │ │ • Opt-in share  │
│  • Color reveals  │            │  • Floating       │ └─────────────────┘
│  • Snap animation │            │    Modern         │
│  • Delete modal   │            │    Composer       │
└───────────────────┘            │  • Quick Chips    │
                                 │  • Soundwave Bar  │
                                 └───────────────────┘
```

#### Component & State Mapping

1. **`SwipeableDeckCard` (inside `DeckListView.tsx`)**:
   - Manages local drag offset: `dragX`, `isDragging`, `startX`.
   - Renders underlying action track:
     - Left backing: `bg-emerald-600/20 text-emerald-400` + `PlayCircle` (Study).
     - Right backing: `bg-rose-600/20 text-rose-400` + `Trash2` (Delete).
   - Renders foreground card container: `transform: translateX(${dragX}px)`, transition dynamic when released.
   - Handlers:
     - If released past $+80\text{px}$ $\to$ invokes `onStartReviewDeck(deck)`.
     - If released past $-80\text{px}$ $\to$ triggers `setDeckPendingDelete(deck)`.
     - Else $\to$ snaps back to $0\text{px}$.

2. **`FloatingModernComposer` (inside `AiStudioView.tsx`)**:
   - Fixed or docked floating card at bottom of AI chat container.
   - Quick prompt chips: clicking sets `promptInput` or triggers immediate generation.
   - Action buttons:
     - Mic button: toggles recording directly from chat.
     - Deck button: opens card generation modal pre-populated with active resource context.
     - Search switch: toggles Google Search grounding.

3. **`SoundwaveVisualizer` (inside `AiStudioView.tsx` & floating mini bar)**:
   - Web Audio API `AudioContext` + `AnalyserNode` connected to microphone stream.
   - Animates 16 vertical audio frequency bars with real-time level heights.

4. **Persistence & Deck Sharing Logic**:
   - `saveStoredDecks` updates `isPublic: false` by default.
   - Import community deck assigns `authorId = currentUser.id` and `isPublic = false`.
   - `App.tsx` retains `chatMessages` across tab unmounts and mounts.

---

### Verification & Testing Plan

1. **Gesture Verification**:
   - Test swiping right past threshold $\to$ launches review session.
   - Test swiping left past threshold $\to$ displays delete confirmation modal.
   - Test partial swipe and release $\to$ card smoothly snaps back to original position.
   - Test normal button clicks (Study, Edit Cards, Title) $\to$ work without interference from gesture listeners.
2. **AI Composer Verification**:
   - Send prompts, verify quick-prompt chips populate and send properly.
   - Test search grounding toggle and citation rendering.
   - Verify proposal dialog appears when AI generates a deck.
3. **Background Recording & Soundwave**:
   - Start recording $\to$ observe live soundwave bars responding to audio.
   - Switch tabs to "Decks" or "Community" $\to$ verify recording timer continues running and floating bar remains accessible.
   - Stop recording $\to$ verify audio blob is captured and ready for transcription.
4. **Chat Persistence**:
   - Chat with AI, navigate away to "Review" tab, navigate back $\to$ verify entire chat conversation remains intact.
5. **Compilation & Build**:
   - Run `compile_applet` to confirm clean TypeScript compilation with zero lint errors.
