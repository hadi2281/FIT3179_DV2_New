/* Extra charts, global "time machine" controls, ASEAN flow map, country explorer. Loaded before main.js. */
const OKABE=["#0072B2","#D55E00","#009E73","#E69F00","#56B4E9","#CC79A7","#6A3D9A","#444444"];
const ASEAN=["Malaysia","Indonesia","Thailand","Viet Nam","The Philippines","Lao PDR","Myanmar","Cambodia","Singapore","Brunei Darussalam"];
const ASEAN_ISO=["MYS","IDN","THA","VNM","LAO","MMR","KHM","SGP","PHL","BRN"];
const MET={renew:["Hydro","Wind","Solar","Bioenergy","Other renewables"],fossil:["Coal","Gas","Other fossil"],coal:["Coal"],gas:["Gas"],
  solarwind:["Solar","Wind"],hydro:["Hydro"],nuclear:["Nuclear"],clean:["Hydro","Wind","Solar","Bioenergy","Other renewables","Nuclear"]};
const MET_LABEL={renew:"Renewables",fossil:"Fossil fuels",coal:"Coal",gas:"Gas",solarwind:"Wind and solar",hydro:"Hydro",nuclear:"Nuclear",clean:"Clean (renewables + nuclear)"};
const STATE={yr:2024,metric:"renew"},VIEWS=[];
const fmt=(n,d=1)=>Number(n).toLocaleString("en",{maximumFractionDigits:d});
const hl=f=>({params:[{name:"hl",select:{type:"point",fields:[f]},bind:"legend"}]});
const hlOp={condition:{param:"hl",value:1},value:0.25};
const baseParams=()=>[{name:"yr",value:STATE.yr},{name:"metric",value:STATE.metric}];
const setText=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t;};
const srcColor=()=>({domain:sourceOrder,range:sourceOrder.map(s=>COLORS[s])});
const myGen=(rows,s,y)=>{const r=rows.find(d=>d.Area==="Malaysia"&&d["Electricity source"]===s&&+d.Year===y);
  return r?{g:+r["Generation (TWh)"],s:+r["Share of generation (%)"]}:null;};
const renewShare=(rows,a,y)=>{let t=0,f=false;rows.forEach(d=>{if(d.Area===a&&+d.Year===y&&MET.renew.includes(d["Electricity source"])&&d["Share of generation (%)"]!==""){t+=+d["Share of generation (%)"];f=true;}});return f?t:null;};

/* ---------- time machine: one slider + metric picker drives every map ---------- */
function applyState(v){["yr","metric"].forEach(n=>{try{v.signal(n,STATE[n]);}catch(e){}});v.run();}
function reg(p,onClick){p.then(r=>{VIEWS.push(r.view);applyState(r.view);if(onClick)r.view.addEventListener("click",onClick);});return p;}
function syncUI(){
  setText("yr-out",STATE.yr);setText("map-title",`Which countries get the most electricity from ${MET_LABEL[STATE.metric].toLowerCase()}?`);
  const s=document.getElementById("yr-slider");if(s)s.value=STATE.yr;
}
function setState(k,v){STATE[k]=v;syncUI();VIEWS.forEach(applyState);}
function initControls(){
  const play=document.getElementById("play"),sl=document.getElementById("yr-slider"),sel=document.getElementById("metric");
  if(!play)return;
  sel.innerHTML=Object.keys(MET_LABEL).map(k=>`<option value="${k}">${MET_LABEL[k]}</option>`).join("");
  sel.onchange=()=>setState("metric",sel.value);sl.oninput=()=>setState("yr",+sl.value);
  let timer=null;const stop=()=>{clearInterval(timer);timer=null;play.textContent="▶ Play";};
  play.onclick=()=>{if(timer)return stop();if(STATE.yr>=2024)setState("yr",2000);play.textContent="❚❚ Pause";
    timer=setInterval(()=>{if(STATE.yr>=2024)return stop();setState("yr",STATE.yr+1);},600);};
  syncUI();
}

/* ---------- map data ---------- */
function buildSeries(w){
  const ser=new Map(),emptyM=()=>Object.fromEntries(Object.keys(MET).map(k=>[k,{}]));
  w.forEach(d=>{const y=+d.year;if(d.total==="")return;
    const o=ser.get(d.iso)||{area:d.country,tot:{},m:emptyM()};ser.set(d.iso,o);o.tot[y]=+d.total;
    Object.keys(MET).forEach(k=>{if(d[k]!==""&&d[k]!==undefined)o.m[k][y]=+d[k];});});
  return {ser,emptyM};
}
function choroLayers(feats){
  return [{data:{values:feats},mark:{type:"geoshape",fill:"#e3e6e0",stroke:"#fff",strokeWidth:.5}},
   {data:{values:feats},transform:[{calculate:"datum.properties.m[metric][yr]",as:"val"},{filter:"isValid(datum.val)"}],
    mark:{type:"geoshape",stroke:"#fff",strokeWidth:.5,cursor:"pointer"},
    encoding:{color:{field:"val",type:"quantitative",title:"Share of electricity (%)",scale:{scheme:"viridis",domain:[0,100]},legend:{orient:"bottom"}},
      tooltip:[{field:"properties.name",type:"nominal",title:"Country"},{field:"val",type:"quantitative",title:"Share of electricity (%)",format:".1f"}]}}];
}
function arcPts(a,b,k){const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[0]-a[0],dy=b[1]-a[1],cx=mx-dy*k,cy=my+dx*k,out=[];
  for(let i=0;i<=24;i++){const t=i/24;out.push([(1-t)*(1-t)*a[0]+2*(1-t)*t*cx+t*t*b[0],(1-t)*(1-t)*a[1]+2*(1-t)*t*cy+t*t*b[1]]);}return out;}

async function buildMaps(rows,feats){
  initControls();
  const w=await d3.csv("data/world-mix.csv"),{ser,emptyM}=buildSeries(w),pts=[],byArea=new Map();
  feats.forEach(f=>{const p=f.properties,iso=p.ISO_A3&&p.ISO_A3!=="-99"?p.ISO_A3:p.ADM0_A3,o=ser.get(iso);
    p.iso=iso;p.name=p.NAME||p.ADMIN;p.m=o?o.m:emptyM();p.area=o?o.area:null;
    if(!o)return;const c=d3.geoCentroid(f);
    Object.keys(o.tot).forEach(y=>pts.push({country:p.name,longitude:c[0],latitude:c[1],year:+y,generation:o.tot[y],m:Object.fromEntries(Object.keys(MET).map(k=>[k,o.m[k][y]]))}));});
  const pick=document.getElementById("country-pick"),names=[...ser.values()].map(o=>o.area).sort();
  const onClick=(e,item)=>{const a=item&&item.datum&&item.datum.properties&&item.datum.properties.area;if(a){if(pick)pick.value=a;showCountry(w,a);}};
  reg(render("renewables-map",{width:"container",height:400,projection:{type:"equalEarth"},params:baseParams(),layer:choroLayers(feats)}),onClick);
  reg(render("generation-bubble-map",{width:"container",height:400,projection:{type:"equalEarth"},params:baseParams(),layer:[
    {data:{values:feats},mark:{type:"geoshape",fill:"#e3e6e0",stroke:"#fff",strokeWidth:.45}},
    {data:{values:pts},transform:[{filter:"datum.year===yr"},{calculate:"datum.m[metric]",as:"val"}],mark:{type:"circle",opacity:.78,stroke:"#fff",strokeWidth:.7},
     encoding:{longitude:{field:"longitude",type:"quantitative"},latitude:{field:"latitude",type:"quantitative"},
       size:{field:"generation",type:"quantitative",title:"Generation (TWh)",scale:{domain:[0,d3.max(pts,d=>d.generation)],range:[10,1500]},legend:{orient:"bottom",values:[10,100,1000,5000]}},
       color:{field:"val",type:"quantitative",title:"Share of electricity (%)",scale:{scheme:"viridis",domain:[0,100]}},
       order:{field:"generation",sort:"descending"},
       tooltip:[{field:"country",title:"Country"},{field:"generation",title:"Generation (TWh)",format:",.1f"},{field:"val",title:"Share (%)",format:".1f"}]}}]}));

  // ASEAN shared-grid map: choropleth + curved link arcs + generation nodes
  const hubs={MYS:["Malaysia",101.69,3.14,"L"],SGP:["Singapore",103.82,1.35,"R"],THA:["Thailand",100.5,13.75,"L"],LAO:["Laos",102.6,17.97,"L"],VNM:["Viet Nam",105.85,21.03,"R"],KHM:["Cambodia",104.92,11.56,"R"]};
  const links=[["MYS","SGP"],["MYS","THA"],["THA","LAO"],["LAO","VNM"],["THA","KHM"],["VNM","KHM"]];
  const arcs=links.map(([a,b])=>({type:"Feature",properties:{link:hubs[a][0]+" – "+hubs[b][0]},geometry:{type:"LineString",coordinates:arcPts(hubs[a].slice(1,3),hubs[b].slice(1,3),.12)}}));
  const nodePts=[];Object.keys(hubs).forEach(iso=>{const o=ser.get(iso);if(!o)return;Object.keys(o.tot).forEach(y=>nodePts.push({name:hubs[iso][0],side:hubs[iso][3],longitude:hubs[iso][1],latitude:hubs[iso][2],year:+y,generation:o.tot[y]}));});
  const pos={longitude:{field:"longitude",type:"quantitative"},latitude:{field:"latitude",type:"quantitative"}};
  const lab=(side,halo)=>({data:{values:nodePts},transform:[{filter:"datum.year===yr&&datum.side==='"+side+"'"}],
    mark:{type:"text",align:side==="L"?"right":"left",dx:side==="L"?-13:13,fontSize:12,fontWeight:700,color:halo?"#fffefa":"#182b28",
      ...(halo?{stroke:"#fffefa",strokeWidth:4,strokeJoin:"round"}:{})},encoding:{...pos,text:{field:"name"}}});
  const legBox={padding:8,titleLimit:260,fillColor:"#fffefaf0",strokeColor:"#d9ded5",cornerRadius:4,titleFontSize:11,labelFontSize:11};
  const aseanFeats=choroLayers(feats.filter(f=>ASEAN_ISO.includes(f.properties.iso)));
  aseanFeats[1].encoding.color.legend={orient:"bottom-left",offset:12,gradientLength:200,...legBox};
  reg(render("asean-map",{width:"container",height:580,projection:{type:"mercator",center:[106,10],scale:1150},params:baseParams(),layer:[...aseanFeats,
    {data:{values:arcs},mark:{type:"geoshape",filled:false,stroke:"#182b28",strokeWidth:2.2,strokeDash:[7,4]},encoding:{tooltip:[{field:"properties.link",type:"nominal",title:"Cross-border link"}]}},
    {data:{values:nodePts},transform:[{filter:"datum.year===yr"}],mark:{type:"circle",fill:"#fff",stroke:"#182b28",strokeWidth:2,opacity:.95},
     encoding:{...pos,size:{field:"generation",type:"quantitative",title:"Generation (TWh)",scale:{domain:[0,d3.max(nodePts,d=>d.generation)],range:[50,650]},legend:{orient:"top-left",offset:12,values:[10,50,200],...legBox}},
       tooltip:[{field:"name",title:"Country"},{field:"generation",title:"Generation (TWh)",format:",.1f"}]}},
    lab("L",true),lab("R",true),lab("L",false),lab("R",false)]}));

  // country explorer
  if(pick){pick.innerHTML=names.map(n=>`<option>${n}</option>`).join("");pick.value="Thailand";pick.onchange=()=>showCountry(w,pick.value);}
  showCountry(w,"Thailand");
  aseanDumbbell(w);
}

const EXPL=[["Coal","coal"],["Gas","gas"],["Oil","oil"],["Hydro","hydro"],["Wind","wind"],["Solar","solar"],["Bioenergy","bio"],["Other renewables","otherren"],["Nuclear","nuclear"]];
function showCountry(w,area){
  const names=[area,"Malaysia"].filter((a,i,r)=>r.indexOf(a)===i),vals=[];
  w.forEach(d=>{if(!names.includes(d.country))return;EXPL.forEach(([n,k],i)=>{if(d[k]!=="")vals.push({area:d.country,year:+d.year,source:n,share:+d[k],idx:i});});});
  const rng=["Coal","Gas","Other fossil","Hydro","Wind","Solar","Bioenergy","Other renewables","Nuclear"].map(s=>COLORS[s]);
  render("country-explorer",{data:{values:vals},facet:{field:"area",type:"nominal",sort:names,title:null,header:{labelFontSize:14,labelFontWeight:700}},columns:2,
    spec:{width:420,height:240,mark:"area",encoding:{x:{field:"year",type:"quantitative",title:null,axis:{format:"d",tickCount:5}},
      y:{field:"share",type:"quantitative",stack:"normalize",title:"Share of electricity",axis:{format:"%"}},
      color:{field:"source",type:"nominal",title:"Source",scale:{domain:EXPL.map(e=>e[0]),range:rng}},order:{field:"idx",type:"quantitative"},
      tooltip:[{field:"area",title:"Country"},{field:"year",title:"Year",format:"d"},{field:"source",title:"Source"},{field:"share",title:"Share (%)",format:".1f"}]}}});
  const g=y=>{const r=w.find(d=>d.country===area&&+d.year===y);return r&&r.renew!==""?+r.renew:null;},a0=g(2000),a1=g(2024);
  if(a0!==null&&a1!==null)setText("take-explorer",`${area}: renewables supplied ${fmt(a0,0)}% of electricity in 2000 and ${fmt(a1,0)}% in 2024.`);
}

function aseanDumbbell(w){
  const dd=[];w.forEach(d=>{if(ASEAN_ISO.includes(d.iso)&&["2000","2024"].includes(d.year)&&d.renew!=="")dd.push({country:d.country,year:d.year,share:+d.renew});});
  const ord=dd.filter(d=>d.year==="2024").sort((a,b)=>b.share-a.share).map(d=>d.country);
  render("asean-dumbbell",{width:"container",height:330,data:{values:dd},
    encoding:{y:{field:"country",type:"nominal",sort:ord,title:null,axis:{labelFontWeight:{expr:"datum.value==='Malaysia'?700:400"}}}},
    layer:[{transform:[{pivot:"year",value:"share",groupby:["country"]}],mark:{type:"rule",strokeWidth:3,color:"#b9c2bc"},
        encoding:{x:{field:"2000",type:"quantitative",title:"Renewables' share of generation (%)"},x2:{field:"2024"}}},
      {mark:{type:"point",filled:true,size:130,opacity:1,tooltip:true},
       encoding:{x:{field:"share",type:"quantitative"},color:{field:"year",type:"nominal",title:"Year",scale:{domain:["2000","2024"],range:["#E69F00","#0072B2"]}},
         shape:{field:"year",type:"nominal",title:"Year",scale:{domain:["2000","2024"],range:["circle","diamond"]}}}}]});
  const rk=ord.indexOf("Malaysia")+1;if(rk)setText("take-asean",`In 2024 Malaysia ranks ${rk} of ${ord.length} ASEAN countries for renewable share.`);
}

function stationMap(mf,st){
  const T=["Coal","Gas","Hydro","Solar"];
  render("malaysia-power-map",{width:"container",height:420,projection:{type:"mercator",center:[110.5,3.8],scale:1900},layer:[
    {data:{values:[mf]},mark:{type:"geoshape",fill:"#e8ece7",stroke:"#aebbb4",strokeWidth:.8}},
    {data:{values:st},params:[{name:"tech",select:{type:"point",fields:["type"]},bind:"legend"}],
     mark:{type:"point",filled:true,size:130,stroke:"#fffefa",strokeWidth:1.5},
     encoding:{longitude:{field:"longitude",type:"quantitative"},latitude:{field:"latitude",type:"quantitative"},
       color:{field:"type",type:"nominal",title:"Technology (click to isolate)",scale:{domain:T,range:[COLORS.Coal,COLORS.Gas,COLORS.Hydro,COLORS.Solar]},legend:{orient:"bottom"}},
       shape:{field:"type",type:"nominal",title:"Technology (click to isolate)",scale:{domain:T,range:["square","circle","triangle-up","diamond"]}},
       opacity:{condition:{param:"tech",value:.95},value:.2},
       tooltip:[{field:"name",type:"nominal",title:"Station"},{field:"state",type:"nominal",title:"State / region"},{field:"type",type:"nominal",title:"Technology"}]}}]});
}

function malaysiaCharts(rows){
  const my=rows.filter(d=>d.Area==="Malaysia"&&sourceOrder.includes(d["Electricity source"])&&+d.Year<=2024&&d["Generation (TWh)"]!=="")
    .map(d=>({year:+d.Year,source:d["Electricity source"],gen:+d["Generation (TWh)"],share:+d["Share of generation (%)"],idx:sourceOrder.indexOf(d["Electricity source"])}));
  const tip=[{field:"year",title:"Year",format:"d"},{field:"source",title:"Source"},{field:"gen",title:"Generation (TWh)",format:",.1f"},{field:"share",title:"Share (%)",format:".1f"}];

  reg(render("malaysia-mix",{width:"container",height:250,params:baseParams(),data:{values:my.filter(d=>d.year>=2000)},
    transform:[{filter:"datum.year===yr"}],mark:{type:"bar",cornerRadiusEnd:2,tooltip:true},
    encoding:{y:{field:"source",type:"nominal",sort:sourceOrder,title:null},
      x:{field:"gen",type:"quantitative",title:"Generation (TWh)",scale:{domain:[0,Math.ceil(d3.max(my,d=>d.gen)/10)*10]}},
      color:{field:"source",type:"nominal",legend:null,scale:srcColor()},tooltip:tip}}));

  reg(render("malaysia-stream",{width:"container",height:330,params:baseParams(),data:{values:my},layer:[
    {params:[{name:"hl",select:{type:"point",fields:["source"]},bind:"legend"}],mark:{type:"area",interpolate:"monotone"},
     encoding:{x:{field:"year",type:"quantitative",title:null,axis:{format:"d",tickCount:8}},y:{field:"gen",type:"quantitative",stack:"center",axis:null},
       color:{field:"source",type:"nominal",title:"Source (click to isolate)",scale:srcColor()},opacity:hlOp,order:{field:"idx",type:"quantitative"},tooltip:tip}},
    {mark:{type:"rule",color:"#182b28",strokeWidth:2,strokeDash:[5,4]},encoding:{x:{datum:{expr:"yr"},type:"quantitative"}}}]}));

  const six=["Coal","Gas","Other fossil","Hydro","Solar","Bioenergy"];
  render("malaysia-multiples",{data:{values:my.filter(d=>six.includes(d.source))},
    facet:{field:"source",type:"nominal",sort:six,title:null,header:{labelFontSize:13,labelFontWeight:600}},columns:3,
    spec:{width:300,height:115,mark:{type:"area",line:true,opacity:.55},
      encoding:{x:{field:"year",type:"quantitative",title:null,axis:{format:"d",tickCount:4}},
        y:{field:"share",type:"quantitative",title:"Share (%)",scale:{domain:[0,100]}},
        color:{field:"source",type:"nominal",legend:null,scale:srcColor()},tooltip:tip}}});

  const ch=six.map(s=>{const a=myGen(rows,s,2000),b=myGen(rows,s,2024);return a&&b?{source:s,change:b.g-a.g}:null;}).filter(Boolean).sort((a,b)=>b.change-a.change);
  render("malaysia-change",{width:"container",height:250,data:{values:ch},
    encoding:{y:{field:"source",type:"nominal",sort:"-x",title:null},x:{field:"change",type:"quantitative",title:"Change in output, 2000 to 2024 (TWh)"}},
    layer:[{mark:{type:"bar",cornerRadiusEnd:2,tooltip:true},encoding:{color:{field:"source",type:"nominal",legend:null,scale:srcColor()}}},
      {mark:{type:"text",fontSize:11,fontWeight:600,align:{expr:"datum.change<0?'right':'left'"},dx:{expr:"datum.change<0?-4:4"}},
       encoding:{text:{field:"change",type:"quantitative",format:"+.1f"},color:{value:"#182b28"}}}]});


  const t0=myGen(rows,"Total generation",2000),t1=myGen(rows,"Total generation",2024),c0=myGen(rows,"Coal",2000),c1=myGen(rows,"Coal",2024),
        g0=myGen(rows,"Gas",2000),g1=myGen(rows,"Gas",2024),cl=myGen(rows,"Clean",2024);
  if(t0&&t1&&c0&&c1&&g0&&g1&&cl){
    setText("kpi-total",fmt(t1.g,0)+" TWh");setText("kpi-total-sub",`${fmt(t1.g/t0.g,1)}x the ${fmt(t0.g,0)} TWh of 2000`);
    setText("kpi-coal",fmt(c1.s,0)+"%");setText("kpi-coal-sub",`up from ${fmt(c0.s,0)}% in 2000`);
    setText("kpi-gas",fmt(g1.s,0)+"%");setText("kpi-gas-sub",`down from ${fmt(g0.s,0)}% in 2000`);
    setText("kpi-clean",fmt(cl.s,0)+"%");setText("kpi-clean-sub","renewables in 2024");
    setText("take-stream",`Output is ${fmt(t1.g/t0.g,1)} times larger than in 2000. Gas supplied ${fmt(g0.s,0)}% of power then and ${fmt(g1.s,0)}% now, while coal rose from ${fmt(c0.s,0)}% to ${fmt(c1.s,0)}%. The dashed line follows the time machine.`);
  }
  if(ch.length)setText("take-change",`${ch[0].source} added the most output (${fmt(ch[0].change,1)} TWh). Solar's gain is real but still small beside it.`);
}
