/** Kitchen English on hub doors. Protocol words stay behind Advanced. */

export const BANNED_DOOR_WORDS = ['node', 'did', 'wallet', 'mcp', 'npm'] as const;

export const YOUR_EMAIL_LABEL = 'Your email.';
export const OPEN_YOUR_HUB_LABEL = 'Open your hub.';
export const HUB_DOOR_TITLE = 'Your hub.';
export const HUB_DOOR_BODY = 'Set up the house, invite the floor.';
export const OPEN_THE_HOUSE_LABEL = 'Open the house';
export const SEE_YOUR_APPS_LABEL = 'See your apps';
export const STAFF_INVITE_LABEL = 'I have a staff invite';
export const STAFF_INVITE_HREF = 'https://www.daup.co.za/invite';
export const DAUP_HOME_HREF = 'https://www.daup.co.za';
export const INVALID_EMAIL_MESSAGE = 'Add the email we can reach.';
export const WHERE_IS_THE_EATERY = 'Where is the eatery?';
export const WHERE_IS_THE_EATERY_SUB = 'Name the place. Staff join with a WhatsApp tap.';
export const YOUR_APPS_KICKER = 'Your apps';
export const OTHER_APPS_KICKER = 'Other apps';
export const COMING_KICKER = 'Coming';
export const SAME_CHAIN_CAPTION = 'Same chain. Not live yet.';
export const EATERY_ROW_BODY = 'Tables, tickets, kitchen, stock.';
export const HUB_HOME_FALLBACK = 'Your hub';
export const LOG_OFF_LABEL = 'Log off.';
export const SUBSCRIBE_LABEL = 'Subscribe';
export const SUBSCRIBED_LABEL = 'Subscribed';

const BANNED_RE = new RegExp(`\\b(${BANNED_DOOR_WORDS.join('|')})\\b`, 'i');

export function hasBannedDoorCopy(text: string): boolean {
  return BANNED_RE.test(text || '');
}

export const HUB_EMAIL_DOOR_COPY = [
  HUB_DOOR_TITLE,
  HUB_DOOR_BODY,
  YOUR_EMAIL_LABEL,
  OPEN_YOUR_HUB_LABEL,
  STAFF_INVITE_LABEL
];

export const HUB_HOME_COPY = [
  YOUR_APPS_KICKER,
  OPEN_THE_HOUSE_LABEL,
  EATERY_ROW_BODY,
  OTHER_APPS_KICKER,
  COMING_KICKER,
  SAME_CHAIN_CAPTION,
  LOG_OFF_LABEL,
  SUBSCRIBE_LABEL,
  'Farm',
  'Reseller',
  'Maker'
];
