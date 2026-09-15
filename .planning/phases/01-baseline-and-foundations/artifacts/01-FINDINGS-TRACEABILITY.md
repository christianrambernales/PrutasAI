[
  {
    "id": "B-01",
    "priority": "Blocker",
    "reviewClaim": "Photo pick and capture actions bypass model execution and return predetermined sample diagnosis after timeout",
    "prototypeEvidence": [
      "app.js:311-312",
      "app.js:317-320"
    ],
    "revalidationTarget": "features/capture/*, useCaptureRoute.ts, CaptureResultScreen.tsx, preview-content boundary",
    "activeModule": "app/src/features/capture",
    "activeModules": [
      "app/src/features/capture",
      "app/src/features/result/CaptureResultScreen.tsx"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "partially-confirmed",
    "targetPhase": 4,
    "dependencies": [
      6
    ],
    "acceptanceEvidence": "A gallery or camera action either receives an image and runs valid checks or clearly states scanning is unavailable; no user-provided image receives a predetermined diagnosis",
    "owner": "Frontend / ML Pipeline Engineer",
    "status": "Pending"
  },
  {
    "id": "B-02",
    "priority": "Blocker",
    "reviewClaim": "Only confirmed, possible, and healthy status entries exist; undetermined and awareness-only states missing while possible exposes full remedy content",
    "prototypeEvidence": [
      "app.js:52-56"
    ],
    "revalidationTarget": "features/result/*, features/viewModels.ts, core/status, compiled remedies",
    "activeModule": "app/src/features/result",
    "activeModules": [
      "app/src/features/result",
      "app/src/features/viewModels.ts",
      "app/src/core/status"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 4,
    "dependencies": [
      5
    ],
    "acceptanceEvidence": "Each status in UX diagnosis contract is reachable, textually distinct, and gates remedies and treatments for uncertain or awareness-only results",
    "owner": "Frontend / Agricultural Knowledge Engineer",
    "status": "Pending"
  },
  {
    "id": "B-03",
    "priority": "Blocker",
    "reviewClaim": "History is initialized empty, never serialized, and saveCurrentResult retains only first entry per crop",
    "prototypeEvidence": [
      "app.js:58-80",
      "app.js:167",
      "app.js:281-284"
    ],
    "revalidationTarget": "scan migration/repository, capture write path, history reload",
    "activeModule": "app/src/core/db/repositories/scans.ts",
    "activeModules": [
      "app/src/core/db/repositories/scans.ts",
      "app/src/core/db/migrations.ts"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "resolved-in-active-app",
    "targetPhase": 2,
    "dependencies": [],
    "acceptanceEvidence": "Reload retains multiple records from same crop using UUID keys; records can be opened and filtered; SQLite migrations verify persistence",
    "owner": "Database / Storage Engineer",
    "status": "Pending"
  },
  {
    "id": "B-04",
    "priority": "High",
    "reviewClaim": "Monitoring checkpoint Day 1 is hardcoded Moderate 28% for all crops, Day 5 is static, and post-checkpoint state is not saved",
    "prototypeEvidence": [
      "app.js:224-225"
    ],
    "revalidationTarget": "features/monitoring, preview sessions, future checkpoint repository",
    "activeModule": "app/src/features/monitoring",
    "activeModules": [
      "app/src/features/monitoring"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 4,
    "dependencies": [
      2,
      5
    ],
    "acceptanceEvidence": "Baseline reflects selected persisted record; follow-up checkpoints can be saved; trend labels derive from recorded observation evidence",
    "owner": "Frontend / Domain Logic Engineer",
    "status": "Pending"
  },
  {
    "id": "UX-01",
    "priority": "High",
    "reviewClaim": "Photo help describes errors like permission, blur, darkness, and distance, but none is an actual outcome; processing cannot cancel or fail",
    "prototypeEvidence": [
      "app.js:237-239"
    ],
    "revalidationTarget": "camera/image-picker permissions, cancel/error/quality states, route abandonment",
    "activeModule": "app/src/features/capture",
    "activeModules": [
      "app/src/features/capture"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 4,
    "dependencies": [],
    "acceptanceEvidence": "Dedicated recovery states exist with single safe next action directing user to retry, change photo, gallery, settings, or model status",
    "owner": "Frontend Engineer",
    "status": "Pending"
  },
  {
    "id": "UX-02",
    "priority": "High",
    "reviewClaim": "Result displays numeric percentage without plain-language interpretation first; healthy result lacks visible retake or escalation option",
    "prototypeEvidence": [
      "app.js:167"
    ],
    "revalidationTarget": "result headings, confidence explanation, healthy/uncertain recovery",
    "activeModule": "app/src/features/result",
    "activeModules": [
      "app/src/features/result"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 4,
    "dependencies": [
      5
    ],
    "acceptanceEvidence": "Plain-language certainty explanation precedes percentage metric; healthy status limits claim to supported conditions and provides scan-again/escalate path",
    "owner": "Frontend / Content Designer",
    "status": "Pending"
  },
  {
    "id": "UX-03",
    "priority": "Medium",
    "reviewClaim": "Generic remedy text references affected fruit and foliage across all non-healthy samples regardless of surface",
    "prototypeEvidence": [
      "app.js:241-243"
    ],
    "revalidationTarget": "remedy selection by crop/surface/condition/certainty/locale/version",
    "activeModule": "app/src/features/result/ResultScreen.tsx",
    "activeModules": [
      "app/src/features/result/ResultScreen.tsx",
      "knowledge"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 5,
    "dependencies": [],
    "acceptanceEvidence": "Remedy content is dynamically keyed by crop, surface, condition, and certainty; uncertain results withhold ungrounded treatment advice",
    "owner": "Agricultural Knowledge Specialist",
    "status": "Pending"
  },
  {
    "id": "UX-04",
    "priority": "Medium",
    "reviewClaim": "Horizontal scrollbar appears on mobile viewports at 375px and 393px violating zero-horizontal-overflow requirement",
    "prototypeEvidence": [
      "styles.css:98-99",
      "index.html:54"
    ],
    "revalidationTarget": "React Native Web layouts and supported widths",
    "activeModule": "app/src/ui",
    "activeModules": [
      "app/src/ui",
      "app/src/navigation"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "prototype-only",
    "targetPhase": 7,
    "dependencies": [
      4
    ],
    "acceptanceEvidence": "Layout reflows cleanly without horizontal document scrolling across standard widths 375px, 393px, 412px, 768px, 1024px, and 1440px",
    "owner": "Frontend / Web Platform Engineer",
    "status": "Pending"
  },
  {
    "id": "UX-05",
    "priority": "Medium",
    "reviewClaim": "Selecting offline or account card immediately navigates without explicit selected-state confirmation or Continue button",
    "prototypeEvidence": [
      "app.js:131"
    ],
    "revalidationTarget": "welcome/onboarding selection/continue behavior",
    "activeModule": "app/src/features/welcome",
    "activeModules": [
      "app/src/features/welcome",
      "app/src/features/language",
      "app/src/features/consent"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 4,
    "dependencies": [],
    "acceptanceEvidence": "Selection uses distinct selected state and explicit Continue action allowing low-confidence users to verify choices before advancing",
    "owner": "UX / Frontend Designer",
    "status": "Pending"
  },
  {
    "id": "UX-06",
    "priority": "Medium",
    "reviewClaim": "History search filter only executes on Enter key without visible submit button or debounced search-as-you-type",
    "prototypeEvidence": [
      "app.js:361-364"
    ],
    "revalidationTarget": "HistoryScreen, useHistoryFilters, scan repository",
    "activeModule": "app/src/features/history/HistoryScreen.tsx",
    "activeModules": [
      "app/src/features/history/HistoryScreen.tsx",
      "app/src/features/history/useHistoryFilters.ts"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 2,
    "dependencies": [
      4
    ],
    "acceptanceEvidence": "Search debounces input typing or provides clear submit action; empty search state reveals clear no-matches guidance",
    "owner": "Frontend Engineer",
    "status": "Pending"
  },
  {
    "id": "UX-07",
    "priority": "Medium",
    "reviewClaim": "Opening a deleted or non-existent history record fails silently without feedback or missing-record recovery state",
    "prototypeEvidence": [
      "app.js:325"
    ],
    "revalidationTarget": "result route lookup and missing-ID recovery",
    "activeModule": "app/src/features/result/ResultScreen.tsx",
    "activeModules": [
      "app/src/features/result/ResultScreen.tsx",
      "app/src/navigation"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 4,
    "dependencies": [
      2
    ],
    "acceptanceEvidence": "Navigating to unknown or missing record renders dedicated missing-record screen with return-to-history affordance",
    "owner": "Frontend Engineer",
    "status": "Pending"
  },
  {
    "id": "UX-08",
    "priority": "Medium",
    "reviewClaim": "Location search input lacks input handler and device location button always produces error toast",
    "prototypeEvidence": [
      "app.js:206-207",
      "app.js:329-331"
    ],
    "revalidationTarget": "location picker/device hook/geocoding/settings",
    "activeModule": "app/src/features/location",
    "activeModules": [
      "app/src/features/location",
      "app/src/core/geo"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 2,
    "dependencies": [
      4
    ],
    "acceptanceEvidence": "Town search returns selectable Philippine municipalities; permission denial or location failure routes gracefully to manual selection",
    "owner": "Core / Location Services Engineer",
    "status": "Pending"
  },
  {
    "id": "UX-09",
    "priority": "Medium",
    "reviewClaim": "Assistant promises conversation drawer, rename/delete/restore, but interface exposes no conversation list and Trash is empty-only",
    "prototypeEvidence": [
      "app.js:228-229"
    ],
    "revalidationTarget": "chat sidebar/row menu/trash/repositories",
    "activeModule": "app/src/features/chat",
    "activeModules": [
      "app/src/features/chat",
      "app/src/core/db/repositories/conversations.ts"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 4,
    "dependencies": [
      3
    ],
    "acceptanceEvidence": "Conversations can be created, switched, renamed, soft-deleted to trash, restored, and permanently removed with confirmation",
    "owner": "Frontend / Assistant Engineer",
    "status": "Pending"
  },
  {
    "id": "UX-10",
    "priority": "Low",
    "reviewClaim": "Inconsistent bilingual mixing after language selection leaves English technical jargon in core Filipino screens",
    "prototypeEvidence": [
      "app.js:145",
      "app.js:203"
    ],
    "revalidationTarget": "ui/i18n/strings.ts and safety/domain copy",
    "activeModule": "app/src/ui/i18n/strings.ts",
    "activeModules": [
      "app/src/ui/i18n/strings.ts"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 5,
    "dependencies": [
      7
    ],
    "acceptanceEvidence": "Audited glossary replaces unnecessary technical loanwords with natural Filipino equivalents; session language remains consistent",
    "owner": "Localization / Content Lead",
    "status": "Pending"
  },
  {
    "id": "FE-01",
    "priority": "High",
    "reviewClaim": "User message text concatenated directly into innerHTML sink without sanitization or DOM escaping",
    "prototypeEvidence": [
      "app.js:197",
      "app.js:368-375"
    ],
    "revalidationTarget": "React Native text rendering in ChatScreen and conversation components",
    "activeModule": "app/src/features/chat/ChatScreen.tsx",
    "activeModules": [
      "app/src/features/chat/ChatScreen.tsx"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "prototype-only",
    "targetPhase": 5,
    "dependencies": [],
    "acceptanceEvidence": "Chat UI renders untrusted messages via native text components; markup injections display literally and execute no code",
    "owner": "Security / Frontend Engineer",
    "status": "Pending"
  },
  {
    "id": "FE-02",
    "priority": "High",
    "reviewClaim": "History state is ephemeral in-memory array deduplicating by crop name rather than unique record identifier",
    "prototypeEvidence": [
      "app.js:58-80",
      "app.js:281-284"
    ],
    "revalidationTarget": "SQLite migrations and scan repository IDs",
    "activeModule": "app/src/core/db/repositories/scans.ts",
    "activeModules": [
      "app/src/core/db/repositories/scans.ts",
      "app/src/core/db/migrations.ts"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "resolved-in-active-app",
    "targetPhase": 2,
    "dependencies": [],
    "acceptanceEvidence": "Scan records persist in SQLite with UUID primary keys; multiple scans for same crop persist without collision",
    "owner": "Database / Storage Engineer",
    "status": "Pending"
  },
  {
    "id": "FE-03",
    "priority": "Medium",
    "reviewClaim": "Assistant simulated async reply lacks live region announcements and response timer is uncancellable on screen unmount",
    "prototypeEvidence": [
      "app.js:195-200",
      "app.js:368-376"
    ],
    "revalidationTarget": "useChat, useChatRuntime, route/unmount behavior",
    "activeModule": "app/src/features/chat/useChat.ts",
    "activeModules": [
      "app/src/features/chat/useChat.ts",
      "app/src/core/chat"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 5,
    "dependencies": [],
    "acceptanceEvidence": "Chat hook handles unmount aborts; responses announce via aria-live; late state changes never execute on unmounted routes",
    "owner": "Frontend / Assistant Engineer",
    "status": "Pending"
  },
  {
    "id": "FE-04",
    "priority": "Medium",
    "reviewClaim": "Sign-up has no field validation and confirm-delete state is rendered without trigger or click handler",
    "prototypeEvidence": [
      "app.js:216-218",
      "app.js:246-251",
      "app.js:345-358"
    ],
    "revalidationTarget": "account/sign-up forms, conversation row menu, trash, repository delete operations",
    "activeModule": "app/src/features/account",
    "activeModules": [
      "app/src/features/account",
      "app/src/features/chat"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 3,
    "dependencies": [
      4
    ],
    "acceptanceEvidence": "Account form inputs enforce validation rules; destructive confirm actions trigger modal and execute complete deletion flow",
    "owner": "Frontend / Security Engineer",
    "status": "Pending"
  },
  {
    "id": "FE-05",
    "priority": "Medium",
    "reviewClaim": "Routing uses single mutable string with incomplete back rules and no browser history or URL sync",
    "prototypeEvidence": [
      "app.js:255-274",
      "app.js:286-292"
    ],
    "revalidationTarget": "navigation/navState.ts and route renderers",
    "activeModule": "app/src/navigation/navState.ts",
    "activeModules": [
      "app/src/navigation/navState.ts",
      "app/src/navigation/render"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "partially-confirmed",
    "targetPhase": 4,
    "dependencies": [],
    "acceptanceEvidence": "Typed stack navigation provides deterministic back transitions; route state machine tested against transition regressions",
    "owner": "Architecture / Navigation Lead",
    "status": "Pending"
  },
  {
    "id": "FE-06",
    "priority": "Low",
    "reviewClaim": "Height-based CSS zoom scales entire interface arbitrarily without proper component reflow",
    "prototypeEvidence": [
      "styles.css:98-99"
    ],
    "revalidationTarget": "React Native/Web chrome, safe areas, handset widths",
    "activeModule": "app/src/ui/components/Screen.tsx",
    "activeModules": [
      "app/src/ui/components/Screen.tsx"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "prototype-only",
    "targetPhase": 7,
    "dependencies": [],
    "acceptanceEvidence": "Handset framing uses standard responsive containers without CSS zoom; controls scale legibly on varying screen dimensions",
    "owner": "Frontend / Design Systems Engineer",
    "status": "Pending"
  },
  {
    "id": "A11Y-01",
    "priority": "High",
    "reviewClaim": "Sheets declare dialog modal role but focus remains on background back button without trap or restoration",
    "prototypeEvidence": [
      "app.js:237-243"
    ],
    "revalidationTarget": "any modal/sidebar/menu/dialog implementation",
    "activeModule": "app/src/ui/components",
    "activeModules": [
      "app/src/ui/components"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 7,
    "dependencies": [
      4
    ],
    "acceptanceEvidence": "Modal components trap focus on open, make background inert, and restore focus to triggering element upon dismissal",
    "owner": "Accessibility / UI Engineer",
    "status": "Pending"
  },
  {
    "id": "A11Y-02",
    "priority": "Medium",
    "reviewClaim": "Processing track is plain div with aria-label lacking progressbar role, value bounds, or status announcements",
    "prototypeEvidence": [
      "app.js:159",
      "index.html:54"
    ],
    "revalidationTarget": "progress/status components and processing screens",
    "activeModule": "app/src/features/result/CaptureResultScreen.tsx",
    "activeModules": [
      "app/src/features/result/CaptureResultScreen.tsx",
      "app/src/ui"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 7,
    "dependencies": [
      4
    ],
    "acceptanceEvidence": "Progress indicators expose progressbar semantics with accessible value bounds and live region status updates",
    "owner": "Accessibility / UI Engineer",
    "status": "Pending"
  },
  {
    "id": "A11Y-03",
    "priority": "Medium",
    "reviewClaim": "Assistant typing indicator has label but lacks live region announcement, causing dynamic replies to be missed",
    "prototypeEvidence": [
      "app.js:198"
    ],
    "revalidationTarget": "chat typing/reply/error status",
    "activeModule": "app/src/features/chat/ChatScreen.tsx",
    "activeModules": [
      "app/src/features/chat/ChatScreen.tsx"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 7,
    "dependencies": [
      5
    ],
    "acceptanceEvidence": "Reply generation and errors announce concisely to assistive technologies via polite live regions without spamming",
    "owner": "Accessibility / UI Engineer",
    "status": "Pending"
  },
  {
    "id": "A11Y-04",
    "priority": "Medium",
    "reviewClaim": "Selection buttons lack aria-pressed or aria-selected states and settings switch nests switch role inside button element",
    "prototypeEvidence": [
      "app.js:145",
      "app.js:203"
    ],
    "revalidationTarget": "segmented controls, onboarding choices, tabs, toggles",
    "activeModule": "app/src/ui/components",
    "activeModules": [
      "app/src/ui/components",
      "app/src/navigation/render/tabs.tsx"
    ],
    "currentEvidenceState": "Not tested",
    "revalidation": "confirmed",
    "targetPhase": 7,
    "dependencies": [
      4
    ],
    "acceptanceEvidence": "Toggles and segmented controls use clean semantic roles without nested interactive elements, exposing selection state",
    "owner": "Accessibility / UI Engineer",
    "status": "Pending"
  }
]
