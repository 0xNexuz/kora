'use client';
import {useEffect,useRef} from 'react';
import {FileCheck2,ChartNoAxesCombined,ArrowLeftRight,Waypoints} from 'lucide-react';
import './kora-hero-illustration.css';

const mascots=[{key:'operations',label:'Operations',image:'/mascots/operations.png'},{key:'capital',label:'Capital',image:'/mascots/capital.png'},{key:'intelligence',label:'Financial intelligence',image:'/mascots/intelligence.png'}];
export default function KoraHeroIllustration({paused}:{paused:boolean}){
 const scene=useRef<HTMLDivElement>(null);
 useEffect(()=>{const element=scene.current;if(!element)return;const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(pointer: fine)');let frame=0;
 const reset=()=>{cancelAnimationFrame(frame);element.style.setProperty('--pointer-x','0px');element.style.setProperty('--pointer-y','0px');};
 const move=(e:PointerEvent)=>{if(paused||reduced.matches||!fine.matches)return;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const rect=element.getBoundingClientRect();element.style.setProperty('--pointer-x',`${Math.max(-1,Math.min(1,(e.clientX-rect.left)/rect.width*2-1))*7}px`);element.style.setProperty('--pointer-y',`${Math.max(-1,Math.min(1,(e.clientY-rect.top)/rect.height*2-1))*5}px`);});};
 element.addEventListener('pointermove',move,{passive:true});element.addEventListener('pointerleave',reset);reduced.addEventListener('change',reset);if(paused)reset();return()=>{reset();element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',reset);reduced.removeEventListener('change',reset);};
 },[paused]);
 return <div ref={scene} className="kora-mascot-scene" role="img" aria-label="Three sculptural Kora mascots representing financial intelligence, operations and capital" data-paused={paused}>
 <div className="mascot-orbit mascot-orbit-outer" aria-hidden="true"/><div className="mascot-orbit mascot-orbit-inner" aria-hidden="true"/>
 <span className="mascot-index" aria-hidden="true">THREE SYSTEMS. ONE FINANCIAL MIND.</span>
 {mascots.map(m=><div key={m.key} className={`mascot-position mascot-${m.key}`} aria-hidden="true"><div className="mascot-parallax"><div className="mascot-float"><img src={m.image} alt="" width={1024} height={1024} decoding="async" draggable={false}/></div></div><span className="mascot-name">{m.label}</span></div>)}
 <div className="financial-fragment fragment-invoice" aria-hidden="true"><FileCheck2 size={19}/><span>INVOICE<br/><b>RECONCILED</b></span></div>
 <div className="financial-fragment fragment-flow" aria-hidden="true"><ChartNoAxesCombined size={20}/><span>CASH FLOW<br/><b>CONNECTED</b></span></div>
 <div className="financial-fragment fragment-settlement" aria-hidden="true"><ArrowLeftRight size={18}/><span>SETTLEMENT</span></div>
 <div className="financial-fragment fragment-graph" aria-hidden="true"><Waypoints size={22}/></div>
 <span className="mascot-footer" aria-hidden="true">FROM FRAGMENTS <span>→</span> TO FLOW.</span>
 </div>;
}
