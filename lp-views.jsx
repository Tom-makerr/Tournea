// ─── La Poste RH v3 · Views ────────────────────────────────────────────────────
const {useState:uS,useEffect:uE,useMemo:uM,useRef:uR,useCallback:uC}=React;

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({user,teams,curTeamId,setCurTeamId,tab,setTab,isManager,pendingCount,onCreateTeam,onJoinTeam,onLogout,theme,setTheme}){
  const myTeams=teams.filter(t=>t.managerIds?.includes(user.id)||t.agentIds?.includes(user.id));
  const navItems=[
    {k:'planning',icon:'📅',label:'Planning'},
    {k:'leaves',icon:'🌴',label:'Congés',badge:isManager?pendingCount:0},
    {k:'agents',icon:'👤',label:'Agents',managerOnly:true},
    {k:'tournees',icon:'🗺',label:'Tournées',managerOnly:true},
    {k:'dashboard',icon:'📊',label:'Tableau de bord',managerOnly:true},
    {k:'settings',icon:'⚙️',label:'Paramètres'},
  ];
  return(
    <div className="sidebar">
      <div className="sb-logo">
        <div className="logo-badge">LP</div>
        <div>
          <div style={{fontSize:13,fontWeight:700,lineHeight:1.2}}>La Poste RH</div>
          <div style={{fontSize:10,color:'var(--text2)',marginTop:1}}>Gestion des tournées</div>
        </div>
      </div>

      {/* Teams */}
      <div className="sb-section">
        <div className="sb-section-label">Mes équipes</div>
        {myTeams.map(t=>(
          <div key={t.id} className={`sb-team${t.id===curTeamId?' active':''}`} onClick={()=>setCurTeamId(t.id)}>
            <div style={{width:8,height:8,borderRadius:'50%',background:t.color,flexShrink:0}}/>
            <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13}}>{t.name}</span>
            <span style={{fontSize:10,color:'var(--text2)',fontFamily:'Space Mono'}}>{t.agents?.length||0}</span>
          </div>
        ))}
        {isManager&&<div className="sb-action" onClick={onCreateTeam}>＋ Nouvelle équipe</div>}
        {!isManager&&<div className="sb-action" onClick={onJoinTeam}>🔑 Rejoindre</div>}
      </div>

      {/* Nav */}
      <div className="sb-nav">
        {navItems.filter(n=>!n.managerOnly||isManager).map(n=>(
          <div key={n.k} className={`sb-nav-item${tab===n.k?' active':''}`} onClick={()=>setTab(n.k)}>
            <span style={{fontSize:15,width:20,textAlign:'center'}}>{n.icon}</span>
            <span style={{flex:1}}>{n.label}</span>
            {n.badge>0&&<span style={{background:'#ef4444',color:'#fff',borderRadius:10,padding:'1px 6px',fontSize:10,fontWeight:700}}>{n.badge}</span>}
          </div>
        ))}
      </div>

      {/* Theme */}
      <div className="sb-section" style={{marginTop:'auto',borderTop:'1px solid var(--border)'}}>
        <div className="sb-section-label">Thème</div>
        <div style={{display:'flex',gap:4,padding:'2px 4px'}}>
          {THEMES.map(t=>(
            <div key={t.id}
              style={{flex:1,padding:'6px 4px',borderRadius:8,cursor:'pointer',textAlign:'center',fontSize:11,fontWeight:500,transition:'.15s',
                background:theme===t.id?'var(--yellow)':'var(--surface)',
                color:theme===t.id?'#000':'var(--text2)',
                border:'1px solid '+(theme===t.id?'transparent':'var(--border)')}}
              onClick={()=>setTheme(t.id)}>
              <div style={{fontSize:16}}>{t.icon}</div>
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {/* User */}
      <div className="sb-user" onClick={onLogout} title="Déconnexion">
        <div style={{width:30,height:30,borderRadius:9,background:user.color||'#FFD100',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:11,color:'#000',flexShrink:0}}>
          {user.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.name}</div>
          <div style={{fontSize:10,color:'var(--text2)'}}>{isManager?'Manager':'Agent'} · Déconnexion</div>
        </div>
      </div>
    </div>
  );
}

// ── PlanningView ──────────────────────────────────────────────────────────────
function PlanningView({team,user,isManager,year,month,setYear,setMonth,selDay,setSelDay,absMap,assignments,setAssignments,onCellClick,holidays}){
  const daysInMonth=new Date(year,month+1,0).getDate();
  const todayStr=fmt(new Date());
  const dayKey=`${team.id}__${selDay}`;
  const dayAssign=assignments[dayKey]||{};
  const selDateObj=parseD(selDay);
  const selLabel=selDateObj.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});

  const visibleAgents=isManager?team.agents:(team.agents||[]).filter(a=>a.userId===user.id||a.id===user.id);
  const allPresents=(team.agents||[]).filter(a=>!absMap[`${a.userId||a.id}__${selDay}`]);
  const dayPresents=allPresents;
  const dayAbsents=(team.agents||[]).filter(a=>!!absMap[`${a.userId||a.id}__${selDay}`]);
  const coveredCount=Object.values(dayAssign).filter(Boolean).length;
  const target=team.targetPresence||Math.ceil((team.agents||[]).length*0.8);
  const presRatio=team.agents?.length?dayPresents.length/team.agents.length:1;
  const presColor=dayPresents.length>=target?'#22c55e':dayPresents.length>=target*0.7?'#f97316':'#ef4444';

  function doAutoAssign(){
    const res=autoAssign(team,absMap,selDay);
    setAssignments(prev=>({...prev,[dayKey]:res}));
  }
  function setAssign(tourneeId,agentId){
    setAssignments(prev=>({...prev,[dayKey]:{...(prev[dayKey]||{}),[tourneeId]:agentId||null}}));
  }

  const months_nav=()=>(
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <button className="mn-btn" onClick={()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}}>‹</button>
      <span style={{fontSize:13,fontWeight:600,minWidth:120,textAlign:'center'}}>{FR_MONTHS[month]} {year}</span>
      <button className="mn-btn" onClick={()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}}>›</button>
    </div>
  );

  return(
    <div style={{display:'flex',flex:1,overflow:'hidden',gap:0}}>
      {/* Calendar */}
      <div style={{flex:1,display:'flex',flexDirection:'column',padding:'12px 0 12px 12px',overflow:'hidden'}}>
        <div className="card" style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <div className="card-hdr">
            <span className="card-title">Planning mensuel</span>
            {months_nav()}
            <span style={{marginLeft:8,fontSize:11,color:'var(--text2)'}}>{visibleAgents.length} agents</span>
          </div>
          <div style={{flex:1,overflow:'auto'}}>
            <div style={{display:'grid',gridTemplateColumns:`150px repeat(${daysInMonth},minmax(26px,1fr))`,minWidth:'max-content'}}>
              <div className="ch" style={{textAlign:'left',paddingLeft:10}}>Agent</div>
              {Array.from({length:daysInMonth},(_,i)=>{
                const d=i+1,dow=new Date(year,month,d).getDay(),isWe=dow===0||dow===6;
                const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const isHol=holidays.has(ds);
                return(
                  <div key={d} className={`ch day-hdr${ds===todayStr?' today':''}${isWe||isHol?' we':''}`}
                    style={isHol?{color:'#f97316',opacity:1}:{}}>
                    <div>{FR_DOW[(dow+6)%7]}</div>
                    <div style={{fontFamily:'Space Mono',fontSize:8,marginTop:1}}>{d}</div>
                    {isHol&&<div style={{fontSize:7,color:'#f97316'}}>🎉</div>}
                  </div>
                );
              })}
              {visibleAgents.map(agent=>{
                const aid=agent.userId||agent.id;
                return(
                  <React.Fragment key={aid}>
                    <div className="ca-name">
                      <div style={{width:7,height:7,borderRadius:'50%',background:agent.color,flexShrink:0}}/>
                      <span style={{overflow:'hidden',textOverflow:'ellipsis',fontSize:11}}>{agent.name}</span>
                    </div>
                    {Array.from({length:daysInMonth},(_,i)=>{
                      const d=i+1,dow=new Date(year,month,d).getDay(),isWe=dow===0||dow===6;
                      const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                      const abs=absMap[`${aid}__${ds}`];
                      const at=abs?ABS_MAP[abs.type]:null;
                      const isHol=holidays.has(ds);
                      return(
                        <div key={d}
                          className={`ca-cell${isWe||isHol?' we':''}${ds===selDay?' sel':''}${ds===todayStr?' tod':''}`}
                          onClick={()=>{setSelDay(ds);if(!isWe&&!isHol&&isManager)onCellClick(agent,ds);else if(!isWe&&!isHol)setSelDay(ds);}}
                          title={abs?`${agent.name} — ${at?.label}`:isHol?'Jour férié':isManager?'Cliquer pour marquer absent':''}>
                          {abs&&<div className="abs-chip" style={{background:`${at?.color}22`,color:at?.color}}>{abs.type}</div>}
                          {isHol&&!abs&&<div style={{fontSize:8,color:'#f97316',opacity:.6}}>F</div>}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          <div style={{padding:'6px 12px',borderTop:'1px solid var(--border)',display:'flex',flexWrap:'wrap',gap:5'}}>
            {ABSENCE_TYPES.map(t=>(
              <div key={t.code} style={{display:'flex',alignItems:'center',gap:3,fontSize:10,color:'var(--text2)'}}>
                <div style={{width:11,height:11,borderRadius:3,background:`${t.color}30`,border:`1px solid ${t.color}`}}/>
                {t.code}
              </div>
            ))}
            <div style={{display:'flex',alignItems:'center',gap:3,fontSize:10,color:'#f97316'}}>
              <div style={{width:11,height:11,borderRadius:3,background:'rgba(249,115,22,0.15)',border:'1px solid #f97316'}}/>🎉 Férié
            </div>
          </div>
        </div>
      </div>

      {/* Day panel */}
      <div style={{width:310,flexShrink:0,padding:12,display:'flex',flexDirection:'column',gap:10,overflow:'hidden'}}>
        {/* Presence gauge */}
        <div className="card">
          <div className="card-hdr">
            <span className="card-title">{selLabel}</span>
          </div>
          <div style={{padding:'10px 14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:12}}>
              <span><b style={{color:presColor,fontSize:18}}>{dayPresents.length}</b> <span style={{color:'var(--text2)'}}>présents</span></span>
              <span style={{color:'var(--text2)',fontSize:11}}>Objectif : <b style={{color:'var(--text)'}}>{target}</b></span>
              <span><b style={{color:'#ef4444'}}>{dayAbsents.length}</b> <span style={{color:'var(--text2)'}}>absents</span></span>
            </div>
            <div style={{height:7,borderRadius:4,background:'var(--border)',overflow:'hidden',position:'relative'}}>
              <div style={{height:'100%',borderRadius:4,background:presColor,width:`${Math.min(100,(dayPresents.length/(team.agents?.length||1))*100)}%`,transition:'width .4s'}}/>
              <div style={{position:'absolute',top:0,bottom:0,left:`${Math.min(100,(target/(team.agents?.length||1))*100)}%`,width:2,background:'rgba(255,255,255,0.6)',borderRadius:1}}/>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:3,marginTop:8}}>
              {(team.agents||[]).map(a=>{
                const isAbs=!!absMap[`${a.userId||a.id}__${selDay}`];
                return(
                  <span key={a.userId||a.id} style={{padding:'2px 6px',borderRadius:5,fontSize:10,fontWeight:500,
                    background:isAbs?'rgba(255,255,255,0.04)':`${a.color}18`,
                    border:`1px solid ${isAbs?'rgba(255,255,255,0.06)':`${a.color}40`}`,
                    color:isAbs?'var(--text3)':a.color,
                    textDecoration:isAbs?'line-through':'none',opacity:isAbs?.45:1}}>
                    {a.name.split(' ').pop()}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tournées */}
        <div className="card" style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <div className="card-hdr">
            <span className="card-title">Tournées</span>
            <span style={{fontSize:10,color:'var(--text2)',marginLeft:4}}>{coveredCount}/{team.tournees?.length||0}</span>
            {isManager&&<button className="btn-sm bn" style={{marginLeft:'auto'}} onClick={doAutoAssign}>⚡ Auto</button>}
          </div>
          {/* Category filter */}
          {team.categories?.length>0&&(
            <div style={{padding:'6px 8px',borderBottom:'1px solid var(--border)',display:'flex',gap:4,flexWrap:'wrap'}}>
              {team.categories.map(c=>(
                <span key={c.id} style={{padding:'2px 7px',borderRadius:5,fontSize:10,fontWeight:600,background:`${c.color}22`,color:c.color,border:`1px solid ${c.color}55`}}>{c.name}</span>
              ))}
            </div>
          )}
          <div style={{flex:1,overflow:'auto',padding:'6px 8px',display:'flex',flexDirection:'column',gap:3}}>
            {(team.tournees||[]).map(t=>{
              const cat=team.categories?.find(c=>c.id===t.categoryId);
              const aId=dayAssign[t.id];
              const ag=(team.agents||[]).find(a=>(a.userId||a.id)===aId);
              return(
                <div key={t.id} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 8px',borderRadius:9,
                  background:'var(--surface)',border:'1px solid var(--border)',transition:'.15s'}}>
                  <div style={{width:26,height:20,borderRadius:4,background:t.color||'#1e3a5f',display:'flex',alignItems:'center',justifyContent:'center',
                    fontFamily:'Space Mono',fontSize:9,fontWeight:700,color:'var(--text)',border:'1px solid rgba(255,255,255,0.1)',flexShrink:0}}>
                    {String(t.num||'').toString().padStart(2,'0')||'—'}
                  </div>
                  {cat&&<div style={{width:4,height:18,borderRadius:2,background:cat.color,flexShrink:0}}/>}
                  <span style={{flex:1,fontSize:11,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.name}</span>
                  {isManager?(
                    <select style={{background:'rgba(0,0,0,0.3)',border:'1px solid '+(ag?`${ag.color}55`:'var(--border)'),color:ag?ag.color:'var(--text2)',
                      fontFamily:'inherit',fontSize:10,padding:'2px 4px',borderRadius:5,cursor:'pointer',maxWidth:88}}
                      value={aId||''} onChange={e=>setAssign(t.id,e.target.value||null)}>
                      <option value="">—</option>
                      {dayPresents.map(a=><option key={a.userId||a.id} value={a.userId||a.id}>{a.name}</option>)}
                    </select>
                  ):(
                    ag?<span style={{fontSize:10,color:ag.color,fontWeight:500}}>{ag.name.split(' ').pop()}</span>
                      :<span style={{fontSize:10,color:'var(--text3)'}}>—</span>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{padding:'8px 10px',borderTop:'1px solid var(--border)'}}>
            {coveredCount===(team.tournees?.length||0)
              ?<div style={{padding:'5px 10px',borderRadius:8,background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.25)',color:'#4ade80',fontSize:11,fontWeight:600}}>✓ Toutes les tournées couvertes</div>
              :<div style={{padding:'5px 10px',borderRadius:8,background:'rgba(251,146,60,0.12)',border:'1px solid rgba(251,146,60,0.25)',color:'#fb923c',fontSize:11,fontWeight:600}}>⚠ {(team.tournees?.length||0)-coveredCount} non assignées</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LeaveView ─────────────────────────────────────────────────────────────────
function LeaveView({user,team,isManager,leaveRequests,onRequestLeave,onReviewLeave,absMap}){
  const[reviewReq,setReviewReq]=uS(null);
  const[showNewReq,setShowNewReq]=uS(false);
  const[filter,setFilter]=uS('pending');

  const teamReqs=leaveRequests.filter(r=>r.teamId===team.id);
  const myReqs=teamReqs.filter(r=>r.userId===user.id);
  const visibleReqs=isManager?teamReqs.filter(r=>filter==='all'||r.status===filter):myReqs;

  function statusStyle(s){
    if(s==='approved')return{bg:'rgba(34,197,94,.12)',border:'rgba(34,197,94,.25)',color:'#4ade80'};
    if(s==='refused')return{bg:'rgba(239,68,68,.12)',border:'rgba(239,68,68,.25)',color:'#f87171'};
    return{bg:'rgba(251,191,36,.12)',border:'rgba(251,191,36,.25)',color:'#fbbf24'};
  }
  function statusLabel(s){return s==='approved'?'✓ Approuvé':s==='refused'?'✕ Refusé':'⏳ En attente';}

  return(
    <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
      <div className="card-hdr" style={{borderRadius:0,borderTop:'none',borderLeft:'none',borderRight:'none',padding:'12px 16px'}}>
        <span className="card-title">Congés & absences</span>
        {isManager&&(
          <div style={{display:'flex',gap:4,marginLeft:12}}>
            {['pending','approved','refused','all'].map(s=>(
              <button key={s} className="btn-sm" style={{background:filter===s?'var(--yellow)':'var(--surface)',color:filter===s?'#000':'var(--text2)',border:'1px solid var(--border)',borderRadius:7,padding:'4px 10px',cursor:'pointer',fontSize:11}}
                onClick={()=>setFilter(s)}>
                {s==='pending'?`⏳ Attente (${teamReqs.filter(r=>r.status==='pending').length})`:s==='approved'?'✓ Approuvés':s==='refused'?'✕ Refusés':'Tous'}
              </button>
            ))}
          </div>
        )}
        {!isManager&&<button className="btn by" style={{marginLeft:'auto',fontSize:12,padding:'6px 14px'}} onClick={()=>setShowNewReq(true)}>+ Demande de congé</button>}
      </div>
      <div style={{flex:1,overflow:'auto',padding:16}}>
        {visibleReqs.length===0&&(
          <div style={{textAlign:'center',padding:40,color:'var(--text2)',fontSize:14}}>
            {isManager?'Aucune demande à afficher':'Aucune demande de congé'}
          </div>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:8,maxWidth:640}}>
          {visibleReqs.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(req=>{
            const agent=(team.agents||[]).find(a=>a.userId===req.userId||a.id===req.userId);
            const lt=LEAVE_MAP[req.type]||{label:req.type,color:'#999'};
            const ss=statusStyle(req.status);
            const days=Math.round((parseD(req.dateTo)-parseD(req.dateFrom))/86400000)+1;
            return(
              <div key={req.id} className="card"
                style={{padding:'14px 16px',cursor:isManager&&req.status==='pending'?'pointer':'default',transition:'.2s'}}
                onClick={()=>isManager&&req.status==='pending'&&setReviewReq(req)}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <div style={{width:36,height:36,borderRadius:10,background:agent?.color||'#999',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12,color:'#000',flexShrink:0}}>
                    {(agent?.name||'?').split(' ').map(w=>w[0]).slice(0,2).join('')}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      <span style={{fontWeight:600,fontSize:13}}>{agent?.name||'Agent'}</span>
                      <span style={{padding:'2px 7px',borderRadius:5,background:`${lt.color}22`,color:lt.color,fontSize:10,fontWeight:700}}>{lt.label}</span>
                      <span style={{padding:'2px 7px',borderRadius:5,background:ss.bg,border:`1px solid ${ss.border}`,color:ss.color,fontSize:10,fontWeight:700,marginLeft:'auto'}}>{statusLabel(req.status)}</span>
                    </div>
                    <div style={{fontSize:12,color:'var(--text2)',marginTop:4}}>
                      📅 {parseD(req.dateFrom).toLocaleDateString('fr-FR')} → {parseD(req.dateTo).toLocaleDateString('fr-FR')} · <b style={{color:'var(--yellow)'}}>{days}j</b>
                    </div>
                    {req.note&&<div style={{fontSize:11,color:'var(--text2)',marginTop:4,fontStyle:'italic'}}>"{req.note}"</div>}
                    {req.managerNote&&<div style={{fontSize:11,color:'var(--neon)',marginTop:4}}>Manager : "{req.managerNote}"</div>}
                  </div>
                  {isManager&&req.status==='pending'&&<span style={{color:'var(--text2)',fontSize:18}}>›</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {reviewReq&&isManager&&(
        <ReviewLeaveModal req={reviewReq} agents={team.agents||[]}
          onReview={(id,status,note)=>{onReviewLeave(id,status,note);setReviewReq(null);}}
          onClose={()=>setReviewReq(null)}/>
      )}
      {showNewReq&&(
        <LeaveRequestModal user={user} teamId={team.id}
          onSave={req=>{onRequestLeave(req);setShowNewReq(false);}}
          onClose={()=>setShowNewReq(false)}/>
      )}
    </div>
  );
}

// ── AgentsView ────────────────────────────────────────────────────────────────
function AgentsView({team,updateTeam}){
  function updateAgent(id,fn){updateTeam(t=>({...t,agents:t.agents.map(a=>(a.userId||a.id)===id?fn(a):a)}));}
  function addAgent(){
    const n=team.agents.length;
    updateTeam(t=>({...t,agents:[...t.agents,{id:mkId(),userId:mkId(),name:`Agent ${n+1}`,color:AGENT_COLORS[n%AGENT_COLORS.length],prefEnabled:false,preferred:[]}]}));
  }
  function removeAgent(id){updateTeam(t=>({...t,agents:t.agents.filter(a=>(a.userId||a.id)!==id)}));}
  return(
    <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
      <div className="card-hdr" style={{borderRadius:0,borderTop:'none',borderLeft:'none',borderRight:'none',padding:'12px 16px'}}>
        <span className="card-title">Agents</span>
        <span style={{fontSize:11,color:'var(--text2)',marginLeft:6}}>{team.agents?.length||0}</span>
        <button className="btn by" style={{marginLeft:'auto',fontSize:12,padding:'6px 14px'}} onClick={addAgent}>+ Ajouter</button>
      </div>
      <div style={{flex:1,overflow:'auto',padding:16}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:10}}>
          {(team.agents||[]).map(agent=>{
            const aid=agent.userId||agent.id;
            return(
              <div key={aid} className="card" style={{padding:14}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <div style={{width:38,height:38,borderRadius:11,background:agent.color,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,color:'#000',flexShrink:0}}>
                    {agent.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <input style={{background:'transparent',border:'none',color:'var(--text)',fontFamily:'inherit',fontSize:14,fontWeight:600,width:'100%',borderBottom:'1px solid transparent',transition:'.2s',padding:0}}
                      value={agent.name} onChange={e=>updateAgent(aid,a=>({...a,name:e.target.value}))}
                      onFocus={e=>e.target.style.borderBottomColor='var(--yellow)'}
                      onBlur={e=>e.target.style.borderBottomColor='transparent'}/>
                    <div style={{fontSize:10,color:'var(--text2)'}}>Agent de distribution</div>
                  </div>
                  <button onClick={()=>removeAgent(aid)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:18,lineHeight:1}}>×</button>
                </div>
                <div style={{height:1,background:'var(--border)',margin:'8px 0'}}/>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <span style={{fontSize:11,color:'var(--text2)',flex:1}}>Tournées préférentielles</span>
                  <div className={`toggle${agent.prefEnabled?' on':''}`} onClick={()=>updateAgent(aid,a=>({...a,prefEnabled:!a.prefEnabled}))}/>
                  {agent.prefEnabled&&<span style={{fontSize:9,color:'var(--neon)',fontWeight:700}}>ON</span>}
                </div>
                {agent.prefEnabled&&(
                  <div style={{display:'flex',flexWrap:'wrap',gap:3,maxHeight:72,overflowY:'auto'}}>
                    {(team.tournees||[]).map(t=>{
                      const on=agent.preferred?.includes(t.id);
                      return(
                        <div key={t.id}
                          style={{padding:'2px 6px',borderRadius:4,fontSize:9,fontWeight:700,cursor:'pointer',
                            fontFamily:'Space Mono',border:`1px solid ${on?'var(--neon)':'rgba(255,255,255,0.08)'}`,
                            background:on?'var(--neon)':'rgba(255,255,255,0.04)',color:on?'#000':'var(--text2)',transition:'.12s'}}
                          onClick={()=>updateAgent(aid,a=>({...a,preferred:on?a.preferred.filter(x=>x!==t.id):[...(a.preferred||[]),t.id]}))}>
                          T{String(t.num||'').toString().padStart(2,'0')}
                        </div>
                      );
                    })}
                  </div>
                )}
                {!agent.prefEnabled&&<div style={{fontSize:10,color:'var(--text3)'}}>Toutes les tournées disponibles</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── TourneesView ──────────────────────────────────────────────────────────────
function TourneesView({team,updateTeam}){
  const[catModal,setCatModal]=uS(null);// null | {cat|null}
  const[filterCat,setFilterCat]=uS(null);

  function updateTournee(id,fn){updateTeam(t=>({...t,tournees:t.tournees.map(tt=>tt.id===id?fn(tt):tt)}));}
  function addTournee(){updateTeam(t=>{const n=t.tournees.length+1;return{...t,tournees:[...t.tournees,{id:mkId(),name:`Tournée ${String(n).padStart(2,'0')}`,color:T_COLORS[n%T_COLORS.length],num:n,categoryId:null}]};});}
  function removeTournee(id){updateTeam(t=>({...t,tournees:t.tournees.filter(tt=>tt.id!==id)}));}
  function saveCategory(cat){
    updateTeam(t=>{
      const cats=t.categories||[];
      const exists=cats.find(c=>c.id===cat.id);
      return{...t,categories:exists?cats.map(c=>c.id===cat.id?cat:c):[...cats,cat]};
    });
    setCatModal(null);
  }
  function removeCat(id){updateTeam(t=>({...t,categories:(t.categories||[]).filter(c=>c.id!==id),tournees:t.tournees.map(tt=>tt.categoryId===id?{...tt,categoryId:null}:tt)}));}

  const visible=filterCat?team.tournees.filter(t=>t.categoryId===filterCat):team.tournees;

  return(
    <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
      {/* Categories bar */}
      <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',background:'var(--surface-hover)'}}>
        <span style={{fontSize:11,fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:.6}}>Catégories</span>
        <div style={{cursor:filterCat?'pointer':'default',padding:'3px 9px',borderRadius:7,fontSize:11,fontWeight:600,background:!filterCat?'var(--yellow)':'var(--surface)',color:!filterCat?'#000':'var(--text2)',border:'1px solid var(--border)',transition:'.15s'}} onClick={()=>setFilterCat(null)}>Toutes</div>
        {(team.categories||[]).map(c=>(
          <div key={c.id} style={{display:'flex',alignItems:'center',gap:0,borderRadius:7,overflow:'hidden',border:`1px solid ${c.color}55`}}>
            <div style={{cursor:'pointer',padding:'3px 9px',fontSize:11,fontWeight:600,background:filterCat===c.id?`${c.color}33`:'var(--surface)',color:c.color,transition:'.15s'}}
              onClick={()=>setFilterCat(filterCat===c.id?null:c.id)}>{c.name}</div>
            <div style={{padding:'3px 6px',cursor:'pointer',color:'var(--text3)',fontSize:13,borderLeft:`1px solid ${c.color}33`}} onClick={()=>setCatModal({cat:c})}>✎</div>
            <div style={{padding:'3px 6px',cursor:'pointer',color:'var(--text3)',fontSize:13,borderLeft:`1px solid ${c.color}33`}} onClick={()=>removeCat(c.id)}>×</div>
          </div>
        ))}
        <button className="btn-sm bn" onClick={()=>setCatModal({cat:null})}>+ Catégorie</button>
        <button className="btn by" style={{marginLeft:'auto',fontSize:12,padding:'6px 14px'}} onClick={addTournee}>+ Tournée</button>
      </div>
      <div style={{flex:1,overflow:'auto',padding:16}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8}}>
          {visible.map(t=>{
            const cat=(team.categories||[]).find(c=>c.id===t.categoryId);
            return(
              <div key={t.id} className="card" style={{padding:'10px 12px',display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:32,height:32,borderRadius:8,background:t.color||'#1e3a5f',display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:'Space Mono',fontSize:10,fontWeight:700,color:'var(--text)',border:'1px solid rgba(255,255,255,0.1)',flexShrink:0}}>
                  {String(t.num||'').toString().padStart(2,'0')||'—'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <input style={{background:'transparent',border:'none',color:'var(--text)',fontFamily:'inherit',fontSize:12,fontWeight:500,width:'100%',borderBottom:'1px solid transparent',transition:'.2s',padding:0}}
                    value={t.name} onChange={e=>updateTournee(t.id,tt=>({...tt,name:e.target.value}))}
                    onFocus={e=>e.target.style.borderBottomColor='var(--neon)'}
                    onBlur={e=>e.target.style.borderBottomColor='transparent'}/>
                  <div>
                    <select style={{background:'transparent',border:'none',color:cat?cat.color:'var(--text3)',fontSize:10,fontFamily:'inherit',cursor:'pointer',padding:0,marginTop:2}}
                      value={t.categoryId||''} onChange={e=>updateTournee(t.id,tt=>({...tt,categoryId:e.target.value||null}))}>
                      <option value="">Sans catégorie</option>
                      {(team.categories||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={()=>removeTournee(t.id)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:18,lineHeight:1,flexShrink:0}}>×</button>
              </div>
            );
          })}
        </div>
      </div>
      {catModal&&<CategoryModal category={catModal.cat} onSave={saveCategory} onClose={()=>setCatModal(null)}/>}
    </div>
  );
}

// ── DashboardView ─────────────────────────────────────────────────────────────
function DashboardView({team,absMap,leaveRequests,year,month,assignments}){
  const daysInMonth=new Date(year,month+1,0).getDate();
  const agents=team.agents||[];

  // Absence counts per type this month
  const absByType={};
  ABSENCE_TYPES.forEach(t=>{absByType[t.code]=0;});
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    agents.forEach(a=>{const abs=absMap[`${a.userId||a.id}__${ds}`];if(abs)absByType[abs.type]=(absByType[abs.type]||0)+1;});
  }

  // Per-agent absence count
  const agentAbsCount=agents.map(a=>{
    let n=0;
    for(let d=1;d<=daysInMonth;d++){
      const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      if(absMap[`${a.userId||a.id}__${ds}`])n++;
    }
    return{agent:a,count:n};
  }).sort((a,b)=>b.count-a.count);

  // Coverage rate
  let totalCovered=0,totalPossible=0;
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow=new Date(year,month,d).getDay();
    if(dow===0||dow===6)continue;
    totalPossible++;
    const da=assignments[`${team.id}__${ds}`]||{};
    if(Object.values(da).some(Boolean))totalCovered++;
  }

  const pendingLeaves=leaveRequests.filter(r=>r.teamId===team.id&&r.status==='pending').length;
  const totalAbsences=Object.values(absByType).reduce((a,b)=>a+b,0);
  const workDays=Array.from({length:daysInMonth},(_,i)=>{const d=new Date(year,month,i+1);return d.getDay()!==0&&d.getDay()!==6;}).filter(Boolean).length;
  const presenceRate=agents.length&&workDays?Math.round(100-(totalAbsences/(agents.length*workDays)*100)):100;

  return(
    <div style={{flex:1,overflow:'auto',padding:16}}>
      {/* KPI row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        {[
          {label:'Taux présence',value:`${presenceRate}%`,sub:`${FR_MONTHS[month]}`,color:'#22c55e',icon:'📈'},
          {label:'Absences',value:totalAbsences,sub:'ce mois',color:'#f97316',icon:'📋'},
          {label:'Congés en attente',value:pendingLeaves,sub:'à valider',color:'#fbbf24',icon:'⏳'},
          {label:'Couverture tournées',value:`${totalPossible?Math.round(totalCovered/totalPossible*100):0}%`,sub:'jours planifiés',color:'#38bdf8',icon:'🗺'},
        ].map(k=>(
          <div key={k.label} className="card" style={{padding:'14px 16px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <span style={{fontSize:20}}>{k.icon}</span>
              <span style={{fontSize:11,color:'var(--text2)',fontWeight:600}}>{k.label}</span>
            </div>
            <div style={{fontSize:28,fontWeight:800,color:k.color}}>{k.value}</div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {/* Absences by type */}
        <div className="card" style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>Absences par type</div>
          {ABSENCE_TYPES.filter(t=>absByType[t.code]>0).sort((a,b)=>absByType[b.code]-absByType[a.code]).map(t=>{
            const n=absByType[t.code];
            const max=Math.max(...Object.values(absByType))||1;
            return(
              <div key={t.code} style={{marginBottom:7}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}>
                  <span style={{color:t.color,fontWeight:600}}>{t.label}</span>
                  <span style={{color:'var(--text2)'}}>{n}j</span>
                </div>
                <div style={{height:5,borderRadius:3,background:'var(--border)'}}>
                  <div style={{height:'100%',borderRadius:3,background:t.color,width:`${(n/max)*100}%`,transition:'width .4s'}}/>
                </div>
              </div>
            );
          })}
          {totalAbsences===0&&<div style={{color:'var(--text3)',fontSize:12}}>Aucune absence ce mois</div>}
        </div>

        {/* Top absents */}
        <div className="card" style={{padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>Absences par agent</div>
          {agentAbsCount.filter(x=>x.count>0).slice(0,8).map(({agent,count})=>(
            <div key={agent.userId||agent.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
              <div style={{width:26,height:26,borderRadius:7,background:agent.color,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:10,color:'#000',flexShrink:0}}>
                {agent.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
              </div>
              <span style={{flex:1,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{agent.name}</span>
              <div style={{height:5,flex:2,borderRadius:3,background:'var(--border)'}}>
                <div style={{height:'100%',borderRadius:3,background:agent.color,width:`${Math.min(100,count/workDays*100)}%`,transition:'width .4s'}}/>
              </div>
              <span style={{fontSize:11,color:'var(--text2)',fontFamily:'Space Mono',minWidth:28,textAlign:'right'}}>{count}j</span>
            </div>
          ))}
          {agentAbsCount.every(x=>x.count===0)&&<div style={{color:'var(--text3)',fontSize:12}}>Tous les agents ont été présents</div>}
        </div>
      </div>
    </div>
  );
}

// ── SettingsView ──────────────────────────────────────────────────────────────
function SettingsView({user,team,isManager,updateTeam,onImport,teams,onJoinTeam}){
  const[teamSettings,setTeamSettings]=uS(false);
  return(
    <div style={{flex:1,overflow:'auto',padding:16,maxWidth:600}}>
      {/* Profile */}
      <div className="card" style={{padding:16,marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Mon profil</div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:48,height:48,borderRadius:14,background:user.color,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'#000',flexShrink:0}}>
            {user.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:15}}>{user.name}</div>
            <div style={{fontSize:12,color:'var(--text2)'}}>{user.email}</div>
            <div style={{fontSize:11,marginTop:2,color:isManager?'#FFD100':'var(--neon)',fontWeight:600}}>
              {isManager?'👔 Manager':'📬 Agent'}
            </div>
          </div>
        </div>
      </div>

      {/* Team */}
      {team&&(
        <div className="card" style={{padding:16,marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:14}}>Équipe · {team.name}</div>
            {isManager&&<button className="btn bg" style={{marginLeft:'auto',fontSize:11,padding:'5px 12px'}} onClick={()=>setTeamSettings(true)}>⚙ Modifier</button>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:12}}>
            <div><span style={{color:'var(--text2)'}}>Agents :</span> <b>{team.agents?.length||0}</b></div>
            <div><span style={{color:'var(--text2)'}}>Tournées :</span> <b>{team.tournees?.length||0}</b></div>
            <div><span style={{color:'var(--text2)'}}>Objectif présents :</span> <b>{team.targetPresence||'—'}</b></div>
            <div><span style={{color:'var(--text2)'}}>Catégories :</span> <b>{team.categories?.length||0}</b></div>
          </div>
          {isManager&&(
            <div style={{marginTop:12}}>
              <div style={{fontSize:11,color:'var(--text2)',marginBottom:4}}>Code d'accès à partager</div>
              <div style={{fontFamily:'Space Mono',fontSize:22,fontWeight:700,color:'var(--yellow)',letterSpacing:4,padding:'8px 14px',background:'var(--surface)',borderRadius:10,display:'inline-block',border:'1px solid var(--border)'}}>{team.code}</div>
            </div>
          )}
        </div>
      )}

      {/* Import */}
      <div className="card" style={{padding:16,marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>Import Excel</div>
        <div style={{fontSize:12,color:'var(--text2)',marginBottom:10}}>Importez un fichier Excel pour pré-remplir les agents et tournées.</div>
        <button className="btn bn" onClick={onImport}>📊 Importer un fichier Excel</button>
      </div>

      {/* Join */}
      {!isManager&&(
        <div className="card" style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>Rejoindre une équipe</div>
          <div style={{fontSize:12,color:'var(--text2)',marginBottom:10}}>Entrez le code fourni par votre manager.</div>
          <button className="btn bg" onClick={onJoinTeam}>🔑 Rejoindre avec un code</button>
        </div>
      )}

      {teamSettings&&isManager&&(
        <TeamSettingsModal team={team}
          onSave={({name,color,targetPresence})=>{updateTeam(t=>({...t,name,color,targetPresence}));setTeamSettings(false);}}
          onClose={()=>setTeamSettings(false)}/>
      )}
    </div>
  );
}

Object.assign(window,{Sidebar,PlanningView,LeaveView,AgentsView,TourneesView,DashboardView,SettingsView});
