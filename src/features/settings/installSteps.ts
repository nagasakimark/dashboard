/** How to install the app by hand when the browser doesn't offer a button. */
export function installSteps(ua: string): { intro: string; steps: string[]; note?: string } {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua))
  const android = /Android/.test(ua)
  const safari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|Edg\//.test(ua)
  const firefox = /Firefox|FxiOS/.test(ua)
  const samsung = /SamsungBrowser/.test(ua)
  const edge = /Edg\//.test(ua)

  if (ios)
    return {
      intro: 'On iPhone and iPad, apps are added from the Share menu.',
      steps: [
        'Tap the Share button (the square with an arrow) in the toolbar.',
        'Scroll down and tap “Add to Home Screen”.',
        'Tap “Add”. ALT Dashboard now opens from your home screen.',
      ],
      note: safari ? undefined : 'Recent iOS versions allow this from any browser; if you don’t see it, open this page in Safari.',
    }
  if (android && samsung)
    return {
      intro: 'Samsung Internet can add the dashboard as an app.',
      steps: ['Tap the menu (☰) at the bottom.', 'Tap “Add page to” → “Home screen”.', 'Tap “Add”.'],
    }
  if (android)
    return {
      intro: 'Chrome on Android installs the dashboard like any other app.',
      steps: ['Tap the menu (⋮) at the top right.', 'Tap “Install app” (or “Add to Home screen”).', 'Tap “Install”.'],
      note: firefox ? 'In Firefox, use the menu (⋮) → “Install”.' : undefined,
    }
  if (safari)
    return {
      intro: 'Safari on a Mac can add the dashboard to the Dock.',
      steps: ['Open the File menu (or the Share button).', 'Choose “Add to Dock…”.', 'Click “Add”.'],
    }
  if (firefox)
    return {
      intro: 'Firefox on computers can’t install web apps.',
      steps: ['Open this page in Chrome or Edge.', 'Go to Settings → Install as an app, and click Install app.'],
      note: 'Your data lives in each browser separately; use sync or export to bring it across.',
    }
  return {
    intro: edge ? 'Edge can install the dashboard as an app.' : 'Chrome can install the dashboard as an app.',
    steps: edge
      ? ['Click the menu (…) at the top right.', 'Choose “Apps” → “Install this site as an app”.', 'Click “Install”.']
      : [
          'Click the install icon at the right end of the address bar, or open the menu (⋮).',
          'Choose “Cast, save and share” → “Install page as app…” (older versions: “Install ALT Dashboard…”).',
          'Click “Install”.',
        ],
    note: 'If there’s no install option, the dashboard may already be installed: look for it with your other apps.',
  }
}
