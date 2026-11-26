// Which sign-in providers are switched on (owner: AUTH). Read here and nowhere else.
//
// Google: off until the owner enables the Google provider in Supabase (docs/app/AUTH.md,
// "What only the owner can do"). Turn it on with "google": true in frontend/app.config.json
// (every build), or VITE_AUTH_GOOGLE=1 for one build or dev server; VITE_AUTH_GOOGLE=0 forces
// it off. With it off, the card is email only: no Google button, no divider, and a Google
// return to /auth/callback is answered as an ordinary sign-in.
import config from '../../../../app.config.json'

const env = import.meta.env?.VITE_AUTH_GOOGLE

export const GOOGLE = env === '1' ? true : env === '0' ? false : config.google === true
