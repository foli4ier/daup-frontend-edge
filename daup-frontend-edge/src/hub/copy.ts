/** Kitchen English on hub doors. Protocol words stay behind Advanced. */

export const BANNED_DOOR_WORDS = [
  'peer',
  'node',
  'dht',
  'did',
  'wallet',
  'mcp',
  'npm',
  'hydrate',
  'neon'
] as const;

/** Door name — never label Your places. / Get apps. / On the chain. as Marketplace. */
export const BANNED_DOOR_NAMES = ['Marketplace'] as const;

export const YOUR_EMAIL_LABEL = 'Your email.';
export const OPEN_YOUR_HUB_LABEL = 'Open your hub.';
export const HUB_DOOR_TITLE = 'Your hub.';
/** Same plain what+who as www: SA food-business owners; staff join on WhatsApp. */
export const HUB_DOOR_BODY = 'For South African food-business owners. You run the business. Staff join on WhatsApp.';
/** One line wherever hub / place are introduced. House is not the owner word. */
export const HUB_DOOR_GLOSSARY = 'Place = the business. Hub = where owners start and invite staff.';
export const OPEN_THE_HOUSE_LABEL = 'Open the place';
export const PLUS_REGISTER_LABEL = '+ Register';
export const LIVE_STATUS_LABEL = 'LIVE';
export const NAV_PLACES_LABEL = 'My places';
export const NAV_APPS_LABEL = 'Apps';
export const NAV_YOU_LABEL = 'You';
export const NAV_OTHER_PLACES_LABEL = 'Other places';
export const YOU_KICKER = 'You.';
export const SETTINGS_KICKER = 'Settings.';
export const MONEY_IN_R_LABEL = 'Prices in R.';
export const SEE_YOUR_APPS_LABEL = 'See your apps';
export const STAFF_INVITE_LABEL = 'I have a staff invite.';
export const STAFF_INVITE_HREF = 'https://www.daup.co.za/invite';
export const DAUP_HOME_HREF = 'https://www.daup.co.za';
export const INVALID_EMAIL_MESSAGE = 'Add the email we can reach.';
export const WHERE_IS_THE_EATERY = 'Create your company / place';
export const WHERE_IS_THE_EATERY_SUB = 'Name the place. Staff join with a WhatsApp tap.';
export const CREATE_YOUR_PLACE_TITLE = WHERE_IS_THE_EATERY;
export const CREATE_YOUR_PLACE_SUB = WHERE_IS_THE_EATERY_SUB;
export const ENABLE_APPS_TITLE = 'Which apps should this place run?';
export const ENABLE_APPS_SUB = 'Pick one or more. Eatery is one of them — not the only path.';
export const PICK_AN_APP_MESSAGE = 'Pick at least one app.';
export const ENABLED_APPS_LABEL = 'Apps';
export const PLACE_PAYMENT_DUE = 'Payment is due. This place is read-only.';
export const PLACE_PAUSED = 'This place is paused. Writes are closed.';
export const PLACE_TRIAL_STATUS = 'Trial.';
export const PLACE_ACTIVE_STATUS = 'Active.';
export const SEED_KICKER = 'Seed.';
export const SEEDNODE_KICKER = SEED_KICKER;
export const SEEDNODE_MODE_HOSTED = 'Hosted.';
export const SEEDNODE_MODE_ON_PREM = 'On this premises.';
export const SEED_STATUS_UNCHECKED = 'Status not checked yet.';
export const SEEDNODE_STATUS_UNKNOWN = SEED_STATUS_UNCHECKED;
export const SEEDNODE_STATUS_CONNECTED = 'Connected.';
export const SEED_STATUS_NOT_CONNECTED = 'Not connected yet.';
export const MANAGE_SEED_LABEL = 'Manage seed.';
export const CHECK_SEED_LABEL = 'Check seed.';
export const MANAGE_SEEDNODE_LABEL = MANAGE_SEED_LABEL;
export const SUBSCRIPTION_KICKER = 'Subscription.';
export const MANAGE_BILLING_LABEL = 'Manage billing.';
export const PLACE_APPS_KICKER = 'Apps';
export const BACK_TO_PLACES_LABEL = 'Back to your places.';
export const COMING_DOT_LABEL = 'Coming.';
export const PLACE_SUB_LINE = 'R199 a month for this place.';
export const SEED_HOSTED_LINE = 'R299 hosted seed.';
export const SEED_HOSTED_ON_PREM_LINE = 'R0 hosted seed.';
export const HOSTED_SEED_SUMMARY = 'Hosted seed.';
export const PLACE_TRIAL_LINE = 'No charge for 30 days.';
export const TRIAL_IS_30_DAYS = 'The trial is 30 days.';
export const PERIOD_ENDED_LABEL = 'This period has ended.';
export const PAYMENT_DUE_LABEL = 'Payment is due.';
export const PLAN_PLACE_LABEL = 'This place.';
export const PLAN_HOSTED_SEED_LABEL = 'Hosted seed.';
export const PLAN_BOTH_LABEL = 'Both.';
export const PLAN_MONTHLY_LABEL = 'Monthly.';
export const PLAN_ANNUAL_LABEL = 'Annual.';
export const PAY_WITH_PAYSTACK_LABEL = 'Pay with Paystack.';
export const PAYSTACK_CHANNELS_LABEL = 'Card, Ozow, or Capitec Pay.';
export const PAYSTACK_NOT_READY_LABEL = 'Paystack is not ready.';
export const PAYSTACK_NEED_EMAIL_LABEL = 'Add an email to pay.';
export const ADD_APPS_LABEL = 'Add apps.';
export const ALREADY_ON_PLACE_LABEL = 'Already on this place.';

export function daysLeftOnTrialLabel(days: number): string {
  const n = Math.max(0, Math.floor(days));
  return n === 1 ? '1 day left on trial.' : `${n} days left on trial.`;
}

export function renewsInDaysLabel(days: number): string {
  const n = Math.max(0, Math.floor(days));
  return n === 1 ? 'Renews in 1 day.' : `Renews in ${n} days.`;
}
export const APPS_SOCIAL_KICKER = 'Social.';
export const APPS_PAID_KICKER = 'Paid.';
export const DOWNLOAD_SEED_SETUP_LABEL = 'Download seed setup.';
export const ON_PREM_SEED_NEXT = 'Next: download the setup and run it on this premises.';
export const ON_PREM_SEED_DOOR_LABEL = 'This premises.';
export const YOUR_PLACES_KICKER = 'Your places.';
export const YOUR_PLACES_EMPTY = 'No place on this hub yet.';
export const YOUR_APPS_KICKER = YOUR_PLACES_KICKER;
export const GET_APPS_KICKER = 'Get apps.';
export const OTHER_APPS_KICKER = GET_APPS_KICKER;
/** Apps shelf heading. The tile is the tap. */
export const APPS_SHELF_TITLE = 'Apps.';
export const APPS_SHELF_LINE = "Tap a tile. That's the whole shelf.";
export const GET_LABEL = 'Get.';
export const OPEN_LABEL = 'Open.';
export const SUBSCRIBE_LABEL = 'Subscribe';
export const COMING_KICKER = 'Coming';
/** Not live yet. Mutes the shelf tile. */
export const SOON_LABEL = 'Soon.';
export const SAME_CHAIN_CAPTION = 'Same chain. Not live yet.';
export const SEE_THE_MENU_LABEL = 'See the menu.';
export const RESERVE_A_TABLE_LABEL = 'Reserve a table.';
export const CHAIN_BACK_LABEL = 'Back.';
export const CHAIN_APP_CHAT = 'Chat';
export const CHAIN_APP_VAULT = 'Vault';
export const CHAIN_APP_FINANCE = 'Finance';
export const CHAIN_APP_TRADE = 'Trade';
export const CHAIN_APP_PROPERTY = 'Property';
export const YOUR_WHATSAPP_LABEL = 'Your WhatsApp number.';
export const SAVE_WHATSAPP_LABEL = 'Save.';
export const CHANGE_WHATSAPP_LABEL = 'Change.';
export const WHATSAPP_ONE_CODE_HINT = 'A code to this number opens the apps for this place.';
export const SEND_CODE_LABEL = 'Send a code.';
export const CODE_LABEL = 'Code.';
export const HOUSE_OTP_TITLE = 'Open with a code.';
export const HOUSE_OTP_BODY = 'We text a code to this number. Then the app opens for this place.';
export const HOUSE_OTP_CODE_HINT = 'Type the code from the message.';
export const HOUSE_OTP_BAD_CODE = 'That code is not the one we sent.';
export const HOUSE_OTP_BAD_PHONE = 'Use a WhatsApp number we can text.';
export const HOUSE_OTP_FAILED = 'We could not open that just now.';
export const HOUSE_OTP_NEED_PLACE = 'Open a place first.';
export const HOUSE_OTP_MOCK_TITLE = 'Code for this try.';
export const HOUSE_OTP_MOCK_BODY = 'The text is not going out yet. Use this code, then open.';
export const HOUSE_OTP_MOCK_FILL = 'Use this code.';
export const HOUSE_OTP_MOCK_TYPE = 'I will type it.';
export const CHAIN_APP_EATIN = 'Eat In';
export const CHAIN_APP_EATOUT = 'Eat Out';
export const CHAIN_APP_PROJECT = 'Project';
export const EATERY_ROW_BODY = 'Tables, tickets, kitchen, stock.';
export const HUB_HOME_FALLBACK = 'Your hub';
export const LOG_OFF_LABEL = 'Log off.';
export const DELETE_THE_HOUSE_LABEL = 'Delete the place.';
export const REGISTER_A_NEW_HOUSE_LABEL = 'Register a new place.';
export const DELETE_HOUSE_TITLE = 'Delete the place.';
export const DELETE_HOUSE_BODY = 'This takes the place off your hub. Type the exact place name to confirm.';
export const DELETE_HOUSE_CONFIRM_LABEL = 'Delete';
export const DELETE_HOUSE_CANCEL_LABEL = 'Cancel';
export const TYPE_THE_PLACE_NAME = 'Type the place name.';
export const STAY_WITH_THE_HOUSE_LABEL = 'Stay with this place.';
export const ON_THE_CHAIN_KICKER = 'On the chain.';
export const ON_THE_CHAIN_EMPTY = 'No other places on the chain yet.';
export const OTHER_PLACES_KICKER = 'Other places.';
export const OTHER_PLACES_EMPTY = 'No other places yet.';
export const FILTER_COUNTRY_LABEL = 'Country';
export const FILTER_REGION_LABEL = 'Region';
export const FILTER_TOWN_LABEL = 'Town';
export const FILTER_ALL_LABEL = 'All';
export const SAMPLE_SOURCE_LABEL = 'Sample.';
export const ON_THIS_HUB_SOURCE_LABEL = 'On this hub.';

export function subscribedCountLabel(count: number): string {
  return `${count} subscribed.`;
}

export function otherPlacesSourceLabel(live: number, sample: number): string {
  if (live && sample) return `${live} on this hub. ${sample} sample.`;
  if (sample) return SAMPLE_SOURCE_LABEL;
  if (live) return ON_THIS_HUB_SOURCE_LABEL;
  return '';
}
export const CHAIN_APP_EATERY = 'Eatery';
export const CHAIN_APP_FARM = 'Farm';
export const CHAIN_APP_RESELLER = 'Reseller';
export const CHAIN_APP_MAKER = 'Maker';
export const CHAIN_APP_LABELS = {
  eatery: CHAIN_APP_EATERY,
  eatin: CHAIN_APP_EATIN,
  eatout: CHAIN_APP_EATOUT,
  project: CHAIN_APP_PROJECT,
  finance: CHAIN_APP_FINANCE,
  trade: CHAIN_APP_TRADE,
  farm: CHAIN_APP_FARM,
  reseller: CHAIN_APP_RESELLER,
  maker: CHAIN_APP_MAKER,
  chat: CHAIN_APP_CHAT,
  vault: CHAIN_APP_VAULT,
  property: CHAIN_APP_PROPERTY
} as const;

export const ASK_FOR_ENHANCEMENT_LABEL = 'Ask for an enhancement.';
export const ASK_WHICH_APP_LABEL = 'Which app?';
export const ASK_PICK_AN_APP = 'Pick an app first.';
export const ASK_KIND_ENHANCEMENT = 'Enhancement';
export const ASK_KIND_WRONG = "Something's wrong";
export const ASK_KIND_HELP = 'Need help';
export const ASK_BODY_LABEL = 'What do you need?';
export const ASK_SEND_LABEL = 'Send.';
export const ASK_EMPTY = 'No asks yet.';
export const ASK_BACK_LABEL = 'Back to your hub.';
export const ASK_PATH_LABEL = '/asks';
export const ASK_ALL_APPS = 'All';

/** Exact match — extra spaces or a different case keep Delete quiet. */
export function houseNameMatchesConfirm(typedName: string, houseName: string): boolean {
  const target = (houseName || '').trim();
  return Boolean(target) && typedName === target;
}

const BANNED_RE = new RegExp(`\\b(${BANNED_DOOR_WORDS.join('|')})\\b`, 'i');

export function hasBannedDoorCopy(text: string): boolean {
  return BANNED_RE.test(text || '');
}

export function hasBannedDoorName(text: string): boolean {
  return BANNED_DOOR_NAMES.some(name => (text || '').includes(name));
}

export const HUB_EMAIL_DOOR_COPY = [
  HUB_DOOR_TITLE,
  HUB_DOOR_BODY,
  HUB_DOOR_GLOSSARY,
  YOUR_EMAIL_LABEL,
  OPEN_YOUR_HUB_LABEL,
  STAFF_INVITE_LABEL
];

export const HUB_HOME_COPY = [
  YOUR_PLACES_KICKER,
  YOUR_PLACES_EMPTY,
  PLUS_REGISTER_LABEL,
  OPEN_LABEL,
  GET_APPS_KICKER,
  APPS_SHELF_TITLE,
  APPS_SHELF_LINE,
  GET_LABEL,
  COMING_KICKER,
  SOON_LABEL,
  SAME_CHAIN_CAPTION,
  SEE_THE_MENU_LABEL,
  RESERVE_A_TABLE_LABEL,
  CHAIN_BACK_LABEL,
  LOG_OFF_LABEL,
  DELETE_THE_HOUSE_LABEL,
  REGISTER_A_NEW_HOUSE_LABEL,
  OTHER_PLACES_KICKER,
  OTHER_PLACES_EMPTY,
  FILTER_COUNTRY_LABEL,
  FILTER_REGION_LABEL,
  FILTER_TOWN_LABEL,
  FILTER_ALL_LABEL,
  SAMPLE_SOURCE_LABEL,
  ON_THIS_HUB_SOURCE_LABEL,
  CHAIN_APP_EATERY,
  CHAIN_APP_EATIN,
  CHAIN_APP_EATOUT,
  CHAIN_APP_PROJECT,
  CHAIN_APP_FARM,
  CHAIN_APP_RESELLER,
  CHAIN_APP_MAKER,
  CHAIN_APP_CHAT,
  CHAIN_APP_VAULT,
  CHAIN_APP_FINANCE,
  CHAIN_APP_TRADE,
  CHAIN_APP_PROPERTY,
  YOUR_WHATSAPP_LABEL,
  SAVE_WHATSAPP_LABEL,
  CHANGE_WHATSAPP_LABEL,
  WHATSAPP_ONE_CODE_HINT,
  SEND_CODE_LABEL,
  CODE_LABEL,
  HOUSE_OTP_TITLE,
  HOUSE_OTP_BODY,
  HOUSE_OTP_CODE_HINT,
  HOUSE_OTP_BAD_CODE,
  HOUSE_OTP_BAD_PHONE,
  HOUSE_OTP_FAILED,
  HOUSE_OTP_NEED_PLACE,
  HOUSE_OTP_MOCK_TITLE,
  HOUSE_OTP_MOCK_BODY,
  HOUSE_OTP_MOCK_FILL,
  HOUSE_OTP_MOCK_TYPE,
  ASK_FOR_ENHANCEMENT_LABEL,
  NAV_PLACES_LABEL,
  NAV_APPS_LABEL,
  NAV_YOU_LABEL,
  NAV_OTHER_PLACES_LABEL,
  YOU_KICKER,
  SETTINGS_KICKER,
  MONEY_IN_R_LABEL,
  PLACE_PAYMENT_DUE,
  PLACE_PAUSED,
  PLACE_TRIAL_STATUS,
  PLACE_ACTIVE_STATUS,
  SEED_KICKER,
  SEEDNODE_MODE_HOSTED,
  SEEDNODE_MODE_ON_PREM,
  SEED_STATUS_UNCHECKED,
  SEEDNODE_STATUS_CONNECTED,
  SEED_STATUS_NOT_CONNECTED,
  MANAGE_SEED_LABEL,
  CHECK_SEED_LABEL,
  SUBSCRIPTION_KICKER,
  MANAGE_BILLING_LABEL,
  PLACE_APPS_KICKER,
  BACK_TO_PLACES_LABEL,
  COMING_DOT_LABEL,
  PLACE_SUB_LINE,
  SEED_HOSTED_LINE,
  SEED_HOSTED_ON_PREM_LINE,
  HOSTED_SEED_SUMMARY,
  PLACE_TRIAL_LINE,
  TRIAL_IS_30_DAYS,
  PERIOD_ENDED_LABEL,
  PAYMENT_DUE_LABEL,
  PLAN_PLACE_LABEL,
  PLAN_HOSTED_SEED_LABEL,
  PLAN_BOTH_LABEL,
  PLAN_MONTHLY_LABEL,
  PLAN_ANNUAL_LABEL,
  PAY_WITH_PAYSTACK_LABEL,
  PAYSTACK_CHANNELS_LABEL,
  PAYSTACK_NOT_READY_LABEL,
  PAYSTACK_NEED_EMAIL_LABEL,
  ADD_APPS_LABEL,
  ALREADY_ON_PLACE_LABEL,
  daysLeftOnTrialLabel(12),
  renewsInDaysLabel(18),
  APPS_SOCIAL_KICKER,
  APPS_PAID_KICKER,
  DOWNLOAD_SEED_SETUP_LABEL,
  ON_PREM_SEED_NEXT,
  ON_PREM_SEED_DOOR_LABEL,
  LIVE_STATUS_LABEL
];

export const ASK_PAGE_COPY = [
  ASK_FOR_ENHANCEMENT_LABEL,
  ASK_WHICH_APP_LABEL,
  ASK_PICK_AN_APP,
  ASK_KIND_ENHANCEMENT,
  ASK_KIND_WRONG,
  ASK_KIND_HELP,
  ASK_BODY_LABEL,
  ASK_SEND_LABEL,
  ASK_EMPTY,
  ASK_BACK_LABEL,
  ASK_ALL_APPS,
  CHAIN_APP_EATERY,
  CHAIN_APP_FARM,
  CHAIN_APP_RESELLER,
  CHAIN_APP_MAKER
];

export const HUB_WIZARD_COPY = [
  CREATE_YOUR_PLACE_TITLE,
  CREATE_YOUR_PLACE_SUB,
  ENABLE_APPS_TITLE,
  ENABLE_APPS_SUB,
  PICK_AN_APP_MESSAGE,
  ENABLED_APPS_LABEL
];

export const DELETE_HOUSE_MODAL_COPY = [
  DELETE_HOUSE_TITLE,
  DELETE_HOUSE_BODY,
  TYPE_THE_PLACE_NAME,
  DELETE_HOUSE_CONFIRM_LABEL,
  DELETE_HOUSE_CANCEL_LABEL
];
