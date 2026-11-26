// In-app browsers where Google refuses to sign in (owner: AUTH). PLAN-AUTH section 4:
// Google's embedded-webview policy answers them with disallowed_useragent.
const IN_APP = /\b(FBAN|FBAV|FB_IAB|FBIOS|Instagram|Line\/|MicroMessenger|Snapchat|musical_ly|BytedanceWebview|TikTok|LinkedInApp|Pinterest|KAKAOTALK)/i
const ANDROID_WEBVIEW = /; wv\)/

/** True inside Instagram, Facebook, TikTok and similar in-app browsers. */
export function isInAppBrowser(ua) {
  const s = String(ua || '')
  if (!s) return false
  if (/\bGSA\//.test(s)) return false // the Google app is allowed
  return IN_APP.test(s) || ANDROID_WEBVIEW.test(s)
}
