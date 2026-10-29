#!/usr/bin/env node
// LF-RiskRosi — Full Demo Server v2.0
// Zero dependencies | All 7 features | Static serving
"use strict";
const http=require("http"),https=require("https"),url=require("url"),fs=require("fs"),path=require("path"),crypto=require("crypto");
function loadEnv(){try{fs.readFileSync(path.join(__dirname,".env"),"utf8").split("\n").forEach(l=>{const c=l.trim();if(!c||c.startsWith("#"))return;const eq=c.indexOf("=");if(eq<0)return;const k=c.slice(0,eq).trim(),v=c.slice(eq+1).trim();if(k&&!process.env[k])process.env[k]=v;});}catch{}}
loadEnv();
const C={reset:"\x1b[0m",bold:"\x1b[1m",dim:"\x1b[2m",red:"\x1b[31m",green:"\x1b[32m",yellow:"\x1b[33m",cyan:"\x1b[36m"};
const db=require("./lumeravault-mock.js");
const PORT=parseInt(process.env.LUMERACORE_PORT)||3001;
const GEMINI_KEY=process.env.GEMINI_API_KEY||"";
const JWT_SECRET=process.env.LUMERAGUARD_SECRET||"lf_demo_secret";

function signToken(p){const h=Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url"),b=Buffer.from(JSON.stringify({...p,exp:Date.now()+86400000})).toString("base64url"),s=crypto.createHmac("sha256",JWT_SECRET).update(`${h}.${b}`).digest("base64url");return`${h}.${b}.${s}`;}
function verifyToken(t){try{const[h,b,s]=t.split(".");const ex=crypto.createHmac("sha256",JWT_SECRET).update(`${h}.${b}`).digest("base64url");if(s!==ex)return null;const p=JSON.parse(Buffer.from(b,"base64url").toString());if(p.exp<Date.now())return null;return p;}catch{return null;}}
function readBody(req){return new Promise((res,rej)=>{let d="";const MAX=100*1024;req.on("data",c=>{d+=c;if(d.length>MAX){const e=new Error("Payload Too Large");e.status=413;rej(e);}});req.on("end",()=>{try{res(d?JSON.parse(d):{})}catch{res({})}});req.on("error",rej);});}
function send(res,status,data,extra={}){const body=JSON.stringify(data);res.writeHead(status,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"GET,POST,PUT,PATCH,DELETE,OPTIONS",...extra});res.end(body);}
function ok(res,data,meta={}){send(res,200,{success:true,data,...meta,_mode:"demo",_ts:new Date().toISOString()});}
function err(res,status,message){send(res,status,{success:false,error:message,_ts:new Date().toISOString()});}
function getAuth(req){const a=req.headers.authorization||"";if(!a.startsWith("Bearer "))return null;return verifyToken(a.slice(7));}

// ── STATIC FILE SERVING ─────────────────────────────────────
function serveStatic(req,res){
  const filePath=path.join(__dirname,url.parse(req.url).pathname==="/"?"/platform.html":url.parse(req.url).pathname);
  const ext=path.extname(filePath);
  const mime={"html":"text/html","css":"text/css","js":"application/javascript","png":"image/png","ico":"image/x-icon","json":"application/json"}[ext.slice(1)]||"text/plain";
  fs.readFile(filePath,(e,data)=>{
    if(e){res.writeHead(404);return res.end("Not found");}
    res.writeHead(200,{"Content-Type":mime,"Access-Control-Allow-Origin":"*"});
    res.end(data);
  });
}

// ── LUMA FALLBACK ────────────────────────────────────────────
function fallback(msg,stats,orgId){
  const m=msg.toLowerCase(),risks=db.getRisks(orgId),tasks=db.getTasks(orgId);
  if(m.includes("critical")||m.includes("urgent")){const c=risks.filter(r=>r.severity==="critical");return`⚠️ **${c.length} Critical Risks:**\n\n${c.map(r=>`• **${r.risk_id}** — ${r.name} (Score: ${r.score})`).join("\n")}\n\n**Sabse urgent:** CVE-2024-1234 patch karo — CVSS 9.8, payment data ₹2.25Cr+ at risk.`;}
  if(m.includes("rosi")||m.includes("investment")){const r=db.getROSI(orgId),b=r.sort((a,c)=>c.rosi-a.rosi)[0],avg=Math.round(r.reduce((s,x)=>s+x.rosi,0)/r.length);return`📈 **ROSI Analysis:**\nAverage ROSI: **${avg}%** (industry benchmark: 245%)\nBest performer: **${b.name}** → ${b.rosi}%\n₹${(b.cost/100000).toFixed(1)}L invest → ₹${(b.ale_before/10000000).toFixed(2)}Cr risk reduced`;}
  if(m.includes("compliance")||m.includes("dpdp")||m.includes("iso")){const c=db.getCompliance(orgId);return`📋 **Compliance Status:**\n${c.map(x=>`• **${x.framework}**: ${x.score}% ${x.score<60?"🔴":x.score<75?"🟡":"🟢"}`).join("\n")}\n\n**DPDP gap critical** — 55% only. Section 13 & 6 implement karo.`;}
  if(m.includes("task")||m.includes("overdue")){const ov=tasks.filter(t=>t.status==="overdue");return`⚡ **Tasks:** ${ov.length} overdue\n${ov.map(t=>`• **${t.task_id}** — ${t.title} (${t.owner})`).join("\n")}\n\n**TSK-001 most urgent** — patch today!`;}
  if(m.includes("vendor")){const v=db.getVendors(orgId),h=v.filter(x=>x.risk_score>=50);return`🏢 **Vendor Risk:** ${v.length} total | ${h.length} high risk\n${h.map(x=>`• **${x.name}**: ${x.risk_score} — ${x.status}`).join("\n")}`;}
  if(m.includes("ccm")||m.includes("control")){return`🔄 **CCM Status:**\n• SSL Certificate: ✅ Valid (45 days left)\n• Port 443: ✅ Open\n• MFA Admin: ⚠️ 3 accounts missing\n• Backup: ⚠️ Last backup 5 days ago\n\nNext auto-check: 15 min mein`;}
  if(m.includes("asm")||m.includes("attack surface")){return`🔍 **ASM Scan Results:**\n• Exposed ports: 2 (3389, 8080) ⚠️\n• SSL grade: B\n• Breach history: 1 incident (2023)\n\n**Action:** Port 3389 RDP close karo immediately.`;}
  if(m.includes("remediat")||m.includes("rsk-001")||m.includes("fix")){return`🛠️ **RSK-001 Remediation Plan:**\n\n**Immediate (Today):**\n1. Azure Blob Storage mein CVE-2024-1234 patch apply karo\n2. Storage account access keys rotate karo\n3. Network security group rules review karo\n\n**This Week:**\n4. Backup verification complete karo\n5. Incident response plan update karo\n\n**Estimated effort:** 4 hours\n**Risk reduction:** Score 20 → 6`;}
  return`✦ **LUMA Intelligence Active**\n\nSecurity Score: **${stats.security_score}/10** | Critical: **${stats.critical_risks}** | ROSI: **${stats.avg_rosi}%**\n\nPucho:\n• "RSK-001 ka remediation batao"\n• "ROSI analysis dikhao"\n• "CCM status kya hai"\n• "compliance gap kya hai"\n• "ASM scan results"\n\n${GEMINI_KEY?"":"💡 GEMINI_API_KEY add karo .env mein for full AI."}`;}


// ── CONSENT MANAGER IN-MEMORY DATA ──────────────────────────
const CONSENT_PURPOSES = [
  {id:"PRP-001",label:"Account Registration & Login",category:"essential",retention_days:730,dpdp_section:"Section 6",lawful_basis:"Consent"},
  {id:"PRP-002",label:"Marketing & Email Communications",category:"marketing",retention_days:180,dpdp_section:"Section 6",lawful_basis:"Consent"},
  {id:"PRP-003",label:"Behavioral Analytics & Profiling",category:"analytics",retention_days:90,dpdp_section:"Section 6",lawful_basis:"Consent"},
  {id:"PRP-004",label:"Third-party Data Sharing",category:"sharing",retention_days:30,dpdp_section:"Section 8",lawful_basis:"Consent"},
  {id:"PRP-005",label:"Loan Application Processing",category:"financial",retention_days:180,dpdp_section:"Section 6",lawful_basis:"Legitimate Interest"},
  {id:"PRP-006",label:"KYC Verification",category:"compliance",retention_days:2555,dpdp_section:"Section 8",lawful_basis:"Legal Obligation"},
];
let CONSENT_ARTIFACTS = [
  {id:"CA-0001",uuid:"ca-uuid-001",data_principal:"priya.sharma@acme.com",purpose_id:"PRP-001",purpose_label:"Account Registration & Login",granular_choices:{email_updates:true,behavioral_analytics:false,third_party:false},language:"hi",status:"active",hash:"a3f4b2c1d0e9f8g7h6i5j4k3l2m1n0",signature:"sig_001_riskrosi",created_at:new Date(Date.now()-86400000*10).toISOString(),expires_at:new Date(Date.now()+86400000*720).toISOString(),retention_days:730,webhook_synced:true,synced_systems:["Database","CRM","Analytics"],ip:"103.21.44.10"},
  {id:"CA-0002",uuid:"ca-uuid-002",data_principal:"raj.kumar@acmefintech.com",purpose_id:"PRP-002",purpose_label:"Marketing & Email Communications",granular_choices:{email_updates:true,sms_updates:false,behavioral_analytics:true,third_party:false},language:"en",status:"active",hash:"b4g5c3d2e1f0g9h8i7j6k5l4m3n2",signature:"sig_002_riskrosi",created_at:new Date(Date.now()-86400000*5).toISOString(),expires_at:new Date(Date.now()+86400000*175).toISOString(),retention_days:180,webhook_synced:true,synced_systems:["Database","HubSpot","GA4"],ip:"103.21.44.11"},
  {id:"CA-0003",uuid:"ca-uuid-003",data_principal:"anita.verma@gmail.com",purpose_id:"PRP-005",purpose_label:"Loan Application Processing",granular_choices:{credit_check:true,third_party_bureau:true,marketing:false},language:"hi",status:"expired",hash:"c5h6d4e3f2g1h0i9j8k7l6m5n4",signature:"sig_003_riskrosi",created_at:new Date(Date.now()-86400000*185).toISOString(),expires_at:new Date(Date.now()-86400000*5).toISOString(),retention_days:180,webhook_synced:true,synced_systems:["Database","CIBIL","LoanOS"],ip:"103.21.44.12",auto_deletion_queued:true},
  {id:"CA-0004",uuid:"ca-uuid-004",data_principal:"mohan.das@flipkart.com",purpose_id:"PRP-003",purpose_label:"Behavioral Analytics & Profiling",granular_choices:{page_tracking:true,purchase_history:true,device_fingerprint:false},language:"en",status:"revoked",hash:"d6i7e5f4g3h2i1j0k9l8m7n6",signature:"sig_004_riskrosi",created_at:new Date(Date.now()-86400000*30).toISOString(),expires_at:new Date(Date.now()+86400000*60).toISOString(),retention_days:90,webhook_synced:true,synced_systems:["Database","CRM","Analytics","ArchiveVault"],ip:"103.21.44.13",revoked_at:new Date(Date.now()-86400000*2).toISOString(),global_kill_switch:true},
];
let SHADOW_PII_COUNT = 3;
let GRIEVANCE_TICKETS = [
  {id:"GR-10001",data_principal:"priya.sharma@acme.com",complaint:"My email was used for marketing without explicit consent",artifact_id:"CA-0001",status:"open",dpo_notified:true,sla_hours:72,created_at:new Date(Date.now()-86400000*1).toISOString()},
];

async function callLUMA(message,orgId){
  const stats=db.getDashboardStats(orgId);
  if(!GEMINI_KEY)return fallback(message,stats,orgId);
  return new Promise(resolve=>{
    const topRisks=db.getRisks(orgId).slice(0,5).map(r=>`${r.risk_id}:${r.name}(${r.severity},score:${r.score})`).join(", ");
    const comp=db.getCompliance(orgId).map(c=>`${c.framework}:${c.score}%`).join(", ");
    const body=JSON.stringify({contents:[{role:"user",parts:[{text:`You are LUMA, AI engine of LF-RiskRosi GRC platform by LumeraFoundry Security India. Respond in Hinglish (Hindi+English mix). Be concise, actionable.\nOrg: Acme Fintech | Score:${stats.security_score}/10 | Critical:${stats.critical_risks} | ROSI:${stats.avg_rosi}%\nRisks: ${topRisks}\nCompliance: ${comp}\nUser: ${message}`}]}],generationConfig:{temperature:0.7,maxOutputTokens:400}});
    const req=https.request({hostname:"generativelanguage.googleapis.com",path:`/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(body)}},gemRes=>{let d="";gemRes.on("data",c=>d+=c);gemRes.on("end",()=>{try{const r=JSON.parse(d);resolve(r?.candidates?.[0]?.content?.parts?.[0]?.text||fallback(message,stats,orgId));}catch{resolve(fallback(message,stats,orgId))}});});
    req.on("error",()=>resolve(fallback(message,stats,orgId)));
    req.setTimeout(8000,()=>{req.destroy();resolve(fallback(message,stats,orgId));});
    req.write(body);req.end();
  });
}

// ── CCM MOCK DATA ────────────────────────────────────────────
const CCM_DATA={
  controls:[
    {id:1,name:"SSL Certificate",type:"ssl",status:"pass",detail:"Valid — 45 days left",last_check:new Date(Date.now()-5*60000).toISOString(),next_check:new Date(Date.now()+10*60000).toISOString()},
    {id:2,name:"Port 443 Health",type:"health_check",status:"pass",detail:"200 OK — 142ms",last_check:new Date(Date.now()-5*60000).toISOString(),next_check:new Date(Date.now()+10*60000).toISOString()},
    {id:3,name:"MFA Admin Accounts",type:"mfa",status:"fail",detail:"3 of 14 admin accounts without MFA",last_check:new Date(Date.now()-5*60000).toISOString(),next_check:new Date(Date.now()+10*60000).toISOString()},
    {id:4,name:"Backup Recency",type:"backup",status:"warn",detail:"Last backup 5 days ago (threshold: 3 days)",last_check:new Date(Date.now()-5*60000).toISOString(),next_check:new Date(Date.now()+10*60000).toISOString()},
    {id:5,name:"Password Policy",type:"policy",status:"pass",detail:"Min 12 chars, complexity enforced",last_check:new Date(Date.now()-5*60000).toISOString(),next_check:new Date(Date.now()+10*60000).toISOString()},
  ],
  summary:{pass:3,warn:1,fail:1,last_run:new Date(Date.now()-5*60000).toISOString()}
};

// ── ASM MOCK DATA ─────────────────────────────────────────────
const ASM_DATA={
  vendors:[
    {vendor:"Razorpay",domain:"razorpay.com",asm_score:22,open_ports:[443,80],ssl_grade:"A",breaches:0,last_scan:new Date().toISOString()},
    {vendor:"Infosys BPO",domain:"infosys.com",asm_score:48,open_ports:[443,80,8080],ssl_grade:"B",breaches:1,last_scan:new Date().toISOString()},
    {vendor:"Local IT Support",domain:"localit.in",asm_score:74,open_ports:[443,80,3389,21],ssl_grade:"C",breaches:2,last_scan:new Date().toISOString()},
  ],
  org:{domain:"acmefintech.com",asm_score:38,open_ports:[443,80],ssl_grade:"B",breaches:0,last_scan:new Date().toISOString()}
};

// ── REG CHANGES MOCK ──────────────────────────────────────────
const REG_CHANGES=[
  {id:1,source:"RBI",title:"RBI Circular: Enhanced Cyber Security Framework for NBFCs",date:"2025-03-05",impact:"high",affected_frameworks:["RBI Cyber","ISO 27001"],luma_summary:"RBI ne NBFCs ke liye multi-factor authentication mandatory kar diya hai. Controls A.9.4.2 aur A.9.3.1 update karne honge.",status:"unread"},
  {id:2,source:"MeitY",title:"DPDP Rules 2025 Draft Released",date:"2025-02-28",impact:"critical",affected_frameworks:["DPDP Act"],luma_summary:"DPDP Rules draft mein Data Fiduciary registration mandatory hai. 90 din mein comply karna hoga.",status:"unread"},
  {id:3,source:"SEBI",title:"SEBI CSCRF Amendment — Incident Reporting Timeline",date:"2025-02-20",impact:"medium",affected_frameworks:["NIST CSF","ISO 27001"],luma_summary:"Incident reporting timeline 6 ghante se 4 ghante kar diya gaya. Playbook update karo.",status:"read"},
];

// ── MONTE CARLO MOCK ──────────────────────────────────────────
function runMonteCarlo({minLoss,maxLoss,threatFreqMin,threatFreqMax,runs=10000}){
  const results=[];
  for(let i=0;i<runs;i++){
    const freq=threatFreqMin+Math.random()*(threatFreqMax-threatFreqMin);
    const loss=minLoss+Math.random()*(maxLoss-minLoss);
    results.push(freq*loss);
  }
  results.sort((a,b)=>a-b);
  return{p5:results[Math.floor(runs*0.05)],p50:results[Math.floor(runs*0.50)],p95:results[Math.floor(runs*0.95)],mean:results.reduce((s,v)=>s+v,0)/runs,runs};
}

// ── SECOPS ORCHESTRATOR DATA ─────────────────────────────────
const SECOPS_SIGNALS=[
  {id:"SIG-001",title:"Mass File Encryption on FileServer-02",severity:"CRITICAL",type:"ransomware",status:"ACTIVE",source:"EDR",node:"FileServer-02",ip:"10.12.5.88",ts:new Date(Date.now()-4*60000).toISOString(),description:"CrowdStrike EDR detected mass encryption activity on 3,200+ files within 90 seconds.",ioc:["SHA256:a3f9e7c...","mutex: Global\\MsWin32","C2: 77.88.21.44"],mitre_tactic:"Impact",mitre_technique:"T1486 — Data Encrypted for Impact",affected_assets:["FileServer-02","NAS-Backup-01"],risk_score:98},
  {id:"SIG-002",title:"Unauthorized Access Attempt to Swift HSM",severity:"CRITICAL",type:"hsm_intrusion",status:"ACTIVE",source:"HSM_MONITOR",node:"Swift-HSM-01",ip:"10.12.2.14",ts:new Date(Date.now()-7*60000).toISOString(),description:"3 consecutive failed PIN attempts on Swift HSM — possible insider or stolen credential.",ioc:["User: svc_swift_ops","Source IP: 10.12.2.14","Failed PINs: 3"],mitre_tactic:"Credential Access",mitre_technique:"T1110 — Brute Force",affected_assets:["Swift-HSM-01","RTGS Gateway"],risk_score:97},
  {id:"SIG-003",title:"External C2 Traffic Detected — 77.88.21.44",severity:"HIGH",type:"c2_traffic",status:"ACTIVE",source:"FW_SIEM",node:"Firewall-Core-01",ip:"77.88.21.44",ts:new Date(Date.now()-11*60000).toISOString(),description:"Outbound beaconing to Tor-exit node 77.88.21.44 every 120s. Beacon jitter suggests Cobalt Strike.",ioc:["IP: 77.88.21.44 (Tor Exit)","Beacon interval: 120s","Port: 443/HTTPS"],mitre_tactic:"Command and Control",mitre_technique:"T1071 — Application Layer Protocol",affected_assets:["WS-FIN-044","Payment Gateway"],risk_score:88},
  {id:"SIG-004",title:"Brute-Force on Admin VPN Gateway",severity:"MEDIUM",type:"brute_force",status:"ACTIVE",source:"VPN_LOG",node:"VPN-GW-01",ip:"45.33.12.198",ts:new Date(Date.now()-18*60000).toISOString(),description:"487 failed login attempts from 45.33.12.198 (OVH) in 5 minutes targeting admin VPN.",ioc:["Source: 45.33.12.198","Attempts: 487 in 5min","Usernames: admin, root, sysop"],mitre_tactic:"Initial Access",mitre_technique:"T1078 — Valid Accounts",affected_assets:["VPN-GW-01","AD-Domain-01"],risk_score:72},
  {id:"SIG-005",title:"Privilege Escalation on DB-Prod-01",severity:"HIGH",type:"priv_escalation",status:"ACTIVE",source:"SIEM",node:"DB-Prod-01",ip:"10.12.4.55",ts:new Date(Date.now()-25*60000).toISOString(),description:"svc_reporting executed SUDO bash as root. Service account should not have shell access.",ioc:["User: svc_reporting","Command: sudo bash","PID: 18342"],mitre_tactic:"Privilege Escalation",mitre_technique:"T1548 — Abuse Elevation Control",affected_assets:["DB-Prod-01","Core Banking DB"],risk_score:91},
];
const SECOPS_POOL=[
  {id:"SIG-006",title:"Suspicious PowerShell on WS-FIN-044",severity:"HIGH",type:"powershell",status:"ACTIVE",source:"EDR",node:"WS-FIN-044",ip:"10.12.3.44",ts:new Date().toISOString(),description:"Encoded PowerShell with AMSI bypass on finance workstation.",ioc:["[Reflection.Assembly]::LoadWithPartialName","Base64 payload detected"],mitre_tactic:"Execution",mitre_technique:"T1059.001 — PowerShell",affected_assets:["WS-FIN-044"],risk_score:85},
  {id:"SIG-007",title:"Kerberoasting Attempt on AD-Domain-01",severity:"CRITICAL",type:"kerberoasting",status:"ACTIVE",source:"AD_LOG",node:"AD-Domain-01",ip:"10.12.2.101",ts:new Date().toISOString(),description:"14 TGS requests in 3 seconds — Kerberoasting signature detected.",ioc:["14 TGS requests in 3s","SPNs: MSSQLSvc, HTTP, HOST"],mitre_tactic:"Credential Access",mitre_technique:"T1558.003 — Kerberoasting",affected_assets:["AD-Domain-01","All Windows Servers"],risk_score:96},
];
const LATERAL_SIGNALS=[
  {id:"LAT-001",title:"Pass-the-Hash: FileServer-02 → DB-Prod-01",severity:"CRITICAL",type:"lateral_movement",status:"ACTIVE",source:"NDR",node:"DB-Prod-01",ip:"10.12.4.55",ts:new Date().toISOString(),description:"NTLM hash from FileServer-02 reused to authenticate to DB-Prod-01 (SMB 445).",ioc:["NTLM from FileServer-02","Target: DB-Prod-01 SMB 445","Hash: aad3b435b51404ee..."],mitre_tactic:"Lateral Movement",mitre_technique:"T1550.002 — Pass the Hash",affected_assets:["DB-Prod-01","FileServer-02"],risk_score:99},
  {id:"LAT-002",title:"RDP Hop to Swift-HSM Network Segment",severity:"CRITICAL",type:"lateral_movement",status:"ACTIVE",source:"FW_SIEM",node:"Swift-HSM-VLAN",ip:"10.12.2.0/24",ts:new Date().toISOString(),description:"RDP from compromised WS-FIN-044 attempting to reach HSM network segment.",ioc:["RDP from WS-FIN-044","Dest: 10.12.2.x VLAN"],mitre_tactic:"Lateral Movement",mitre_technique:"T1021.001 — Remote Desktop Protocol",affected_assets:["WS-FIN-044","Swift-HSM-01"],risk_score:99},
  {id:"LAT-003",title:"Data Staging 2.1GB on FileServer-02",severity:"HIGH",type:"exfil_staging",status:"ACTIVE",source:"DLP",node:"FileServer-02",ip:"10.12.5.88",ts:new Date().toISOString(),description:"DLP: 2.1GB financial records compressed to C:\\Windows\\Temp\\logs.zip",ioc:["2.1GB in C:\\Windows\\Temp\\logs.zip","Files: *.xlsx, *.pdf"],mitre_tactic:"Collection",mitre_technique:"T1074 — Data Staged",affected_assets:["FileServer-02"],risk_score:93},
];
const PLAYBOOKS={
  ransomware:{name:"RANSOMWARE-CONTAIN-v2",eta:"8 min",steps:[
    {step:1,action:"ISOLATE",target:"FileServer-02",detail:"Network isolation via CrowdStrike RTR — kill switch executed",status:"DONE"},
    {step:2,action:"SNAPSHOT",target:"FileServer-02",detail:"VSS shadow copy before further encryption",status:"IN_PROGRESS"},
    {step:3,action:"BLOCK_IOC",target:"Firewall-Core-01",detail:"Block C2 IP 77.88.21.44 at perimeter",status:"PENDING"},
    {step:4,action:"CREDENTIAL_RESET",target:"Service Accounts",detail:"Rotate all service account passwords via AD",status:"PENDING"},
    {step:5,action:"NOTIFY",target:"CISO+SOC",detail:"Page CISO, SOC Lead — P1 incident declared",status:"PENDING"},
  ]},
  hsm_intrusion:{name:"HSM-LOCKDOWN-v1",eta:"3 min",steps:[
    {step:1,action:"LOCK_HSM",target:"Swift-HSM-01",detail:"Emergency PIN lock — no further auth",status:"DONE"},
    {step:2,action:"REVOKE_CERTS",target:"Swift-HSM-01",detail:"Revoke all active signing sessions",status:"IN_PROGRESS"},
    {step:3,action:"ALERT_SWIFT",target:"SWIFT Network",detail:"Notify SWIFT network ops of potential compromise",status:"PENDING"},
    {step:4,action:"FORENSICS",target:"svc_swift_ops",detail:"Preserve auth logs for forensic analysis",status:"PENDING"},
  ]},
  c2_traffic:{name:"C2-BLOCK-ISOLATE-v3",eta:"5 min",steps:[
    {step:1,action:"BLOCK_IP",target:"77.88.21.44",detail:"Immediate block at edge firewall",status:"DONE"},
    {step:2,action:"DNS_SINK",target:"Internal-DNS",detail:"Sinkhole all queries to bad TLD",status:"IN_PROGRESS"},
    {step:3,action:"ISOLATE_HOST",target:"WS-FIN-044",detail:"Network isolation of beaconing workstation",status:"PENDING"},
    {step:4,action:"MEMORY_DUMP",target:"WS-FIN-044",detail:"Capture volatile memory for analysis",status:"PENDING"},
  ]},
  brute_force:{name:"BRUTE-FORCE-BLOCK-v1",eta:"2 min",steps:[
    {step:1,action:"IP_BLOCK",target:"45.33.12.198",detail:"Block source IP at perimeter firewall",status:"DONE"},
    {step:2,action:"RATE_LIMIT",target:"VPN-GW-01",detail:"Max 5 attempts/min per IP",status:"IN_PROGRESS"},
    {step:3,action:"MFA_ENFORCE",target:"VPN Users",detail:"Force MFA on all active VPN sessions",status:"PENDING"},
  ]},
  priv_escalation:{name:"PRIV-ESC-CONTAIN-v2",eta:"4 min",steps:[
    {step:1,action:"KILL_SESSION",target:"svc_reporting",detail:"Terminate sudo bash session PID 18342",status:"DONE"},
    {step:2,action:"REVOKE_SUDO",target:"svc_reporting",detail:"Remove sudo rights from service account",status:"DONE"},
    {step:3,action:"AUDIT_DB",target:"DB-Prod-01",detail:"Check for unauthorized queries last 30min",status:"IN_PROGRESS"},
    {step:4,action:"ROTATE_CREDS",target:"svc_reporting",detail:"Rotate service account credentials",status:"PENDING"},
  ]},
  default:{name:"GENERIC-CONTAIN-v1",eta:"5 min",steps:[
    {step:1,action:"ISOLATE",target:"Affected Node",detail:"Network isolation",status:"IN_PROGRESS"},
    {step:2,action:"LOG_PRESERVE",target:"SIEM",detail:"Preserve all relevant logs",status:"PENDING"},
    {step:3,action:"NOTIFY",target:"SOC",detail:"Alert SOC for investigation",status:"PENDING"},
  ]},
};
const SECOPS_META={last_sync:new Date().toISOString(),red_team_active:true,sync_count:0};

// ── ROUTER ────────────────────────────────────────────────────
async function router(req,res){
  const p=url.parse(req.url,true),pathname=p.pathname.replace(/\/$/,"")||"/",method=req.method.toUpperCase(),q=p.query;
  if(method==="OPTIONS"){res.writeHead(204,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"GET,POST,PUT,PATCH,DELETE,OPTIONS"});return res.end();}

  const CORS={"Access-Control-Allow-Origin":"*"};
  function ok2(d,m={}){send(res,200,{success:true,data:d,...m,_ts:new Date().toISOString()},CORS);}

  // Health — must be BEFORE static file handler
  if(pathname==="/api/health"||pathname==="/health")return ok2({status:"operational",service:"LumeraCore API v2",platform:"LF-RiskRosi",mode:"demo",luma:GEMINI_KEY?"gemini":"fallback",version:"2.0.0",uptime:process.uptime().toFixed(0)+"s",features:["CCM","TrustCenter","RegChange","CRQ","AgenticLUMA","ASM","DevSecOps","SecOps"]});

  // Static files
  if(!pathname.startsWith("/api")){return serveStatic(req,res);}
  if(pathname==="/api/ping")return ok2({pong:true});

  // Auth
  if(pathname==="/api/auth/login"&&method==="POST"){const{email,password}=await readBody(req);const user=db.authenticateUser(email,password);if(!user)return err(res,401,"Invalid credentials");const token=signToken({userId:user.id,orgId:user.org_id,role:user.role,email:user.email});return ok2({token,user:{id:user.id,name:user.name,email:user.email,role:user.role,org_id:user.org_id}});}
  if(pathname==="/api/auth/me"&&method==="GET"){const a=getAuth(req);if(!a)return err(res,401,"Unauthorized");const user=db.users.find(u=>u.id===a.userId);if(!user)return err(res,404,"Not found");return ok2({id:user.id,name:user.name,email:user.email,role:user.role});}

  const authUser=getAuth(req),orgId=authUser?.orgId||1;

  // Core APIs
  if(pathname==="/api/dashboard"&&method==="GET")return ok2(db.getDashboardStats(orgId));
  if(pathname==="/api/risks"){if(method==="GET"){const r=db.getRisks(orgId,{severity:q.severity,status:q.status});return ok2(r,{total:r.length});}if(method==="POST"){const b=await readBody(req);if(!b.name)return err(res,400,"name required");return send(res,201,{success:true,data:db.createRisk(orgId,b)},CORS);}}
  const rm=pathname.match(/^\/api\/risks\/(.+)$/);
  if(rm){const id=rm[1];if(method==="GET"){const r=db.getRiskById(orgId,id);if(!r)return err(res,404,"Not found");return ok2(r);}if(method==="PUT"||method==="PATCH"){const b=await readBody(req);const r=db.updateRisk(orgId,id,b);if(!r)return err(res,404,"Not found");return ok2(r);}if(method==="DELETE"){if(!db.deleteRisk(orgId,id))return err(res,404,"Not found");return ok2({deleted:true});}}
  if(pathname==="/api/rosi"){if(method==="GET"){const r=db.getROSI(orgId),avg=Math.round(r.reduce((s,x)=>s+x.rosi,0)/r.length);return ok2(r,{avg_rosi:avg});}if(method==="POST"){const b=await readBody(req);return send(res,201,{success:true,data:db.createROSI(orgId,b)},CORS);}}
  if(pathname==="/api/compliance")return ok2(db.getCompliance(orgId),{avg_score:Math.round(db.getCompliance(orgId).reduce((s,x)=>s+x.score,0)/db.getCompliance(orgId).length)});
  if(pathname==="/api/vendors")return ok2(db.getVendors(orgId),{total:db.getVendors(orgId).length,high_risk:db.getVendors(orgId).filter(x=>x.risk_score>=50).length});
  if(pathname==="/api/assets"){const a=db.getAssets(orgId);return ok2(a,{total:a.length,total_value:a.reduce((s,x)=>s+(x.value||0),0)});}
  if(pathname==="/api/tasks"){const t=db.getTasks(orgId,{status:q.status});return ok2(t,{total:t.length,overdue:t.filter(x=>x.status==="overdue").length});}
  const tm=pathname.match(/^\/api\/tasks\/(.+)\/status$/);
  if(tm&&method==="PATCH"){const{status}=await readBody(req);const t=db.updateTaskStatus(orgId,tm[1],status);if(!t)return err(res,404,"Not found");return ok2(t);}
  if(pathname==="/api/esg")return ok2(db.getESG(orgId));
  if(pathname==="/api/audit-log")return ok2(db.getAuditLog(orgId,parseInt(q.limit)||50));
  if(pathname==="/api/organisations")return ok2(db.orgs);

  // ── FEATURE 1: CCM ─────────────────────────────────────────
  if(pathname==="/api/ccm/status")return ok2({...CCM_DATA,last_run:CCM_DATA.summary.last_run,next_run:CCM_DATA.controls[0].next_check});
  if(pathname==="/api/ccm/run-now"&&method==="POST"){
    CCM_DATA.summary.last_run=new Date().toISOString();
    CCM_DATA.controls.forEach(c=>c.last_check=CCM_DATA.summary.last_run);
    return ok2({triggered:true,message:"CCM scan triggered — results ready in 30s",results:CCM_DATA.summary});
  }

  // ── FEATURE 2: TRUST CENTER ────────────────────────────────
  if(pathname==="/api/trust-center")return ok2({slug:"acme-fintech",is_public:true,frameworks:["ISO 27001","PCI-DSS","DPDP Act"],uptime_pct:99.8,last_audit:"2025-01-15",nda_required:false,visitor_count:47,url:"https://trust.lumerafoundry.com/acme-fintech"});

  // ── FEATURE 3: REGULATORY CHANGE MGMT ─────────────────────
  if(pathname==="/api/reg-changes")return ok2(REG_CHANGES,{unread:REG_CHANGES.filter(x=>x.status==="unread").length});
  if(pathname.match(/^\/api\/reg-changes\/(\d+)\/acknowledge$/)&&method==="POST"){
    const id=parseInt(pathname.split("/")[3]);
    const r=REG_CHANGES.find(x=>x.id===id);
    if(!r)return err(res,404,`Reg change ${id} not found`);
    r.status="acknowledged";
    return ok2({acknowledged:true,id});
  }

  // ── FEATURE 4: CRQ MONTE CARLO ─────────────────────────────
  if(pathname==="/api/crq/simulate"&&method==="POST"){
    const b=await readBody(req);
    const result=runMonteCarlo({minLoss:b.minLoss||500000,maxLoss:b.maxLoss||5000000,threatFreqMin:b.threatFreqMin||0.5,threatFreqMax:b.threatFreqMax||2.5,runs:10000});
    return ok2(result);
  }

  // ── FEATURE 5: AGENTIC LUMA ────────────────────────────────
  if(pathname==="/api/luma/actions"&&method==="POST"){
    const b=await readBody(req);
    const{action,action_type,risk_id,title,owner,due_date,details}=b;
    const actionId=`ACT-${String(Date.now()).slice(-6)}`;
    const taskId=`TSK-${String(db.tasks.length+1).padStart(3,"0")}`;
    const task={id:db.tasks.length+1,task_id:taskId,title:title||`Auto: Fix ${risk_id}`,risk_id,owner:owner||"IT Head",due:due_date||new Date(Date.now()+7*86400000).toISOString().split("T")[0],status:"open",priority:"high",created_by:"LUMA",org_id:orgId};
    db.tasks.push(task);
    db._log(orgId,"luma_action",`LUMA action ${actionId}: ${action||action_type||"create_task"} for ${risk_id}`);
    return ok2({action_id:actionId,status:"pending",action:action||action_type||"create_task",task,message:`✅ LUMA ne ${taskId} create ki — ${owner||"IT Head"} ko assign ki. Confirm karo execute ke liye.`,details:details||""});
  }
  if(pathname==="/api/luma/actions"&&method==="GET")return ok2(db.getAuditLog(orgId).filter(x=>x.action==="luma_action"));

  // ── FEATURE 6: ASM ─────────────────────────────────────────
  if(pathname==="/api/asm/scan")return ok2(ASM_DATA.vendors,{org:ASM_DATA.org,total:ASM_DATA.vendors.length,high_risk:ASM_DATA.vendors.filter(v=>v.asm_score>=50).length});
  if(pathname==="/api/asm/vendor"&&method==="GET"){
    const vendor=q.name;
    const data=ASM_DATA.vendors.find(v=>v.vendor.toLowerCase().includes((vendor||"").toLowerCase()))||ASM_DATA.vendors[0];
    return ok2(data);
  }

  // ── FEATURE 7: DEVSECOPS ───────────────────────────────────
  if(pathname==="/api/devsecops/repos")return ok2([
    {id:1,name:"acme-core-banking",branch:"main",last_scan:"2025-03-09",compliance_score:78,findings:3,status:"warning"},
    {id:2,name:"acme-payment-api",branch:"main",last_scan:"2025-03-09",compliance_score:65,findings:7,status:"critical"},
    {id:3,name:"acme-mobile-app",branch:"main",last_scan:"2025-03-08",compliance_score:90,findings:1,status:"pass"},
  ]);
  if(pathname==="/api/devsecops/findings")return ok2([
    {id:1,repo:"acme-payment-api",file:"src/api/payments.js",line:142,severity:"critical",framework:"PCI-DSS",clause:"Req 6.3.1",message:"Hardcoded API key detected",pr:"#47"},
    {id:2,repo:"acme-payment-api",file:"src/auth/login.js",line:88,severity:"high",framework:"DPDP Act",clause:"Section 8",message:"PII logged without masking",pr:"#47"},
    {id:3,repo:"acme-core-banking",file:"config/db.js",line:12,severity:"high",framework:"ISO 27001",clause:"A.10.1.1",message:"Weak encryption algorithm (MD5)",pr:"#31"},
  ]);

  // ── SECOPS ORCHESTRATOR (Red Team Simulation) ─────────────
  if(pathname==="/api/secops/signals"){
    return ok2(SECOPS_SIGNALS,{
      total:SECOPS_SIGNALS.length,
      critical:SECOPS_SIGNALS.filter(x=>x.severity==="CRITICAL").length,
      high:SECOPS_SIGNALS.filter(x=>x.severity==="HIGH").length,
      medium:SECOPS_SIGNALS.filter(x=>x.severity==="MEDIUM").length,
      active:SECOPS_SIGNALS.filter(x=>x.status==="ACTIVE").length,
      last_sync:SECOPS_META.last_sync,
      red_team_active:SECOPS_META.red_team_active,
    });
  }
  if(pathname==="/api/secops/sync"&&method==="POST"){
    SECOPS_META.last_sync=new Date().toISOString();
    SECOPS_META.sync_count=(SECOPS_META.sync_count||0)+1;
    // Simulate new signal coming in on each sync
    const newEvt=SECOPS_POOL[SECOPS_META.sync_count%SECOPS_POOL.length];
    if(!SECOPS_SIGNALS.find(s=>s.id===newEvt.id)){
      SECOPS_SIGNALS.unshift({...newEvt,ts:new Date().toISOString()});
    }
    db._log(orgId,"secops_sync",`Global Sync #${SECOPS_META.sync_count} — ${SECOPS_SIGNALS.length} signals active`);
    return ok2({synced:true,sync_count:SECOPS_META.sync_count,last_sync:SECOPS_META.last_sync,new_signals:1,total_signals:SECOPS_SIGNALS.length,message:"LumeraVault sync complete — live intel updated"});
  }
  const remM=pathname.match(/^\/api\/secops\/remediate\/(.+)$/);
  if(remM&&method==="POST"){
    const sigId=remM[1];
    const sig=SECOPS_SIGNALS.find(x=>x.id===sigId);
    if(!sig)return err(res,404,`Signal ${sigId} not found`);
    const playbook=PLAYBOOKS[sig.type]||PLAYBOOKS["default"];
    sig.status="REMEDIATING";
    sig.remediation_started=new Date().toISOString();
    db._log(orgId,"secops_remediate",`Playbook triggered for ${sigId}: ${sig.title}`);
    return ok2({
      signal_id:sigId,
      playbook_name:playbook.name,
      steps:playbook.steps,
      estimated_time:playbook.eta,
      status:"EXECUTING",
      triggered_by:"LUMA Autonomous Engine",
      message:`🛡️ Playbook "${playbook.name}" executing — ${playbook.steps.length} containment steps`,
    });
  }
  if(pathname==="/api/secops/signal"&&method==="PATCH"){
    const b=await readBody(req);
    const sig=SECOPS_SIGNALS.find(x=>x.id===b.id);
    if(!sig)return err(res,404,"Signal not found");
    Object.assign(sig,{status:b.status||sig.status});
    return ok2(sig);
  }
  if(pathname==="/api/secops/lateral-movement"&&method==="POST"){
    LATERAL_SIGNALS.forEach(s=>{ if(!SECOPS_SIGNALS.find(x=>x.id===s.id)) SECOPS_SIGNALS.unshift(s); });
    return ok2({injected:LATERAL_SIGNALS,count:LATERAL_SIGNALS.length,signals:LATERAL_SIGNALS,message:"Lateral movement logs injected into LumeraVault"});
  }

  // LUMA
  if(pathname==="/api/luma/chat"&&method==="POST"){const{message}=await readBody(req);if(!message?.trim())return err(res,400,"Message required");const reply=await callLUMA(message.trim(),orgId);return ok2({message:reply,reply:reply,mode:GEMINI_KEY?"gemini":"fallback"});}
  if(pathname==="/api/luma/intelligence"){const s=db.getDashboardStats(orgId),r=db.getRisks(orgId)[0];return ok2({security_score:s.security_score,critical_risks:s.critical_risks,top_risk:r?.name,avg_rosi:s.avg_rosi+"%",overdue_tasks:s.overdue_tasks,ccm_failing:1,reg_changes_unread:2,luma_status:GEMINI_KEY?"gemini":"fallback"});}


  // ── CONSENT MANAGER (DPDP Act 2023) ─────────────────────────
  if(pathname==="/api/consent/artifacts"&&method==="GET"){
    return ok2({artifacts:CONSENT_ARTIFACTS,meta:{total:CONSENT_ARTIFACTS.length,active:CONSENT_ARTIFACTS.filter(a=>a.status==="active").length,revoked:CONSENT_ARTIFACTS.filter(a=>a.status==="revoked").length,expired:CONSENT_ARTIFACTS.filter(a=>a.status==="expired").length,shadow_count:SHADOW_PII_COUNT}});
  }
  if(pathname==="/api/consent/artifacts"&&method==="POST"){
    const b=await readBody(req);
    if(!b.data_principal||!b.purpose_id)return err(res,400,"data_principal and purpose_id required");
    const now=new Date(),expiry=new Date(now.getTime()+(b.retention_days||180)*86400000);
    const artifactData=`${b.data_principal}|${b.purpose_id}|${now.toISOString()}|${JSON.stringify(b.granular_choices||{})}`;
    const hash=crypto.createHash("sha256").update(artifactData).digest("hex");
    const signature=crypto.createHmac("sha256","RISKROSI_PRIVATE_KEY_2025").update(hash).digest("hex");
    const artifact={id:`CA-${String(CONSENT_ARTIFACTS.length+1).padStart(4,"0")}`,uuid:crypto.randomUUID(),data_principal:b.data_principal,purpose_id:b.purpose_id,purpose_label:CONSENT_PURPOSES.find(p=>p.id===b.purpose_id)?.label||b.purpose_id,granular_choices:b.granular_choices||{},language:b.language||"en",status:"active",hash,signature,created_at:now.toISOString(),expires_at:expiry.toISOString(),retention_days:b.retention_days||180,webhook_synced:true,synced_systems:["Database","CRM","Analytics"],ip:req.headers["x-forwarded-for"]||"127.0.0.1"};
    CONSENT_ARTIFACTS.unshift(artifact);
    if(SHADOW_PII_COUNT>0)SHADOW_PII_COUNT--;
    return send(res,201,{success:true,data:{artifact,message:"Consent Artifact generated, signed and stored. Webhooks dispatched.",immutable:true}});
  }
  if(pathname.match(/^\/api\/consent\/artifacts\/.+\/revoke$/)&&method==="POST"){
    const uuid=pathname.split("/")[4];
    const art=CONSENT_ARTIFACTS.find(a=>a.uuid===uuid||a.id===uuid);
    if(!art)return err(res,404,"Artifact not found");
    art.status="revoked";art.revoked_at=new Date().toISOString();art.global_kill_switch=true;
    art.synced_systems=["Database","CRM","Analytics","ArchiveVault"];
    return ok2({artifact:art,kill_switch_fired:true,message:"Global Kill-Switch activated. All integrated systems notified.",data_deletion_queued:true});
  }
  if(pathname==="/api/consent/purposes")return ok2(CONSENT_PURPOSES);
  if(pathname==="/api/consent/shadow-scan"&&method==="POST"){
    SHADOW_PII_COUNT=Math.floor(Math.random()*6)+2;
    const found=[
      {table:"users",column:"phone",records:Math.floor(Math.random()*500)+50,risk:"HIGH",reason:"No consent artifact linked"},
      {table:"transactions",column:"ip_address",records:Math.floor(Math.random()*2000)+200,risk:"MEDIUM",reason:"Consent expired"},
      {table:"analytics_events",column:"user_id",records:Math.floor(Math.random()*10000)+1000,risk:"CRITICAL",reason:"Processing without valid consent"},
    ].slice(0,Math.min(SHADOW_PII_COUNT,3));
    return ok2({shadow_pii_found:found,total_records_at_risk:found.reduce((s,f)=>s+f.records,0),compliance_gap:"CRITICAL",dpdp_sections_violated:["Section 4","Section 6","Section 8"],scan_timestamp:new Date().toISOString()});
  }
  if(pathname==="/api/consent/notice/generate"&&method==="POST"){
    const b=await readBody(req);
    const purpose=CONSENT_PURPOSES.find(p=>p.id===b.purpose_id)||CONSENT_PURPOSES[0];
    const notices={en:`We request your consent to process your data for: **${purpose.label}**. Under DPDP Act 2023, you may withdraw consent anytime. Retention: ${purpose.retention_days} days.`,hi:`हम **${purpose.label}** के लिए आपके डेटा की प्रोसेसिंग की अनुमति मांगते हैं। DPDP Act 2023 के तहत, आप कभी भी सहमति वापस ले सकते हैं। डेटा ${purpose.retention_days} दिनों के लिए संग्रहीत किया जाएगा।`,ta:`**${purpose.label}** நோக்கத்திற்காக உங்கள் தனிப்பட்ட தரவை செயலாக்க உங்கள் சம்மதம் கோருகிறோம். DPDP சட்டம் 2023 கீழ், நீங்கள் எந்த நேரத்திலும் சம்மதத்தை திரும்பப் பெறலாம்.`,te:`**${purpose.label}** నిమిత్తం మీ వ్యక్తిగత డేటాను ప్రాసెస్ చేయడానికి మీ సమ్మతిని కోరుతున్నాము. DPDP చట్టం 2023 ప్రకారం, మీరు ఎప్పుడైనా సమ్మతిని ఉపసంహరించుకోవచ్చు. నిలుపుదల: ${purpose.retention_days} రోజులు.`,mr:`**${purpose.label}** साठी तुमचा वैयक्तिक डेटा प्रक्रिया करण्यासाठी तुमची संमती मागतो. DPDP कायदा 2023 अंतर्गत, तुम्ही कधीही संमती मागे घेऊ शकता. ${purpose.retention_days} दिवसांसाठी डेटा साठवला जाईल.`};
    return ok2({notice:notices[b.language||"en"]||notices.en,purpose,dpdp_section:"Section 6 — Consent",generated_by:"LUMA AI Notice Engine",plain_language:true});
  }
  if(pathname==="/api/consent/grievance"&&method==="POST"){
    const b=await readBody(req);
    const ticket={id:`GR-${String(Date.now()).slice(-5)}`,data_principal:b.data_principal,complaint:b.complaint,artifact_id:b.artifact_id,status:"open",dpo_notified:true,sla_hours:72,created_at:new Date().toISOString()};
    GRIEVANCE_TICKETS.push(ticket);
    return send(res,201,{success:true,data:{ticket,message:"Grievance registered. DPO notified. SLA: 72 hours per DPDP Act.",dpdp_section:"Section 13 — Grievance Redressal"}});
  }
  if(pathname==="/api/consent/grievance")return ok2(GRIEVANCE_TICKETS);
  if(pathname==="/api/consent/expiry-check"&&method==="POST"){
    const now=new Date(),expired=CONSENT_ARTIFACTS.filter(a=>a.status==="active"&&new Date(a.expires_at)<now);
    expired.forEach(a=>{a.status="expired";a.expired_at=now.toISOString();a.auto_deletion_queued=true;});
    return ok2({auto_expired:expired.length,data_deletion_queued:expired.length,message:`${expired.length} consent(s) auto-expired. Data deletion queued.`});
  }

  return err(res,404,`Not found: ${method} ${pathname}`);
}

const server=http.createServer(async(req,res)=>{
  const start=Date.now();
  try{await router(req,res);}catch(e){console.error("[Error]",e.message);try{err(res,e.status||500,(e.status===413?"Payload Too Large":"Internal error")+": "+e.message);}catch{}}
  if(url.parse(req.url).pathname.startsWith("/api"))
    console.log(`${C.dim}[${new Date().toLocaleTimeString("en-IN")}]${C.reset} ${C.cyan}${req.method.padEnd(6)}${C.reset} ${url.parse(req.url).pathname.padEnd(35)} ${C.green}${res.statusCode}${C.reset} ${C.dim}${Date.now()-start}ms${C.reset}`);
});
server.listen(PORT,()=>{
  console.clear();
  console.log(`\n${C.cyan}${C.bold}  LF-RiskRosi Platform v2.0 — Demo Server${C.reset}`);
  console.log(`  ${C.dim}LumeraFoundry Security India Pvt. Ltd.${C.reset}\n`);
  console.log(`  ${C.green}✅ Platform UI:${C.reset}  http://localhost:${PORT}`);
  console.log(`  ${C.green}✅ API Base:${C.reset}     http://localhost:${PORT}/api`);
  console.log(`  ${C.green}✅ LumeraVault:${C.reset}  In-memory | 12 risks | 8 vendors | 5 frameworks`);
  console.log(`  ${C.green}✅ Features:${C.reset}     CCM | Trust | RegChange | CRQ | Agentic | ASM | DevSecOps`);
  console.log(`  ${GEMINI_KEY?C.green+"✅":C.yellow+"⚠️ "} LUMA AI:${C.reset}      ${GEMINI_KEY?"Gemini connected":"Fallback — add GEMINI_API_KEY to .env"}`);
  console.log(`\n  ${C.cyan}Login:${C.reset}  demo@lumerafoundry.com / LumeRa@2025\n`);
});
server.on("error",e=>{if(e.code==="EADDRINUSE"){console.error(`\n${C.red}❌ Port ${PORT} busy. Run: LUMERACORE_PORT=3002 node demo-server.js${C.reset}\n`);}process.exit(1);});
process.on("SIGINT",()=>{console.log(`\n${C.yellow}Shutting down...${C.reset}\n`);process.exit(0);});
