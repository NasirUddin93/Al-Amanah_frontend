import React from 'react';
import Reveal from './reveal';

export default function SectionHead({ tag, title, sub, center = false, light = false }: { tag: string; title: React.ReactNode; sub?: string; center?: boolean; light?: boolean }) {
  return (
    <div className={center ? 'center' : ''}>
      <Reveal><span className="sec-tag">{tag}</span></Reveal>
      <Reveal delay={100}><h2 className="sec-title" style={light ? { color: '#fff' } : undefined}>{title}</h2></Reveal>
      {sub && <Reveal delay={200}><p className="sec-sub">{sub}</p></Reveal>}
    </div>
  );
}
