// ─── La Poste RH v3 · Core: constants, utils, auth, modals ───────────────────
const {useState,useEffect,useRef,useMemo}=React;

// ── Constants ─────────────────────────────────────────────────────────────────
const ABSENCE_TYPES=[
  {code:'CP',label:'Congés Payés',color:'#22c55e'},
  {code:'MAL',label:'Maladie',color:'#ef4444'},
  {code:'FORM',label:'Formation',color:'#3b82f6'},
  {code:'RC',label:'Repos Comp.',color:'#f97316'},
  {code:'AT',label:'Acc. Travail',color:'#a855f7'},
  {code:'CSE',label:'CSE/RPX',color:'#06b6d4'},
  {code:'CARC',label:'CA/RC',color:'#ec4899'},
  {code:'ATM',label:'ATM/ATA',color:'#64748b'},
  {code:'ASA',label:'ASA',color:'#fbbf24'},
  {code:'AUTRE',label:'Autre',color:'#6b7280'},
];
const LEAVE_TYPES=[
  {code:'CP',label:'Congés Payés',color:'#22c55e'},
  {code:'RTT',label:'RTT',color:'#3b82f6'},
  {code:'CSS',label:'Congé sans solde',color:'#94a3b8'},
  {code:'MAT',label:'Maternité',color:'#ec4899'},
  {code:'PAT',label:'Paternité',color:'#8b5cf6'},
  {code:'MAL',label:'Maladie',color:'#ef4444'},
  {code:'FP',label:'Famille perso',color:'#f59e0b'},
];
const ABS_MAP=Object.fromEntries(ABSENCE_TYPES.map(a=>[a.code,a]));
const LEAVE_MAP=Object.fromEntries(LEAVE_TYPES.map(a=>[a.code,a]));
const FR_MONTHS=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const FR_DOW=['L','M','M','J','V','S','D'];
const TEAM_COLORS=['#FFD100','#38bdf8','#a78bfa','#34d399','#f87171','#fb923c','#e879f9','#2dd4bf'];
const AGENT_COLORS=['#FFD100','#38bdf8','#a78bfa','#34d399','#f87171','#fb923c','#e879f9','#2dd4bf','#fbbf24','#60a5fa','#f472b6','#4ade80','#c084fc','#818cf8','#fdba74'];
const CAT_COLORS=['#ef4444','#3b82f6','#22c55e','#f59e0b','#a855f7','#ec4899','#06b6d4','#f97316'];
const T_COLORS=['#1e3a5f','#1a3a2a','#3a1a3a','#3a2a1a','#1a2a3a','#2a1a2a','#1a3a3a','#2d2a1a'];
const THEMES=[{id:'dark',label:'Sombre',icon:'🌙'},{id:'light',label:'Clair',icon:'☀️'},{id:'glass',label:'Liquid Glass',icon:'💎'}];

// ── Utils ─────────────────────────────────────────────────────────────────────
function mkId(){return Math.random().toString(36).slice(2)+Date.now().toString(36);}
function fmt(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function parseD(s){const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);}
function generateCode(){return Math.random().toString(36).slice(2,8).toUpperCase();}
function load(k,def){try{const v=JSON.parse(localStorage.getItem(k));return v!==null?v:def;}catch{return def;}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v));}
function hashPw(s){let h=0;for(let i=0;i<s.length;i++){h=(h<<5)-h+s.charCodeAt(i);h|=0;}return h.toString(36);}

function getEaster(y){
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
  return new Date(y,month-1,day);
}
function getFrHolidays(year){
  const e=getEaster(year);
  const add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return fmt(x);};
  return new Set([
    `${year}-01-01`,add(e,1),`${year}-05-01`,`${year}-05-08`,
    add(e,39),add(e,50),`${year}-07-14`,`${year}-08-15`,
    `${year}-11-01`,`${year}-11-11`,`${year}-12-25`,
  ]);
}

function autoAssign(team,absMap,dateStr){
  const present=(team.agents||[]).filter(a=>!absMap[`${a.userId||a.id}__${dateStr}`]);
  if(!present.length)return{};
  const res={};let idx=0;
  (team.tournees||[]).forEach(t=>{
    const elig=present.filter(a=>{if(a.prefEnabled&&a.preferred?.length>0)return a.preferred.includes(t.id);return true;});
    const pool=elig.length?elig:present;
    res[t.id]=pool[idx%pool.length].userId||pool[idx%pool.length].id;
    idx++;
  });
  return res;
}

// ── AuthScreen ────────────────────────────────────────────────────────────────
function AuthScreen({onLogin}){
  const[mode,setMode]=useState('login');
  const[name,setName]=useState('');
  const[email,setEmail]=useState('');
  const[pw,setPw]=useState('');
  const[role,setRole]=useState('agent');
  const[err,setErr]=useState('');

  function doLogin(){
    const users=load('lp3_users',[]);
    const u=users.find(x=>x.email===email&&x.password===hashPw(pw));
    if(!u){setErr('Email ou mot de passe incorrect.');return;}
    onLogin(u);
  }
  function doRegister(){
    if(!name.trim()||!email.trim()||!pw.trim()){setErr('Tous les champs sont requis.');return;}
    const users=load('lp3_users',[]);
    if(users.find(u=>u.email===email)){setErr('Cet email est déjà utilisé.');return;}
    const u={id:mkId(),name:name.trim(),email:email.trim(),password:hashPw(pw),role,color:AGENT_COLORS[users.length%AGENT_COLORS.length]};
    const next=[...users,u];save('lp3_users',next);
    onLogin(u);
  }

  return(
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-badge">LP</div>
          <div>
            <div className="auth-title">La Poste RH</div>
            <div className="auth-sub">Gestion des tournées & équipes</div>
          </div>
        </div>
        <div className="auth-tabs">
          {[['login','Connexion'],['register','Créer un compte']].map(([k,l])=>(
            <div key={k} className={`auth-tab${mode===k?' active':''}`} onClick={()=>{setMode(k);setErr('');}}>{l}</div>
          ))}
        </div>
        {mode==='register'&&(
          <div>
            <div className="fl">Nom complet</div>
            <input className="fi" placeholder="Marie Dupont" value={name} onChange={e=>setName(e.target.value)}/>
          </div>
        )}
        <div className="fl">Adresse e-mail</div>
        <input className="fi" type="email" placeholder="exemple@laposte.fr" value={email} onChange={e=>setEmail(e.target.value)}/>
        <div className="fl">Mot de passe</div>
        <input className="fi" type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&(mode==='login'?doLogin():doRegister())}/>
        {mode==='register'&&(
          <div>
            <div className="fl">Rôle</div>
            <div className="role-row">
              {[['manager','👔 Manager'],['agent','📬 Agent']].map(([k,l])=>(
                <div key={k} className={`role-btn${role===k?' active':''}`} onClick={()=>setRole(k)}>{l}</div>
              ))}
            </div>
          </div>
        )}
        {err&&<div className="auth-err">{err}</div>}
        <button className="auth-submit" onClick={mode==='login'?doLogin:doRegister}>
          {mode==='login'?'Se connecter':'Créer le compte'}
        </button>
      </div>
    </div>
  );
}

// ── AbsenceModal ──────────────────────────────────────────────────────────────
function AbsenceModal({agent,date,existing,onSave,onDelete,onClose}){
  const[type,setType]=useState(existing?.type||'CP');
  const[from,setFrom]=useState(existing?.dateFrom||date);
  const[to,setTo]=useState(existing?.dateTo||date);
  const save=()=>{
    const a=from<=to?from:to,b=from<=to?to:from;
    const dates=[];let cur=parseD(a);const end=parseD(b);
    while(cur<=end){dates.push(fmt(cur));cur.setDate(cur.getDate()+1);}
    onSave(agent.userId||agent.id,dates,type,a,b);
  };
  return(
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal">
        <div className="modal-title">Absence · {agent.name}</div>
        <div className="modal-sub">Saisir une absence directement</div>
        <div className="fl">Période</div>
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <input type="date" className="fi" style={{margin:0}} value={from} onChange={e=>setFrom(e.target.value)}/>
          <input type="date" className="fi" style={{margin:0}} value={to} onChange={e=>setTo(e.target.value)}/>
        </div>
        <div className="fl" style={{marginBottom:8}}>Type</div>
        <div className="abs-grid">
          {ABSENCE_TYPES.map(t=>(
            <button key={t.code} className={`abs-btn${type===t.code?' sel':''}`}
              style={{'--c':t.color}} onClick={()=>setType(t.code)}>
              <span style={{color:t.color,display:'block',marginBottom:2,fontSize:13}}>●</span>{t.label}
            </button>
          ))}
        </div>
        <div className="mf">
          {existing&&<button className="btn bd" onClick={()=>onDelete(agent.userId||agent.id,date)}>Supprimer</button>}
          <button className="btn bg" onClick={onClose}>Annuler</button>
          <button className="btn by" onClick={save}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ── LeaveRequestModal ─────────────────────────────────────────────────────────
function LeaveRequestModal({user,teamId,onSave,onClose}){
  const[type,setType]=useState('CP');
  const[from,setFrom]=useState(fmt(new Date()));
  const[to,setTo]=useState(fmt(new Date()));
  const[note,setNote]=useState('');
  const save=()=>{
    const req={id:mkId(),userId:user.id,teamId,dateFrom:from,dateTo:to,type,note:note.trim(),status:'pending',createdAt:new Date().toISOString()};
    onSave(req);
  };
  return(
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal">
        <div className="modal-title">Demande de congé</div>
        <div className="modal-sub">Votre demande sera soumise au manager de l'équipe</div>
        <div className="fl">Période souhaitée</div>
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <input type="date" className="fi" style={{margin:0}} value={from} onChange={e=>setFrom(e.target.value)}/>
          <input type="date" className="fi" style={{margin:0}} value={to} onChange={e=>setTo(e.target.value)}/>
        </div>
        <div className="fl" style={{marginBottom:8}}>Type de congé</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:12}}>
          {LEAVE_TYPES.map(t=>(
            <button key={t.code} className={`abs-btn${type===t.code?' sel':''}`}
              style={{'--c':t.color}} onClick={()=>setType(t.code)}>
              <span style={{color:t.color,display:'block',marginBottom:2,fontSize:11}}>●</span>{t.label}
            </button>
          ))}
        </div>
        <div className="fl">Note (optionnel)</div>
        <textarea className="fi" style={{height:70,resize:'none'}} placeholder="Raison, précisions…"
          value={note} onChange={e=>setNote(e.target.value)}/>
        <div className="mf">
          <button className="btn bg" onClick={onClose}>Annuler</button>
          <button className="btn by" onClick={save}>Envoyer la demande</button>
        </div>
      </div>
    </div>
  );
}

// ── ReviewLeaveModal ──────────────────────────────────────────────────────────
function ReviewLeaveModal({req,agents,onReview,onClose}){
  const[note,setNote]=useState('');
  const agent=agents.find(a=>a.userId===req.userId||a.id===req.userId);
  const lt=LEAVE_MAP[req.type]||{label:req.type,color:'#999'};
  const days=Math.round((parseD(req.dateTo)-parseD(req.dateFrom))/(86400000))+1;
  return(
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal">
        <div className="modal-title">Demande de congé</div>
        <div style={{background:'var(--surface)',borderRadius:12,padding:'12px 14px',marginBottom:14,border:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <div style={{width:32,height:32,borderRadius:9,background:agent?.color||'#999',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12,color:'#000',flexShrink:0}}>
              {(agent?.name||'?').split(' ').map(w=>w[0]).slice(0,2).join('')}
            </div>
            <div>
              <div style={{fontWeight:600,fontSize:13}}>{agent?.name||'Inconnu'}</div>
              <div style={{fontSize:11,color:'var(--text2)'}}>Agent · {new Date(req.createdAt).toLocaleDateString('fr-FR')}</div>
            </div>
            <div style={{marginLeft:'auto',padding:'3px 8px',borderRadius:6,background:`${lt.color}22`,color:lt.color,fontSize:11,fontWeight:700}}>{lt.label}</div>
          </div>
          <div style={{fontSize:12,color:'var(--text2)'}}>
            📅 Du <b style={{color:'var(--text)'}}>{parseD(req.dateFrom).toLocaleDateString('fr-FR')}</b> au <b style={{color:'var(--text)'}}>{parseD(req.dateTo).toLocaleDateString('fr-FR')}</b> · <b style={{color:'var(--yellow)'}}>{days} jour{days>1?'s':''}</b>
          </div>
          {req.note&&<div style={{marginTop:8,fontSize:12,color:'var(--text2)',fontStyle:'italic'}}>"{req.note}"</div>}
        </div>
        <div className="fl">Note au collaborateur (optionnel)</div>
        <textarea className="fi" style={{height:60,resize:'none'}} placeholder="Message pour le collaborateur…"
          value={note} onChange={e=>setNote(e.target.value)}/>
        <div className="mf">
          <button className="btn bg" onClick={onClose}>Fermer</button>
          <button className="btn bd" onClick={()=>onReview(req.id,'refused',note)}>✕ Refuser</button>
          <button className="btn by" onClick={()=>onReview(req.id,'approved',note)}>✓ Approuver</button>
        </div>
      </div>
    </div>
  );
}

// ── CreateTeamModal ───────────────────────────────────────────────────────────
function CreateTeamModal({onSave,onClose}){
  const[name,setName]=useState('');
  const[color,setColor]=useState(TEAM_COLORS[0]);
  const[nb,setNb]=useState(8);
  const[nt,setNt]=useState(20);
  const[target,setTarget]=useState(6);
  const save=()=>{
    if(!name.trim())return;
    const agents=Array.from({length:nb},(_,i)=>({id:mkId(),userId:mkId(),name:`Agent ${i+1}`,color:AGENT_COLORS[i%AGENT_COLORS.length],prefEnabled:false,preferred:[]}));
    const tournees=Array.from({length:nt},(_,i)=>({id:mkId(),name:`Tournée ${String(i+1).padStart(2,'0')}`,color:T_COLORS[i%T_COLORS.length],num:i+1,categoryId:null}));
    const categories=[{id:mkId(),name:'Remises',color:CAT_COLORS[0]},{id:mkId(),name:'Collectes',color:CAT_COLORS[1]}];
    onSave({id:mkId(),name:name.trim(),color,code:generateCode(),managerIds:[],agentIds:[],targetPresence:target,agents,tournees,categories});
  };
  return(
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal">
        <div className="modal-title">Créer une équipe</div>
        <div className="modal-sub">Configurez votre nouvelle équipe</div>
        <div className="fl">Nom de l'équipe</div>
        <input className="fi" placeholder="Ex: Équipe Nord, CDI Paris 12…" value={name} onChange={e=>setName(e.target.value)}/>
        <div className="fl">Couleur</div>
        <div style={{display:'flex',gap:6,marginBottom:12}}>
          {TEAM_COLORS.map(c=>(
            <div key={c} style={{width:24,height:24,borderRadius:'50%',background:c,cursor:'pointer',border:color===c?'2px solid #fff':'2px solid transparent',transform:color===c?'scale(1.2)':'scale(1)',transition:'.15s'}} onClick={()=>setColor(c)}/>
          ))}
        </div>
        <div style={{display:'flex',gap:10}}>
          <div style={{flex:1}}><div className="fl">Agents</div><input className="fi" type="number" min="1" max="80" value={nb} onChange={e=>setNb(+e.target.value)}/></div>
          <div style={{flex:1}}><div className="fl">Tournées</div><input className="fi" type="number" min="1" max="100" value={nt} onChange={e=>setNt(+e.target.value)}/></div>
          <div style={{flex:1}}><div className="fl">Objectif présents</div><input className="fi" type="number" min="1" max={nb} value={target} onChange={e=>setTarget(+e.target.value)}/></div>
        </div>
        <div className="mf">
          <button className="btn bg" onClick={onClose}>Annuler</button>
          <button className="btn by" disabled={!name.trim()} onClick={save}>Créer</button>
        </div>
      </div>
    </div>
  );
}

// ── JoinTeamModal ─────────────────────────────────────────────────────────────
function JoinTeamModal({user,teams,onJoin,onClose}){
  const[code,setCode]=useState('');
  const[err,setErr]=useState('');
  const join=()=>{
    const t=teams.find(x=>x.code===code.trim().toUpperCase());
    if(!t){setErr('Code invalide. Vérifiez auprès de votre manager.');return;}
    if(t.agentIds?.includes(user.id)||t.managerIds?.includes(user.id)){setErr('Vous êtes déjà membre de cette équipe.');return;}
    onJoin(t.id);
  };
  return(
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal">
        <div className="modal-title">Rejoindre une équipe</div>
        <div className="modal-sub">Entrez le code fourni par votre manager</div>
        <div className="fl">Code d'équipe (6 caractères)</div>
        <input className="fi" placeholder="Ex: A3B7F2" value={code}
          onChange={e=>setCode(e.target.value.toUpperCase())}
          onKeyDown={e=>e.key==='Enter'&&join()}
          style={{fontFamily:'Space Mono',fontSize:18,textAlign:'center',letterSpacing:4}}/>
        {err&&<div style={{color:'#f87171',fontSize:12,marginBottom:8}}>⚠ {err}</div>}
        <div className="mf">
          <button className="btn bg" onClick={onClose}>Annuler</button>
          <button className="btn by" onClick={join}>Rejoindre</button>
        </div>
      </div>
    </div>
  );
}

// ── CategoryModal ─────────────────────────────────────────────────────────────
function CategoryModal({category,onSave,onClose}){
  const[name,setName]=useState(category?.name||'');
  const[color,setColor]=useState(category?.color||CAT_COLORS[0]);
  return(
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal">
        <div className="modal-title">{category?'Modifier la catégorie':'Nouvelle catégorie'}</div>
        <div className="fl">Nom</div>
        <input className="fi" placeholder="Ex: Remises, Collectes…" value={name} onChange={e=>setName(e.target.value)}/>
        <div className="fl">Couleur</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
          {CAT_COLORS.map(c=>(
            <div key={c} style={{width:24,height:24,borderRadius:'50%',background:c,cursor:'pointer',border:color===c?'2px solid #fff':'2px solid transparent',transform:color===c?'scale(1.2)':'scale(1)',transition:'.15s'}} onClick={()=>setColor(c)}/>
          ))}
        </div>
        <div className="mf">
          <button className="btn bg" onClick={onClose}>Annuler</button>
          <button className="btn by" disabled={!name.trim()} onClick={()=>onSave({id:category?.id||mkId(),name:name.trim(),color})}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ── TeamSettingsModal ─────────────────────────────────────────────────────────
function TeamSettingsModal({team,onSave,onClose}){
  const[name,setName]=useState(team.name);
  const[target,setTarget]=useState(team.targetPresence||5);
  const[color,setColor]=useState(team.color||TEAM_COLORS[0]);
  const[copied,setCopied]=useState(false);
  function copyCode(){navigator.clipboard?.writeText(team.code).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});}
  return(
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal">
        <div className="modal-title">Paramètres de l'équipe</div>
        <div className="fl">Nom de l'équipe</div>
        <input className="fi" value={name} onChange={e=>setName(e.target.value)}/>
        <div className="fl">Couleur</div>
        <div style={{display:'flex',gap:6,marginBottom:12}}>
          {TEAM_COLORS.map(c=>(
            <div key={c} style={{width:24,height:24,borderRadius:'50%',background:c,cursor:'pointer',border:color===c?'2px solid #fff':'2px solid transparent',transform:color===c?'scale(1.2)':'scale(1)',transition:'.15s'}} onClick={()=>setColor(c)}/>
          ))}
        </div>
        <div className="fl">Objectif présents / jour</div>
        <input className="fi" type="number" min="1" max="99" value={target} onChange={e=>setTarget(+e.target.value)}/>
        <div className="fl">Code d'accès équipe</div>
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12}}>
          <div style={{flex:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 14px',fontFamily:'Space Mono',fontSize:18,letterSpacing:4,fontWeight:700,color:'var(--yellow)'}}>{team.code}</div>
          <button className="btn bn" onClick={copyCode}>{copied?'✓ Copié':'Copier'}</button>
        </div>
        <div style={{fontSize:11,color:'var(--text2)',marginBottom:12}}>Partagez ce code avec vos agents pour qu'ils rejoignent l'équipe.</div>
        <div className="mf">
          <button className="btn bg" onClick={onClose}>Annuler</button>
          <button className="btn by" onClick={()=>onSave({name:name.trim(),color,targetPresence:target})}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ── ImportModal ───────────────────────────────────────────────────────────────
function ImportModal({team,onApply,onClose}){
  const[dragging,setDragging]=useState(false);
  const[parsed,setParsed]=useState(null);
  const[err,setErr]=useState('');
  const fileRef=useRef();
  function parseXlsx(ab){
    try{
      const wb=XLSX.read(ab,{type:'array'});
      const name=wb.SheetNames[0];
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:''});
      const agents=[...new Set(rows.slice(1).map(r=>String(r[0]||'').trim()).filter(v=>v&&v.length>2&&v.length<40&&!/^\d/.test(v)))].slice(0,80);
      const tournees=[...new Set(rows[0]?.slice(1).map(c=>String(c||'').trim()).filter(v=>v&&v.length>0&&v.length<30)||[])].slice(0,100);
      setParsed({agents,tournees,sheet:name});
      setErr('');
    }catch(e){setErr('Erreur: '+e.message);}
  }
  function handleFile(f){const r=new FileReader();r.onload=e=>parseXlsx(e.target.result);r.readAsArrayBuffer(f);}
  function apply(){
    const agents=(parsed?.agents||[]).map((name,i)=>({id:mkId(),userId:mkId(),name,color:AGENT_COLORS[i%AGENT_COLORS.length],prefEnabled:false,preferred:[]}));
    const tournees=(parsed?.tournees||[]).map((name,i)=>({id:mkId(),name,color:T_COLORS[i%T_COLORS.length],num:i+1,categoryId:null}));
    onApply({agents,tournees});
  }
  return(
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal" style={{minWidth:460}}>
        <div className="modal-title">Import Excel</div>
        <div className="modal-sub">Glissez votre fichier — agents (col A) et tournées (ligne 1) détectés automatiquement</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}}
          onChange={e=>{if(e.target.files[0])handleFile(e.target.files[0]);}}/>
        <div className={`drop-zone${dragging?' over':''}`}
          onDragOver={e=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);if(e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0]);}}
          onClick={()=>fileRef.current.click()}>
          <div style={{fontSize:32,marginBottom:6}}>📊</div>
          <div style={{fontWeight:600}}>Glissez votre Excel ici</div>
          <div style={{fontSize:12,color:'var(--text2)',marginTop:4}}>ou cliquez · .xlsx .xls .csv</div>
        </div>
        {err&&<div style={{color:'#f87171',fontSize:12,marginTop:8}}>⚠ {err}</div>}
        {parsed&&!err&&(
          <div style={{display:'flex',gap:12,marginTop:12}}>
            <div style={{flex:1,padding:'10px 14px',borderRadius:10,background:'var(--surface)',border:'1px solid var(--border)'}}>
              <div style={{fontSize:22,fontWeight:800,color:'var(--yellow)'}}>{parsed.agents.length}</div>
              <div style={{fontSize:11,color:'var(--text2)'}}>agents détectés</div>
              <div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>{parsed.agents.slice(0,3).join(', ')}{parsed.agents.length>3?'…':''}</div>
            </div>
            <div style={{flex:1,padding:'10px 14px',borderRadius:10,background:'var(--surface)',border:'1px solid var(--border)'}}>
              <div style={{fontSize:22,fontWeight:800,color:'var(--neon)'}}>{parsed.tournees.length}</div>
              <div style={{fontSize:11,color:'var(--text2)'}}>tournées détectées</div>
              <div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>{parsed.tournees.slice(0,3).join(', ')}{parsed.tournees.length>3?'…':''}</div>
            </div>
          </div>
        )}
        <div className="mf">
          <button className="btn bg" onClick={onClose}>Annuler</button>
          {parsed&&!err&&<button className="btn by" onClick={apply}>Appliquer</button>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window,{
  ABSENCE_TYPES,LEAVE_TYPES,ABS_MAP,LEAVE_MAP,FR_MONTHS,FR_DOW,TEAM_COLORS,AGENT_COLORS,CAT_COLORS,T_COLORS,THEMES,
  mkId,fmt,parseD,generateCode,load,save,hashPw,getFrHolidays,autoAssign,
  AuthScreen,AbsenceModal,LeaveRequestModal,ReviewLeaveModal,
  CreateTeamModal,JoinTeamModal,CategoryModal,TeamSettingsModal,ImportModal,
});
