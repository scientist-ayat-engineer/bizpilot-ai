/* BizPilot AI - main app: pages, dashboard, charts, agents room, billing, bot (demo mode logic) */
(function(){
var $=function(s){return document.querySelector(s)},$$=function(s){return document.querySelectorAll(s)};
var SAMPLE={m:["January","February","March","April","May","June"],s:[12000,15000,14000,18000,21000,19000],e:[8000,9000,85000,11000,12000,11500]};
var D=copy(SAMPLE),mem={},current=null,busy=false;
function copy(o){return JSON.parse(JSON.stringify(o))}
function get(k){try{return localStorage.getItem(k)}catch(x){return mem[k]||null}}
function set(k,v){try{localStorage.setItem(k,v)}catch(x){mem[k]=v}}
function fmt(n){return (n<0?"-":"")+"Rs "+Math.abs(Math.round(n)).toLocaleString("en-US")}
function sum(a){return a.reduce(function(x,y){return x+y},0)}
function toast(t){var e=$("#toast");e.textContent=t;e.classList.remove("hide");clearTimeout(toast.t);toast.t=setTimeout(function(){e.classList.add("hide")},3200)}
function stats(){var ts=sum(D.s),te=sum(D.e),p=D.s.map(function(v,i){return v-D.e[i]}),bi=D.s.indexOf(Math.max.apply(null,D.s)),n=D.s.length;
 return{ts:ts,te:te,tp:ts-te,mg:ts?(ts-te)/ts*100:0,p:p,bi:bi,g:(D.s[n-1]-D.s[0])/D.s[0]*100,last:(D.s[n-1]-D.s[n-2])/D.s[n-2]*100,er:ts?te/ts*100:0}}
function anomalies(){var o=D.e.slice().sort(function(a,b){return a-b}),md=o[Math.floor(o.length/2)],r=[];D.e.forEach(function(v,i){if(md&&v>3*md)r.push(i)});return r}
function renderAll(){
 var s=stats(),a=anomalies();
 $("#dsub").textContent=D.m[0]+" to "+D.m[D.m.length-1]+" – "+D.m.length+" months of data";
 $("#kpis").innerHTML=[["Total sales",fmt(s.ts),"up","+"+s.g.toFixed(0)+"% since "+D.m[0]],["Total expenses",fmt(s.te),"dn",s.er.toFixed(0)+"% of sales"],["Net profit",fmt(s.tp),s.tp>=0?"up":"dn",s.mg.toFixed(1)+"% margin"],["Best month",D.m[s.bi],"up",fmt(D.s[s.bi])+" in sales"]].map(function(k){return'<div class="card kpi"><div class="l">'+k[0]+'</div><div class="v">'+k[1]+'</div><div class="d '+k[2]+'">'+k[3]+'</div></div>'}).join("");
 $("#warn").innerHTML=a.length?'<div class="warn"><span><b>Possible data error:</b> '+D.m[a[0]]+' expenses of '+fmt(D.e[a[0]])+' are far above your other months.</span><button class="btn" id="fix">Use '+fmt(fixVal(a[0]))+' instead</button></div>':"";
 var f=$("#fix");if(f)f.onclick=function(){D.e[a[0]]=fixVal(a[0]);renderAll();toast("Fixed. Charts and totals updated.")};
 chart1();chart2(s);if(window.insights)window.insights();
}
function fixVal(i){var l=D.e[i-1],r=D.e[i+1];return Math.round(((l===undefined?r:l)+(r===undefined?l:r))/2)}
function chart1(){var mx=Math.max.apply(null,D.s.concat(D.e))*1.1,w=470/D.m.length,h="";
 for(var g=0;g<=4;g++){var y=210-g*45;h+='<line x1="56" x2="540" y1="'+y+'" y2="'+y+'" stroke="rgba(0,229,255,.12)"/><text x="50" y="'+(y+4)+'" text-anchor="end" font-size="11" fill="#8b97c0">'+Math.round(mx*g/4/1000)+'k</text>'}
 D.m.forEach(function(m,i){var x=62+i*w,b=Math.min(26,w/2-6),hs=D.s[i]/mx*180,he=D.e[i]/mx*180;
  h+='<rect x="'+x+'" y="'+(210-hs)+'" width="'+b+'" height="'+hs+'" rx="3" fill="#00e5ff"/><rect x="'+(x+b+4)+'" y="'+(210-he)+'" width="'+b+'" height="'+he+'" rx="3" fill="#a855f7"/><text x="'+(x+b)+'" y="230" text-anchor="middle" font-size="11" fill="#8b97c0">'+m.slice(0,3)+'</text>'});
 $("#c1").innerHTML=h}
function chart2(s){var mn=Math.min(0,Math.min.apply(null,s.p)),mx=Math.max(0,Math.max.apply(null,s.p)),rg=(mx-mn)||1,z=20+(mx/rg)*180,w=300/D.m.length,h='<line x1="40" x2="350" y1="'+z+'" y2="'+z+'" stroke="rgba(255,255,255,.3)"/>';
 s.p.forEach(function(v,i){var x=48+i*w,bh=Math.abs(v)/rg*180,y=v>=0?z-bh:z;h+='<rect x="'+x+'" y="'+y+'" width="'+Math.min(30,w-10)+'" height="'+bh+'" rx="3" fill="'+(v>=0?"#34f5a0":"#ff5c8a")+'"/><text x="'+(x+Math.min(30,w-10)/2)+'" y="240" text-anchor="middle" font-size="11" fill="#8b97c0">'+D.m[i].slice(0,3)+'</text>'});
 $("#c2").innerHTML=h}
/* csv */
function parseCSV(t){var L=t.trim().split(/\r?\n/).map(function(l){return l.split(",").map(function(c){return c.trim()})});if(L.length<3)throw"Add at least 3 rows of data.";var hd=L[0].map(function(c){return c.toLowerCase()}),im=hd.indexOf("month"),is=hd.indexOf("sales"),ie=hd.indexOf("expenses");if(im<0||is<0||ie<0)throw"The first row must have the columns month, sales and expenses.";var o={m:[],s:[],e:[]};L.slice(1).forEach(function(r){var s=parseFloat(r[is]),e=parseFloat(r[ie]);if(r[im]&&!isNaN(s)&&!isNaN(e)){o.m.push(r[im]);o.s.push(s);o.e.push(e)}});if(o.m.length<3)throw"Fewer than 3 valid rows found. Check that sales and expenses are numbers.";return o}
function load(f){var r=new FileReader();r.onload=function(){try{D=parseCSV(r.result);renderAll();toast("Loaded "+D.m.length+" months from "+f.name)}catch(e){toast(String(e))}};r.readAsText(f)}
$("#file").onchange=function(e){if(e.target.files[0])load(e.target.files[0])};
var dr=$("#drop");["dragover","dragenter"].forEach(function(n){dr.addEventListener(n,function(e){e.preventDefault();dr.classList.add("over")})});
["dragleave","drop"].forEach(function(n){dr.addEventListener(n,function(e){e.preventDefault();dr.classList.remove("over");if(n==="drop"&&e.dataTransfer.files[0])load(e.dataTransfer.files[0])})});
dr.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();$("#file").click()}});
$("#reset").onclick=function(){D=copy(SAMPLE);renderAll();toast("Sample data restored.")};
/* agents */
function typeInto(el,t){return new Promise(function(res){var i=0,id=setInterval(function(){i+=3;el.textContent=t.slice(0,i);if(i>=t.length){clearInterval(id);res()}},16)})}
function scripts(){var s=stats(),a=anomalies(),mn=D.m[s.bi];
 var m="Objectives: raise profit, cut avoidable expenses, understand sales and find improvements.\nKPIs to track: profit margin, expense ratio, month-on-month sales growth.\nAnalyst, please calculate each one and flag anything unusual.";
 var an="Total sales "+fmt(s.ts)+", total expenses "+fmt(s.te)+", net profit "+fmt(s.tp)+" ("+s.mg.toFixed(1)+"% margin).\nBest month: "+mn+" with "+fmt(D.s[s.bi])+" in sales.\nSales moved "+(s.g>=0?"up ":"down ")+Math.abs(s.g).toFixed(0)+"% from "+D.m[0]+" to "+D.m[D.m.length-1]+"; the latest month changed "+s.last.toFixed(1)+"% from the month before.\nExpenses take "+s.er.toFixed(0)+"% of sales."+(a.length?"\nData warning: "+D.m[a[0]]+" expenses ("+fmt(D.e[a[0]])+") look unusually high and may be an entry error.":"");
 var ex=["Overall: the business is "+(s.tp>=0?"profitable":"losing money")+" with a "+s.mg.toFixed(1)+"% margin.","Opportunity: repeat what worked in "+mn+", your strongest sales month.",s.last<0?"Risk: sales fell "+Math.abs(s.last).toFixed(1)+"% in the latest month. Find out why.":"Risk: keep expense growth below sales growth.","Action: aim to keep expenses near "+Math.max(40,Math.round(s.er-5))+"% of sales."+(a.length?" Check the "+D.m[a[0]]+" expense entry first.":"")].join("\n");
 return[m,an,ex]}
function run(){if(window.BPLive)return BPLive.run();if(busy)return;if(monthCount()>=PLANS[plan()].lim){toast("You have used all reports on the "+PLANS[plan()].n+" plan this month. Upgrade to continue.");location.hash="#billing";return}busy=true;location.hash="#agents";var T=scripts(),N=["Business Manager","Data Analyst","Executive Agent"],c=$("#chat");c.innerHTML="";$$(".node").forEach(function(n){n.className="node"});$("#run").disabled=$("#run2").disabled=true;
 var p=Promise.resolve();T.forEach(function(t,i){p=p.then(function(){$("#n"+i).classList.add("active");var d=document.createElement("div");d.className="msg b"+(i+1);d.innerHTML="<b>"+N[i]+"</b><span></span>";c.appendChild(d);return typeInto(d.querySelector("span"),t)}).then(function(){var n=$("#n"+i);n.classList.remove("active");n.classList.add("done")})});
 p.then(function(){current=makeReport(T);$("#rep").innerHTML=current.html;var h=JSON.parse(get("bp_hist")||"[]");h.unshift(current);set("bp_hist",JSON.stringify(h.slice(0,20)));renderHist();toast("Report saved. Open the Report tab.");busy=false;$("#run").disabled=$("#run2").disabled=false})}
function makeReport(T){var s=stats(),d=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}),rows=D.m.map(function(m,i){return"<tr><td>"+m+"</td><td>"+fmt(D.s[i])+"</td><td>"+fmt(D.e[i])+"</td><td>"+fmt(s.p[i])+"</td></tr>"}).join("");
 function par(t){return t.split("\n").map(function(l){return"<p>"+l+"</p>"}).join("")}
 return{id:Date.now(),date:d,title:"Executive report, "+D.m[0]+" to "+D.m[D.m.length-1],html:"<h2>Executive business report</h2><p class='sub'>Prepared by BizPilot AI on "+d+"</p><h3>Plan (Business Manager)</h3>"+par(T[0])+"<h3>Data (Data Analyst)</h3>"+par(T[1])+"<table><tr><th>Month</th><th>Sales</th><th>Expenses</th><th>Profit</th></tr>"+rows+"</table><h3>Decisions (Executive Agent)</h3>"+par(T[2])}}
$("#run").onclick=$("#run2").onclick=run;$("#pdf").onclick=function(){window.print()};
function renderHist(){var h=JSON.parse(get("bp_hist")||"[]"),e=$("#hist");if(!h.length){e.innerHTML='<div class="empty">No saved reports yet.</div>';return}
 e.innerHTML=h.map(function(r,i){return'<div class="item"><div><b>'+r.title+'</b><div class="sub" style="margin:0">'+r.date+'</div></div><button class="btn ghost sp" data-i="'+i+'">Open</button></div>'}).join("");
 $$("#hist button").forEach(function(b){b.onclick=function(){$("#rep").innerHTML=h[b.dataset.i].html;location.hash="#reports"}})}
/* auth + router */
function user(){return get("bp_user")}
function signin(e){set("bp_user",e);location.hash="#dashboard";route();var w=get("bp_want");if(w){set("bp_want","");location.hash="#billing";openPay(w)}}
$("#lf").onsubmit=function(e){e.preventDefault();if(window.BPLive){BPLive.login($("#em").value,$("#pw").value);return}signin($("#em").value)};$("#demo").onclick=function(){signin("demo@bizpilot.ai")};
$("#out").onclick=function(){if(window.BPLive)BPLive.logout();set("bp_user","");location.hash="#home";route()};
function route(){var u=user(),h=(location.hash||(user()?"#dashboard":"#home")).slice(1);if(!u){var lg=h==="login";$("#login").classList.toggle("hide",!lg);$("#land").classList.toggle("hide",lg);$("#app").classList.add("hide");return}
 if(["dashboard","agents","reports","insights","billing","admin","history","settings"].indexOf(h)<0)h="dashboard";$("#login").classList.add("hide");$("#land").classList.add("hide");$("#app").classList.remove("hide");$("#who").textContent=u;
 $$("[data-view]").forEach(function(s){s.classList.toggle("hide",s.dataset.view!==h)});$$(".side a").forEach(function(a){a.classList.toggle("on",a.dataset.v===h)});
 $("#pt").textContent={dashboard:"Dashboard",agents:"Agent room",reports:"Report",insights:"Insights",billing:"Billing",admin:"Admin payments",history:"History",settings:"Settings"}[h]}
/* insights */
function lin(a,k){var n=a.length,mx=(n-1)/2,my=sum(a)/n,c=0,v=0,o=[];a.forEach(function(y,i){c+=(i-mx)*(y-my);v+=(i-mx)*(i-mx)});var sl=v?c/v:0;for(var j=1;j<=k;j++)o.push(Math.max(0,Math.round(my+sl*(n-1+j-mx))));return o}
window.insights=function(){var s=stats(),a=anomalies(),fs=lin(D.s,3),fe=lin(D.e,3),n=D.s.length,tot=n+3,mx=Math.max.apply(null,D.s.concat(D.e,fs,fe))*1.1,w=470/(tot-1),h="";
 function X(i){return 60+i*w}function Y(v){return 210-v/mx*180}
 for(var g=0;g<=4;g++){var y=210-g*45;h+='<line x1="56" x2="540" y1="'+y+'" y2="'+y+'" stroke="rgba(0,229,255,.12)"/><text x="50" y="'+(y+4)+'" text-anchor="end" font-size="11" fill="#8b97c0">'+Math.round(mx*g/4/1000)+'k</text>'}
 function ln(arr,st,col,dash){return'<polyline fill="none" stroke="'+col+'" stroke-width="2.5"'+(dash?' stroke-dasharray="6 5"':'')+' points="'+arr.map(function(v,i){return X(st+i)+','+Y(v)}).join(' ')+'"/>'}
 h+=ln(D.s,0,'#00e5ff')+ln([D.s[n-1]].concat(fs),n-1,'#00e5ff',1)+ln(D.e,0,'#a855f7')+ln([D.e[n-1]].concat(fe),n-1,'#a855f7',1);
 for(var i=0;i<tot;i++)h+='<text x="'+X(i)+'" y="232" text-anchor="middle" font-size="11" fill="#8b97c0">'+(i<n?D.m[i].slice(0,3):'+'+(i-n+1))+'</text>';
 $("#c3").innerHTML=h;
 $("#fc").textContent="If the current trend continues, sales could reach "+fmt(fs[2])+" and expenses "+fmt(fe[2])+" in 3 months, leaving a profit of "+fmt(fs[2]-fe[2])+". This is a straight-line estimate, not a guarantee.";
 var sc=Math.max(0,Math.min(100,Math.round(50+s.mg*1.2+s.g*0.4-(a.length?15:0)-(s.last<0?5:0))));
 $("#hs").textContent=sc+" / 100";$("#hl").textContent=sc>=75?"Strong":sc>=50?"Steady":"Needs attention";$("#hm").style.width=sc+"%";
 whatif()};
function whatif(){var s=stats(),ps=+$("#ws").value,pe=+$("#we").value,ns=s.ts*(1+ps/100),ne=s.te*(1+pe/100),np=ns-ne,dp=np-s.tp;
 $("#wsv").textContent=(ps>0?"+":"")+ps+"%";$("#wev").textContent=(pe>0?"+":"")+pe+"%";
 function K(l,v,d,c){return'<div class="card kpi"><div class="l">'+l+'</div><div class="v">'+v+'</div><div class="d '+c+'">'+d+'</div></div>'}
 $("#wi").innerHTML=K("New sales",fmt(ns),(ps>=0?"+":"")+ps+"% vs now",ps>=0?"up":"dn")+K("New expenses",fmt(ne),(pe>=0?"+":"")+pe+"% vs now",pe<=0?"up":"dn")+K("New profit",fmt(np),(dp>=0?"+":"")+fmt(dp)+" vs now",dp>=0?"up":"dn")+K("New margin",(ns?(np/ns*100):0).toFixed(1)+"%","now "+s.mg.toFixed(1)+"%",np/(ns||1)*100>=s.mg?"up":"dn")}
$("#ws").oninput=$("#we").oninput=whatif;
$("#clr").onclick=function(){set("bp_hist","[]");renderHist();toast("Saved reports cleared.")};
/* plans and billing */
var PLANS={free:{n:"Free",p:0,lim:3,f:["3 AI reports a month","CSV upload, charts and KPIs","Assistant bot (Roman Urdu too)"]},pro:{n:"Pro",p:1499,lim:30,f:["30 AI reports a month","Everything in Free","Forecast and what-if simulator","Saved report history","Priority support"]},biz:{n:"Business",p:3999,lim:999,f:["Unlimited reports","Everything in Pro","Up to 5 team members","Multiple shops (coming soon)","WhatsApp and email reports (coming soon)"]}};
var ACC={"JazzCash":"03XX-XXXXXXX","Easypaisa":"03XX-XXXXXXX","Bank transfer":"Bank name, IBAN PKXX XXXX XXXX XXXX XXXX XXXX"},payK="pro";
function plan(){return get("bp_plan")||"free"}
function monthCount(){if(window.BPLive&&BPLive.used!=null)return BPLive.used;var h=JSON.parse(get("bp_hist")||"[]"),n=new Date();return h.filter(function(r){var d=new Date(r.id);return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()}).length}
function planCards(ctx){var cur=plan();return'<div class="plans">'+Object.keys(PLANS).map(function(k){var p=PLANS[k],now=ctx==="app"&&cur===k;return'<div class="card plan'+(k==="pro"?' rec':'')+'">'+(k==="pro"?'<span class="badge">Most popular</span>':'')+'<h2>'+p.n+'</h2><div class="price">'+(p.p?'Rs '+p.p.toLocaleString("en-US"):'Free')+'<small>'+(p.p?' / month':'')+'</small></div><ul>'+p.f.map(function(x){return'<li>'+x+'</li>'}).join("")+'</ul><button class="btn'+(k==="pro"?'':' ghost')+'" data-plan="'+k+'"'+(now?' disabled':'')+'>'+(now?"Current plan":k==="free"?"Start free":"Choose "+p.n)+'</button></div>'}).join("")+'</div>'}
function bindPlans(root){root.querySelectorAll("[data-plan]").forEach(function(b){b.onclick=function(){var k=b.dataset.plan;if(!user()){if(k!=="free")set("bp_want",k);location.hash="#login";return}if(k==="free"){toast("The Free plan applies when your paid month ends.");return}openPay(k)}})}
function renderBilling(){var k=plan(),p=PLANS[k],used=monthCount(),pend=JSON.parse(get("bp_pay")||"null"),h='<div class="card"><h2>Current plan: '+p.n+'</h2><p class="sub" style="margin-bottom:10px">Reports used this month: '+used+' of '+(p.lim>=999?"unlimited":p.lim)+'</p><div class="meter"><i style="width:'+(p.lim>=999?8:Math.min(100,used/p.lim*100))+'%"></i></div></div>';
 if(pend&&pend.status==="pending")h+='<div class="warn" style="margin-top:14px"><span><b>Payment under review:</b> '+PLANS[pend.plan].n+' via '+pend.method+', transaction '+pend.tid+'. Your plan turns on after we verify it.</span>'+(window.BPLive?'':'<button class="btn" id="appr">Demo: approve</button>')+'</div>';
 $("#bill").innerHTML=h+'<div style="margin-top:22px">'+planCards("app")+'</div>';bindPlans($("#bill"));var a=$("#appr");if(a)a.onclick=function(){set("bp_plan",pend.plan);pend.status="active";set("bp_pay",JSON.stringify(pend));renderBilling();updChip();toast("Plan activated (demo approval).")}}
function updChip(){$("#who").textContent=user()+" – "+PLANS[plan()].n}
function payInfo(){var m=document.querySelector("input[name=pm]:checked").value;$("#pins").textContent="Send Rs "+PLANS[payK].p.toLocaleString("en-US")+" to "+ACC[m]+" (account title: BizPilot AI). Then enter the transaction ID below. These account details are placeholders for now."}
function openPay(k){payK=k;$("#pt2").textContent="Upgrade to "+PLANS[k].n;$("#pamt").textContent="Rs "+PLANS[k].p.toLocaleString("en-US")+" per month";payInfo();$("#pay").classList.remove("hide");$("#pph").focus()}
$$("input[name=pm]").forEach(function(r){r.onchange=payInfo});
$("#pc").onclick=function(){$("#pay").classList.add("hide")};
document.addEventListener("keydown",function(e){if(e.key==="Escape")$("#pay").classList.add("hide")});
$("#pf").onsubmit=function(e){e.preventDefault();if(window.BPLive){BPLive.pay({plan:payK,method:document.querySelector("input[name=pm]:checked").value,tid:$("#ptid").value.trim(),phone:$("#pph").value.trim()});return}set("bp_pay",JSON.stringify({plan:payK,method:document.querySelector("input[name=pm]:checked").value,tid:$("#ptid").value.trim(),phone:$("#pph").value.trim(),status:"pending"}));$("#pay").classList.add("hide");$("#pf").reset();location.hash="#billing";renderBilling();toast("Payment submitted. We will verify it and activate your plan.")};
$("#lplans").innerHTML=planCards("land");bindPlans($("#lplans"));
$$("[data-go]").forEach(function(b){b.onclick=function(){var t=$("#"+b.dataset.go);if(t)t.scrollIntoView({behavior:"smooth"})}});
$("#lsi").onclick=$("#lst").onclick=$("#lh").onclick=function(){location.hash="#login"};
/* assistant bot */
var bot=$("#bot"),bl=$("#bl");
function say(t,me){var d=document.createElement("div");d.className="bm"+(me?" me":"");d.textContent=t;bl.appendChild(d);bl.scrollTop=bl.scrollHeight}
function answer(q){q=q.toLowerCase();var s=stats(),a=anomalies(),ur=/kitna|kitni|kya|batao|mera|meri|kharcha|munafa|bikri|kaisa|kyun|nahi|karo|\bhai\b/.test(q);function L(e,u){return ur?u:e}
 var lo=D.s.indexOf(Math.min.apply(null,D.s)),fs=lin(D.s,3),fe=lin(D.e,3);
 if(/anomal|error|galat|typo|unusual/.test(q))return a.length?L(D.m[a[0]]+" expenses ("+fmt(D.e[a[0]])+") look far above your other months. Use the fix button on the dashboard.",D.m[a[0]]+" ka kharcha ("+fmt(D.e[a[0]])+") baaqi mahino se bohot zyada hai. Dashboard par fix button use karo."):L("I found no unusual values in your data.","Data me koi ajeeb value nahi mili.");
 if(/forecast|predict|next|agle/.test(q))return L("If the trend continues, in 3 months sales could be "+fmt(fs[2])+" and expenses "+fmt(fe[2])+". It is an estimate only.","Agar trend yahi raha to 3 mahine baad sales "+fmt(fs[2])+" aur kharcha "+fmt(fe[2])+" ho sakta hai. Ye sirf andaza hai.");
 if(/best|top|behtar|sab se zyada/.test(q))return L("Your best month is "+D.m[s.bi]+" with "+fmt(D.s[s.bi])+" in sales.","Sab se acha mahina "+D.m[s.bi]+" hai, sales "+fmt(D.s[s.bi])+".");
 if(/worst|lowest|weak|sab se kam/.test(q))return L("Your weakest sales month is "+D.m[lo]+" with "+fmt(D.s[lo])+".","Sab se kamzor mahina "+D.m[lo]+" hai, sales "+fmt(D.s[lo])+".");
 if(/profit|munafa|margin/.test(q))return L("Net profit is "+fmt(s.tp)+", a margin of "+s.mg.toFixed(1)+"%."+(a.length?" A suspicious expense entry may be distorting this.":""),"Net munafa "+fmt(s.tp)+" hai, yani margin "+s.mg.toFixed(1)+"%."+(a.length?" Ek shak wali expense entry isay bigaar sakti hai.":""));
 if(/expens|kharch|cost/.test(q))return L("Total expenses are "+fmt(s.te)+", which is "+s.er.toFixed(0)+"% of sales.","Kul kharcha "+fmt(s.te)+" hai, jo sales ka "+s.er.toFixed(0)+"% hai.");
 if(/sales|bikri|revenue/.test(q))return L("Total sales are "+fmt(s.ts)+". They moved "+s.g.toFixed(0)+"% from "+D.m[0]+" to "+D.m[D.m.length-1]+".","Kul sales "+fmt(s.ts)+" hain. "+D.m[0]+" se "+D.m[D.m.length-1]+" tak "+s.g.toFixed(0)+"% change hua.");
 if(/trend|growth|badh/.test(q))return L("Sales changed "+s.g.toFixed(0)+"% overall and "+s.last.toFixed(1)+"% in the latest month.","Sales overall "+s.g.toFixed(0)+"% badli aur aakhri mahine "+s.last.toFixed(1)+"%.");
 if(/report|pdf/.test(q))return L("Run the agent team to create a report, then open the Report tab and press Download as PDF.","Pehle agent team run karo, phir Report tab me Download as PDF dabao.");
 if(/^(hi|hello|hey|salam|assalam)/.test(q))return L("Hello! Ask me about your sales, expenses, profit or forecast.","Assalam o alaikum! Sales, kharcha, munafa ya forecast ke baare me poocho.");
 return L("I can answer questions about sales, expenses, profit, best month, forecast and data errors. Try one of the suggestions below.","Main sales, kharcha, munafa, best mahina, forecast aur data ki ghaltiyon ke baare me bata sakta hoon. Neeche di gayi suggestions try karo.")}
function ask(t){if(!t.trim())return;say(t,1);if(window.BPLive){BPLive.chat(t,function(a){say(a)},function(){say(answer(t))});return}setTimeout(function(){say(answer(t))},350)}
$("#sg").innerHTML=["What is my profit?","Best month?","Forecast","Any data errors?","Mera kharcha kitna hai?"].map(function(t){return'<button type="button">'+t+'</button>'}).join("");
$$("#sg button").forEach(function(b){b.onclick=function(){ask(b.textContent)}});
$("#bf").onsubmit=function(e){e.preventDefault();var i=$("#bi");ask(i.value);i.value=""};
$("#fab").onclick=function(){bot.classList.toggle("hide");if(!bot.classList.contains("hide"))$("#bi").focus()};
$("#bx").onclick=function(){bot.classList.add("hide")};
say("Hi! I’m the BizPilot assistant. Ask me about your sales, expenses, profit or forecast. You can also write in Roman Urdu.");
var _route=route;route=function(){_route();var on=!!user();if(on){updChip();if(location.hash==="#billing")renderBilling();if(window.BPLive&&BPLive.onRoute)BPLive.onRoute(location.hash)}$("#fab").classList.toggle("hide",!on);if(!on)bot.classList.add("hide")};
window.BP={get D(){return D},toast:toast,get:get,set:set,route:route,renderBilling:renderBilling,renderHist:renderHist,renderAll:renderAll,fmt:fmt,say:say,typeInto:typeInto,updChip:updChip};
window.addEventListener("hashchange",route);renderAll();renderHist();route();
})();