import './HandshakeAnimation.css'

export default function HandshakeAnimation() {
  return (
    <div className="handshake-animation" aria-hidden="true">
      <svg viewBox="0 0 640 210" role="presentation" focusable="false">
        <defs>
          <linearGradient id="left-sleeve" x1="0" x2="1">
            <stop offset="0" stopColor="#172a45" />
            <stop offset="1" stopColor="#314c6e" />
          </linearGradient>
          <linearGradient id="right-sleeve" x1="1" x2="0">
            <stop offset="0" stopColor="#d96c5e" />
            <stop offset="1" stopColor="#ee9381" />
          </linearGradient>
          <linearGradient id="hand-tone" x1="0" x2="0.8" y1="0" y2="1">
            <stop offset="0" stopColor="#f2c7a9" />
            <stop offset="1" stopColor="#dca987" />
          </linearGradient>
          <filter id="hand-shadow" x="-20%" y="-30%" width="140%" height="170%">
            <feDropShadow dx="0" dy="5" floodColor="#172a45" floodOpacity="0.12" stdDeviation="5" />
          </filter>
        </defs>

        <ellipse cx="320" cy="158" rx="208" ry="13" fill="#172a45" opacity=".055" />
        <g className="handshake-arm handshake-arm-left" filter="url(#hand-shadow)">
          <path d="M22 79h157q23 0 39 15l33 31-37 37-34-28q-9-7-21-7H22z" fill="url(#left-sleeve)" />
          <path d="M22 79h111v48H22z" fill="#172a45" opacity=".16" />
          <path d="M178 91q15-11 31 1l40 31 43-22q15-8 26 4l9 10q7 9-2 18l-52 42q-14 11-29 1l-61-42q-13-9-14-22-1-12 9-21z" fill="url(#hand-tone)" stroke="#c79172" strokeWidth="2" strokeLinejoin="round" />
          <path d="m250 123 31 24q8 6 16 0l25-19" fill="none" stroke="#bc896b" strokeWidth="3" strokeLinecap="round" />
          <path d="m232 141 27 20q8 6 15 0" fill="none" stroke="#c29172" strokeWidth="2.5" strokeLinecap="round" />
          <path d="m200 107 35 26" fill="none" stroke="#f8dfcb" strokeWidth="3" strokeLinecap="round" opacity=".75" />
        </g>

        <g className="handshake-arm handshake-arm-right" filter="url(#hand-shadow)">
          <path d="M618 79H461q-23 0-39 15l-33 31 37 37 34-28q9-7 21-7h137z" fill="url(#right-sleeve)" />
          <path d="M507 79h111v48H507z" fill="#fff" opacity=".12" />
          <path d="M462 91q-15-11-31 1l-40 31-43-22q-15-8-26 4l-9 10q-7 9 2 18l52 42q14 11 29 1l61-42q13-9 14-22 1-12-9-21z" fill="url(#hand-tone)" stroke="#c79172" strokeWidth="2" strokeLinejoin="round" />
          <path d="m390 123-31 24q-8 6-16 0l-25-19" fill="none" stroke="#bc896b" strokeWidth="3" strokeLinecap="round" />
          <path d="m408 141-27 20q-8 6-15 0" fill="none" stroke="#c29172" strokeWidth="2.5" strokeLinecap="round" />
          <path d="m440 107-35 26" fill="none" stroke="#f8dfcb" strokeWidth="3" strokeLinecap="round" opacity=".75" />
        </g>

        <g className="handshake-heart">
          <circle cx="320" cy="53" r="20" fill="#fff" opacity=".92" />
          <path d="M320 63s-13-7.5-13-15a7 7 0 0 1 13-3.5A7 7 0 0 1 333 48c0 7.5-13 15-13 15z" fill="#e86f61" />
        </g>
      </svg>
    </div>
  )
}
