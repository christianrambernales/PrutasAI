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
  change: 'Change',
  rereadRegistry: 'Re-read the registry',
  refreshClimate: 'Refresh climate',

  // startup
  startingUp: 'Opening your records…',
  startupFailedTitle: 'The app could not open its database',
  startupFailedBody:
    'Nothing has been lost — your saved scans are still on this device. Close the app and open it again. If this keeps happening, report the message below.',

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
  historyRestored: (n: number) => `${n} ${n === 1 ? 'scan' : 'scans'} restored`,
  historyClaimed: 'Your earlier scans are now on this account.',
  historyRestoreFailed: 'Signed in, but your history could not be fetched. It will still be here next time you sign in.',
  photoNotOnThisDevice: 'The photo for this scan is on the phone that took it.',
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
  change: 'Palitan',
  rereadRegistry: 'Basahin ulit ang registry',
  refreshClimate: 'I-refresh ang panahon',

  startingUp: 'Binubuksan ang iyong mga tala…',
  startupFailedTitle: 'Hindi mabuksan ng app ang database nito',
  startupFailedBody:
    'Walang nawala — nasa device mo pa rin ang mga naitalang scan. Isara ang app at buksan ulit. Kung paulit-ulit itong nangyayari, iulat ang mensaheng nasa ibaba.',

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
  historyRestored: (n: number) => `${n} ${n === 1 ? 'scan' : 'na scan'} ang naibalik`,
  historyClaimed: 'Nasa akawnt mo na ang mga naunang scan mo.',
  historyRestoreFailed: 'Naka-sign in ka na, ngunit hindi nakuha ang kasaysayan mo. Nandiyan pa rin ito sa susunod mong pag-sign in.',
  photoNotOnThisDevice: 'Ang larawan ng scan na ito ay nasa teleponong kumuha nito.',
};

const DICTIONARIES: Record<Language, Dictionary> = { EN, FIL };

export type StringKey = keyof Dictionary;

export function strings(language: Language): Dictionary {
  return DICTIONARIES[language] ?? EN;
}
