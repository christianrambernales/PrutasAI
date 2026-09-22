/**
 * UI strings in English and Filipino.
 *
 * The language setting used to move a segmented control and change nothing:
 * `app.language` reached only the chat, while every screen was hardcoded
 * English. This is the dictionary that makes the setting mean something.
 *
 * Keys are grouped by screen. Values may be a string or a function of its
 * arguments, so plurals and counts read naturally in both languages rather than
 * being glued together from fragments.
 *
 * Filipino here is the everyday Tagalog used in agricultural extension
 * material, not formal register: established loanwords ("elevation", "normals")
 * are kept where a farmer would recognise them and a coined Tagalog term would
 * not.
 */

export type Language = 'EN' | 'FIL';

const EN = {
  // chrome
  tabHome: 'Home',
  tabClimate: 'Climate',
  tabChat: 'Chat',
  tabHistory: 'History',
  tabScan: 'Scan',
  titleAssistant: 'Assistant',
  titleSettings: 'Settings',
  titleResult: 'Result',
  titleMonitoring: 'Monitoring',
  titleModelStatus: 'Model status',
  titleLocationPicker: 'Choose a location',
  titleCapture: 'Scan a fruit',
  titleScan: 'Scan',
  goBack: 'Go back',
  dismiss: 'Dismiss',
  changeLanguage: 'Change language',
  settings: 'Settings',
  tryAgain: 'Try again',
  showTechnicalDetails: 'Show technical details',
  hideTechnicalDetails: 'Hide technical details',
  change: 'Change',
  rereadRegistry: 'Re-read the registry',
  refreshClimate: 'Refresh climate',

  // startup
  startingUp: 'Opening your records…',
  startupFailedTitle: 'The app could not open its database',
  startupFailedBody:
    'Nothing has been lost — your saved scans are still on this device. Close the app and open it again. If this keeps happening, report the message below.',
  unexpectedErrorTitle: 'The app hit an unexpected problem',
  notIsolatedTitle: 'This page cannot open the local database',
  notIsolatedBody:
    'The browser only allows it on a cross-origin isolated page, which needs the COOP and COEP headers. In development, run "npm run start:web" and open the address it prints — not the Expo dev server’s own port, and not the "w" shortcut in its terminal.',

  // home
  tagline: 'Fruit · variety · disease — works offline',
  scanHeadline: 'Scan a fruit',
  scanBlurb: 'Point the camera at a banana, mango or papaya — identification runs on your phone.',
  openCamera: 'Open camera',
  browseFruits: 'Browse fruits',
  fruitsAndVarieties: (fruits: number, varieties: number) =>
    `${fruits} fruits · ${varieties} varieties`,
  varietyCount: (n: number) => `${n} ${n === 1 ? 'variety' : 'varieties'}`,
  modelsCount: (ready: number, total: number) => `${ready}/${total} models`,
  recentScans: 'Recent scans',
  viewAll: 'View all',
  setLocation: 'Set your location',
  setLocationBlurb: 'Choose a place to see local weather and whether a fruit suits your area.',
  fetchingWeather: 'Fetching weather…',
  fetchingWeatherBlurb: 'Reading current conditions and 5-year normals.',

  // climate
  noLocationSet: 'No location set',
  noLocationBlurb:
    'Weather and suitability need a place to compare against. Nothing is looked up until you choose one, and only a coarse coordinate is stored.',
  chooseLocation: 'Choose a location',

  // location picker
  useMyLocation2: 'Use my location',
  locating: 'Getting your location…',
  searchAnyTown: 'Search any town or city',
  locationDenied: 'Location permission was refused. You can still search for a place.',
  locationBlocked: 'Location is blocked for this app. Open system settings to allow it.',
  openSettings: 'Open settings',
  locationFailed: 'Could not get a fix. Try searching instead.',
  searching: 'Searching…',
  noPlacesFound: 'No place matches that search.',
  suggestedPlaces: 'Suggested places',
  coarseCoordinateNote: 'Coordinates are stored rounded to about a kilometre.',

  rightNow: 'RIGHT NOW',
  humidity: 'Humidity',
  rainNow: 'Rain now',
  elevation: 'Elevation',
  weatherNeverDecides: 'Today’s weather is displayed but never decides a verdict.',
  monthlyNormals: 'Monthly rainfall normals',
  annualTotal: 'Annual total',
  meanAnnualTemperature: 'Mean annual temperature',
  canIGrow: 'Can I grow this here?',
  noVerdictYet: 'No verdict yet',
  noVerdictBlurb: 'A verdict needs both crop requirements and climate normals for this place.',
  climateUnavailable: 'Climate data unavailable',
  climateUnreachable: 'Could not reach the climate service.',
  showingLastReading: ' Showing the last reading fetched this session.',
  fetchingConditions: 'Fetching current conditions and 5-year normals…',
  months: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],

  // chat
  askPlaceholder: 'Ask about a fruit, a disease or your location…',
  send: 'Send',
  message: 'Message',
  curatedBanner:
    'Answers come from the bundled knowledge base, worded from curated templates. They work with no connection. Turn on the AI assistant in Settings to ask open crop questions and get more natural wording — the facts and the verdict never change.',
  groundedSubtitle: 'Grounded in your knowledge base',
  onlineSubtitle: 'Grounded answers · AI assistant on',
  clearConversation: 'Clear conversation',
  generalGuidance: 'General guidance',
  notFromKnowledgeBase: 'Not from the knowledge base',
  offTopic:
    'I only answer questions about crops and plant health. Ask me about growing, pests, diseases, soil or weather for your crop.',
  assistantOff: 'That needs the AI assistant. Turn it on in Settings.',
  assistantUnreachable: 'Could not reach the assistant. Check your connection and try again.',
  assistantBusy: 'There are too many questions just now. Try again in a minute.',
  assistantUnavailable: 'The assistant is unavailable right now. Try again shortly.',
  newConversation: 'New conversation',
  conversationsTitle: 'Conversations',
  noConversationsYet: 'No conversations yet',
  rename: 'Rename',
  delete: 'Delete',
  moreOptions: 'More options',

  // history
  noScansYet: 'No scans yet',
  noScansMatch: 'No scans match',
  noScansYetBlurb: 'Scans you take are kept on this device. A record of what was found is uploaded — never the photo.',
  noScansMatchBlurb: 'Try a different filter or search term.',
  searchScans: 'Search scans',
  filterAll: 'All',
  filterDiseased: 'Diseased',
  scansShown: (shown: number, total: number) => `${shown} of ${total} sample scans shown`,
  scanWord: (n: number) => `${n} ${n === 1 ? 'scan' : 'scans'}`,

  // settings
  sectionLanguage: 'LANGUAGE',
  sectionLocation: 'LOCATION & PRIVACY',
  sectionClimate: 'CLIMATE',
  sectionAssistant: 'ASSISTANT',
  sectionData: 'DATA',
  sectionAbout: 'ABOUT',
  appLanguage: 'App language',
  useMyLocation: 'Use my location',
  useMyLocationDetail: 'Coarse only · asked when first needed',
  savedLocation: 'Saved location',
  noLocationSaved: 'No location saved',
  forgetLocation: 'Forget my location',
  forgetLocationDetail: 'Clears cached coordinates and climate rows',
  provider: 'Provider',
  refreshNormals: 'Refresh normals',
  refresh: 'Refresh',
  notFetchedYet: 'Not fetched yet',
  aiAssistant: 'AI assistant',
  aiAssistantOn: 'Answers open crop questions and improves wording — sends your typed question, location label and current conditions to Google.',
  aiAssistantOff: 'Grounded answers only, fully offline',
  aiAssistantUnset: 'No assistant URL set — answers stay on curated wording',
  factsStayOnDevice: 'Facts stay on the device',
  factsStayDetail: 'An online model may only reword a verdict, never change it.',
  knowledgeBase: 'Knowledge base',
  contentVersion: (v: string) => `Content version ${v}`,
  detectionModels: 'Detection models',
  scanHistory: 'Scan history',
  modelsInstalled: (ready: number, total: number) => `${ready} of ${total} installed`,
  aboutBlurb: 'Offline-first fruit, variety and disease identification',

  // model status & stages
  stageFruit: 'Fruit',
  stageVariety: 'Variety',
  stageDisease: 'Disease',
  ready: 'ready',
  missing: 'missing',
  checksumMismatch: 'checksum mismatch',
  checksumVerified: 'checksum verified',
  notVerified: 'not verified',
  modelsDeclared: (n: number) => `${n} declared`,
  noModelsDeclared: 'No models declared',
  importModelFile: 'Import a model file',

  // variety info
  identifiedByModel: 'Identified by the model',
  informationOnly: 'Information only',
  notPredicted: 'not predicted',
  growingConditions: 'Growing conditions',
  sources: 'Sources',
  unverified: 'Unverified',
  filipinoName: 'Filipino name',
  classIndex: 'Stage-2 class index',
  predictedByModel: 'Predicted by the model',
  yes: 'yes',
  modelClassesAndStrains: (classes: number, strains: number) =>
    `${classes} model classes · ${strains} information-only strains`,
  diseases: 'Diseases',
  noVerifiedDiseaseInfo: 'No verified disease information',
  noDescription: 'No description available',
  noApprovedRemedy: 'Disease without approved remedy',
  unknownFruit: 'Unknown fruit',

  // welcome
  welcomeTitle: 'Keep your scans on this phone, or across your devices',
  welcomeOfflineTitle: 'Use offline',
  welcomeOfflineBody: 'Everything stays on this phone. Nothing is uploaded.',
  welcomeAccountTitle: 'Sign in or create an account',
  welcomeAccountBody: 'Your scan history follows you to a new phone. You can do this later instead.',
  welcomeChooseOffline: 'Use offline',

  // consent
  consentTitle: 'What PrutasAI sends',
  consentSent: 'Sent',
  consentSentList: 'The fruit and variety found, the date, a coarse location, whether a model ran, and a random ID for this install — never your name.',
  consentNeverSent: 'Never sent',
  consentNeverSentList: 'Your photograph, your name, and your exact position.',
  consentAcknowledge: 'Got it',
  // settings → data
  dataDisclosure: 'What is uploaded',
  dataDisclosureDetail: 'Findings, dates, a coarse location and a random per-install ID. Never your photo, name or exact position.',
  // capture
  captureOnDevice: 'Identification runs on your phone. Your photo never leaves it.',
  photoStaysHere: 'Your photo stays on this device.',
  photoStayedOnThisDevice: 'Your photo stayed on this device. The app never guesses a variety or a disease — an unanswered question is reported as unanswered.',

  // account
  titleAccount: 'Account',
  sectionAccount: 'ACCOUNT',
  accountSignedOut: 'Not signed in',
  accountSignedOutDetail: 'Sign in and your scan history follows you to a new phone.',
  emailLabel: 'Email',
  passwordLabel: 'Password',
  signIn: 'Sign in',
  signingIn: 'Signing in…',
  signUp: 'Create account',
  signOut: 'Sign out',
  signedInAs: (email: string) => `Signed in as ${email}`,
  cloudSyncEnabled: 'Cloud sync is on',
  cloudSyncPaused: 'Cloud sync is paused. Your local and cloud copies are kept.',
  pauseCloudSync: 'Pause cloud sync',
  resumeCloudSync: 'Resume cloud sync',
  claimLocalDataTitle: 'Keep this device data private',
  claimLocalDataDetail: (scans: number, conversations: number) =>
    `${scans} scan(s) and ${conversations} conversation(s) were created offline. Add them to this account before syncing?`,
  claimLocalData: 'Add to this account',
  keepLocalOnly: 'Keep local only',
  syncQueueStatus: (pending: number, attention: number, conflicts: number) =>
    `${pending} waiting · ${attention} need attention · ${conflicts} conflicts`,
  lastSuccessfulSync: (at: string) => `Last successful sync: ${at}`,
  syncNow: 'Sync now',
  removeLocalDeviceCopy: 'Remove this device copy',
  removeLocalDeviceCopyDetail: 'Removes only this account’s local records from this device. Cloud copies are kept.',
  historyRestored: (n: number) => `${n} ${n === 1 ? 'scan' : 'scans'} restored`,
  historyRestoreFailed: 'Signed in, but your history could not be fetched. It will still be here next time you sign in.',
  historyUploadIncomplete: 'Some scans have not been uploaded yet. They stay on this phone and go up next time.',
  sessionExpired: 'Your session expired. Sign in again to keep your scans in sync — nothing has been lost.',
  photoNotOnThisDevice: 'The photo for this scan is on the phone that took it.',
  forgotPassword: 'Forgot password?',
  resetEmailSent: 'If an account exists for that email, a reset link has been sent.',
  createAccountPrompt: 'New here? Create an account',
  alreadyHaveAccount: 'Already have an account? Sign in',
  titleSignUp: 'Create your account',
  checkYourEmail: 'Check your email',
  checkYourEmailDetail: (email: string) =>
    `We sent a confirmation link to ${email}. Confirm your email to turn on cloud sync. You can continue using all offline features right now.`,
  resendConfirmation: 'Resend confirmation email',
  resendingConfirmation: 'Resending…',
  confirmationResent: 'A new confirmation email has been sent.',
  continueOffline: 'Continue offline',
  signInAgain: 'Sign in again',

  // reset password
  titleResetPassword: 'Reset password',
  newPasswordLabel: 'New password',
  confirmPasswordLabel: 'Confirm password',
  setNewPassword: 'Set new password',
  updatingPassword: 'Updating password…',
  passwordMismatch: 'Passwords do not match.',
  passwordResetSuccessTitle: 'Password updated',
  passwordResetSuccessDetail:
    'Your password has been changed successfully. You can now sign in with your new password.',
  passwordResetFailed: 'Unable to reset password. Please request a new reset link.',
  cancel: 'Cancel',
  done: 'Done',

  // auth errors
  authErrorInvalidCredentials: 'The email or password you entered is incorrect.',
  authErrorEmailNotConfirmed: 'Please check your email and confirm your account before signing in.',
  authErrorWeakPassword: 'Password is too weak. Please use at least 6 characters.',
  authErrorRateLimit: 'Too many attempts. Please try again in a few minutes.',
  authErrorNetwork: 'Could not connect. Please check your internet connection.',
  authErrorServiceUnavailable: 'The auth service is currently unavailable. Please try again shortly.',
  authErrorUnknown: 'An unexpected authentication error occurred. Please try again.',

  // trash
  titleTrash: 'Trash',
  trashRow: 'Trash',
  trashEmpty: 'Trash is empty',
  select: 'Select',
  restore: 'Restore',
  deleteForever: 'Delete permanently',
  daysLeft: (n: number) => `${n} ${n === 1 ? 'day' : 'days'} left`,

  // phase 4 onboarding
  onboardingContinueToMode: 'Continue to mode selection',
  onboardingReviewConsent: 'Review consent',
  onboardingFinishSetup: 'Finish setup and go to Home',
  
  // home actions
  homeActionScan: 'Scan a fruit',
  homeActionHistory: 'History',
  homeActionChat: 'Assistant Chat',
  homeActionMonitoring: 'Monitoring',

  // capture/result
  captureSavingLocally: 'Saving photo locally',
  resultAnalysisUnavailable: 'Analysis unavailable',
  resultNotAnalyzed: 'Not analyzed',
  resultActionReviewPhoto: 'Review local photo',
  resultActionBrowseGuidance: 'Browse local guidance',
  resultActionStartMonitoring: 'Start observation monitoring',
  
  // chat
  chatConversations: 'Conversations',
  chatMoveToTrash: 'Move to Trash',
  chatConfirmDeleteBody: 'Are you sure you want to permanently delete this conversation? This action cannot be undone.',
  
  // monitoring
  monitoringDay1: 'Day 1',
  monitoringDay5: 'Day 5',
  monitoringDay10: 'Day 10',
  monitoringScheduled: 'Scheduled',
  monitoringActual: 'Actual',
  monitoringDue: 'Due',
  monitoringIncomplete: 'Incomplete',
  monitoringCompleted: 'Completed',
  monitoringCompletedLate: 'Completed late',
  
  // observations
  observationBetter: 'Better',
  observationAboutSame: 'About the same',
  observationWorse: 'Worse',
  observationUnsure: 'Unsure',
  
  // missing fields
  missingPhoto: 'Photo not added',
  missingNote: 'Note not added',
  missingObservation: 'Observation needed',
  
  // trend
  trendUnavailable: 'Overall trend unavailable',
  
  // offline/error
  offlineSavedLocally: 'Offline — saved on this device',
  localErrorGeneric: 'We could not complete that action. Your saved data is still on this device. Try again or go back.',
};

type Dictionary = typeof EN;

const FIL: Dictionary = {
  tabHome: 'Home',
  tabClimate: 'Panahon',
  tabChat: 'Usapan',
  tabHistory: 'Kasaysayan',
  tabScan: 'I-scan',
  titleAssistant: 'Katuwang',
  titleSettings: 'Mga Setting',
  titleResult: 'Resulta',
  titleMonitoring: 'Pagsubaybay',
  titleModelStatus: 'Katayuan ng modelo',
  titleLocationPicker: 'Pumili ng lokasyon',
  titleCapture: 'Mag-scan ng prutas',
  titleScan: 'Scan',
  goBack: 'Bumalik',
  dismiss: 'Isara',
  changeLanguage: 'Palitan ang wika',
  settings: 'Mga Setting',
  tryAgain: 'Subukan ulit',
  showTechnicalDetails: 'Ipakita ang teknikal na detalye',
  hideTechnicalDetails: 'Itago ang teknikal na detalye',
  change: 'Palitan',
  rereadRegistry: 'Basahin ulit ang registry',
  refreshClimate: 'I-refresh ang panahon',

  startingUp: 'Binubuksan ang iyong mga tala…',
  startupFailedTitle: 'Hindi mabuksan ng app ang database nito',
  startupFailedBody:
    'Walang nawala — nasa device mo pa rin ang mga naitalang scan. Isara ang app at buksan ulit. Kung paulit-ulit itong nangyayari, iulat ang mensaheng nasa ibaba.',
  unexpectedErrorTitle: 'May hindi inaasahang problema ang app',
  notIsolatedTitle: 'Hindi mabuksan ng pahinang ito ang lokal na database',
  notIsolatedBody:
    'Pinapayagan lang ito ng browser sa isang cross-origin isolated na pahina, na nangangailangan ng COOP at COEP headers. Sa development, patakbuhin ang "npm run start:web" at buksan ang address na ipinapakita nito — hindi ang sariling port ng Expo dev server, at hindi ang "w" na shortcut sa terminal nito.',

  tagline: 'Prutas · uri · sakit — gumagana nang offline',
  scanHeadline: 'Mag-scan ng prutas',
  scanBlurb: 'Itutok ang kamera sa saging, mangga o papaya — sa telepono mismo tumatakbo ang pagkilala.',
  openCamera: 'Buksan ang kamera',
  browseFruits: 'Tingnan ang mga prutas',
  fruitsAndVarieties: (fruits: number, varieties: number) =>
    `${fruits} prutas · ${varieties} uri`,
  varietyCount: (n: number) => `${n} uri`,
  modelsCount: (ready: number, total: number) => `${ready}/${total} modelo`,
  recentScans: 'Mga huling scan',
  viewAll: 'Tingnan lahat',
  setLocation: 'Itakda ang lokasyon',
  setLocationBlurb: 'Pumili ng lugar para makita ang panahon at kung angkop ba ang prutas sa inyong lugar.',
  fetchingWeather: 'Kinukuha ang panahon…',
  fetchingWeatherBlurb: 'Binabasa ang kasalukuyang kondisyon at 5-taong normals.',

  noLocationSet: 'Walang nakatakdang lokasyon',
  noLocationBlurb:
    'Kailangan ng lugar na pagbabatayan ng panahon at pagsusuri. Walang kinukuha hangga’t wala kang pinipili, at magaspang lamang na koordinado ang iniimbak.',
  chooseLocation: 'Pumili ng lokasyon',

  useMyLocation2: 'Gamitin ang aking lokasyon',
  locating: 'Kinukuha ang iyong lokasyon…',
  searchAnyTown: 'Maghanap ng bayan o lungsod',
  locationDenied: 'Tinanggihan ang pahintulot sa lokasyon. Maaari ka pa ring maghanap ng lugar.',
  locationBlocked: 'Naka-block ang lokasyon para sa app na ito. Buksan ang system settings.',
  openSettings: 'Buksan ang settings',
  locationFailed: 'Hindi makuha ang lokasyon. Subukang maghanap na lang.',
  searching: 'Naghahanap…',
  noPlacesFound: 'Walang lugar na tumugma.',
  suggestedPlaces: 'Mga mungkahing lugar',
  coarseCoordinateNote: 'Ang koordinado ay iniimbak na binilog sa humigit-kumulang isang kilometro.',

  rightNow: 'NGAYON',
  humidity: 'Halumigmig',
  rainNow: 'Ulan ngayon',
  elevation: 'Taas sa dagat',
  weatherNeverDecides: 'Ipinapakita ang panahon ngayon ngunit hindi ito ang nagdedesisyon ng hatol.',
  monthlyNormals: 'Buwanang normals ng ulan',
  annualTotal: 'Kabuuan sa isang taon',
  meanAnnualTemperature: 'Karaniwang temperatura sa isang taon',
  canIGrow: 'Pwede bang magtanim nito dito?',
  noVerdictYet: 'Wala pang hatol',
  noVerdictBlurb: 'Kailangan ng pangangailangan ng pananim at climate normals para sa lugar na ito.',
  climateUnavailable: 'Walang datos ng panahon',
  climateUnreachable: 'Hindi maabot ang serbisyo ng panahon.',
  showingLastReading: ' Ipinapakita ang huling nakuhang datos ngayong session.',
  fetchingConditions: 'Kinukuha ang kasalukuyang kondisyon at 5-taong normals…',
  months: ['E', 'P', 'M', 'A', 'M', 'H', 'H', 'A', 'S', 'O', 'N', 'D'],

  askPlaceholder: 'Magtanong tungkol sa prutas, sakit o lokasyon…',
  send: 'Ipadala',
  message: 'Mensahe',
  curatedBanner:
    'Ang mga sagot ay mula sa nakalakip na knowledge base, gamit ang mga inihandang teksto. Gumagana kahit walang koneksyon. Buksan ang AI assistant sa Settings para makapagtanong nang malawak at mas natural ang pananalita — hindi nagbabago ang datos at ang hatol.',
  groundedSubtitle: 'Nakaugat sa iyong knowledge base',
  onlineSubtitle: 'Nakaugat na sagot · nakabukas ang AI assistant',
  clearConversation: 'Burahin ang usapan',
  generalGuidance: 'Pangkalahatang gabay',
  notFromKnowledgeBase: 'Hindi mula sa knowledge base',
  offTopic:
    'Mga tanong lamang tungkol sa pananim at kalusugan ng halaman ang sinasagot ko. Magtanong tungkol sa pagtatanim, peste, sakit, lupa o panahon.',
  assistantOff: 'Kailangan nito ang AI assistant. Buksan ito sa Settings.',
  assistantUnreachable: 'Hindi maabot ang katuwang. Suriin ang koneksyon at subukang muli.',
  assistantBusy: 'Sobrang dami ng tanong ngayon. Subukang muli sa isang minuto.',
  assistantUnavailable: 'Hindi magamit ang katuwang ngayon. Subukang muli mamaya.',
  newConversation: 'Bagong usapan',
  conversationsTitle: 'Mga Usapan',
  noConversationsYet: 'Wala pang usapan',
  rename: 'Palitan ang pangalan',
  delete: 'Tanggalin',
  moreOptions: 'Higit pang opsyon',

  noScansYet: 'Wala pang scan',
  noScansMatch: 'Walang tumugmang scan',
  noScansYetBlurb: 'Ang mga scan mo ay nananatili sa teleponong ito. Ina-upload ang tala ng nakita — hindi kailanman ang larawan.',
  noScansMatchBlurb: 'Subukan ang ibang filter o salita.',
  searchScans: 'Maghanap ng scan',
  filterAll: 'Lahat',
  filterDiseased: 'May sakit',
  scansShown: (shown: number, total: number) =>
    `${shown} sa ${total} halimbawang scan ang ipinapakita`,
  scanWord: (n: number) => `${n} scan`,

  sectionLanguage: 'WIKA',
  sectionLocation: 'LOKASYON AT PRIBASIYA',
  sectionClimate: 'PANAHON',
  sectionAssistant: 'KATUWANG',
  sectionData: 'DATOS',
  sectionAbout: 'TUNGKOL',
  appLanguage: 'Wika ng app',
  useMyLocation: 'Gamitin ang aking lokasyon',
  useMyLocationDetail: 'Magaspang lamang · hinihingi kapag kailangan',
  savedLocation: 'Nakaimbak na lokasyon',
  noLocationSaved: 'Walang nakaimbak na lokasyon',
  forgetLocation: 'Kalimutan ang aking lokasyon',
  forgetLocationDetail: 'Buburahin ang naka-cache na koordinado at datos ng panahon',
  provider: 'Pinagkukunan',
  refreshNormals: 'I-refresh ang normals',
  refresh: 'I-refresh',
  notFetchedYet: 'Hindi pa nakukuha',
  aiAssistant: 'AI na katuwang',
  aiAssistantOn: 'Sumasagot ng malawak na tanong at pinapaganda ang pananalita — ipinapadala ang naitipang tanong mo, label ng lokasyon at kasalukuyang kondisyon sa Google.',
  aiAssistantOff: 'Nakaugat na sagot lamang, ganap na offline',
  aiAssistantUnset: 'Walang naitakdang URL ng katuwang — mananatili sa inihandang teksto',
  factsStayOnDevice: 'Nananatili sa telepono ang datos',
  factsStayDetail: 'Maaari lamang bagohin ng online na modelo ang pananalita, hindi ang hatol.',
  knowledgeBase: 'Knowledge base',
  contentVersion: (v: string) => `Bersyon ng nilalaman ${v}`,
  detectionModels: 'Mga modelo ng pagkilala',
  scanHistory: 'Kasaysayan ng scan',
  modelsInstalled: (ready: number, total: number) => `${ready} sa ${total} ang nakaluklok`,
  aboutBlurb: 'Offline-first na pagkilala ng prutas, uri at sakit',

  // model status & stages
  stageFruit: 'Prutas',
  stageVariety: 'Uri',
  stageDisease: 'Sakit',
  ready: 'handa',
  missing: 'nawawala',
  checksumMismatch: 'hindi tugma ang checksum',
  checksumVerified: 'napatunayan ang checksum',
  notVerified: 'hindi napatunayan',
  modelsDeclared: (n: number) => `${n} ang nakasaad`,
  noModelsDeclared: 'Walang modelong nakasaad',
  importModelFile: 'Mag-import ng file ng modelo',

  identifiedByModel: 'Nakikilala ng modelo',
  informationOnly: 'Pang-impormasyon lamang',
  notPredicted: 'hindi hinuhulaan',
  growingConditions: 'Kondisyon sa pagtatanim',
  sources: 'Mga sanggunian',
  unverified: 'Hindi pa napapatunayan',
  filipinoName: 'Pangalang Filipino',
  classIndex: 'Class index ng stage 2',
  predictedByModel: 'Hinuhulaan ng modelo',
  yes: 'oo',
  modelClassesAndStrains: (classes: number, strains: number) =>
    `${classes} klase ng modelo · ${strains} pang-impormasyong strain`,
  diseases: 'Mga sakit',
  noVerifiedDiseaseInfo: 'Walang napatunayang impormasyon tungkol sa sakit',
  noDescription: 'Walang paglalarawan',
  noApprovedRemedy: 'Sakit na walang aprubadong lunas',
  unknownFruit: 'Hindi alam na prutas',

  // welcome
  welcomeTitle: 'Itago ang mga scan sa teleponong ito, o sa lahat ng device mo',
  welcomeOfflineTitle: 'Gamitin nang offline',
  welcomeOfflineBody: 'Mananatili ang lahat sa teleponong ito. Walang ipapadala.',
  welcomeAccountTitle: 'Mag-sign in o gumawa ng account',
  welcomeAccountBody: 'Susunod ang kasaysayan ng scan mo sa bagong telepono. Puwede rin itong gawin mamaya.',
  welcomeChooseOffline: 'Gamitin nang offline',

  // consent
  consentTitle: 'Ano ang ipinapadala ng PrutasAI',
  consentSent: 'Ipinapadala',
  consentSentList: 'Ang prutas at uring natukoy, ang petsa, magaspang na lokasyon, kung may modelong tumakbo, at isang random na ID para sa install na ito — hindi kailanman ang pangalan mo.',
  consentNeverSent: 'Hindi kailanman ipinapadala',
  consentNeverSentList: 'Ang larawan mo, ang pangalan mo, at ang eksaktong kinaroroonan mo.',
  consentAcknowledge: 'Naiintindihan ko',
  // settings → data
  dataDisclosure: 'Ano ang ina-upload',
  dataDisclosureDetail: 'Mga natuklasan, petsa, magaspang na lokasyon at isang random na ID kada install. Hindi kailanman ang larawan, pangalan o eksaktong kinaroroonan mo.',
  // capture
  captureOnDevice: 'Ang pagkilala ay tumatakbo sa teleponong ito. Hindi umaalis ang larawan mo rito.',
  photoStaysHere: 'Nananatili sa teleponong ito ang larawan mo.',
  photoStayedOnThisDevice: 'Nanatili sa teleponong ito ang larawan mo. Hindi kailanman nanghuhula ang app ng uri o sakit — ang hindi nasagot na tanong ay iniuulat na hindi nasagot.',

  // account
  titleAccount: 'Akawnt',
  sectionAccount: 'AKAWNT',
  accountSignedOut: 'Hindi naka-sign in',
  accountSignedOutDetail: 'Mag-sign in at susunod sa bagong telepono ang kasaysayan ng scan mo.',
  emailLabel: 'Email',
  passwordLabel: 'Password',
  signIn: 'Mag-sign in',
  signingIn: 'Nagsa-sign in…',
  signUp: 'Gumawa ng akawnt',
  signOut: 'Mag-sign out',
  signedInAs: (email: string) => `Naka-sign in bilang ${email}`,
  cloudSyncEnabled: 'Naka-on ang cloud sync',
  cloudSyncPaused: 'Naka-pause ang cloud sync. Nananatili ang lokal at cloud na kopya.',
  pauseCloudSync: 'I-pause ang cloud sync',
  resumeCloudSync: 'Ipagpatuloy ang cloud sync',
  claimLocalDataTitle: 'Panatilihing pribado ang data sa device na ito',
  claimLocalDataDetail: (scans: number, conversations: number) =>
    `${scans} scan at ${conversations} usapan ay ginawa offline. Idagdag sa akawnt na ito bago mag-sync?`,
  claimLocalData: 'Idagdag sa akawnt na ito',
  keepLocalOnly: 'Panatilihing lokal lamang',
  syncQueueStatus: (pending: number, attention: number, conflicts: number) =>
    `${pending} naghihintay · ${attention} kailangang tingnan · ${conflicts} conflict`,
  lastSuccessfulSync: (at: string) => `Huling matagumpay na sync: ${at}`,
  syncNow: 'I-sync ngayon',
  removeLocalDeviceCopy: 'Alisin ang kopya sa device na ito',
  removeLocalDeviceCopyDetail: 'Lokal na tala lamang ng akawnt na ito ang aalisin sa device. Mananatili ang cloud copy.',
  historyRestored: (n: number) => `${n} ${n === 1 ? 'scan' : 'na scan'} ang naibalik`,
  historyRestoreFailed: 'Naka-sign in ka na, ngunit hindi nakuha ang kasaysayan mo. Nandiyan pa rin ito sa susunod mong pag-sign in.',
  historyUploadIncomplete: 'May mga scan na hindi pa nai-upload. Nananatili sila sa teleponong ito at aakyat sa susunod.',
  sessionExpired: 'Nag-expire ang session mo. Mag-sign in ulit para manatiling naka-sync ang mga scan mo — walang nawala.',
  photoNotOnThisDevice: 'Ang larawan ng scan na ito ay nasa teleponong kumuha nito.',
  forgotPassword: 'Nakalimutan ang password?',
  resetEmailSent: 'Kung may akawnt na nakarehistro sa email na iyan, may naipadala nang link para mag-reset.',
  createAccountPrompt: 'Bago dito? Gumawa ng akawnt',
  alreadyHaveAccount: 'May akawnt ka na? Mag-sign in',
  titleSignUp: 'Gumawa ng iyong akawnt',
  checkYourEmail: 'Tingnan ang iyong email',
  checkYourEmailDetail: (email: string) =>
    `Nagpadala kami ng link ng kumpirmasyon sa ${email}. Kumpirmahin ang iyong email para buksan ang cloud sync. Maaari mong ipagpatuloy ang paggamit ng lahat ng offline na feature ngayon.`,
  resendConfirmation: 'Ipadala muli ang kumpirmasyon',
  resendingConfirmation: 'Ipinapadala muli…',
  confirmationResent: 'Naipadala na muli ang kumpirmasyon sa email.',
  continueOffline: 'Magpatuloy nang offline',
  signInAgain: 'Mag-sign in ulit',

  // reset password
  titleResetPassword: 'I-reset ang password',
  newPasswordLabel: 'Bagong password',
  confirmPasswordLabel: 'Kumpirmahin ang password',
  setNewPassword: 'Itakda ang bagong password',
  updatingPassword: 'Ina-update ang password…',
  passwordMismatch: 'Hindi tugma ang mga password.',
  passwordResetSuccessTitle: 'Na-update ang password',
  passwordResetSuccessDetail:
    'Matagumpay na napalitan ang iyong password. Maaari ka nang mag-sign in gamit ang iyong bagong password.',
  passwordResetFailed: 'Hindi ma-reset ang password. Humiling muli ng bagong reset link.',
  cancel: 'Kanselahin',
  done: 'Tapos na',

  // auth errors
  authErrorInvalidCredentials: 'Mali ang inilagay na email o password.',
  authErrorEmailNotConfirmed: 'Pakisuri ang iyong email at kumpirmahin ang akawnt bago mag-sign in.',
  authErrorWeakPassword: 'Masyadong mahina ang password. Gumamit ng kahit 6 na karakter.',
  authErrorRateLimit: 'Masyadong maraming pagsubok. Subukang muli pagkalipas ng ilang minuto.',
  authErrorNetwork: 'Hindi makakonekta. Pakisuri ang koneksyon sa internet.',
  authErrorServiceUnavailable: 'Kasalukuyang hindi magamit ang serbisyo. Subukang muli mamaya.',
  authErrorUnknown: 'May hindi inaasahang problema sa pag-authenticate. Subukang muli.',

  // trash
  titleTrash: 'Basurahan',
  trashRow: 'Basurahan',
  trashEmpty: 'Walang laman ang basurahan',
  select: 'Pumili',
  restore: 'Ibalik',
  deleteForever: 'Tanggalin nang permanente',
  daysLeft: (n: number) => `${n} ${n === 1 ? 'araw' : 'araw'} na lang`,

  // phase 4 onboarding
  onboardingContinueToMode: 'Magpatuloy sa pagpili ng mode',
  onboardingReviewConsent: 'Suriin ang pahintulot',
  onboardingFinishSetup: 'Tapusin ang setup at pumunta sa Home',

  // home actions
  homeActionScan: 'I-scan ang prutas',
  homeActionHistory: 'Kasaysayan',
  homeActionChat: 'Usapan sa Katuwang',
  homeActionMonitoring: 'Pagsubaybay',

  // capture/result
  captureSavingLocally: 'Sine-save ang larawan sa device',
  resultAnalysisUnavailable: 'Hindi available ang pagsusuri',
  resultNotAnalyzed: 'Hindi nasuri',
  resultActionReviewPhoto: 'Suriin ang lokal na larawan',
  resultActionBrowseGuidance: 'Mag-browse ng lokal na gabay',
  resultActionStartMonitoring: 'Simulan ang pagmamasid',
  
  // chat
  chatConversations: 'Mga usapan',
  chatMoveToTrash: 'Ilipat sa Basurahan',
  chatConfirmDeleteBody: 'Sigurado ka bang gusto mong permanenteng burahin ang usapang ito? Hindi na ito maibabalik.',
  
  // monitoring
  monitoringDay1: 'Araw 1',
  monitoringDay5: 'Araw 5',
  monitoringDay10: 'Araw 10',
  monitoringScheduled: 'Nakatakda',
  monitoringActual: 'Aktwal',
  monitoringDue: 'Dapat na',
  monitoringIncomplete: 'Hindi kumpleto',
  monitoringCompleted: 'Nakumpleto',
  monitoringCompletedLate: 'Nakumpleto nang huli',

  // observations
  observationBetter: 'Bumuti',
  observationAboutSame: 'Walang pinagbago',
  observationWorse: 'Lumala',
  observationUnsure: 'Hindi sigurado',

  // missing fields
  missingPhoto: 'Walang larawang idinagdag',
  missingNote: 'Walang tala na idinagdag',
  missingObservation: 'Kailangan ng obserbasyon',

  // trend
  trendUnavailable: 'Hindi available ang kabuuang pagbabago',

  // offline/error
  offlineSavedLocally: 'Offline — naka-save sa device',
  localErrorGeneric: 'Hindi namin makumpleto ang aksyon. Nasa device pa rin ang iyong naka-save na data. Subukan muli o bumalik.',
};

const DICTIONARIES: Record<Language, Dictionary> = { EN, FIL };

export type StringKey = keyof Dictionary;

export function strings(language: Language): Dictionary {
  return DICTIONARIES[language] ?? EN;
}
