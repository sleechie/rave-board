// Product support policy: iOS remains preview-only during this first release,
// even if a specialist browser exposes Bluetooth. Android is quietly available.
export function connectionSupport({ userAgent = '', platform = '', maxTouchPoints = 0, bluetooth = false, secure = true } = {}) {
  const ios = /iPhone|iPad|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
  if (ios) return {
    kind:'ios', canConnect:false, title:'iPhone & iPad: preview only for now',
    message:'Board connection on iPhone and iPad isn’t available in this release yet. You can explore every effect here. To light a board, open Rave Board in Chrome or Edge on a computer.',
  };
  if (!secure) return { kind:'insecure', canConnect:false, title:'Open the secure website', message:'Bluetooth needs a secure connection. Open https://raveboard.up.railway.app/rave to connect.' };
  if (!bluetooth) return { kind:'unsupported', canConnect:false, title:'This browser can preview the show', message:'For board connection, open this page in Chrome or Edge on a computer with Bluetooth turned on.' };
  if (/Android/i.test(userAgent)) return { kind:'android', canConnect:true, title:'Mobile connection is experimental', message:'Keep this page visible and your phone awake while playing. Preview works without a connection.' };
  return { kind:'supported', canConnect:true, title:'', message:'' };
}
