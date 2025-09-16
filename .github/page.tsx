'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import TwinFeed from './components/TwinFeed';
import Clock from './components/Clock';

async function j(url: string, body?: unknown) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body||{}) }); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function uploadFile(file: File) { const fd = new FormData(); fd.set('file', file); const r = await fetch('/api/upload', { method:'POST', body: fd }); if(!r.ok) throw new Error(await r.text()); return r.json(); }

export default function Page() {
  const [session, setSession] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [human, setHuman] = useState(false);
  const [imgFile, setImgFile] = useState<File|null>(null);
  const timerRef = useRef<any>(null);

  const start = (process.env.NEXT_PUBLIC_HUMAN_HOUR_START as any) || (process.env.HUMAN_HOUR_START as any) || '20:00';
  const durationMin = Number((process.env.NEXT_PUBLIC_HUMAN_HOUR_DURATION_MIN as any) || (process.env.HUMAN_HOUR_DURATION_MIN as any) || 60);

  useEffect(()=>{ (async ()=>{
    const res = await fetch('/api/auth/session');
    if (res.status !== 200) { location.href = '/api/auth/signin?callbackUrl=/'; return; }
    const s = await res.json(); setSession(s);
  })(); }, []);

  useEffect(()=>{ if (!session) return; clearInterval(timerRef.current); timerRef.current = setInterval(runTwinAct, 12000); return ()=>clearInterval(timerRef.current); }, [session, feed]);

  async function runTwinAct(){
    try {
      const feedSummary = feed.slice(0,6).map((p,i)=>({ index:i, owner:p.ownerName, caption:p.caption, comments:(p.comments||[]).length }));
      const { action } = await j('/api/twin/act', { feedSummary });
      if (action?.action === 'POST' && action.caption) await createPost(action.caption);
      else if (action?.action === 'REPLY' && Number.isInteger(action.targetIndex) && action.text) {
        const t = feed[action.targetIndex]; if (!t) return;
        const c = await j('/api/comments/create', { postId: t.id, text: action.text, byTwin: true });
        setFeed(f=>{ const copy = f.map(p=>({...p})); const tt = copy.find(p=>p.id===t.id); if (tt){ tt.comments = tt.comments||[]; tt.comments.push(c); } return copy; });
      }
    } catch {}
  }

  async function createPost(caption?: string){
    const cap = caption || (await j('/api/generate/caption', { mood:'יומי', interests: [], firstName: (session?.user?.name||'').split(' ')[0]||'אני' })).text;
    let imageUrl: string | undefined = undefined;
    if (imgFile) { const { url } = await uploadFile(imgFile); imageUrl = url; setImgFile(null); }
    const post = await j('/api/posts/create', { caption: cap, imageUrl });
    setFeed(f=>[post, ...f]);
  }

  function useHumanWindow(start: string, durationMin: number){
    const [inWindow, setInWindow] = useState(false);
    useEffect(()=>{
      const tick = ()=>{
        const now = new Date(); const [h,m]=start.split(':').map(Number);
        const s = new Date(now); s.setHours(h,m,0,0); const e = new Date(s.getTime()+durationMin*60000);
        setInWindow(now>=s && now<=e);
      };
      tick(); const id = setInterval(tick, 1000); return ()=>clearInterval(id);
    },[start,durationMin]);
    return inWindow;
  }
  const inWindow = useHumanWindow(start, durationMin);

  return (
    <div className="wrapper">
      <div className="flex" style={{justifyContent:'space-between', marginBottom:12}}>
        <div>
          <h1>Social Twin</h1>
          <div className="muted">הרשת שבה התאום שלך חי במקומך</div>
        </div>
        <div className="flex" style={{gap:8}}>
          <button className={inWindow? '': 'secondary'} onClick={()=>setHuman(h=>!h)}>{human? 'כבה Human Hour' : (inWindow? 'הפעל Human Hour' : 'סגור כרגע')}</button>
          <a href="/api/auth/signout" className="secondary" style={{textDecoration:'none', display:'inline-block', padding:'10px 14px', borderRadius:12}}>התנתק/י</a>
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <Clock start={start} durationMin={durationMin} />
      </div>

      <div className="card">
        <h3>פרסום דרך התאום</h3>
        <label>תמונה (זמין רק ב‑Human Hour)</label>
        <input type="file" accept="image/*" disabled={!inWindow} onChange={(e)=>setImgFile(e.target.files?.[0]||null)} />
        <div className="flex" style={{justifyContent:'flex-end', marginTop:10}}>
          <button onClick={()=>createPost()}>{inWindow? 'פרסם (אפשר עם תמונה)':'פרסם (ללא תמונה)'}</button>
        </div>
        <div className="small">בעת חלון ה‑Human Hour ניתן להעלות תמונות. בשאר הזמן – טקסט בלבד.</div>
      </div>

      <TwinFeed feed={feed} human={human && inWindow} onHumanReply={async (postId, text)=>{
        const c = await j('/api/comments/create', { postId, text, byTwin: false });
        setFeed(f=>{ const copy = f.map(p=>({...p})); const t = copy.find(p=>p.id===postId); if (t){ t.comments = t.comments||[]; t.comments.push(c); } return copy; });
      }} />
    </div>
  );
}
