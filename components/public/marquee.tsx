import React from 'react';

export default function Marquee({ items }: { items: string[] }) {
  const group = (
    <div className="m-group">
      {items.map((t, i) => (<span key={i}>{t} <i>✦</i></span>))}
    </div>
  );
  return (
    <div className="marquee">
      <div className="marquee-track">{group}{group}</div>
    </div>
  );
}
