import { useState, useEffect, useCallback } from "react";

// ─── PALETTE & CONSTANTS ─────────────────────────────────────────────────────
const C = {
  bg:       "#06101f",
  surface:  "rgba(255,255,255,0.03)",
  border:   "rgba(255,255,255,0.07)",
  muted:    "rgba(255,255,255,0.45)",
  dim:      "rgba(255,255,255,0.22)",
  hazard:   "#38bdf8",
  vuln:     "#fbbf24",
  future:   "#f87171",
  geo:      "#f87171",
  hydro:    "#38bdf8",
  meteo:    "#fbbf24",
  bio:      "#a78bfa",
  good:     "#34d399",
  warn:     "#fbbf24",
  bad:      "#f87171",
  nodata:   "rgba(255,255,255,0.3)",
};

const LAYERS = [
  { key:"hazard",        label:"Hazard Exposure",     color:C.hazard },
  { key:"vulnerability", label:"Vulnerability",        color:C.vuln   },
  { key:"future",        label:"Coping Capacity",   color:C.future },
];

const GROUP_COLOR = {
  Hydrological: C.hydro, Meteorological: C.meteo,
  Geophysical:  C.geo,   Biological:     C.bio,
};

const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Simple language catalog for header dropdown
const LANGUAGES = [
  { code:"ENG", label:"English" },
  { code:"RUS", label:"Русский" },
];

const TREND = {
  RIGHT:    { label:"Right Direction",           color:C.good,   icon:"↗" },
  RIGHT_NT: { label:"Right Direction, No Target",color:C.good,   icon:"↗" },
  OFFTRACK: { label:"Off Track",                 color:C.warn,   icon:"→" },
  WRONG:    { label:"Wrong Direction",            color:C.bad,    icon:"↘" },
  NODATA:   { label:"Insufficient Data",          color:C.nodata, icon:"?" },
};

const fmtN = n => n >= 1e6 ? `${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : String(n);
const fmtM = n => n == null ? "—" : n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${n}`;
const polar = (cx,cy,r,deg) => { const a=((deg-90)*Math.PI)/180; return {x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}; };

// ─── COUNTRY DATA ─────────────────────────────────────────────────────────────
const COUNTRIES = {
  ARM: {
    id:"ARM", name:"Armenia", region:"South Caucasus", short:"ARM", wbISO:"ARM",
    totalEvents:26, yearRange:"1982–2024",
    hazard:0.52, vulnerability:0.68, future:0.65, confidence:0.58,
    dominantHazards:["Flash Floods","Earthquakes","Mass Movement"],
    knownDeaths:448, knownAffected:388496, knownLoss:56876650,
    deathCov:8, affCov:11, lossCov:3,
    hazardBreakdown:{ Hydrological:14, Meteorological:6, Geophysical:5, Biological:1 },

    narrative: "Armenia faces a compound risk profile where hydrological hazards — primarily flash floods — account for over half of all recorded events, while Soviet-era infrastructure consistently amplifies their impact. The 1982 earthquake (400 deaths) and 2014 floods (25 deaths, 4,700 houses, $5M loss) define the upper bound of recorded losses, but data coverage remains partial across most events. Infrastructure decay rates of 79–97% in heating and electricity networks mean any moderate event can cascade rapidly. Looking forward, projected temperature rises of +5°C by 2100 and growing water stress will compound an already stretched system.",

    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",           val:"448",          note:"8 of 26 events — severe undercount",                   conf:"low"    },
      { group:"Disaster Record",    label:"People affected (partial)",           val:"388K",          note:"11 of 26 events — 2000 drought dominates at 297K",     conf:"low"    },
      { group:"Disaster Record",    label:"Recorded economic losses",            val:"$57M",          note:"3 of 26 events — severe undercount",                   conf:"low"    },
      { group:"Disaster Record",    label:"Losses 1994–2015 (all hazards)",      val:">$1.5B",        note:"Floods, EQ, drought, hail, mudflows — World Bank 2017", conf:"medium" },
      { group:"Infrastructure",     label:"Critical infrastructure condition",   val:"79–97% worn",   note:"Electricity 97%, heating 79%, water 58–62% — Yerevan City Passport 2025", conf:"medium" },
      { group:"Infrastructure",     label:"Population below poverty line",       val:"35%",           note:"Amplifies disaster vulnerability — Armenia NAP 2021",   conf:"medium" },
      { group:"Infrastructure",     label:"Unemployment rate",                   val:"28.6%",         note:"Limits adaptive capacity — Armenia NAP 2021",          conf:"medium" },
      { group:"Infrastructure",     label:"Early warning system status",         val:"Partial",       note:"Not nationwide — UNDP Armenia DRR 2023 / NAP 2021 §2.3", conf:"medium" },
      { group:"Climate & Future",   label:"Observed temperature rise",           val:"+1.23°C",       note:"1929–2016 vs 1961–1990 baseline — 4th Nat. Comm. 2020", conf:"high"   },
      { group:"Climate & Future",   label:"Observed precipitation change",       val:"–9%",           note:"1935–2016 annual average, trend accelerating — NAP 2021", conf:"high"  },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",         val:"+3.3°C",        note:"National avg, METRAS model RCP8.5 — NAP 2021 Table 1",  conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2100",         val:"+4.7°C",        note:"National avg, METRAS/4th Nat. Comm. 2020 RCP8.5",       conf:"low"    },
      { group:"Economic Exposure",  label:"NDC emissions baseline (1990)",       val:"25,855 Gg CO₂eq",note:"Reference year for 40% reduction target — NDC 2021",   conf:"high"   },
      { group:"Economic Exposure",  label:"NDC 2030 emissions target",           val:"≤15,513 Gg",    note:"40% below 1990 baseline — Decree N610-L, Apr 2021",     conf:"high"   },
      { group:"Economic Exposure",  label:"GDP loss without climate action",     val:"~1.3%/yr",      note:"World Bank Country Climate and Development Report 2022", conf:"low"    },
      { group:"Economic Exposure",  label:"Agriculture sector exposure",         val:"High",          note:"Water scarcity & heat stress threaten food systems",     conf:"medium" },
      { group:"Governance & Capacity", label:"NAP status",                       val:"Adopted 2021",  note:"NAP 2021–2025 — GCF-UNDP project, Decree N749-L",      conf:"high"   },
      { group:"Governance & Capacity", label:"NDC status",                       val:"Adopted 2021",  note:"2nd NDC — 40% below 1990 by 2030, Decree N610-L",      conf:"high"   },
      { group:"Governance & Capacity", label:"Adaptation M&E system",            val:"Absent",        note:"Not yet established — flagged as critical gap, NAP 2021 §46", conf:"high" },
      { group:"Governance & Capacity", label:"Climate budget tagging",           val:"Not implemented",note:"Identified as priority measure — NAP 2021 measure 2.7", conf:"medium" },
    ],

    policy: [
      { area:"Disaster Risk",  indicator:"National DRR strategy",              trend:"RIGHT",    val:"Adopted 2022",       target:"Sendai aligned 2022–2030",    source:"Armenia DRR Strategy 2022",        year:2022 },
      { area:"Disaster Risk",  indicator:"Multi-hazard early warning system",  trend:"OFFTRACK", val:"Partial",            target:"Nationwide coverage",         source:"NAP Armenia 2021 §2.3",            year:2021 },
      { area:"Disaster Risk",  indicator:"Community / local DRR plans",        trend:"OFFTRACK", val:"34% complete",       target:"100% by 2030",                source:"UNDP Armenia DRR Report 2023",     year:2023 },
      { area:"Climate",        indicator:"NDC emissions reduction target",      trend:"RIGHT_NT", val:"40% below 1990",     target:"By 2030 (Decree N610-L)",     source:"Armenia NDC 2021",                 year:2021 },
      { area:"Climate",        indicator:"NAP adoption & implementation",       trend:"OFFTRACK", val:"Adopted 2021",       target:"2021–2025 cycle (5 yr)",      source:"Armenia NAP 2021, Decree N749-L",  year:2021 },
      { area:"Climate",        indicator:"Renewable / low-carbon energy",       trend:"RIGHT",    val:"59 MW solar → 1000 MW",target:"By 2030",                  source:"Armenia Energy Strategy 2040",     year:2021 },
      { area:"Climate",        indicator:"Climate finance mobilised",           trend:"NODATA",   val:"—",                  target:"Financing plan pending",      source:"Armenia NDC 2021 — FFIPCCA",       year:2021 },
      { area:"Adaptation",     indicator:"Adaptation M&E / MRV system",        trend:"WRONG",    val:"Absent",             target:"Operational by 2022",         source:"NAP 2021 §6 — priority gap",       year:2021 },
      { area:"Adaptation",     indicator:"Sectoral adaptation plans",           trend:"OFFTRACK", val:"Water: in dev. / Ag: partial", target:"All sectors by 2022", source:"NAP 2021 measures 1.1–1.2",      year:2022 },
      { area:"Adaptation",     indicator:"Climate-proofing infrastructure",     trend:"OFFTRACK", val:"In review",          target:"CCA in norms by 2024",        source:"NAP 2021 measure 2.9",             year:2024 },
    ],

    events:[
      {year:2024,month:5,  group:"Hydrological",  type:"Flash Flood",   deaths:4,  affected:10000,econLoss:50000000,location:"Lori & Tavush",       source:"GDACS/IFRC",sl:1.0},
      {year:2024,month:3,  group:"Geophysical",   type:"Earthquake",    deaths:null,affected:null, econLoss:null,    location:null,                  source:"DesInventar",sl:0.6},
      {year:2023,month:6,  group:"Meteorological",type:"Hailstorm",     deaths:null,affected:18000,econLoss:null,    location:"South Armenia",       source:"IFRC",sl:1.0},
      {year:2021,month:4,  group:"Meteorological",type:"Windstorm",     deaths:6,  affected:73,   econLoss:null,    location:"Vostan",               source:"DesInventar",sl:0.6},
      {year:2021,month:4,  group:"Geophysical",   type:"Mudslide",      deaths:null,affected:2,    econLoss:null,    location:null,                  source:"DesInventar",sl:0.6},
      {year:2020,month:8,  group:"Hydrological",  type:"Drought",       deaths:null,affected:null, econLoss:null,    location:"Armenia",             source:"Copernicus",sl:0.6},
      {year:2020,month:3,  group:"Biological",    type:"COVID-19",      deaths:null,affected:null, econLoss:null,    location:"Armenia",             source:"WHO",sl:1.0},
      {year:2018,month:2,  group:"Geophysical",   type:"Earthquake",    deaths:null,affected:null, econLoss:null,    location:null,                  source:"DesInventar",sl:0.6},
      {year:2014,month:5,  group:"Hydrological",  type:"Flash Flood",   deaths:25, affected:1666, econLoss:5055000, location:"Paravaqar; Chinari",  source:"DesInventar",sl:0.6},
      {year:2013,month:12, group:"Meteorological",type:"Cold Wave",     deaths:null,affected:12000,econLoss:null,    location:null,                  source:"IFRC",sl:1.0},
      {year:2013,month:5,  group:"Meteorological",type:"Hailstorm",     deaths:null,affected:48000,econLoss:null,    location:"Armavir",             source:"IFRC",sl:1.0},
      {year:2010,month:10, group:"Hydrological",  type:"Flash Flood",   deaths:3,  affected:926,  econLoss:null,    location:null,                  source:"DesInventar",sl:0.6},
      {year:2000,month:6,  group:"Hydrological",  type:"Drought",       deaths:null,affected:297000,econLoss:1821650,location:"8 provinces",        source:"OCHA",sl:1.0},
      {year:1994,month:5,  group:"Hydrological",  type:"Flood",         deaths:5,  affected:400,  econLoss:null,    location:"Armenia",             source:"DFO",sl:1.0},
      {year:1982,month:12, group:"Geophysical",   type:"Earthquake",    deaths:400,affected:null,  econLoss:null,    location:null,                  source:"DesInventar",sl:0.6},
    ],
  },

  BLR: {
    id:"BLR", name:"Belarus", region:"Eastern Europe", short:"BLR", wbISO:"BLR",
    totalEvents:24, yearRange:"1993–2025",
    hazard:0.35, vulnerability:0.45, future:0.50, confidence:0.62,
    dominantHazards:["Extreme Temperature","Floods","Epidemics"],
    knownDeaths:7189, knownAffected:1204079, knownLoss:73300000,
    deathCov:8, affCov:13, lossCov:1,
    hazardBreakdown:{ Hydrological:12, Meteorological:9, Biological:3, Geophysical:0 },

    narrative: "Belarus presents a fundamentally different risk profile from Central Asian neighbours — no seismic exposure, lower hazard frequency, and relatively stronger baseline infrastructure. The dominant threats are extreme temperature events (heat waves accounting for 4 of 8 recorded death events) and epidemics, including COVID-19 which generated 99% of all recorded affected figures. Flood risk is present but moderate, concentrated in western oblasts. The more significant long-term concern is climate trajectory: heat extremes that were once rare are now recurring annually, and the country lacks a comprehensive DRR framework aligned to this shifting pattern.",

    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",           val:"7,182",         note:"Dominated by COVID-19 (7,118) — WHO 2020",             conf:"medium" },
      { group:"Disaster Record",    label:"People affected (partial)",           val:"1.11M",         note:"10 of 24 nat. events — COVID dominates",               conf:"low"    },
      { group:"Disaster Record",    label:"Recorded economic losses",            val:"$73M",          note:"1 of 24 events (1997 storm) — extreme undercount",     conf:"low"    },
      { group:"Disaster Record",    label:"Recurring heat events (count)",       val:"5",             note:"2006, 2010, 2013, 2014, 2017 — annual threat emerging", conf:"high"   },
      { group:"Infrastructure",     label:"Critical infrastructure condition",   val:"Ageing Soviet stock", note:"Energy efficiency concern — UNDP Belarus 2022",  conf:"medium" },
      { group:"Infrastructure",     label:"Population below poverty line",       val:"5.6%",          note:"Lower than regional avg — World Bank 2022",            conf:"high"   },
      { group:"Infrastructure",     label:"Unemployment rate",                   val:"3.8%",          note:"Official rate — World Bank 2022",                      conf:"medium" },
      { group:"Infrastructure",     label:"Early warning system status",         val:"Exists",        note:"Multi-hazard EWS operational — Belarus MES 2023",      conf:"high"   },
      { group:"Climate & Future",   label:"Observed temperature rise",           val:"+1.5°C",        note:"1990–2023 trend — Belarus State Committee for Hydrometeorology", conf:"medium" },
      { group:"Climate & Future",   label:"Observed precipitation change",       val:"+5% (variable)",note:"Mixed signal — wetter west, drier east — IPCC AR6",   conf:"low"    },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",         val:"+2.1°C",        note:"IPCC AR6 Eastern Europe / Belarus Nat. Comm. 2022",     conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2100",         val:"+4.0°C",        note:"High-emission scenario — Belarus Nat. Comm. 2022",      conf:"low"    },
      { group:"Economic Exposure",  label:"NDC emissions baseline (1990)",       val:"139,146 Gg CO₂eq",note:"1990 reference — Belarus NDC 2021",                 conf:"high"   },
      { group:"Economic Exposure",  label:"NDC 2030 emissions target",           val:"35% below 1990",note:"Unconditional — Belarus NDC 2021",                     conf:"high"   },
      { group:"Economic Exposure",  label:"GDP loss without climate action",     val:"Not quantified",note:"Not published in NDC/NAP documents",                   conf:"low"    },
      { group:"Economic Exposure",  label:"Agriculture sector exposure",         val:"High",          note:"Drought and heat stress risk to major crop sectors",    conf:"medium" },
      { group:"Governance & Capacity", label:"NAP status",                       val:"Adopted 2022",  note:"Belarus NAP 2022 — UNFCCC process",                    conf:"high"   },
      { group:"Governance & Capacity", label:"NDC status",                       val:"Adopted 2021",  note:"35% below 1990 by 2030 — Belarus NDC 2021",           conf:"high"   },
      { group:"Governance & Capacity", label:"Adaptation M&E system",            val:"Partial",       note:"MRV system developing — Belarus BUR 2022",             conf:"medium" },
      { group:"Governance & Capacity", label:"Climate budget tagging",           val:"Not implemented",note:"Not referenced in available documents",               conf:"low"    },
    ],

    policy: [
      { area:"Disaster Risk",  indicator:"National DRR strategy",              trend:"OFFTRACK", val:"Partial framework",  target:"Full Sendai alignment",       source:"UNDRR Belarus Review 2022",        year:2022 },
      { area:"Disaster Risk",  indicator:"Multi-hazard early warning system",  trend:"RIGHT_NT", val:"Operational",        target:"No formal target",            source:"Belarus MES Annual Report 2023",   year:2023 },
      { area:"Disaster Risk",  indicator:"Community / local DRR plans",        trend:"NODATA",   val:"—",                  target:"Not specified",               source:"—",                                year:null },
      { area:"Climate",        indicator:"NDC emissions reduction target",      trend:"OFFTRACK", val:"35% below 1990",     target:"By 2030",                     source:"Belarus NDC 2021",                 year:2021 },
      { area:"Climate",        indicator:"NAP adoption & implementation",       trend:"RIGHT_NT", val:"Adopted 2022",       target:"Implementation ongoing",      source:"Belarus NAP 2022",                 year:2022 },
      { area:"Climate",        indicator:"Renewable / low-carbon energy",       trend:"OFFTRACK", val:"7.8% renewable",     target:"9% by 2025",                  source:"Belarus Energy Strategy 2035",     year:2023 },
      { area:"Climate",        indicator:"Climate finance mobilised",           trend:"NODATA",   val:"—",                  target:"Not quantified in NDC",       source:"Belarus NDC 2021",                 year:2021 },
      { area:"Adaptation",     indicator:"Adaptation M&E / MRV system",        trend:"OFFTRACK", val:"MRV developing",     target:"Operational",                 source:"Belarus BUR 2022",                 year:2022 },
      { area:"Adaptation",     indicator:"Sectoral adaptation plans",           trend:"OFFTRACK", val:"Flood: partial",     target:"All sectors",                 source:"Belarus NAP 2022",                 year:2022 },
      { area:"Adaptation",     indicator:"Climate-proofing infrastructure",     trend:"OFFTRACK", val:"Partial",            target:"Energy + water systems",      source:"Belarus NAP 2022",                 year:2022 },
    ],

    events:[
      {year:2025,month:1,  group:"Hydrological",  type:"Flood",          deaths:null,affected:null,  econLoss:null,   location:null,              source:"DesInventar",sl:0.6},
      {year:2020,month:3,  group:"Biological",    type:"COVID-19",       deaths:7118,affected:994038,econLoss:null,   location:"Belarus",         source:"WHO",sl:1.0},
      {year:2017,month:7,  group:"Meteorological",type:"Extreme Heat",   deaths:43, affected:50539, econLoss:null,   location:"Multiple oblasts", source:"IFRC",sl:1.0},
      {year:2014,month:7,  group:"Meteorological",type:"Extreme Heat",   deaths:2,  affected:31500, econLoss:null,   location:"Minsk area",      source:"DesInventar",sl:0.6},
      {year:2013,month:7,  group:"Meteorological",type:"Extreme Heat",   deaths:4,  affected:11325, econLoss:null,   location:"Belarus",         source:"DesInventar",sl:0.6},
      {year:2010,month:6,  group:"Meteorological",type:"Extreme Heat",   deaths:null,affected:null,  econLoss:null,   location:null,              source:"DesInventar",sl:0.6},
      {year:2006,month:8,  group:"Meteorological",type:"Extreme Heat",   deaths:5,  affected:1820,  econLoss:null,   location:"Minsk",           source:"DesInventar",sl:0.6},
      {year:2002,month:6,  group:"Hydrological",  type:"Drought",        deaths:null,affected:null,  econLoss:null,   location:null,              source:"DesInventar",sl:0.6},
      {year:1999,month:4,  group:"Hydrological",  type:"Flood",          deaths:2,  affected:2000,  econLoss:null,   location:"Brest,Gomel,Minsk",source:"DesInventar",sl:0.6},
      {year:1997,month:6,  group:"Meteorological",type:"Storm",          deaths:5,  affected:21390, econLoss:33000000,location:"Multiple oblasts",source:"DesInventar",sl:0.6},
      {year:1995,month:3,  group:"Biological",    type:"Epidemic",       deaths:13, affected:282,   econLoss:null,   location:"Gomel",           source:"DesInventar",sl:0.6},
      {year:1993,month:1,  group:"Hydrological",  type:"Flood",          deaths:null,affected:null,  econLoss:null,   location:null,              source:"DesInventar",sl:0.6},
    ],
  },

  TJK: {
    id:"TJK", name:"Tajikistan", region:"Central Asia", short:"TJK", wbISO:"TJK",
    totalEvents:70, yearRange:"1998–2025",
    hazard:0.88, vulnerability:0.85, future:0.90, confidence:0.60,
    dominantHazards:["Flash Floods","Earthquakes","Landslides","Extreme Heat"],
    knownDeaths:502, knownAffected:5655379, knownLoss:719973434,
    deathCov:57, affCov:52, lossCov:18,
    hazardBreakdown:{ Hydrological:38, Geophysical:23, Meteorological:6, Biological:3 },

    narrative: "Tajikistan carries the highest compound risk of any country in this dataset — driven by the convergence of annual flash floods, active seismicity, glacial hazards, and extreme heat, all concentrated on a population with limited adaptive capacity. Recorded economic losses exceed $720M across 18 events, almost certainly a fraction of actual impact given that only 26% of events have any economic data. The 1998 floods alone killed 134 people and caused $60M in damage. In the capital Dushanbe alone, annual losses from natural hazards are estimated at 1–1.5% of GRP today, rising to 2–3% by the second half of the century without proactive DRR/CCA measures. Infrastructure decay is severe: water losses reach 60% in urban supply networks and 40% in district heating. Average annual temperatures in Dushanbe have already risen by 3.2°C over the past 50 years — nearly triple the global average — with crop yield losses projected at up to 50% by 2050 and a water deficit deepening as glaciers retreat.",

    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",           val:"502",           note:"57% of 70 events have data — best coverage in CA",     conf:"medium" },
      { group:"Disaster Record",    label:"People affected (partial)",           val:"5.66M",         note:"52% of events — multiple large floods",                conf:"medium" },
      { group:"Disaster Record",    label:"Recorded economic losses",            val:"$720M",         note:"18 of 70 events — likely major undercount",            conf:"low"    },
      { group:"Disaster Record",    label:"Deadliest single event",             val:"134 dead",       note:"1998 floods, Vose/Kulob/Garm — DesInventar",           conf:"high"   },
      { group:"Infrastructure",     label:"Critical infrastructure condition",   val:"40–60% worn",   note:"Water losses 60%, heating 40% — Dushanbe GCAP 2022 / ESCAP Review 2020",   conf:"medium" },
      { group:"Infrastructure",     label:"Population below poverty line",       val:"26.3%",         note:"World Bank 2022 — high vulnerability amplifier",       conf:"high"   },
      { group:"Infrastructure",     label:"Unemployment rate",                   val:"10.1%",         note:"Official rate — World Bank 2022",                      conf:"medium" },
      { group:"Infrastructure",     label:"Early warning system status",         val:"Partial",       note:"UNDP Tajikistan DRR 2024 — limited coverage",          conf:"medium" },
      { group:"Climate & Future",   label:"Observed temperature rise",           val:"+3.2°C (Dushanbe)",note:"1975–2025, Dushanbe city — Dushanbe Risk Profile 2025 / ADB-WB 2021",  conf:"high"   },
      { group:"Climate & Future",   label:"Observed precipitation change",       val:"Highly variable",note:"Seasonal extremes increasing — Tajikistan NC 2022",  conf:"low"    },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",         val:"+2.8°C",        note:"IPCC AR6 / Tajikistan 4th Nat. Comm.",                 conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2100",         val:"+5.5°C",        note:"RCP8.5 high-emission — Tajikistan NC 2022",            conf:"low"    },
      { group:"Economic Exposure",  label:"NDC emissions baseline (1990)",       val:"47,000 Gg CO₂eq",note:"1990 reference — Tajikistan NDC 2021",               conf:"medium" },
      { group:"Economic Exposure",  label:"NDC 2030 emissions target",           val:"50–65% below 1990",note:"Conditional on finance — Tajikistan NDC 2021",      conf:"high"   },
      { group:"Economic Exposure",  label:"GDP loss without climate action",     val:"Not quantified",note:"Not published in current NDC/NAP",                     conf:"low"    },
      { group:"Economic Exposure",  label:"Agriculture sector exposure",         val:"Critical",      note:"50% crop yield loss risk by 2050 — Tajikistan NAP 2023", conf:"medium"},
      { group:"Governance & Capacity", label:"NAP status",                       val:"Adopted 2023",  note:"Tajikistan NAP 2023 — GCF-UNDP support",              conf:"high"   },
      { group:"Governance & Capacity", label:"NDC status",                       val:"Adopted 2021",  note:"Updated NDC — 50–65% below 1990 by 2030",             conf:"high"   },
      { group:"Governance & Capacity", label:"Adaptation M&E system",            val:"In development",note:"UNDP Tajikistan DRR 2024 — partial MRV",              conf:"medium" },
      { group:"Governance & Capacity", label:"Climate budget tagging",           val:"Not implemented",note:"Not referenced in available NAP/NDC documents",       conf:"low"    },
    ],

    policy: [
      { area:"Disaster Risk",  indicator:"National DRR strategy",              trend:"RIGHT",    val:"Adopted 2022",       target:"Sendai aligned 2022–2030",    source:"Tajikistan DRR Strategy 2022",     year:2022 },
      { area:"Disaster Risk",  indicator:"Multi-hazard early warning system",  trend:"OFFTRACK", val:"Partial",            target:"Full coverage",               source:"UNDP Tajikistan DRR 2024",         year:2024 },
      { area:"Disaster Risk",  indicator:"Community / local DRR plans",        trend:"OFFTRACK", val:"Partial",            target:"All districts",               source:"UNDP Tajikistan DRR 2024",         year:2024 },
      { area:"Climate",        indicator:"NDC emissions reduction target",      trend:"RIGHT_NT", val:"50–65% below 1990",  target:"By 2030 (conditional)",       source:"Tajikistan NDC 2021",              year:2021 },
      { area:"Climate",        indicator:"NAP adoption & implementation",       trend:"RIGHT",    val:"Adopted 2023",       target:"Implementation started",      source:"Tajikistan NAP 2023",              year:2023 },
      { area:"Climate",        indicator:"Renewable / low-carbon energy",       trend:"RIGHT",    val:"High hydro share",   target:"Maintain + expand",           source:"Tajikistan NDC 2021 — 98% hydro",  year:2021 },
      { area:"Climate",        indicator:"Climate finance mobilised",           trend:"OFFTRACK", val:"Conditional target", target:"Requires $8B+ int'l finance", source:"Tajikistan NDC 2021",              year:2021 },
      { area:"Adaptation",     indicator:"Adaptation M&E / MRV system",        trend:"OFFTRACK", val:"In development",     target:"Operational",                 source:"UNDP Tajikistan DRR 2024",         year:2024 },
      { area:"Adaptation",     indicator:"Sectoral adaptation plans",           trend:"OFFTRACK", val:"Water: in dev. / Ag: in dev.", target:"All sectors",       source:"Tajikistan NAP 2023",              year:2023 },
      { area:"Adaptation",     indicator:"Climate-proofing infrastructure",     trend:"OFFTRACK", val:"Priority gap",       target:"Roads, irrigation systems",   source:"Tajikistan NAP 2023",              year:2023 },
    ],

    events:[
      {year:2025,month:1,  group:"Geophysical",  type:"Earthquake",  deaths:1,  affected:4020,   econLoss:null,      location:"Rasht, Tojikobod",    source:"UNDP",sl:1.0},
      {year:2024,month:5,  group:"Hydrological", type:"Flash Flood", deaths:3,  affected:40,     econLoss:null,      location:"Sughd,Khatlon,GBAO",  source:"DesInventar",sl:0.6},
      {year:2023,month:3,  group:"Geophysical",  type:"Earthquake",  deaths:0,  affected:2205,   econLoss:null,      location:"Sughd",               source:"DesInventar",sl:0.6},
      {year:2021,month:5,  group:"Hydrological", type:"Flash Flood", deaths:7,  affected:25010,  econLoss:10419000,  location:"Khatlon, Dushanbe",   source:"IFRC",sl:1.0},
      {year:2021,month:3,  group:"Geophysical",  type:"Earthquake",  deaths:5,  affected:4480,   econLoss:null,      location:"Tajikabad",           source:"DesInventar",sl:0.6},
      {year:2019,month:4,  group:"Hydrological", type:"Flash Flood", deaths:4,  affected:6750,   econLoss:null,      location:"Khatlon, Sughd",      source:"IFRC",sl:1.0},
      {year:2018,month:4,  group:"Hydrological", type:"Flash Flood", deaths:14, affected:5725,   econLoss:null,      location:"Khatlon",             source:"DesInventar",sl:0.6},
      {year:2016,month:4,  group:"Geophysical",  type:"Landslide",   deaths:6,  affected:17800,  econLoss:null,      location:"Sughd",               source:"IFRC",sl:1.0},
      {year:2015,month:10, group:"Geophysical",  type:"Earthquake",  deaths:2,  affected:124500, econLoss:null,      location:"GBAO",                source:"IFRC",sl:1.0},
      {year:2014,month:5,  group:"Hydrological", type:"Flash Flood", deaths:15, affected:2562,   econLoss:2650000,   location:"Vose, Shurobod",      source:"DesInventar",sl:0.6},
      {year:2014,month:4,  group:"Geophysical",  type:"Landslide",   deaths:20, affected:7400,   econLoss:null,      location:"Khatlon, Sughd",      source:"IFRC",sl:1.0},
      {year:2010,month:5,  group:"Hydrological", type:"Flash Flood", deaths:40, affected:16000,  econLoss:293469000, location:"South Tajikistan",    source:"IFRC",sl:1.0},
      {year:2010,month:3,  group:"Biological",   type:"Epidemic",    deaths:29, affected:458,    econLoss:null,      location:"Dushanbe, Khatlon",   source:"WHO",sl:1.0},
      {year:2009,month:5,  group:"Geophysical",  type:"Landslide",   deaths:26, affected:15000,  econLoss:1000000,   location:"Khatlon",             source:"IFRC",sl:1.0},
      {year:2009,month:3,  group:"Hydrological", type:"Flash Flood", deaths:18, affected:15000,  econLoss:1462000,   location:"Multiple districts",  source:"IFRC",sl:1.0},
      {year:2008,month:1,  group:"Hydrological", type:"Drought",     deaths:0,  affected:1300000,econLoss:34746555,  location:"Tajikistan",          source:"WFP",sl:1.0},
      {year:2007,month:7,  group:"Meteorological",type:"Extreme Heat",deaths:16,affected:null,   econLoss:31000000,  location:"Dushanbe",            source:"DesInventar",sl:0.6},
      {year:2007,month:3,  group:"Geophysical",  type:"Earthquake",  deaths:15, affected:11292,  econLoss:22000000,  location:"Ashtskiy, Rasht",     source:"IFRC",sl:1.0},
      {year:2005,month:5,  group:"Hydrological", type:"Flash Flood", deaths:8,  affected:12000,  econLoss:10000000,  location:"Panjakent",           source:"DesInventar",sl:0.6},
      {year:2003,month:4,  group:"Hydrological", type:"Flash Flood", deaths:6,  affected:1500,   econLoss:34104000,  location:"Penjikent, Khujand",  source:"DesInventar",sl:0.6},
      {year:2000,month:6,  group:"Hydrological", type:"Drought",     deaths:0,  affected:1500000,econLoss:null,      location:"Khatlon, Leninabad",  source:"OCHA",sl:1.0},
      {year:1998,month:7,  group:"Hydrological", type:"Flash Flood", deaths:134,affected:27632,  econLoss:60000000,  location:"Vose, Kulob, Garm",   source:"DesInventar",sl:0.6},
    ],
  },

  KGZ: {
    id:"KGZ", name:"Kyrgyzstan", region:"Central Asia", short:"KGZ", wbISO:"KGZ",
    totalEvents:45, yearRange:"1911–2025",
    hazard:0.78, vulnerability:0.80, future:0.82, confidence:0.50,
    dominantHazards:["Floods","Earthquakes","Landslides","Mudslides"],
    knownDeaths:2927, knownAffected:258992, knownLoss:5060000,
    deathCov:16, affCov:12, lossCov:3,
    hazardBreakdown:{ Hydrological:24, Geophysical:13, Biological:4, Meteorological:4 },

    narrative: "Kyrgyzstan's risk landscape is defined by the combination of active seismicity, dense informal settlements on hazard-prone slopes, and rapid glacier-driven hydrological change. The record extends to 1911 (Chon-Kemin earthquake, 452 deaths), giving one of the longest time horizons in the dataset. The 2008 Nura earthquake (75 deaths) and 2003–2004 landslide cluster (67 deaths across two events) illustrate the persistent geophysical threat. Osh city — 478K population, growing at 8% annually on seismic slopes — represents the single highest urban concentration risk in the region. Projected 30% water deficit by 2030 from glacier retreat will compound food and livelihood insecurity significantly.",

    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",           val:"2,927",         note:"16 of 45 events — 1911 Chon-Kemin EQ dominates at 452", conf:"low"  },
      { group:"Disaster Record",    label:"People affected (partial)",           val:"259K",          note:"12 of 45 events — COVID dominates 2020",               conf:"low"    },
      { group:"Disaster Record",    label:"Recorded economic losses",            val:"$5M",           note:"3 of 45 events — extreme undercount",                  conf:"low"    },
      { group:"Disaster Record",    label:"Deadliest single event",             val:"452 dead",       note:"1911 Chon-Kemin earthquake — USGS",                    conf:"medium" },
      { group:"Infrastructure",     label:"Critical infrastructure condition",   val:"50%+ worn (Osh)",note:"Water network decay — Osh Risk Profile 2025",          conf:"low"    },
      { group:"Infrastructure",     label:"Population below poverty line",       val:"33.3%",         note:"World Bank 2022 — high vulnerability amplifier",       conf:"high"   },
      { group:"Infrastructure",     label:"Unemployment rate",                   val:"6.2%",          note:"Official rate — World Bank 2022",                      conf:"high"   },
      { group:"Infrastructure",     label:"Early warning system status",         val:"Partial",       note:"Not full coverage — UNDP Kyrgyzstan DRR 2024",         conf:"medium" },
      { group:"Climate & Future",   label:"Observed temperature rise",           val:"+1.2°C",        note:"1935–2020 — Kyrgyzstan Nat. Comm. 2022",               conf:"medium" },
      { group:"Climate & Future",   label:"Observed precipitation change",       val:"Increasing (N)",note:"More intense events in north — Kyrgyzstan NAP 2022",  conf:"low"    },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",         val:"+2.5°C",        note:"IPCC AR6 / Kyrgyzstan Nat. Comm.",                     conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2100",         val:"+6.2°C",        note:"SSP5-8.5 high-emission — Osh Risk Profile 2025",       conf:"low"    },
      { group:"Economic Exposure",  label:"NDC emissions baseline (1990)",       val:"30,000 Gg CO₂eq",note:"Estimated reference — Kyrgyzstan NDC 2021",           conf:"medium" },
      { group:"Economic Exposure",  label:"NDC 2030 emissions target",           val:"44% below 1990",note:"Conditional on finance — Kyrgyzstan NDC 2021",         conf:"high"   },
      { group:"Economic Exposure",  label:"GDP loss without climate action",     val:"Not quantified",note:"Climate finance need estimated at $1.5B — NDC 2021",   conf:"low"    },
      { group:"Economic Exposure",  label:"Agriculture sector exposure",         val:"Critical",      note:"30% water deficit by 2030 from glacier retreat",       conf:"medium" },
      { group:"Governance & Capacity", label:"NAP status",                       val:"Adopted 2022",  note:"Kyrgyzstan NAP 2022 — UNFCCC process",                conf:"high"   },
      { group:"Governance & Capacity", label:"NDC status",                       val:"Adopted 2021",  note:"44% below 1990 by 2030 — Kyrgyzstan NDC 2021",        conf:"high"   },
      { group:"Governance & Capacity", label:"Adaptation M&E system",            val:"In development",note:"Kyrgyzstan NAP 2022 — monitoring framework pending",  conf:"medium" },
      { group:"Governance & Capacity", label:"Climate budget tagging",           val:"Not implemented",note:"Not referenced in available NAP/NDC documents",       conf:"low"    },
    ],

    policy: [
      { area:"Disaster Risk",  indicator:"National DRR strategy",              trend:"RIGHT",    val:"Adopted 2025",       target:"Sendai aligned 2025–2030",    source:"Kyrgyzstan DRR Strategy 2025",     year:2025 },
      { area:"Disaster Risk",  indicator:"Multi-hazard early warning system",  trend:"OFFTRACK", val:"Partial",            target:"Full coverage",               source:"UNDP Kyrgyzstan DRR 2024",         year:2024 },
      { area:"Disaster Risk",  indicator:"Community / local DRR plans",        trend:"OFFTRACK", val:"Osh: Draft",         target:"Adopted urban risk plans",    source:"Osh City Master Plan 2025",        year:2025 },
      { area:"Climate",        indicator:"NDC emissions reduction target",      trend:"RIGHT_NT", val:"44% below 1990",     target:"By 2030 (conditional)",       source:"Kyrgyzstan NDC 2021",              year:2021 },
      { area:"Climate",        indicator:"NAP adoption & implementation",       trend:"RIGHT_NT", val:"Adopted 2022",       target:"Implementation ongoing",      source:"Kyrgyzstan NAP 2022",              year:2022 },
      { area:"Climate",        indicator:"Renewable / low-carbon energy",       trend:"OFFTRACK", val:"Hydro dominant",     target:"Expand + diversify",          source:"Kyrgyzstan NDC 2021",              year:2021 },
      { area:"Climate",        indicator:"Climate finance mobilised",           trend:"OFFTRACK", val:"—",                  target:"$1.5B needed (NDC est.)",     source:"Kyrgyzstan NDC 2021",              year:2021 },
      { area:"Adaptation",     indicator:"Adaptation M&E / MRV system",        trend:"OFFTRACK", val:"In development",     target:"Operational",                 source:"Kyrgyzstan NAP 2022",              year:2022 },
      { area:"Adaptation",     indicator:"Sectoral adaptation plans",           trend:"OFFTRACK", val:"Flood mapping: 60%", target:"100% by 2027",               source:"Kyrgyzstan NAP 2022",              year:2022 },
      { area:"Adaptation",     indicator:"Climate-proofing infrastructure",     trend:"WRONG",    val:"Stalled (Osh)",      target:"Informal settlement phase 1", source:"UNDP Osh Risk Profile 2025",       year:2025 },
    ],

    events:[
      {year:2025,month:1,  group:"Biological",    type:"Epidemic",    deaths:2,  affected:8211,econLoss:null,   location:"Bishkek, Chuy, Jalal-Abad, Osh",source:"IFRC",sl:1.0},
      {year:2024,month:5,  group:"Hydrological",  type:"Flood",       deaths:4,  affected:420, econLoss:null,   location:"Osh City",               source:"DesInventar",sl:0.6},
      {year:2024,month:4,  group:"Geophysical",   type:"Mudslide",    deaths:1,  affected:300, econLoss:null,   location:"Jalal-Abad",             source:"DesInventar",sl:0.6},
      {year:2021,month:7,  group:"Geophysical",   type:"Mudslide",    deaths:8,  affected:null,econLoss:null,   location:"Aksy, Jalal-Abad",       source:"IFRC",sl:1.0},
      {year:2021,month:6,  group:"Hydrological",  type:"Flash Flood", deaths:1,  affected:null,econLoss:null,   location:"Suzak, Jalal-Abad",      source:"IFRC",sl:1.0},
      {year:2020,month:3,  group:"Biological",    type:"COVID-19",    deaths:2614,affected:179036,econLoss:null, location:"Kyrgyzstan",            source:"WHO",sl:1.0},
      {year:2013,month:6,  group:"Biological",    type:"Epidemic",    deaths:1,  affected:131, econLoss:null,   location:"Ak-Suu, Issyk-Kul",     source:"WHO",sl:1.0},
      {year:2012,month:7,  group:"Meteorological",type:"Extreme Heat",deaths:16, affected:4000,econLoss:null,   location:"Bishkek",               source:"IFRC",sl:1.0},
      {year:2008,month:10, group:"Geophysical",   type:"Earthquake",  deaths:75, affected:150, econLoss:null,   location:"Nura, Kura villages",   source:"USGS",sl:1.0},
      {year:2006,month:5,  group:"Meteorological",type:"Storm",       deaths:4,  affected:null,econLoss:null,   location:"Sary-Bee, Osh",         source:"DesInventar",sl:0.6},
      {year:2006,month:4,  group:"Geophysical",   type:"Landslide",   deaths:4,  affected:null,econLoss:null,   location:"Kara-Kulja",            source:"DesInventar",sl:0.6},
      {year:2005,month:7,  group:"Hydrological",  type:"Flood",       deaths:3,  affected:null,econLoss:2660000,location:"Nookat District",        source:"DesInventar",sl:0.6},
      {year:2004,month:5,  group:"Geophysical",   type:"Landslide",   deaths:33, affected:12,  econLoss:null,   location:"Alay, Osh",             source:"IFRC",sl:1.0},
      {year:2003,month:4,  group:"Geophysical",   type:"Landslide",   deaths:34, affected:null,econLoss:null,   location:"Sogot, Uzgen",          source:"IFRC",sl:1.0},
      {year:1992,month:8,  group:"Geophysical",   type:"Earthquake",  deaths:75, affected:null,econLoss:null,   location:"Suusamyr",              source:"USGS",sl:1.0},
      {year:1911,month:1,  group:"Geophysical",   type:"Earthquake",  deaths:452,affected:740, econLoss:null,   location:"Chon-Kemin",            source:"USGS",sl:1.0},
    ],
  },

  BIH: {
    id:"BIH", name:"Bosnia & Herzegovina", region:"Western Balkans", short:"BIH", wbISO:"BIH",
    totalEvents:38, yearRange:"1996-2025",
    hazard:0.55, vulnerability:0.62, future:0.60, confidence:0.65,
    dominantHazards:["Floods","Extreme Heat","Fires","Droughts"],
    knownDeaths:1005, knownAffected:2511642, knownLoss:3376579500,
    deathCov:25, affCov:28, lossCov:8,
    hazardBreakdown:{ Hydrological:25, Meteorological:9, Biological:3, Geophysical:1 },
    narrative:"Bosnia and Herzegovina is defined by two converging threats: exceptional flood exposure along the Sava, Bosna and Neretva river systems, and rapidly intensifying heat extremes. The 2014 floods caused $3.3 billion in losses and displaced over a million people -- the largest non-seismic disaster in this entire dataset. The 2024 heat event killed 909 people, signalling that extreme temperature is no longer a background risk but an acute annual threat. Post-war infrastructure fragmentation across entity lines complicates coordinated disaster response.",
    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",           val:"1,005",         note:"25 of 35 natural events — 2024 heat wave 909 deaths",  conf:"medium" },
      { group:"Disaster Record",    label:"People affected (partial)",           val:"2.51M",         note:"28 of 35 events — 2014 floods dominate at 1M displaced", conf:"medium"},
      { group:"Disaster Record",    label:"Recorded economic losses",            val:"$3.38B",        note:"8 events — dominated by 2014 floods (EU/WB estimate)", conf:"medium" },
      { group:"Disaster Record",    label:"Deadliest single event",              val:"909 dead",      note:"2024 extreme heat event — IFRC",                       conf:"high"   },
      { group:"Infrastructure",     label:"Critical infrastructure condition",   val:"Entity-fragmented",note:"Post-war BiH-wide DRR coordination gaps",           conf:"medium" },
      { group:"Infrastructure",     label:"Population below poverty line",       val:"16.9%",         note:"World Bank 2022",                                      conf:"high"   },
      { group:"Infrastructure",     label:"Unemployment rate",                   val:"14.5%",         note:"World Bank 2022 — high vulnerability",                 conf:"high"   },
      { group:"Infrastructure",     label:"Early warning system status",         val:"Partial",       note:"Entity-level gaps — UNDRR BiH Review 2023",            conf:"medium" },
      { group:"Climate & Future",   label:"Observed temperature rise",           val:"+1.7°C",        note:"1961–2020 — Bosnia Hydromet Institute 2022",           conf:"medium" },
      { group:"Climate & Future",   label:"Observed precipitation change",       val:"–5% (variable)",note:"Increasing intensity, decreasing annual avg — IPCC AR6", conf:"low" },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",         val:"+2.5°C",        note:"IPCC AR6 Western Balkans",                             conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2100",         val:"+4.5°C",        note:"RCP8.5 — IPCC AR6 Western Balkans",                   conf:"low"    },
      { group:"Economic Exposure",  label:"NDC emissions baseline (1990)",       val:"34,000 Gg CO₂eq",note:"Estimated — BiH NDC 2020",                           conf:"medium" },
      { group:"Economic Exposure",  label:"NDC 2030 emissions target",           val:"18% below 1990",note:"Unconditional — BiH NDC 2020",                        conf:"high"   },
      { group:"Economic Exposure",  label:"GDP loss without climate action",     val:"Not quantified",note:"Not published in current BiH NDC/NAP",                conf:"low"    },
      { group:"Economic Exposure",  label:"Agriculture sector exposure",         val:"High",          note:"Drought and heat risk — BiH NAP 2021",                conf:"medium" },
      { group:"Governance & Capacity", label:"NAP status",                       val:"Adopted 2021",  note:"BiH NAP 2021 — entity coordination challenge",        conf:"medium" },
      { group:"Governance & Capacity", label:"NDC status",                       val:"Adopted 2020",  note:"18% below 1990 by 2030 — BiH NDC 2020",              conf:"high"   },
      { group:"Governance & Capacity", label:"Adaptation M&E system",            val:"Partial",       note:"Entity-level systems — BiH-wide integration pending", conf:"medium" },
      { group:"Governance & Capacity", label:"Climate budget tagging",           val:"Not implemented",note:"Identified gap — UNDRR BiH Review 2023",             conf:"low"    },
    ],

    policy: [
      { area:"Disaster Risk",  indicator:"National DRR strategy",              trend:"OFFTRACK", val:"Entity-fragmented",  target:"BiH-wide framework",          source:"UNDRR BiH Review 2023",            year:2023 },
      { area:"Disaster Risk",  indicator:"Multi-hazard early warning system",  trend:"OFFTRACK", val:"Partial",            target:"Entity integration needed",   source:"UNDRR BiH Review 2023",            year:2023 },
      { area:"Disaster Risk",  indicator:"Community / local DRR plans",        trend:"OFFTRACK", val:"Partial",            target:"All municipalities",           source:"UNDRR BiH Review 2023",            year:2023 },
      { area:"Climate",        indicator:"NDC emissions reduction target",      trend:"RIGHT_NT", val:"18% below 1990",     target:"By 2030 (unconditional)",     source:"BiH NDC 2020",                     year:2020 },
      { area:"Climate",        indicator:"NAP adoption & implementation",       trend:"RIGHT_NT", val:"Adopted 2021",       target:"Entity coordination ongoing", source:"BiH NAP 2021",                     year:2021 },
      { area:"Climate",        indicator:"Renewable / low-carbon energy",       trend:"OFFTRACK", val:"35% renewables",     target:"In energy strategy",          source:"BiH Energy Strategy 2035",         year:2023 },
      { area:"Climate",        indicator:"Climate finance mobilised",           trend:"OFFTRACK", val:"—",                  target:"Not quantified in NDC",       source:"BiH NDC 2020",                     year:2020 },
      { area:"Adaptation",     indicator:"Adaptation M&E / MRV system",        trend:"OFFTRACK", val:"Partial (entity)",   target:"BiH-wide system",             source:"BiH NAP 2021",                     year:2021 },
      { area:"Adaptation",     indicator:"Sectoral adaptation plans",           trend:"OFFTRACK", val:"Flood: ~30% / Heat: absent", target:"All sectors",         source:"BiH NAP 2021",                     year:2021 },
      { area:"Adaptation",     indicator:"Climate-proofing infrastructure",     trend:"OFFTRACK", val:"Sava embankments partial", target:"Full upgrade",           source:"EU IPA Flood Project 2022",        year:2022 },
    ],

    events:[
      {year:2024,month:7, group:"Meteorological",type:"Extreme Heat", deaths:909, affected:null,   econLoss:null,       location:"Bosnia-Herzegovina",  source:"IFRC",sl:1.0},
      {year:2024,month:10,group:"Hydrological",  type:"Floods",       deaths:27,  affected:5000,   econLoss:null,       location:"Jablanica, Konjic",   source:"IFRC",sl:1.0},
      {year:2014,month:5, group:"Hydrological",  type:"Floods",       deaths:null,affected:1000000,econLoss:3376579500, location:"Federation and RS",   source:"EU/WB",sl:1.0},
      {year:2010,month:2, group:"Meteorological",type:"Extreme Cold", deaths:null,affected:50000,  econLoss:null,       location:"Multiple cantons",    source:"IFRC",sl:1.0},
    ],
  },
  CYP: {
    id:"CYP", name:"Cyprus", region:"Eastern Mediterranean", short:"CYP", wbISO:"CYP",
    totalEvents:21, yearRange:"1941-2025",
    hazard:0.42, vulnerability:0.38, future:0.55, confidence:0.60,
    dominantHazards:["Extreme Heat","Fires","Earthquakes","Floods"],
    knownDeaths:155, knownAffected:8081, knownLoss:4600000,
    deathCov:7, affCov:10, lossCov:2,
    hazardBreakdown:{ Meteorological:10, Hydrological:6, Geophysical:4, Biological:1 },
    narrative:"Cyprus presents lower hazard frequency than most countries here, but its Mediterranean island geography concentrates converging risks. Extreme heat events are now the dominant killer -- 101 deaths in 2022 -- and are projected to intensify significantly. Wildfire seasons are extending with reduced winter rainfall. Future risk is rated considerably higher than current hazard because the Eastern Mediterranean climate trajectory is among the most severe in the region: temperatures rising 2-3x the global average, precipitation declining 20-30% by 2100.",
    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",           val:"155",           note:"7 of 21 events — 2022 heat wave dominates at 101",    conf:"medium" },
      { group:"Disaster Record",    label:"People affected (partial)",           val:"8,081",         note:"10 of 21 events — lower than most countries",         conf:"medium" },
      { group:"Disaster Record",    label:"Recorded economic losses",            val:"$4.6M",         note:"2 events only — severe undercount",                   conf:"low"    },
      { group:"Disaster Record",    label:"Deadliest single event",              val:"101 dead",      note:"2022 extreme heat event — IFRC",                      conf:"high"   },
      { group:"Infrastructure",     label:"Critical infrastructure condition",   val:"Water-stressed", note:"Desalination-dependent island — drought critical",   conf:"high"   },
      { group:"Infrastructure",     label:"Population below poverty line",       val:"13.1%",         note:"EU-SILC 2022",                                        conf:"high"   },
      { group:"Infrastructure",     label:"Unemployment rate",                   val:"6.9%",          note:"Eurostat 2022",                                       conf:"high"   },
      { group:"Infrastructure",     label:"Early warning system status",         val:"Operational",   note:"EU civil protection framework — Cyprus DDPM 2023",    conf:"high"   },
      { group:"Climate & Future",   label:"Observed temperature rise",           val:"+1.8°C",        note:"1961–2020 — Cyprus Met Dept 2022",                    conf:"high"   },
      { group:"Climate & Future",   label:"Observed precipitation change",       val:"–15%",          note:"1980–2020 annual avg — Eastern Mediterranean signal", conf:"high"   },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",         val:"+2.8°C",        note:"IPCC AR6 Eastern Mediterranean — 2–3× global avg",   conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2100",         val:"+5.0°C",        note:"RCP8.5 — Eastern Mediterranean hotspot",             conf:"low"    },
      { group:"Economic Exposure",  label:"NDC emissions baseline (1990)",       val:"5,700 Gg CO₂eq",note:"EU-aligned baseline — Cyprus NDC 2021",              conf:"high"   },
      { group:"Economic Exposure",  label:"NDC 2030 emissions target",           val:"55% below 1990",note:"EU Green Deal aligned — Cyprus NDC 2021",             conf:"high"   },
      { group:"Economic Exposure",  label:"GDP loss without climate action",     val:"Not quantified",note:"Tourism sector (~20% GDP) most at risk from heat/fire", conf:"low"  },
      { group:"Economic Exposure",  label:"Agriculture sector exposure",         val:"High",          note:"Water scarcity compounds heat stress on agriculture", conf:"medium" },
      { group:"Governance & Capacity", label:"NAP status",                       val:"Adopted 2023",  note:"Cyprus NAP 2023 — UNFCCC process",                    conf:"high"   },
      { group:"Governance & Capacity", label:"NDC status",                       val:"Adopted 2021",  note:"55% below 1990 by 2030 — EU-aligned NDC 2021",       conf:"high"   },
      { group:"Governance & Capacity", label:"Adaptation M&E system",            val:"EU-aligned",    note:"Part of EU adaptation monitoring framework",          conf:"high"   },
      { group:"Governance & Capacity", label:"Climate budget tagging",           val:"Partial (EU)",  note:"EU taxonomy partially applied — Cyprus Govt 2023",    conf:"medium" },
    ],

    policy: [
      { area:"Disaster Risk",  indicator:"National DRR strategy",              trend:"RIGHT",    val:"Adopted 2020",       target:"Sendai aligned 2020–2030",    source:"Cyprus DRR Strategy 2020",         year:2020 },
      { area:"Disaster Risk",  indicator:"Multi-hazard early warning system",  trend:"RIGHT",    val:"EU-operational",     target:"Maintain EU standard",        source:"Cyprus DDPM / EU Civil Protection", year:2023},
      { area:"Disaster Risk",  indicator:"Community / local DRR plans",        trend:"RIGHT_NT", val:"Municipal level",    target:"Coverage expanding",          source:"Cyprus DDPM 2023",                 year:2023 },
      { area:"Climate",        indicator:"NDC emissions reduction target",      trend:"RIGHT",    val:"55% below 1990",     target:"By 2030 (EU Green Deal)",     source:"Cyprus NDC 2021",                  year:2021 },
      { area:"Climate",        indicator:"NAP adoption & implementation",       trend:"RIGHT",    val:"Adopted 2023",       target:"Implementation started",      source:"Cyprus NAP 2023",                  year:2023 },
      { area:"Climate",        indicator:"Renewable / low-carbon energy",       trend:"RIGHT",    val:"23% renewable",      target:"42% by 2030 (EU RED)",        source:"Cyprus National Energy Plan 2023", year:2023 },
      { area:"Climate",        indicator:"Climate finance mobilised",           trend:"RIGHT_NT", val:"EU funding access",  target:"EU Cohesion + Green Deal",    source:"Cyprus MoEnv 2023",                year:2023 },
      { area:"Adaptation",     indicator:"Adaptation M&E / MRV system",        trend:"RIGHT",    val:"EU-aligned",         target:"EU adaptation monitoring",    source:"Cyprus NAP 2023 / EEA",            year:2023 },
      { area:"Adaptation",     indicator:"Sectoral adaptation plans",           trend:"OFFTRACK", val:"Water: active / Heat: partial", target:"All sectors",      source:"Cyprus NAP 2023",                  year:2023 },
      { area:"Adaptation",     indicator:"Climate-proofing infrastructure",     trend:"RIGHT",    val:"Desalination active",target:"Water security maintained",   source:"Cyprus Water Strategy 2023",       year:2023 },
    ],

    events:[
      {year:2022,month:7, group:"Meteorological",type:"Extreme Heat", deaths:101, affected:null, econLoss:null,   location:"All 6 districts",   source:"IFRC",sl:1.0},
      {year:2021,month:7, group:"Meteorological",type:"Fires",        deaths:null,affected:null, econLoss:null,   location:"Limassol, Larnaca", source:"DesInventar",sl:0.6},
      {year:1953,month:9, group:"Geophysical",   type:"Earthquake",   deaths:40,  affected:4100, econLoss:null,   location:"Paphos district",   source:"USGS",sl:1.0},
    ],
  },
  GEO: {
    id:"GEO", name:"Georgia", region:"South Caucasus", short:"GEO", wbISO:"GEO",
    totalEvents:20, yearRange:"2002-2025",
    hazard:0.48, vulnerability:0.55, future:0.60, confidence:0.70,
    dominantHazards:["Floods","Earthquakes","Extreme Heat"],
    knownDeaths:50, knownAffected:9088687, knownLoss:218700000,
    deathCov:17, affCov:20, lossCov:5,
    hazardBreakdown:{ Hydrological:16, Geophysical:2, Meteorological:2 },
    narrative:"Georgia's hazard record is almost entirely hydrological with 15 of 20 events being floods. The 2015 Tbilisi floods (19 deaths, $30M loss) demonstrated how rapidly flash floods through mountain gorges can devastate an urban centre. The 2002 Tbilisi earthquake caused $180M in losses. Affected population figures near 9 million likely reflect national-level reporting. Climate projections point to increased precipitation variability -- wetter wet seasons amplifying flood frequency alongside long-term drying in eastern lowlands.",
    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",           val:"50",            note:"17 of 20 events — one of the best data rates here",   conf:"high"   },
      { group:"Disaster Record",    label:"People affected (partial)",           val:"9.09M",         note:"20 events — national-level reporting inflates figure", conf:"medium" },
      { group:"Disaster Record",    label:"Recorded economic losses",            val:"$219M",         note:"5 of 20 events — 2002 EQ ($180M) dominates",          conf:"medium" },
      { group:"Disaster Record",    label:"Deadliest single event",              val:"19 dead",       note:"2015 Tbilisi flash flood — IFRC",                     conf:"high"   },
      { group:"Infrastructure",     label:"Critical infrastructure condition",   val:"Moderate",      note:"Urban gorge flood exposure — Tbilisi topography",     conf:"medium" },
      { group:"Infrastructure",     label:"Population below poverty line",       val:"21.7%",         note:"World Bank 2022",                                     conf:"high"   },
      { group:"Infrastructure",     label:"Unemployment rate",                   val:"16.4%",         note:"World Bank 2022",                                     conf:"high"   },
      { group:"Infrastructure",     label:"Early warning system status",         val:"Partial",       note:"River flood coverage — UNDP Georgia DRR 2023",        conf:"medium" },
      { group:"Climate & Future",   label:"Observed temperature rise",           val:"+1.3°C",        note:"1961–2020 — Georgia Hydromet Dept 2022",              conf:"medium" },
      { group:"Climate & Future",   label:"Observed precipitation change",       val:"Variable",      note:"Wetter west, drier east — Georgia Nat. Comm. 2022",   conf:"low"    },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",         val:"+2.0°C",        note:"IPCC AR6 Caucasus region",                            conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2100",         val:"+3.5°C",        note:"RCP8.5 — Georgia Nat. Comm.",                         conf:"low"    },
      { group:"Economic Exposure",  label:"NDC emissions baseline (1990)",       val:"38,700 Gg CO₂eq",note:"1990 reference — Georgia NDC 2021",                 conf:"medium" },
      { group:"Economic Exposure",  label:"NDC 2030 emissions target",           val:"35% below 1990",note:"Conditional target — Georgia NDC 2021",               conf:"high"   },
      { group:"Economic Exposure",  label:"GDP loss without climate action",     val:"Not quantified",note:"Not published in current Georgia NDC/NAP",            conf:"low"    },
      { group:"Economic Exposure",  label:"Agriculture sector exposure",         val:"High",          note:"Drought stress in eastern lowlands — Georgia NAP 2023", conf:"medium"},
      { group:"Governance & Capacity", label:"NAP status",                       val:"Adopted 2023",  note:"Georgia NAP 2023 — UNFCCC / GCF support",             conf:"high"   },
      { group:"Governance & Capacity", label:"NDC status",                       val:"Adopted 2021",  note:"35% below 1990 by 2030 — Georgia NDC 2021",           conf:"high"   },
      { group:"Governance & Capacity", label:"Adaptation M&E system",            val:"In development",note:"Georgia NAP 2023 — monitoring framework pending",    conf:"medium" },
      { group:"Governance & Capacity", label:"Climate budget tagging",           val:"Not implemented",note:"Identified gap — Georgia NAP 2023",                 conf:"low"    },
    ],

    policy: [
      { area:"Disaster Risk",  indicator:"National DRR strategy",              trend:"RIGHT",    val:"Adopted 2023",       target:"Sendai aligned 2023–2030",    source:"Georgia DRR Strategy 2023",        year:2023 },
      { area:"Disaster Risk",  indicator:"Multi-hazard early warning system",  trend:"OFFTRACK", val:"Partial (rivers)",   target:"Full national coverage",      source:"UNDP Georgia DRR 2023",            year:2023 },
      { area:"Disaster Risk",  indicator:"Community / local DRR plans",        trend:"OFFTRACK", val:"Partial",            target:"All municipalities",           source:"UNDP Georgia DRR 2023",            year:2023 },
      { area:"Climate",        indicator:"NDC emissions reduction target",      trend:"RIGHT_NT", val:"35% below 1990",     target:"By 2030 (conditional)",       source:"Georgia NDC 2021",                 year:2021 },
      { area:"Climate",        indicator:"NAP adoption & implementation",       trend:"RIGHT",    val:"Adopted 2023",       target:"Implementation started",      source:"Georgia NAP 2023",                 year:2023 },
      { area:"Climate",        indicator:"Renewable / low-carbon energy",       trend:"RIGHT",    val:"Hydro-dominant",     target:"Expand renewables",           source:"Georgia NDC 2021 / Energy Strategy",year:2021},
      { area:"Climate",        indicator:"Climate finance mobilised",           trend:"OFFTRACK", val:"—",                  target:"Conditional on int'l finance",source:"Georgia NDC 2021",                 year:2021 },
      { area:"Adaptation",     indicator:"Adaptation M&E / MRV system",        trend:"OFFTRACK", val:"In development",     target:"Operational",                 source:"Georgia NAP 2023",                 year:2023 },
      { area:"Adaptation",     indicator:"Sectoral adaptation plans",           trend:"RIGHT",    val:"Urban flood: active",target:"All sectors",                 source:"EU-Georgia Infrastructure 2023",   year:2023 },
      { area:"Adaptation",     indicator:"Climate-proofing infrastructure",     trend:"RIGHT",    val:"Tbilisi active",     target:"Expand to other cities",      source:"EU-Georgia Infrastructure 2023",   year:2023 },
    ],

    events:[
      {year:2015,month:6, group:"Hydrological",  type:"Floods",       deaths:19, affected:8800,  econLoss:30440000,  location:"Tbilisi, Kakheti",  source:"IFRC",sl:1.0},
      {year:2011,month:8, group:"Hydrological",  type:"Floods",       deaths:7,  affected:3000,  econLoss:null,      location:"National",          source:"DesInventar",sl:0.6},
      {year:2002,month:4, group:"Geophysical",   type:"Earthquakes",  deaths:6,  affected:19156, econLoss:180000000, location:"Tbilisi",           source:"USGS",sl:1.0},
    ],
  },
  KAZ: {
    id:"KAZ", name:"Kazakhstan", region:"Central Asia", short:"KAZ", wbISO:"KAZ",
    totalEvents:133, yearRange:"1993-2025",
    hazard:0.50, vulnerability:0.52, future:0.62, confidence:0.48,
    dominantHazards:["Fires","Floods","Droughts","Storms"],
    knownDeaths:297, knownAffected:1054901, knownLoss:285570,
    deathCov:18, affCov:42, lossCov:8,
    hazardBreakdown:{ Meteorological:87, Hydrological:39, Biological:4, Geophysical:3 },
    narrative:"Kazakhstan's hazard profile is shaped by its vast steppe geography and continental climate extremes. Fires account for 83 of 133 recorded events, many affecting enormous grassland areas with limited response capacity. Flood risk concentrates in spring snowmelt events -- the 2024 Ural floods displaced over 100,000 people. The near-absence of economic loss data ($286K recorded) reflects collection gaps rather than low impact. Future risk is elevated by projected aridification and the loss of glacial water sources from the Tian Shan.",
    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",           val:"297",           note:"18 of 129 nat. events — severe undercount",           conf:"low"    },
      { group:"Disaster Record",    label:"People affected (partial)",           val:"1.05M",         note:"42 of 133 events — 2024 Ural floods dominate",        conf:"low"    },
      { group:"Disaster Record",    label:"Recorded economic losses",            val:"~$286K",        note:"8 events — extreme undercount, vast territory",        conf:"low"    },
      { group:"Disaster Record",    label:"Deadliest single event",              val:"112 dead",      note:"1995 storm, Karaganda and Akmola — DesInventar",      conf:"medium" },
      { group:"Infrastructure",     label:"Critical infrastructure condition",   val:"Steppe-limited", note:"Vast territory, sparse infrastructure coverage",     conf:"low"    },
      { group:"Infrastructure",     label:"Population below poverty line",       val:"5.2%",          note:"World Bank 2022 — lower vulnerability",               conf:"high"   },
      { group:"Infrastructure",     label:"Unemployment rate",                   val:"4.9%",          note:"World Bank 2022",                                     conf:"high"   },
      { group:"Infrastructure",     label:"Early warning system status",         val:"Partial",       note:"Spring melt flood coverage — UNDP Kazakhstan 2024",   conf:"medium" },
      { group:"Climate & Future",   label:"Observed temperature rise",           val:"+1.7°C",        note:"1940–2020 — Kazakhstan Hydromet Service 2022",        conf:"medium" },
      { group:"Climate & Future",   label:"Observed precipitation change",       val:"–5% (south)",   note:"Southern aridification accelerating — IPCC AR6",     conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",         val:"+3.0°C",        note:"Continental amplification — IPCC AR6",                conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2100",         val:"+5.5°C",        note:"RCP8.5 — Kazakhstan Nat. Comm.",                      conf:"low"    },
      { group:"Economic Exposure",  label:"NDC emissions baseline (1990)",       val:"374,000 Gg CO₂eq",note:"1990 reference — Kazakhstan NDC 2021",             conf:"high"   },
      { group:"Economic Exposure",  label:"NDC 2030 emissions target",           val:"15% below 1990",note:"Unconditional; 25% conditional — Kazakhstan NDC 2021", conf:"high"  },
      { group:"Economic Exposure",  label:"GDP loss without climate action",     val:"Not quantified",note:"Not published in available NDC/NAP documents",        conf:"low"    },
      { group:"Economic Exposure",  label:"Agriculture sector exposure",         val:"High",          note:"Aridification and Tian Shan glacier retreat — KAZ NAP 2023", conf:"medium"},
      { group:"Governance & Capacity", label:"NAP status",                       val:"Adopted 2023",  note:"Kazakhstan NAP 2023 — UNFCCC process",                conf:"high"   },
      { group:"Governance & Capacity", label:"NDC status",                       val:"Adopted 2021",  note:"15–25% below 1990 by 2030 — Kazakhstan NDC 2021",     conf:"high"   },
      { group:"Governance & Capacity", label:"Adaptation M&E system",            val:"In development",note:"Kazakhstan NAP 2023 — monitoring framework pending",  conf:"medium" },
      { group:"Governance & Capacity", label:"Climate budget tagging",           val:"Not implemented",note:"Not referenced in available documents",              conf:"low"    },
    ],

    policy: [
      { area:"Disaster Risk",  indicator:"National DRR strategy",              trend:"RIGHT",    val:"Adopted 2021",       target:"Sendai aligned 2021–2030",    source:"Kazakhstan DRR Strategy 2021",     year:2021 },
      { area:"Disaster Risk",  indicator:"Multi-hazard early warning system",  trend:"OFFTRACK", val:"Partial",            target:"Full national coverage",      source:"UNDP Kazakhstan 2024",             year:2024 },
      { area:"Disaster Risk",  indicator:"Community / local DRR plans",        trend:"OFFTRACK", val:"Partial",            target:"All regions",                 source:"Kazakhstan DRR Strategy 2021",     year:2021 },
      { area:"Climate",        indicator:"NDC emissions reduction target",      trend:"OFFTRACK", val:"15–25% below 1990",  target:"By 2030",                     source:"Kazakhstan NDC 2021",              year:2021 },
      { area:"Climate",        indicator:"NAP adoption & implementation",       trend:"RIGHT",    val:"Adopted 2023",       target:"Implementation started",      source:"Kazakhstan NAP 2023",              year:2023 },
      { area:"Climate",        indicator:"Renewable / low-carbon energy",       trend:"OFFTRACK", val:"6% renewable",       target:"15% by 2030",                 source:"Kazakhstan Energy Strategy 2030",  year:2022 },
      { area:"Climate",        indicator:"Climate finance mobilised",           trend:"OFFTRACK", val:"—",                  target:"Not quantified in NDC",       source:"Kazakhstan NDC 2021",              year:2021 },
      { area:"Adaptation",     indicator:"Adaptation M&E / MRV system",        trend:"OFFTRACK", val:"In development",     target:"Operational",                 source:"Kazakhstan NAP 2023",              year:2023 },
      { area:"Adaptation",     indicator:"Sectoral adaptation plans",           trend:"OFFTRACK", val:"Agriculture: partial",target:"All sectors",                source:"Kazakhstan NAP 2023",              year:2023 },
      { area:"Adaptation",     indicator:"Climate-proofing infrastructure",     trend:"OFFTRACK", val:"Irrigation: partial", target:"Spring flood protection",    source:"Kazakhstan NAP 2023",              year:2023 },
    ],

    events:[
      {year:2024,month:4, group:"Hydrological",  type:"Floods",       deaths:4,   affected:117000,econLoss:null,   location:"Ural and Syr Darya",  source:"IFRC",sl:1.0},
      {year:2004,month:7, group:"Geophysical",   type:"Landslide",    deaths:48,  affected:null,  econLoss:null,   location:"Talgar",              source:"DesInventar",sl:0.6},
      {year:1995,month:5, group:"Meteorological",type:"Storm",        deaths:112, affected:null,  econLoss:3000,   location:"Karaganda, Akmola",   source:"DesInventar",sl:0.6},
    ],
  },
  KOS: {
    id:"KOS", name:"Kosovo", region:"Western Balkans", short:"KOS", wbISO:"KOS",
    totalEvents:96, yearRange:"1999-2026",
    hazard:0.45, vulnerability:0.58, future:0.52, confidence:0.42,
    dominantHazards:["Storms","Landslides","Fires","Floods"],
    knownDeaths:28, knownAffected:92096, knownLoss:0,
    deathCov:8, affCov:81, lossCov:0,
    hazardBreakdown:{ Meteorological:61, Geophysical:18, Hydrological:14, Biological:3 },
    narrative:"Kosovo's disaster record reveals a significant data gap: zero economic losses are recorded across 96 events, reflecting systemic under-reporting rather than low impact. Storm events dominate by count (44), with landslides (17) and fires (16) as persistent secondary threats across the highland terrain. The 2012 Restelice landslide (10 deaths) and concurrent heat event (9 deaths) represent the worst natural hazard year on record. Institutional capacity for DRR remains limited relative to exposure.",
    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",           val:"28",            note:"8 of 93 nat. events — very low coverage",             conf:"low"    },
      { group:"Disaster Record",    label:"People affected (partial)",           val:"92K",           note:"81 of 96 events have affected data — better coverage", conf:"medium" },
      { group:"Disaster Record",    label:"Recorded economic losses",            val:"$0",            note:"Data gap — zero recorded, not zero impact",           conf:"low"    },
      { group:"Disaster Record",    label:"Deadliest single event",              val:"10 dead",       note:"2012 Restelice landslide — DesInventar",              conf:"medium" },
      { group:"Infrastructure",     label:"Critical infrastructure condition",   val:"Limited capacity",note:"DRR institutions underdeveloped relative to exposure", conf:"medium"},
      { group:"Infrastructure",     label:"Population below poverty line",       val:"17.6%",         note:"World Bank 2022",                                     conf:"high"   },
      { group:"Infrastructure",     label:"Unemployment rate",                   val:"25.2%",         note:"World Bank 2022 — high vulnerability",                conf:"high"   },
      { group:"Infrastructure",     label:"Early warning system status",         val:"Absent",        note:"Flash flood EWS absent — UNDP Kosovo 2024",           conf:"high"   },
      { group:"Climate & Future",   label:"Observed temperature rise",           val:"+1.5°C",        note:"1961–2020 — Kosovo Hydrometeorological Institute",    conf:"medium" },
      { group:"Climate & Future",   label:"Observed precipitation change",       val:"Increasingly intense",note:"Seasonal extremes — Western Balkans signal",   conf:"low"    },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",         val:"+2.3°C",        note:"IPCC AR6 Western Balkans",                            conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2100",         val:"+4.2°C",        note:"RCP8.5 — IPCC AR6 Western Balkans",                  conf:"low"    },
      { group:"Economic Exposure",  label:"NDC emissions baseline (1990)",       val:"Not submitted",  note:"Kosovo has not submitted NDC to UNFCCC",             conf:"high"   },
      { group:"Economic Exposure",  label:"NDC 2030 emissions target",           val:"Not submitted",  note:"UNFCCC registry — no NDC on file",                   conf:"high"   },
      { group:"Economic Exposure",  label:"GDP loss without climate action",     val:"Not quantified", note:"No NDC/NAP quantification available",                conf:"low"    },
      { group:"Economic Exposure",  label:"Agriculture sector exposure",         val:"High",          note:"Flash flood and drought risk to food systems",        conf:"medium" },
      { group:"Governance & Capacity", label:"NAP status",                       val:"Not adopted",   note:"No formal NAP — Kosovo DRR Framework 2023 draft only", conf:"high"  },
      { group:"Governance & Capacity", label:"NDC status",                       val:"Not submitted",  note:"UNFCCC registry — not yet submitted",                conf:"high"   },
      { group:"Governance & Capacity", label:"Adaptation M&E system",            val:"Absent",        note:"No framework exists — critical institutional gap",    conf:"high"   },
      { group:"Governance & Capacity", label:"Climate budget tagging",           val:"Not implemented",note:"Not referenced in available documents",              conf:"low"    },
    ],

    policy: [
      { area:"Disaster Risk",  indicator:"National DRR strategy",              trend:"OFFTRACK", val:"Draft only",         target:"Adopted strategy",            source:"Kosovo DRR Framework 2023",        year:2023 },
      { area:"Disaster Risk",  indicator:"Multi-hazard early warning system",  trend:"WRONG",    val:"Absent",             target:"Flash flood EWS recommended", source:"UNDP Kosovo 2024",                 year:2024 },
      { area:"Disaster Risk",  indicator:"Community / local DRR plans",        trend:"OFFTRACK", val:"~20% coverage",      target:"Full territory mapped",       source:"UNDP Kosovo 2023",                 year:2023 },
      { area:"Climate",        indicator:"NDC emissions reduction target",      trend:"NODATA",   val:"Not submitted",      target:"UNFCCC submission needed",    source:"UNFCCC registry",                  year:null },
      { area:"Climate",        indicator:"NAP adoption & implementation",       trend:"NODATA",   val:"Not adopted",        target:"Formal NAP process needed",   source:"UNFCCC registry",                  year:null },
      { area:"Climate",        indicator:"Renewable / low-carbon energy",       trend:"OFFTRACK", val:"Coal-dominant",      target:"Transition target needed",    source:"Kosovo Energy Strategy 2022",      year:2022 },
      { area:"Climate",        indicator:"Climate finance mobilised",           trend:"NODATA",   val:"—",                  target:"NDC needed before access",    source:"—",                                year:null },
      { area:"Adaptation",     indicator:"Adaptation M&E / MRV system",        trend:"WRONG",    val:"Absent",             target:"Framework needed",            source:"UNDP Kosovo 2024",                 year:2024 },
      { area:"Adaptation",     indicator:"Sectoral adaptation plans",           trend:"WRONG",    val:"None in place",      target:"Priority sectors",            source:"UNDP Kosovo 2024",                 year:2024 },
      { area:"Adaptation",     indicator:"Climate-proofing infrastructure",     trend:"WRONG",    val:"No programme",       target:"Landslide + flood protection", source:"UNDP Kosovo 2024",                year:2024 },
    ],

    events:[
      {year:2020,month:3, group:"Biological",    type:"Epidemic",     deaths:3211,affected:273312,econLoss:null, location:"Kosovo",              source:"WHO",sl:1.0},
      {year:2012,month:8, group:"Geophysical",   type:"Landslide",    deaths:10,  affected:300,   econLoss:null, location:"Restelice",           source:"DesInventar",sl:0.6},
      {year:2012,month:7, group:"Meteorological",type:"Extreme Heat", deaths:9,   affected:18234, econLoss:null, location:"Multiple municipalities",source:"DesInventar",sl:0.6},
    ],
  },
  MDA: {
    id:"MDA", name:"Moldova", region:"Eastern Europe", short:"MDA", wbISO:"MDA",
    totalEvents:22, yearRange:"1994-2020",
    hazard:0.48, vulnerability:0.58, future:0.55, confidence:0.62,
    dominantHazards:["Floods","Droughts","Extreme Heat"],
    knownDeaths:234, knownAffected:2806737, knownLoss:2176476900,
    deathCov:9, affCov:12, lossCov:12,
    hazardBreakdown:{ Meteorological:18, Hydrological:3, Biological:1 },
    narrative:"Moldova stands out in this dataset for relatively good economic loss documentation -- $2.18 billion recorded across 12 events, making it one of the better-evidenced countries. Floods along the Prut and Dniester rivers are the acute threat. Droughts are the persistent slow-onset risk: five recorded events between 1994 and 2020 consistently affect agricultural production. The 2007 heat event killed 146 people. Moldova's landlocked geography and rain-fed agriculture make it particularly exposed to the drying and temperature-rise trajectory projected for Eastern Europe.",
    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",           val:"193",           note:"Best economic loss data in dataset — death data sparse", conf:"medium"},
      { group:"Disaster Record",    label:"People affected (partial)",           val:"~900K",         note:"12 events with data — 2010 Prut floods (500K) dominate", conf:"medium"},
      { group:"Disaster Record",    label:"Recorded economic losses",            val:"$2.18B",        note:"12 events — best economic loss coverage in dataset",   conf:"high"   },
      { group:"Disaster Record",    label:"Deadliest single event",              val:"146 dead",      note:"2007 extreme heat event — EM-DAT",                    conf:"high"   },
      { group:"Infrastructure",     label:"Critical infrastructure condition",   val:"Ageing Soviet stock",note:"Post-Soviet infrastructure — UNDP Moldova 2022",  conf:"medium" },
      { group:"Infrastructure",     label:"Population below poverty line",       val:"27.0%",         note:"World Bank 2022 — high vulnerability",                conf:"high"   },
      { group:"Infrastructure",     label:"Unemployment rate",                   val:"4.1%",          note:"World Bank 2022",                                     conf:"high"   },
      { group:"Infrastructure",     label:"Early warning system status",         val:"Active",        note:"Prut/Dniester river flood EWS — Moldova Hydromet 2023", conf:"high"  },
      { group:"Climate & Future",   label:"Observed temperature rise",           val:"+1.4°C",        note:"1961–2020 — Moldova State Hydrometeorological Service", conf:"medium" },
      { group:"Climate & Future",   label:"Observed precipitation change",       val:"–5% (variable)",note:"Increasing drought frequency — Moldova Nat. Comm.",   conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",         val:"+2.0°C",        note:"IPCC AR6 Eastern Europe",                             conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2100",         val:"+4.0°C",        note:"RCP8.5 — Moldova Nat. Comm.",                         conf:"low"    },
      { group:"Economic Exposure",  label:"NDC emissions baseline (1990)",       val:"52,000 Gg CO₂eq",note:"1990 reference — Moldova NDC 2021",                 conf:"medium" },
      { group:"Economic Exposure",  label:"NDC 2030 emissions target",           val:"70% below 1990",note:"Conditional — Moldova NDC 2021 (most ambitious in region)", conf:"high"},
      { group:"Economic Exposure",  label:"GDP loss without climate action",     val:"Not quantified",note:"Not published in current Moldova NDC/NAP",            conf:"low"    },
      { group:"Economic Exposure",  label:"Agriculture sector exposure",         val:"Critical",      note:"Drought-prone country — dominant economic sector",    conf:"high"   },
      { group:"Governance & Capacity", label:"NAP status",                       val:"Adopted 2022",  note:"Moldova NAP 2022 — GCF-UNDP support",                conf:"high"   },
      { group:"Governance & Capacity", label:"NDC status",                       val:"Adopted 2021",  note:"70% below 1990 by 2030 — Moldova NDC 2021",          conf:"high"   },
      { group:"Governance & Capacity", label:"Adaptation M&E system",            val:"In development",note:"Moldova NAP 2022 — monitoring framework planned",    conf:"medium" },
      { group:"Governance & Capacity", label:"Climate budget tagging",           val:"Not implemented",note:"Not referenced in available Moldova documents",      conf:"low"    },
    ],

    policy: [
      { area:"Disaster Risk",  indicator:"National DRR strategy",              trend:"RIGHT",    val:"Adopted 2022",       target:"Sendai aligned 2022–2030",    source:"Moldova DRR Strategy 2022",        year:2022 },
      { area:"Disaster Risk",  indicator:"Multi-hazard early warning system",  trend:"RIGHT",    val:"Active (rivers)",    target:"Expand to all hazards",       source:"Moldova Hydromet 2023",            year:2023 },
      { area:"Disaster Risk",  indicator:"Community / local DRR plans",        trend:"OFFTRACK", val:"Partial",            target:"All districts",               source:"Moldova DRR Strategy 2022",        year:2022 },
      { area:"Climate",        indicator:"NDC emissions reduction target",      trend:"RIGHT_NT", val:"70% below 1990",     target:"By 2030 (most ambitious region)",source:"Moldova NDC 2021",               year:2021 },
      { area:"Climate",        indicator:"NAP adoption & implementation",       trend:"RIGHT",    val:"Adopted 2022",       target:"Implementation started",      source:"Moldova NAP 2022",                 year:2022 },
      { area:"Climate",        indicator:"Renewable / low-carbon energy",       trend:"OFFTRACK", val:"16% renewable",      target:"30% by 2030",                 source:"Moldova Energy Strategy 2030",     year:2022 },
      { area:"Climate",        indicator:"Climate finance mobilised",           trend:"OFFTRACK", val:"—",                  target:"Conditional on int'l finance",source:"Moldova NDC 2021",                 year:2021 },
      { area:"Adaptation",     indicator:"Adaptation M&E / MRV system",        trend:"OFFTRACK", val:"In development",     target:"Operational",                 source:"Moldova NAP 2022",                 year:2022 },
      { area:"Adaptation",     indicator:"Sectoral adaptation plans",           trend:"OFFTRACK", val:"Ag drought: partial",target:"All sectors by 2030",         source:"Moldova NAP 2022",                 year:2022 },
      { area:"Adaptation",     indicator:"Climate-proofing infrastructure",     trend:"OFFTRACK", val:"Flood protection partial", target:"Prut/Dniester full",    source:"Moldova NAP 2022",                 year:2022 },
    ],

    events:[
      {year:2010,month:7, group:"Hydrological",  type:"Floods",       deaths:null,affected:500000,econLoss:39000000,  location:"Prut Valley",       source:"EM-DAT",sl:0.6},
      {year:2007,month:7, group:"Meteorological",type:"Extreme Heat", deaths:146, affected:null,  econLoss:530000000, location:"Moldova",           source:"EM-DAT",sl:0.6},
      {year:1994,month:5, group:"Hydrological",  type:"Floods",       deaths:47,  affected:25000, econLoss:300000,    location:"Moldova",           source:"EM-DAT",sl:0.6},
    ],
  },
  MNE: {
    id:"MNE", name:"Montenegro", region:"Western Balkans", short:"MNE", wbISO:"MNE",
    totalEvents:18, yearRange:"1992-2025",
    hazard:0.38, vulnerability:0.42, future:0.48, confidence:0.55,
    dominantHazards:["Floods","Fires","Extreme Heat"],
    knownDeaths:11, knownAffected:44387, knownLoss:90,
    deathCov:15, affCov:11, lossCov:1,
    hazardBreakdown:{ Hydrological:10, Meteorological:7, Biological:1 },
    narrative:"Montenegro has among the lowest compound risk scores in this dataset, reflecting its small size, moderate hazard exposure, and relatively intact natural systems including intact forest cover and Adriatic coastal resilience. Floods are the most frequent threat (10 events). Fires have increased in frequency as Mediterranean drying conditions extend northward. The near-zero economic loss data ($90 recorded) is a data gap rather than a reflection of actual impact.",
    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",           val:"11",            note:"15 of 17 nat. events — among best coverage here",     conf:"medium" },
      { group:"Disaster Record",    label:"People affected (partial)",           val:"44K",           note:"11 of 18 events — 2012 heat (20K) dominates",         conf:"medium" },
      { group:"Disaster Record",    label:"Recorded economic losses",            val:"$90",           note:"1 event only — critical data gap",                    conf:"low"    },
      { group:"Disaster Record",    label:"Deadliest single event",              val:"6 dead",        note:"1992 Podgorica/Kolasin floods — DesInventar",         conf:"high"   },
      { group:"Infrastructure",     label:"Critical infrastructure condition",   val:"Moderate",      note:"Small state — more manageable infrastructure base",   conf:"medium" },
      { group:"Infrastructure",     label:"Population below poverty line",       val:"21.1%",         note:"World Bank 2022",                                     conf:"high"   },
      { group:"Infrastructure",     label:"Unemployment rate",                   val:"15.3%",         note:"World Bank 2022",                                     conf:"high"   },
      { group:"Infrastructure",     label:"Early warning system status",         val:"Partial",       note:"Limited coverage — Montenegro DRR Strategy 2020",     conf:"medium" },
      { group:"Climate & Future",   label:"Observed temperature rise",           val:"+1.5°C",        note:"1961–2020 — Montenegro Hydromet Inst. 2022",          conf:"medium" },
      { group:"Climate & Future",   label:"Observed precipitation change",       val:"–5% (south)",   note:"Mediterranean drying extending northward — IPCC AR6", conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",         val:"+2.1°C",        note:"IPCC AR6 Western Balkans",                            conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2100",         val:"+4.0°C",        note:"RCP8.5 — IPCC AR6 Western Balkans",                  conf:"low"    },
      { group:"Economic Exposure",  label:"NDC emissions baseline (1990)",       val:"5,100 Gg CO₂eq",note:"1990 reference — Montenegro NDC 2021",               conf:"medium" },
      { group:"Economic Exposure",  label:"NDC 2030 emissions target",           val:"35% below 1990",note:"Unconditional — Montenegro NDC 2021",                conf:"high"   },
      { group:"Economic Exposure",  label:"GDP loss without climate action",     val:"Not quantified",note:"Tourism (~25% GDP) most at risk from fire and flood",  conf:"low"    },
      { group:"Economic Exposure",  label:"Agriculture sector exposure",         val:"Moderate",      note:"Fire and drought risk — Montenegro NAP 2023",         conf:"medium" },
      { group:"Governance & Capacity", label:"NAP status",                       val:"Adopted 2023",  note:"Montenegro NAP 2023 — UNFCCC process",               conf:"high"   },
      { group:"Governance & Capacity", label:"NDC status",                       val:"Adopted 2021",  note:"35% below 1990 by 2030 — Montenegro NDC 2021",       conf:"high"   },
      { group:"Governance & Capacity", label:"Adaptation M&E system",            val:"In development",note:"Montenegro NAP 2023 — monitoring framework planned", conf:"medium" },
      { group:"Governance & Capacity", label:"Climate budget tagging",           val:"Not implemented",note:"Identified gap — Montenegro NAP 2023",              conf:"low"    },
    ],

    policy: [
      { area:"Disaster Risk",  indicator:"National DRR strategy",              trend:"RIGHT",    val:"Adopted 2020",       target:"Sendai aligned 2020–2030",    source:"Montenegro DRR Strategy 2020",     year:2020 },
      { area:"Disaster Risk",  indicator:"Multi-hazard early warning system",  trend:"OFFTRACK", val:"Partial",            target:"Full coverage",               source:"Montenegro DRR Strategy 2020",     year:2020 },
      { area:"Disaster Risk",  indicator:"Community / local DRR plans",        trend:"OFFTRACK", val:"Partial",            target:"All municipalities",           source:"Montenegro DRR Strategy 2020",     year:2020 },
      { area:"Climate",        indicator:"NDC emissions reduction target",      trend:"RIGHT_NT", val:"35% below 1990",     target:"By 2030 (unconditional)",     source:"Montenegro NDC 2021",              year:2021 },
      { area:"Climate",        indicator:"NAP adoption & implementation",       trend:"RIGHT",    val:"Adopted 2023",       target:"Implementation started",      source:"Montenegro NAP 2023",              year:2023 },
      { area:"Climate",        indicator:"Renewable / low-carbon energy",       trend:"RIGHT",    val:"44% renewable",      target:"51% by 2030 (EU aligned)",    source:"Montenegro Energy Strategy 2030",  year:2022 },
      { area:"Climate",        indicator:"Climate finance mobilised",           trend:"OFFTRACK", val:"—",                  target:"Not quantified in NDC",       source:"Montenegro NDC 2021",              year:2021 },
      { area:"Adaptation",     indicator:"Adaptation M&E / MRV system",        trend:"OFFTRACK", val:"In development",     target:"Operational",                 source:"Montenegro NAP 2023",              year:2023 },
      { area:"Adaptation",     indicator:"Sectoral adaptation plans",           trend:"OFFTRACK", val:"Fire prevention: partial", target:"All sectors",           source:"Montenegro NAP 2023",              year:2023 },
      { area:"Adaptation",     indicator:"Climate-proofing infrastructure",     trend:"OFFTRACK", val:"Coastal: partial",   target:"Coastal + forest systems",    source:"Montenegro NAP 2023",              year:2023 },
    ],

    events:[
      {year:2022,month:8, group:"Meteorological",type:"Fires",         deaths:null,affected:null, econLoss:null, location:"Northern Montenegro",  source:"DesInventar",sl:0.6},
      {year:2012,month:7, group:"Meteorological",type:"Extreme Heat",  deaths:2,   affected:20000,econLoss:null, location:"Multiple municipalities",source:"DesInventar",sl:0.6},
      {year:1992,month:11,group:"Hydrological",  type:"Floods",        deaths:6,   affected:6146, econLoss:null, location:"Podgorica, Kolasin",  source:"DesInventar",sl:0.6},
    ],
  },
  MKD: {
    id:"MKD", name:"North Macedonia", region:"Western Balkans", short:"MKD", wbISO:"MKD",
    totalEvents:35, yearRange:"2000-2025",
    hazard:0.45, vulnerability:0.50, future:0.52, confidence:0.60,
    dominantHazards:["Floods","Fires","Extreme Heat","Earthquakes"],
    knownDeaths:33, knownAffected:423919, knownLoss:13006913,
    deathCov:5, affCov:23, lossCov:5,
    hazardBreakdown:{ Hydrological:16, Meteorological:15, Geophysical:3, Biological:1 },
    narrative:"North Macedonia's disaster profile is shaped by flash flood exposure -- 16 hydrological events in 35 total, with the 2016 Skopje floods killing 22 people in a single afternoon event. The country sits at a seismic junction with three recorded earthquake events. Fires are increasing (11 events since 2000) under Mediterranean drying conditions. Skopje's Vardar river corridor and hillslope settlements combine high hazard exposure with limited drainage infrastructure.",
    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",           val:"33",            note:"5 of 34 nat. events — low coverage",                  conf:"low"    },
      { group:"Disaster Record",    label:"People affected (partial)",           val:"424K",          note:"23 of 34 nat. events — relatively good coverage",     conf:"medium" },
      { group:"Disaster Record",    label:"Recorded economic losses",            val:"$13M",          note:"5 events — better than most Balkan states",           conf:"medium" },
      { group:"Disaster Record",    label:"Deadliest single event",              val:"22 dead",       note:"2016 Skopje flash flood — IFRC",                      conf:"high"   },
      { group:"Infrastructure",     label:"Critical infrastructure condition",   val:"Limited drainage",note:"Vardar corridor flash flood exposure — Skopje",     conf:"medium" },
      { group:"Infrastructure",     label:"Population below poverty line",       val:"21.8%",         note:"World Bank 2022",                                     conf:"high"   },
      { group:"Infrastructure",     label:"Unemployment rate",                   val:"14.4%",         note:"World Bank 2022",                                     conf:"high"   },
      { group:"Infrastructure",     label:"Early warning system status",         val:"Active",        note:"Flash flood EWS active — N.Macedonia NAP 2023",       conf:"medium" },
      { group:"Climate & Future",   label:"Observed temperature rise",           val:"+1.6°C",        note:"1961–2020 — N.Macedonia Hydromet Inst. 2022",         conf:"medium" },
      { group:"Climate & Future",   label:"Observed precipitation change",       val:"–8% (annual)",  note:"Mediterranean drying trend — IPCC AR6",              conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",         val:"+2.3°C",        note:"IPCC AR6 Western Balkans",                            conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2100",         val:"+4.5°C",        note:"RCP8.5 — IPCC AR6 Western Balkans",                  conf:"low"    },
      { group:"Economic Exposure",  label:"NDC emissions baseline (1990)",       val:"16,300 Gg CO₂eq",note:"1990 reference — N.Macedonia NDC 2022",             conf:"medium" },
      { group:"Economic Exposure",  label:"NDC 2030 emissions target",           val:"51% below 1990",note:"Conditional — N.Macedonia NDC 2022",                 conf:"high"   },
      { group:"Economic Exposure",  label:"GDP loss without climate action",     val:"Not quantified",note:"Not published in available NDC/NAP documents",        conf:"low"    },
      { group:"Economic Exposure",  label:"Agriculture sector exposure",         val:"High",          note:"Drought and heat stress — N.Macedonia NAP 2023",      conf:"medium" },
      { group:"Governance & Capacity", label:"NAP status",                       val:"Adopted 2023",  note:"N.Macedonia NAP 2023 — UNFCCC process",              conf:"high"   },
      { group:"Governance & Capacity", label:"NDC status",                       val:"Adopted 2022",  note:"51% below 1990 by 2030 — N.Macedonia NDC 2022",      conf:"high"   },
      { group:"Governance & Capacity", label:"Adaptation M&E system",            val:"In development",note:"N.Macedonia NAP 2023 — monitoring framework planned",conf:"medium" },
      { group:"Governance & Capacity", label:"Climate budget tagging",           val:"Not implemented",note:"Identified gap — N.Macedonia NAP 2023",             conf:"low"    },
    ],

    policy: [
      { area:"Disaster Risk",  indicator:"National DRR strategy",              trend:"RIGHT",    val:"Adopted 2021",       target:"Sendai aligned 2021–2030",    source:"N.Macedonia DRR Strategy 2021",    year:2021 },
      { area:"Disaster Risk",  indicator:"Multi-hazard early warning system",  trend:"RIGHT",    val:"Flash flood: active", target:"Expand to all hazards",       source:"N.Macedonia NAP 2023",             year:2023 },
      { area:"Disaster Risk",  indicator:"Community / local DRR plans",        trend:"OFFTRACK", val:"Partial",            target:"All municipalities",           source:"UNDP N.Macedonia 2023",            year:2023 },
      { area:"Climate",        indicator:"NDC emissions reduction target",      trend:"RIGHT_NT", val:"51% below 1990",     target:"By 2030 (conditional)",       source:"N.Macedonia NDC 2022",             year:2022 },
      { area:"Climate",        indicator:"NAP adoption & implementation",       trend:"RIGHT",    val:"Adopted 2023",       target:"Implementation started",      source:"N.Macedonia NAP 2023",             year:2023 },
      { area:"Climate",        indicator:"Renewable / low-carbon energy",       trend:"OFFTRACK", val:"28% renewable",      target:"38% by 2030",                 source:"N.Macedonia Energy Strategy 2040", year:2022 },
      { area:"Climate",        indicator:"Climate finance mobilised",           trend:"OFFTRACK", val:"—",                  target:"Conditional on int'l finance",source:"N.Macedonia NDC 2022",             year:2022 },
      { area:"Adaptation",     indicator:"Adaptation M&E / MRV system",        trend:"OFFTRACK", val:"In development",     target:"Operational",                 source:"N.Macedonia NAP 2023",             year:2023 },
      { area:"Adaptation",     indicator:"Sectoral adaptation plans",           trend:"OFFTRACK", val:"Urban flood: active", target:"All sectors",                source:"N.Macedonia NAP 2023",             year:2023 },
      { area:"Adaptation",     indicator:"Climate-proofing infrastructure",     trend:"OFFTRACK", val:"Skopje: partial",    target:"Full embankment upgrade",     source:"UNDP N.Macedonia 2023",            year:2023 },
    ],

    events:[
      {year:2016,month:8, group:"Hydrological",  type:"Floods",       deaths:22,  affected:33582, econLoss:6535000, location:"Skopje area",       source:"IFRC",sl:1.0},
      {year:2015,month:8, group:"Hydrological",  type:"Floods",       deaths:7,   affected:5030,  econLoss:115143,  location:"Tetovo province",   source:"DesInventar",sl:0.6},
      {year:2003,month:7, group:"Hydrological",  type:"Floods",       deaths:2,   affected:4000,  econLoss:null,    location:"Skopje",            source:"DesInventar",sl:0.6},
    ],
  },
  UKR: {
    id:"UKR", name:"Ukraine", region:"Eastern Europe", short:"UKR", wbISO:"UKR",
    totalEvents:33, yearRange:"1993-2024",
    hazard:0.48, vulnerability:0.72, future:0.58, confidence:0.55,
    dominantHazards:["Extreme Heat","Floods","Fires","Storms"],
    knownDeaths:1369, knownAffected:2147067, knownLoss:1683931960,
    deathCov:18, affCov:20, lossCov:6,
    hazardBreakdown:{ Meteorological:17, Hydrological:14, Biological:2 },
    narrative:"This dataset covers natural hazards only and predates the 2022 Russian invasion, which caused infrastructure damage exceeding $150 billion. Within the natural hazard record, extreme heat is the dominant killer: twin heat waves in 2006 caused 919 deaths. Vulnerability is scored higher than natural hazard frequency alone would suggest because conflict damage to heating systems, water infrastructure and evacuation capacity means current resilience is substantially below any pre-2022 baseline. Any risk assessment for Ukraine must be read alongside conflict impact data.",
    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",           val:"1,369",         note:"18 of 31 nat. events — reasonable coverage",          conf:"medium" },
      { group:"Disaster Record",    label:"People affected (partial)",           val:"2.15M",         note:"20 of 33 events — Carpathian floods dominate",        conf:"medium" },
      { group:"Disaster Record",    label:"Recorded economic losses",            val:"$1.68B",        note:"6 events — reasonable coverage for region",           conf:"medium" },
      { group:"Disaster Record",    label:"Deadliest single event",              val:"919 dead",      note:"2006 twin heat waves — EM-DAT",                       conf:"high"   },
      { group:"Infrastructure",     label:"Critical infrastructure condition",   val:"Conflict-damaged",note:"Heating, water, evacuation degraded — UNDP Ukraine 2024", conf:"high"},
      { group:"Infrastructure",     label:"Population below poverty line",       val:"Not reliable",  note:"Pre-2022 data — conflict has dramatically altered",   conf:"low"    },
      { group:"Infrastructure",     label:"Unemployment rate",                   val:"Not reliable",  note:"Pre-2022 data — conflict-affected economy",           conf:"low"    },
      { group:"Infrastructure",     label:"Early warning system status",         val:"Conflict-affected",note:"Pre-2022 capacity substantially degraded",         conf:"low"    },
      { group:"Climate & Future",   label:"Observed temperature rise",           val:"+1.3°C",        note:"1961–2020 — Ukraine Hydromet Centre 2022",            conf:"medium" },
      { group:"Climate & Future",   label:"Observed precipitation change",       val:"Increasing intensity",note:"Extreme events more frequent — IPCC AR6",      conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",         val:"+2.2°C",        note:"IPCC AR6 Eastern Europe",                             conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2100",         val:"+4.5°C",        note:"RCP8.5 — IPCC AR6 Eastern Europe",                   conf:"low"    },
      { group:"Economic Exposure",  label:"NDC emissions baseline (1990)",       val:"944,000 Gg CO₂eq",note:"1990 reference — Ukraine NDC 2021",                conf:"high"   },
      { group:"Economic Exposure",  label:"NDC 2030 emissions target",           val:"65% below 1990",note:"Conditional — Ukraine NDC 2021",                      conf:"high"   },
      { group:"Economic Exposure",  label:"GDP loss without climate action",     val:"Not quantified",note:"Conflict impact ($150B+) dominates over climate",     conf:"low"    },
      { group:"Economic Exposure",  label:"Agriculture sector exposure",         val:"Critical",      note:"Breadbasket nation — heat and drought risk compound conflict", conf:"medium"},
      { group:"Governance & Capacity", label:"NAP status",                       val:"Conflict-affected",note:"NAP process disrupted — Ukraine DRR Strategy 2019", conf:"low"   },
      { group:"Governance & Capacity", label:"NDC status",                       val:"Adopted 2021",  note:"65% below 1990 by 2030 — Ukraine NDC 2021",          conf:"high"   },
      { group:"Governance & Capacity", label:"Adaptation M&E system",            val:"Conflict-affected",note:"Pre-2022 system substantially disrupted",          conf:"low"    },
      { group:"Governance & Capacity", label:"Climate budget tagging",           val:"Not implemented",note:"Disrupted by conflict — priority for recovery phase", conf:"low"   },
    ],

    policy: [
      { area:"Disaster Risk",  indicator:"National DRR strategy",              trend:"OFFTRACK", val:"Adopted 2019",       target:"Implementation conflict-disrupted", source:"Ukraine DRR Strategy 2019–2030", year:2019},
      { area:"Disaster Risk",  indicator:"Multi-hazard early warning system",  trend:"WRONG",    val:"Conflict-affected",  target:"Restore post-conflict",       source:"UNDP Ukraine 2024",                year:2024 },
      { area:"Disaster Risk",  indicator:"Community / local DRR plans",        trend:"WRONG",    val:"Conflict-disrupted",  target:"Restore capacity",            source:"UNDP Ukraine 2024",                year:2024 },
      { area:"Climate",        indicator:"NDC emissions reduction target",      trend:"OFFTRACK", val:"65% below 1990",     target:"By 2030 (conditional)",       source:"Ukraine NDC 2021",                 year:2021 },
      { area:"Climate",        indicator:"NAP adoption & implementation",       trend:"WRONG",    val:"Conflict-disrupted",  target:"Resume post-conflict",        source:"Ukraine NAP process 2022",         year:2022 },
      { area:"Climate",        indicator:"Renewable / low-carbon energy",       trend:"WRONG",    val:"Conflict-damaged",   target:"Restore + expand renewables", source:"UNDP Ukraine 2024",                year:2024 },
      { area:"Climate",        indicator:"Climate finance mobilised",           trend:"NODATA",   val:"—",                  target:"Recovery financing priority", source:"Ukraine Recovery Plan 2023",       year:2023 },
      { area:"Adaptation",     indicator:"Adaptation M&E / MRV system",        trend:"WRONG",    val:"Conflict-disrupted",  target:"Restore system",              source:"UNDP Ukraine 2024",                year:2024 },
      { area:"Adaptation",     indicator:"Sectoral adaptation plans",           trend:"WRONG",    val:"Heat health: damaged",target:"Restore capacity",            source:"WHO Ukraine 2024",                 year:2024 },
      { area:"Adaptation",     indicator:"Climate-proofing infrastructure",     trend:"WRONG",    val:"$150B+ damage",      target:"Integrate CCA into rebuild",  source:"Ukraine Recovery Plan 2023",       year:2023 },
    ],

    events:[
      {year:2008,month:7, group:"Hydrological",  type:"Floods",       deaths:37,  affected:47000, econLoss:600000000, location:"Carpathians",       source:"EM-DAT",sl:0.6},
      {year:2006,month:8, group:"Meteorological",type:"Extreme Heat", deaths:738, affected:7500,  econLoss:null,      location:"Ukraine",           source:"EM-DAT",sl:0.6},
      {year:2006,month:7, group:"Meteorological",type:"Extreme Heat", deaths:181, affected:4470,  econLoss:null,      location:"Ukraine",           source:"EM-DAT",sl:0.6},
      {year:2002,month:7, group:"Hydrological",  type:"Floods",       deaths:39,  affected:260000,econLoss:1019000000,location:"Western Ukraine",   source:"EM-DAT",sl:0.6},
    ],
  },
  UZB: {
    id:"UZB", name:"Uzbekistan", region:"Central Asia", short:"UZB", wbISO:"UZB",
    totalEvents:29, yearRange:"1902-2025",
    hazard:0.55, vulnerability:0.68, future:0.72, confidence:0.45,
    dominantHazards:["Floods","Fires","Earthquakes","Droughts","Landslides"],
    knownDeaths:4675, knownAffected:822217, knownLoss:391083000,
    deathCov:13, affCov:9, lossCov:2,
    hazardBreakdown:{ Hydrological:12, Meteorological:9, Geophysical:6, Biological:2 },
    narrative:"Uzbekistan's hazard record spans over a century with the 1902 earthquake (4,500 deaths) as the defining historical event. But the most significant vulnerability driver is outside this dataset entirely: the collapse of the Aral Sea has degraded agricultural systems, created toxic dust storm hazards, and left 60,000 km2 of exposed seabed. Future risk is high -- projected temperature increases of 3-4C by 2050, 30% water deficit from glacier retreat, and crop yield losses that threaten food systems for 35 million people.",
    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",           val:"4,675",         note:"13 of 27 nat. events — 1902 EQ (4,500) dominates",    conf:"low"    },
      { group:"Disaster Record",    label:"People affected (partial)",           val:"822K",          note:"9 of 29 events — low coverage",                       conf:"low"    },
      { group:"Disaster Record",    label:"Recorded economic losses",            val:"$391M",         note:"2 events — extreme undercount",                        conf:"low"    },
      { group:"Disaster Record",    label:"Deadliest single event",              val:"4,500 dead",    note:"1902 earthquake — USGS/EM-DAT",                       conf:"medium" },
      { group:"Infrastructure",     label:"Critical infrastructure condition",   val:"Soviet-era irrigation",note:"Ferghana Valley decay — UNDP Uzbekistan 2022", conf:"medium" },
      { group:"Infrastructure",     label:"Population below poverty line",       val:"16.8%",         note:"World Bank 2022",                                     conf:"high"   },
      { group:"Infrastructure",     label:"Unemployment rate",                   val:"9.0%",          note:"World Bank 2022",                                     conf:"high"   },
      { group:"Infrastructure",     label:"Early warning system status",         val:"Partial",       note:"UNDP Uzbekistan DRR 2023 — limited coverage",         conf:"medium" },
      { group:"Climate & Future",   label:"Observed temperature rise",           val:"+1.8°C",        note:"1940–2020 — Uzbekistan Hydromet Centre 2022",         conf:"medium" },
      { group:"Climate & Future",   label:"Observed precipitation change",       val:"–10% (arid zones)",note:"Aridification accelerating — IPCC AR6",            conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",         val:"+3.5°C",        note:"Continental amplification — IPCC AR6",                conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2100",         val:"+6.0°C",        note:"RCP8.5 — Uzbekistan Nat. Comm.",                      conf:"low"    },
      { group:"Economic Exposure",  label:"NDC emissions baseline (1990)",       val:"211,000 Gg CO₂eq",note:"1990 reference — Uzbekistan NDC 2021",             conf:"medium" },
      { group:"Economic Exposure",  label:"NDC 2030 emissions target",           val:"35% below 1990",note:"Unconditional — Uzbekistan NDC 2021",                 conf:"high"   },
      { group:"Economic Exposure",  label:"GDP loss without climate action",     val:"Not quantified",note:"Aral Sea collapse costs ongoing but unquantified",    conf:"low"    },
      { group:"Economic Exposure",  label:"Agriculture sector exposure",         val:"Critical",      note:"35M people — glacier retreat + aridification threat",  conf:"high"   },
      { group:"Governance & Capacity", label:"NAP status",                       val:"Adopted 2022",  note:"Uzbekistan NAP 2022 — UNFCCC process",                conf:"high"   },
      { group:"Governance & Capacity", label:"NDC status",                       val:"Adopted 2021",  note:"35% below 1990 by 2030 — Uzbekistan NDC 2021",        conf:"high"   },
      { group:"Governance & Capacity", label:"Adaptation M&E system",            val:"In development",note:"Uzbekistan NAP 2022 — monitoring framework planned",  conf:"medium" },
      { group:"Governance & Capacity", label:"Climate budget tagging",           val:"Not implemented",note:"Not referenced in available documents",              conf:"low"    },
    ],

    policy: [
      { area:"Disaster Risk",  indicator:"National DRR strategy",              trend:"RIGHT",    val:"Adopted 2021",       target:"Sendai aligned 2021–2030",    source:"Uzbekistan DRR Strategy 2021",     year:2021 },
      { area:"Disaster Risk",  indicator:"Multi-hazard early warning system",  trend:"OFFTRACK", val:"Partial",            target:"Full national coverage",      source:"UNDP Uzbekistan 2023",             year:2023 },
      { area:"Disaster Risk",  indicator:"Community / local DRR plans",        trend:"OFFTRACK", val:"Partial",            target:"All regions",                 source:"Uzbekistan DRR Strategy 2021",     year:2021 },
      { area:"Climate",        indicator:"NDC emissions reduction target",      trend:"RIGHT_NT", val:"35% below 1990",     target:"By 2030 (unconditional)",     source:"Uzbekistan NDC 2021",              year:2021 },
      { area:"Climate",        indicator:"NAP adoption & implementation",       trend:"RIGHT",    val:"Adopted 2022",       target:"Implementation started",      source:"Uzbekistan NAP 2022",              year:2022 },
      { area:"Climate",        indicator:"Renewable / low-carbon energy",       trend:"RIGHT",    val:"8% renewable",       target:"25% by 2030",                 source:"Uzbekistan Energy Strategy 2030",  year:2022 },
      { area:"Climate",        indicator:"Climate finance mobilised",           trend:"OFFTRACK", val:"—",                  target:"Not quantified in NDC",       source:"Uzbekistan NDC 2021",              year:2021 },
      { area:"Adaptation",     indicator:"Adaptation M&E / MRV system",        trend:"OFFTRACK", val:"In development",     target:"Operational",                 source:"Uzbekistan NAP 2022",              year:2022 },
      { area:"Adaptation",     indicator:"Sectoral adaptation plans",           trend:"OFFTRACK", val:"Water: partial",     target:"All sectors",                 source:"Uzbekistan NAP 2022",              year:2022 },
      { area:"Adaptation",     indicator:"Climate-proofing infrastructure",     trend:"RIGHT",    val:"Aral Sea: active",   target:"Ongoing remediation",         source:"UN Aral Sea Programme 2023",       year:2023 },
    ],

    events:[
      {year:1998,month:5, group:"Hydrological",  type:"Floods",       deaths:100, affected:null,  econLoss:null,      location:"Uzbekistan",        source:"EM-DAT",sl:0.6},
      {year:1902,month:12,group:"Geophysical",   type:"Earthquake",   deaths:4500,affected:null,  econLoss:null,      location:"Uzbekistan",        source:"USGS",sl:0.6},
    ],
  },
  TKM: {
    id:"TKM", name:"Turkmenistan", region:"Central Asia", short:"TKM", wbISO:"TKM",
    totalEvents:26, yearRange:"1929-2025",
    hazard:0.45, vulnerability:0.72, future:0.75, confidence:0.38,
    dominantHazards:["Earthquakes","Storms","Floods","Droughts"],
    knownDeaths:113298, knownAffected:176420, knownLoss:45000000,
    deathCov:6, affCov:2, lossCov:2,
    hazardBreakdown:{ Hydrological:10, Meteorological:9, Geophysical:7 },
    narrative:"Turkmenistan's disaster record is dominated by the 1948 Ashgabat earthquake (110,000 deaths -- one of the deadliest of the 20th century) and the 1929 Ashgabat earthquake (3,257 deaths). Outside these seismic catastrophes the contemporary picture is storms and floods, but data availability is severely constrained by political opacity. Vulnerability is scored high because critical infrastructure is opaque to external assessment. Future risk is driven by extreme aridification threatening the already water-stressed Amu Darya basin.",
    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",           val:"113,298",       note:"1948 Ashgabat EQ (110K) dominates — USGS/EM-DAT",     conf:"medium" },
      { group:"Disaster Record",    label:"People affected (partial)",           val:"176K",          note:"2 of 26 events — extreme undercount due to opacity",  conf:"low"    },
      { group:"Disaster Record",    label:"Recorded economic losses",            val:"$45M",          note:"2 events — political opacity limits data",            conf:"low"    },
      { group:"Disaster Record",    label:"Deadliest single event",              val:"110,000 dead",  note:"1948 Ashgabat earthquake — 20th century's deadliest",  conf:"high"   },
      { group:"Infrastructure",     label:"Critical infrastructure condition",   val:"Opaque",        note:"International assessment restricted — critical gap",  conf:"low"    },
      { group:"Infrastructure",     label:"Population below poverty line",       val:"Not available",  note:"Political opacity — World Bank data restricted",     conf:"low"    },
      { group:"Infrastructure",     label:"Unemployment rate",                   val:"Not available",  note:"Official data not published — UNDP 2023",           conf:"low"    },
      { group:"Infrastructure",     label:"Early warning system status",         val:"Unknown",       note:"No international assessment available — UNDRR 2023",  conf:"low"    },
      { group:"Climate & Future",   label:"Observed temperature rise",           val:"+1.9°C",        note:"1940–2020 — Central Asian regional estimate",         conf:"low"    },
      { group:"Climate & Future",   label:"Observed precipitation change",       val:"–15% (trend)",  note:"Arid zone — extreme drying projected — IPCC AR6",    conf:"low"    },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",         val:"+3.8°C",        note:"Continental arid amplification — IPCC AR6",           conf:"low"    },
      { group:"Climate & Future",   label:"Projected temp rise by 2100",         val:"+6.0°C",        note:"RCP8.5 — among highest in dataset",                   conf:"low"    },
      { group:"Economic Exposure",  label:"NDC emissions baseline (1990)",       val:"Not quantified",note:"NDC submitted 2022 — no quantified baseline",         conf:"low"    },
      { group:"Economic Exposure",  label:"NDC 2030 emissions target",           val:"No numeric target",note:"Turkmenistan NDC 2022 — qualitative only",         conf:"medium" },
      { group:"Economic Exposure",  label:"GDP loss without climate action",     val:"Not quantified",note:"Political opacity limits all economic assessment",    conf:"low"    },
      { group:"Economic Exposure",  label:"Agriculture sector exposure",         val:"Critical",      note:"Amu Darya water stress — irrigation-dependent economy", conf:"medium"},
      { group:"Governance & Capacity", label:"NAP status",                       val:"Not publicly available",note:"No NAP on UNFCCC registry — UNDRR 2023",      conf:"low"    },
      { group:"Governance & Capacity", label:"NDC status",                       val:"Submitted 2022",note:"No quantified targets — Turkmenistan NDC 2022",       conf:"medium" },
      { group:"Governance & Capacity", label:"Adaptation M&E system",            val:"Unknown",       note:"No international assessment available",               conf:"low"    },
      { group:"Governance & Capacity", label:"Climate budget tagging",           val:"Unknown",       note:"Political opacity limits assessment",                  conf:"low"    },
    ],

    policy: [
      { area:"Disaster Risk",  indicator:"National DRR strategy",              trend:"WRONG",    val:"Minimal engagement", target:"Open int'l DRR engagement",  source:"UNDRR 2023",                       year:2023 },
      { area:"Disaster Risk",  indicator:"Multi-hazard early warning system",  trend:"NODATA",   val:"Unknown",            target:"Not assessable externally",   source:"UNDRR 2023",                       year:2023 },
      { area:"Disaster Risk",  indicator:"Community / local DRR plans",        trend:"NODATA",   val:"Unknown",            target:"Not assessable externally",   source:"UNDRR 2023",                       year:2023 },
      { area:"Climate",        indicator:"NDC emissions reduction target",      trend:"NODATA",   val:"No numeric target",  target:"Qualitative NDC only",        source:"Turkmenistan NDC 2022",            year:2022 },
      { area:"Climate",        indicator:"NAP adoption & implementation",       trend:"NODATA",   val:"Not publicly available",target:"Not on UNFCCC registry",    source:"UNFCCC registry",                  year:null },
      { area:"Climate",        indicator:"Renewable / low-carbon energy",       trend:"NODATA",   val:"Unknown",            target:"Not quantified in NDC",       source:"Turkmenistan NDC 2022",            year:2022 },
      { area:"Climate",        indicator:"Climate finance mobilised",           trend:"NODATA",   val:"—",                  target:"Not publicly available",      source:"—",                                year:null },
      { area:"Adaptation",     indicator:"Adaptation M&E / MRV system",        trend:"NODATA",   val:"Unknown",            target:"Not assessable externally",   source:"UNDRR 2023",                       year:2023 },
      { area:"Adaptation",     indicator:"Sectoral adaptation plans",           trend:"NODATA",   val:"Not publicly available",target:"Not on UNFCCC registry",    source:"—",                                year:null },
      { area:"Adaptation",     indicator:"Climate-proofing infrastructure",     trend:"NODATA",   val:"Unknown",            target:"Not assessable externally",   source:"UNDRR 2023",                       year:2023 },
    ],

    events:[
      {year:2020,month:7, group:"Meteorological",type:"Storm",        deaths:30,  affected:null,  econLoss:null,     location:"Turkmenistan",   source:"DesInventar",sl:0.6},
      {year:1948,month:10,group:"Geophysical",   type:"Earthquake",   deaths:110000,affected:176000,econLoss:25000000,location:"Ashgabat",      source:"USGS/EM-DAT",sl:0.6},
      {year:1929,month:2, group:"Geophysical",   type:"Earthquake",   deaths:3257,affected:null,  econLoss:null,     location:"Ashgabat",       source:"USGS",sl:0.6},
    ],
  },

  // ─── MOCK DATA ADDITIONS ────────────────────────────────────────────────────
  ALB: {
    id:"ALB", name:"Albania", region:"Western Balkans", short:"ALB", wbISO:"ALB",
    totalEvents:32, yearRange:"1980–2025",
    hazard:0.58, vulnerability:0.60, future:0.63, confidence:0.55,
    dominantHazards:["Floods","Earthquakes","Landslides"],
    knownDeaths:420, knownAffected:520000, knownLoss:320000000,
    deathCov:14, affCov:18, lossCov:7,
    hazardBreakdown:{ Hydrological:18, Geophysical:9, Meteorological:4, Biological:1 },

    narrative: "Albania faces a classic coastal-mountain risk profile where winter river floods and shallow earthquakes intersect with dense urban growth in floodplains. Recurrent Drin and Vjosa basin floods have displaced tens of thousands of people since the 1990s, while seismic risk remains elevated around Tirana and Durres. Ageing water, energy and road infrastructure amplify even moderate events, and future sea‑level rise plus more intense rainfall could significantly increase annual losses without proactive adaptation.",

    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",       val:"420",      note:"14 of 32 events — mixed hydrological and seismic record", conf:"low" },
      { group:"Disaster Record",    label:"People affected (partial)",       val:"520K",     note:"18 of 32 events — concentrated in major river basins",    conf:"low" },
      { group:"Disaster Record",    label:"Recorded economic losses",        val:"$320M",    note:"7 of 32 events — likely undercount of local impacts",     conf:"low" },
      { group:"Infrastructure",     label:"Critical infrastructure condition",val:"Worn",    note:"Legacy Soviet‑era networks under stress",                 conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2050",     val:"+2.3°C",   note:"Indicative regional projection — mock data",              conf:"low" },
      { group:"Governance & Capacity", label:"NAP status",                   val:"Draft",    note:"Adaptation planning in development — mock",               conf:"low" },
    ],

    policy: [
      { area:"Disaster Risk", indicator:"National DRR strategy",        trend:"RIGHT",    val:"Adopted",      target:"Aligned with Sendai (mock)",    source:"Mock source", year:2023 },
      { area:"Climate",       indicator:"NDC emissions reduction",      trend:"OFFTRACK", val:"Pledged cuts", target:"2030 target (mock)",           source:"Mock source", year:2022 },
      { area:"Adaptation",    indicator:"Local DRR plans",              trend:"OFFTRACK", val:"Partial",      target:"Full municipal coverage",      source:"Mock source", year:2024 },
    ],

    events:[
      {year:2024,month:1, group:"Hydrological", type:"Flood",        deaths:4,  affected:12000, econLoss:15000000, location:"Shkoder basin",   source:"Mock", sl:0.5},
      {year:2019,month:11,group:"Hydrological", type:"Flood",        deaths:6,  affected:25000, econLoss:40000000, location:"Central Albania", source:"Mock", sl:0.5},
      {year:2010,month:1, group:"Hydrological", type:"Flood",        deaths:3,  affected:14000, econLoss:25000000, location:"Lezha",           source:"Mock", sl:0.5},
      {year:1999,month:8, group:"Geophysical",  type:"Earthquake",   deaths:18, affected:5200,  econLoss:12000000, location:"Tirana region",   source:"Mock", sl:0.4},
    ],
  },

  SRB: {
    id:"SRB", name:"Serbia", region:"Western Balkans", short:"SRB", wbISO:"SRB",
    totalEvents:28, yearRange:"1984–2025",
    hazard:0.50, vulnerability:0.55, future:0.57, confidence:0.52,
    dominantHazards:["River Floods","Heatwaves","Storms"],
    knownDeaths:310, knownAffected:760000, knownLoss:1800000000,
    deathCov:10, affCov:16, lossCov:6,
    hazardBreakdown:{ Hydrological:17, Meteorological:7, Geophysical:2, Biological:2 },

    narrative: "Serbia’s risk profile is dominated by the Sava–Danube river system, where large‑scale floods periodically affect Belgrade and northern municipalities. The 2014 floods remain the benchmark loss event, but smaller annual floods, heatwaves and winter storms steadily erode infrastructure and household resilience. Climate projections suggest more intense rainfall events and hotter, drier summers, increasing both flood and heat‑related health risks.",

    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",   val:"310",    note:"10 of 28 events — flood and heat events dominate",   conf:"low" },
      { group:"Disaster Record",    label:"People affected (partial)",   val:"760K",   note:"16 of 28 events — includes 2014 mega‑flood",         conf:"low" },
      { group:"Infrastructure",     label:"Critical infrastructure",     val:"Ageing", note:"Key transport and energy assets exposed to floods",  conf:"medium" },
      { group:"Climate & Future",   label:"Heatwave frequency",          val:"Rising", note:"Mock upward trend in multi‑day heat events",        conf:"low" },
      { group:"Governance & Capacity", label:"DRR coordination",         val:"Partial",note:"National framework in place, local gaps (mock)",   conf:"low" },
    ],

    policy: [
      { area:"Disaster Risk", indicator:"Flood risk management plan", trend:"RIGHT",    val:"Adopted",     target:"Updated after 2014 floods (mock)", source:"Mock", year:2018 },
      { area:"Climate",       indicator:"NDC implementation",        trend:"OFFTRACK", val:"In progress", target:"2030 mitigation and resilience",   source:"Mock", year:2022 },
      { area:"Adaptation",    indicator:"Urban heat action plans",   trend:"OFFTRACK", val:"Pilots",      target:"Main cities covered",              source:"Mock", year:2024 },
    ],

    events:[
      {year:2014,month:5, group:"Hydrological", type:"Flood",      deaths:57, affected:150000, econLoss:1400000000, location:"Sava–Danube basin", source:"Mock", sl:0.7},
      {year:2020,month:8, group:"Meteorological",type:"Heatwave",  deaths:22, affected:32000,  econLoss:8000000,    location:"Belgrade",         source:"Mock", sl:0.4},
      {year:2005,month:3, group:"Hydrological", type:"Flood",      deaths:6,  affected:21000,  econLoss:30000000,   location:"Central Serbia",   source:"Mock", sl:0.5},
    ],
  },

  TUR: {
    id:"TUR", name:"Türkiye", region:"Western Balkans & Türkiye", short:"TUR", wbISO:"TUR",
    totalEvents:60, yearRange:"1980–2025",
    hazard:0.82, vulnerability:0.70, future:0.78, confidence:0.65,
    dominantHazards:["Earthquakes","Floods","Wildfires","Heatwaves"],
    knownDeaths:32000, knownAffected:5200000, knownLoss:48000000000,
    deathCov:24, affCov:30, lossCov:15,
    hazardBreakdown:{ Geophysical:28, Hydrological:16, Meteorological:10, Biological:6 },

    narrative: "Türkiye combines one of the world’s highest seismic risk corridors with rapidly growing coastal and metropolitan exposure along the Marmara, Aegean and Mediterranean. Catastrophic earthquakes set the upper bound of recorded losses, while recurrent river and flash floods, wildfires and heatwaves place chronic pressure on local systems. Future climate signals point to hotter summers, higher fire weather risk and more intense rainfall events, particularly in urban areas with limited drainage capacity.",

    indicators: [
      { group:"Disaster Record",    label:"Recorded deaths (partial)",   val:"32,000", note:"Dominated by major earthquake sequences — mock",   conf:"low" },
      { group:"Disaster Record",    label:"People affected (partial)",   val:"5.2M",   note:"30 of 60 events — earthquakes and floods",        conf:"low" },
      { group:"Infrastructure",     label:"Critical infrastructure",     val:"Mixed",  note:"Modern assets co‑exist with vulnerable stock",    conf:"medium" },
      { group:"Climate & Future",   label:"Projected temp rise by 2050", val:"+2.5°C", note:"Indicative regional projection — mock",           conf:"low" },
      { group:"Governance & Capacity", label:"Seismic building code",    val:"Strengthened", note:"Progress after major quakes — mock",       conf:"medium" },
    ],

    policy: [
      { area:"Disaster Risk", indicator:"Earthquake risk reduction", trend:"RIGHT",    val:"Scaled‑up",  target:"Retrofit + urban renewal", source:"Mock", year:2025 },
      { area:"Climate",       indicator:"Wildfire management",      trend:"OFFTRACK", val:"Stressed",  target:"Modernised aerial & EWS capacity", source:"Mock", year:2023 },
      { area:"Adaptation",    indicator:"Urban flood resilience",   trend:"OFFTRACK", val:"Patchy",    target:"Major cities climate‑proofed",     source:"Mock", year:2024 },
    ],

    events:[
      {year:2023,month:2, group:"Geophysical",  type:"Earthquake", deaths:24000, affected:3000000, econLoss:35000000000, location:"Southern Türkiye", source:"Mock", sl:0.7},
      {year:2021,month:8, group:"Meteorological",type:"Wildfire",  deaths:10,    affected:15000,   econLoss:700000000,  location:"Mediterranean coast", source:"Mock", sl:0.5},
      {year:2020,month:6, group:"Hydrological", type:"Flash Flood",deaths:12,    affected:8000,    econLoss:90000000,   location:"Black Sea region",   source:"Mock", sl:0.5},
    ],
  },
};

const CONF_COLOR = { high:C.good, medium:C.warn, low:C.bad };
const IND_GROUPS = ["Disaster Record","Infrastructure","Climate & Future","Economic Exposure","Governance & Capacity"];
const POL_AREAS  = ["Disaster Risk","Climate","Adaptation"];

// ─── SMALL ATOMS ─────────────────────────────────────────────────────────────
const SL = { fontSize:11, color:C.muted, fontFamily:"'DM Mono',monospace", letterSpacing:"2px", marginBottom:10 };

function ConfPill({level}){
  const c=CONF_COLOR[level]||C.nodata;
  return <span style={{fontSize:7,color:c,border:`1px solid ${c}40`,borderRadius:3,padding:"1px 5px",marginLeft:6,fontFamily:"'DM Mono',monospace",textTransform:"uppercase"}}>{level}</span>;
}

function TrendBadge({trend}){
  const t=TREND[trend]||TREND.NODATA;
  return(
    <div style={{display:"flex",alignItems:"center",gap:5}}>
      <span style={{fontSize:11,color:t.color}}>{t.icon}</span>
      <span style={{fontSize:9,color:t.color,fontFamily:"'DM Mono',monospace"}}>{t.label}</span>
    </div>
  );
}

function HazardBar({breakdown}){
  const total=Object.values(breakdown).reduce((s,v)=>s+v,0)||1;
  return(
    <div style={{display:"flex",gap:2,height:5,borderRadius:3,overflow:"hidden"}}>
      {Object.entries(breakdown).filter(([,v])=>v>0).map(([g,v])=>(
        <div key={g} style={{flex:v/total,background:GROUP_COLOR[g],opacity:0.7}} title={`${g}: ${v}`}/>
      ))}
    </div>
  );
}

// ─── RADAR ────────────────────────────────────────────────────────────────────
function Radar({countries, selected, onSelect}){
  const cx=250, cy=250, maxR=190;
  const ids=Object.keys(countries);
  const n=ids.length;
  const segAngle=360/n;
  const GAP_DEG=3; // gap between segments in degrees
  const BAND_PAD=3; // px padding between bands
  const bands=[0, maxR*0.33, maxR*0.66, maxR];
  const [hov,setHov]=useState(null);

  const arc=(iR,oR,sa,ea)=>{
    const laf=ea-sa>180?1:0;
    const p1=polar(cx,cy,iR,sa), p2=polar(cx,cy,oR,sa);
    const p3=polar(cx,cy,oR,ea), p4=polar(cx,cy,iR,ea);
    return `M${p1.x},${p1.y} L${p2.x},${p2.y} A${oR},${oR} 0 ${laf} 1 ${p3.x},${p3.y} L${p4.x},${p4.y} A${iR},${iR} 0 ${laf} 0 ${p1.x},${p1.y}Z`;
  };

  // Each country×layer combo gets its own radial gradient id
  const gid=(ci,li)=>`g${ci}l${li}`;

  return(
    <svg width={520} height={520} viewBox="-10,-10,520,520" style={{overflow:"visible"}}>
      <defs>

        {/* Soft glow filter for selected segments */}
        <filter id="segGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>

        {/* Ambient background glow at centre */}
        <radialGradient id="bgAtmos" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#1a3a5c" stopOpacity="0.6"/>
          <stop offset="60%"  stopColor="#0a1f38" stopOpacity="0.3"/>
          <stop offset="100%" stopColor={C.bg}    stopOpacity="0"/>
        </radialGradient>

        {/* Per-segment radial gradients — colour radiates outward from centre */}
        {ids.map((id,ci)=>
          LAYERS.map((layer,li)=>(
            <radialGradient key={gid(ci,li)} id={gid(ci,li)}
              cx={cx} cy={cy} r={maxR}
              gradientUnits="userSpaceOnUse">
              <stop offset={`${(bands[li]/maxR)*100}%`}
                stopColor={layer.color} stopOpacity="0.05"/>
              <stop offset={`${(bands[li+1]/maxR)*80}%`}
                stopColor={layer.color} stopOpacity="0.55"/>
              <stop offset={`${(bands[li+1]/maxR)*100}%`}
                stopColor={layer.color} stopOpacity="0.85"/>
            </radialGradient>
          ))
        )}

        {/* Layer-level ring gradients for the guide lines */}
        {LAYERS.map((layer,li)=>(
          <radialGradient key={`rg${li}`} id={`rg${li}`}
            cx={cx} cy={cy} r={bands[li+1]}
            gradientUnits="userSpaceOnUse">
            <stop offset="60%" stopColor={layer.color} stopOpacity="0"/>
            <stop offset="100%" stopColor={layer.color} stopOpacity="0.35"/>
          </radialGradient>
        ))}

      </defs>

      {/* ── AMBIENT ATMOSPHERE ──────────────────────────────────── */}
      <circle cx={cx} cy={cy} r={maxR+20}
        fill="url(#bgAtmos)"/>

      {/* ── BAND ZONE FILLS — very subtle tinted rings ─────────── */}
      {LAYERS.map((layer,li)=>(
        <circle key={`zone${li}`} cx={cx} cy={cy} r={bands[li+1]}
          fill={`${layer.color}09`}/>
      ))}
      {/* Punch out inner bands so they don't stack */}
      {LAYERS.map((layer,li)=> li>0 &&(
        <circle key={`punch${li}`} cx={cx} cy={cy} r={bands[li]-1}
          fill={C.bg}/>
      ))}

      {/* ── GUIDE RING LINES ────────────────────────────────────── */}
      {LAYERS.map((layer,li)=>(
        <circle key={`ring${li}`} cx={cx} cy={cy} r={bands[li+1]}
          fill="none"
          stroke={`url(#rg${li})`}
          strokeWidth={li===2?1.5:1}
          strokeDasharray={li===2?"none":"3 7"}/>
      ))}
      {/* Innermost faint ring */}
      <circle cx={cx} cy={cy} r={bands[0]+1}
        fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1}/>

      {/* ── SPOKE DIVIDERS ──────────────────────────────────────── */}
      {ids.map((_,i)=>{
        const spokeDeg=i*segAngle;
        const inner=polar(cx,cy,12,spokeDeg);
        const outer=polar(cx,cy,maxR+2,spokeDeg);
        return(
          <line key={`spk${i}`}
            x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
            stroke="rgba(255,255,255,0.06)" strokeWidth={1}/>
        );
      })}

      {/* ── GHOST ARCS — full band, very dim, always visible ────── */}
      {ids.map((id,ci)=>{
        const mid=ci*segAngle, sa=mid-segAngle/2+GAP_DEG/2, ea=mid+segAngle/2-GAP_DEG/2;
        return LAYERS.map((_,li)=>{
          const iR=bands[li]+BAND_PAD, oR=bands[li+1]-BAND_PAD;
          return(
            <path key={`gh${ci}${li}`}
              d={arc(iR,oR,sa,ea)}
              fill="rgba(255,255,255,0.025)"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={0.5}
              style={{pointerEvents:"none"}}/>
          );
        });
      })}

      {/* ── DATA SEGMENTS ───────────────────────────────────────── */}
      {ids.map((id,ci)=>{
        const c=countries[id];
        const mid=ci*segAngle;
        const sa=mid-segAngle/2+GAP_DEG/2;
        const ea=mid+segAngle/2-GAP_DEG/2;
        const isSel=selected?.id===id, isHov=hov===id;

        return(
          <g key={`country${ci}`}
            style={{cursor:"pointer"}}
            onClick={()=>onSelect(isSel?null:c)}
            onMouseEnter={()=>setHov(id)}
            onMouseLeave={()=>setHov(null)}>

            {LAYERS.map((layer,li)=>{
              const val=c[layer.key];
              const bandStart=bands[li]+BAND_PAD;
              const bandTotal=bands[li+1]-bands[li]-BAND_PAD*2;
              const oR=bandStart+bandTotal*val;
              if(oR<=bandStart+1) return null;

              const d=arc(bandStart, oR, sa, ea);

              // Thin bright leading edge arc (outer rim of data)
              const edgeD=arc(oR-1.5, oR+1, sa+0.8, ea-0.8);

              return(
                <g key={`seg${li}`}>
                  {/* Glow layer behind — only when selected */}
                  {isSel&&(
                    <path d={d}
                      fill={layer.color}
                      fillOpacity={0.18}
                      filter="url(#segGlow)"
                      style={{pointerEvents:"none"}}/>
                  )}
                  {/* Main fill with radial gradient */}
                  <path d={d}
                    fill={`url(#${gid(ci,li)})`}
                    fillOpacity={isSel?1.0:isHov?0.75:0.5}
                    style={{transition:"fill-opacity 0.22s ease"}}/>
                  {/* Bright outer edge line */}
                  <path d={edgeD}
                    fill={layer.color}
                    fillOpacity={isSel?0.95:isHov?0.6:0.22}
                    style={{
                      transition:"fill-opacity 0.22s ease",
                      pointerEvents:"none"
                    }}/>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* ── GAP CUTTERS — clean dark lines between countries ─────── */}
      {ids.map((_,i)=>{
        const deg=i*segAngle-segAngle/2+GAP_DEG/2;
        const inner=polar(cx,cy,BAND_PAD,deg);
        const outer=polar(cx,cy,maxR-BAND_PAD,deg);
        return(
          <line key={`cut${i}`}
            x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
            stroke={C.bg} strokeWidth={GAP_DEG*0.55}
            strokeLinecap="round"
            style={{pointerEvents:"none"}}/>
        );
      })}

      {/* ── COUNTRY LABELS ──────────────────────────────────────── */}
      {ids.map((id,ci)=>{
        const c=countries[id];
        const mid=ci*segAngle;
        const isSel=selected?.id===id, isHov=hov===id;

        // Confidence arc — a thin arc just outside the radar edge
        const confTrackR=maxR+10;
        const confArcSpan=segAngle-GAP_DEG-4;
        const cfsa=mid-confArcSpan/2, cfea=mid+confArcSpan/2;
        const confFillSpan=confArcSpan*c.confidence;
        const cffsa=mid-confFillSpan/2, cffea=mid+confFillSpan/2;

        // Label pill position
        const labelR=maxR+26;
        const lpos=polar(cx,cy,labelR,mid);
        const pw=28, ph=16, pr=5;

        return(
          <g key={`lbl${id}`}
            style={{cursor:"pointer"}}
            onClick={()=>onSelect(isSel?null:c)}
            onMouseEnter={()=>setHov(id)}
            onMouseLeave={()=>setHov(null)}>

            {/* Confidence track — full arc, very dim */}
            <path
              d={arc(confTrackR, confTrackR+3.5, cfsa, cfea)}
              fill="rgba(255,255,255,0.07)"
              style={{pointerEvents:"none"}}/>

            {/* Confidence fill — shows how much data we trust */}
            {cffea>cffsa&&(
              <path
                d={arc(confTrackR, confTrackR+3.5, cffsa, cffea)}
                fill={isSel?"rgba(255,255,255,0.55)":isHov?"rgba(255,255,255,0.35)":"rgba(255,255,255,0.18)"}
                style={{
                  transition:"fill 0.22s ease",
                  pointerEvents:"none"
                }}/>
            )}

            {/* Label pill background */}
            <rect
              x={lpos.x-pw/2} y={lpos.y-ph/2}
              width={pw} height={ph} rx={pr}
              fill={isSel?"rgba(255,255,255,0.14)":isHov?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.03)"}
              stroke={isSel?"rgba(255,255,255,0.4)":isHov?"rgba(255,255,255,0.18)":"rgba(255,255,255,0.08)"}
              strokeWidth={1}
              style={{transition:"all 0.22s ease"}}/>

            {/* Label text */}
            <text
              x={lpos.x} y={lpos.y+4}
              textAnchor="middle"
              fill={isSel?"#ffffff":isHov?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.38)"}
              fontSize={isSel?10:9}
              fontWeight={isSel?700:500}
              fontFamily="'DM Mono',monospace"
              letterSpacing="0.8"
              style={{transition:"all 0.22s ease", userSelect:"none"}}>
              {c.short}
            </text>
          </g>
        );
      })}

      {/* ── CENTRE HUB ──────────────────────────────────────────── */}
      {/* Outer halo ring */}
      <circle cx={cx} cy={cy} r={26}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={1}/>
      {/* Hub disc */}
      <circle cx={cx} cy={cy} r={22}
        fill={C.bg}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={1}/>
      {/* Inner accent ring */}
      <circle cx={cx} cy={cy} r={18}
        fill="none"
        stroke="rgba(56,189,248,0.2)"
        strokeWidth={0.75}/>
      {/* UNDP label */}
      <text x={cx} y={cy-2} textAnchor="middle"
        fill="rgba(255,255,255,0.35)"
        fontSize={7.5}
        fontFamily="'DM Mono',monospace"
        letterSpacing="2"
        fontWeight="600">
        UNDP
      </text>
      <text x={cx} y={cy+8} textAnchor="middle"
        fill="rgba(56,189,248,0.4)"
        fontSize={5.5}
        fontFamily="'DM Mono',monospace"
        letterSpacing="1">
        RISK
      </text>
    </svg>
  );
}

// ─── AI NARRATIVE GENERATOR ───────────────────────────────────────────────────
function NarrativePanel({country}){
  const [text,setText]=useState(country.narrative);
  const [loading,setLoading]=useState(false);
  const [editing,setEditing]=useState(false);

  const regenerate=async()=>{
    setLoading(true);
    try{
      const prompt=`You are a UNDP disaster risk analyst writing for senior executives and government ministers. 
Write a concise 4-sentence country risk narrative for ${country.name} based on this data:
- Total disaster events: ${country.totalEvents} (${country.yearRange})
- Dominant hazards: ${country.dominantHazards.join(", ")}
- Recorded deaths: ${fmtN(country.knownDeaths)} (from ${country.deathCov} events)
- Recorded people affected: ${fmtN(country.knownAffected)} (from ${country.affCov} events)  
- Recorded economic loss: ${fmtM(country.knownLoss)} (from ${country.lossCov} events — severe undercount)
- Hazard breakdown: ${Object.entries(country.hazardBreakdown).filter(([,v])=>v>0).map(([k,v])=>`${k}: ${v}`).join(", ")}
- Key indicators: ${country.indicators.slice(0,5).map(i=>`${i.label}: ${i.val}`).join("; ")}
- Region: ${country.region}

Rules: No bullet points. 4 sentences only. First sentence: dominant risk profile. Second: what the data shows (with specific numbers). Third: infrastructure/vulnerability context. Fourth: future outlook. Be direct and policy-relevant. Do not hedge excessively.`;

      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          messages:[{role:"user",content:prompt}]
        })
      });
      const data=await res.json();
      setText(data.content?.[0]?.text||text);
    }catch(e){ console.error(e); }
    setLoading(false);
  };

  return(
    <div style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"16px 18px",border:`1px solid rgba(255,255,255,0.08)`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={SL}>EXECUTIVE NARRATIVE</div>
      </div>
      {editing
        ? <textarea value={text} onChange={e=>setText(e.target.value)}
            style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,color:"white",fontSize:12,lineHeight:1.7,padding:"10px 12px",resize:"vertical",minHeight:100,fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box"}}/>
        : <p style={{fontSize:12,color:"rgba(255,255,255,0.65)",lineHeight:1.75,margin:0,fontStyle:"italic"}}>{text}</p>
      }
    </div>
  );
}

const ghostBtn={padding:"5px 11px",borderRadius:6,cursor:"pointer",fontSize:9,background:"transparent",
  border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.4)",
  fontFamily:"'DM Mono',monospace",letterSpacing:"0.5px"};

// ─── INDICATORS ACCORDION ─────────────────────────────────────────────────────
function IndicatorsPanel({country}){
  const [open,setOpen]=useState("Disaster Record");
  return(
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {IND_GROUPS.map(group=>{
        const items=country.indicators.filter(i=>i.group===group);
        if(!items.length) return null;
        const isOpen=open===group;
        return(
          <div key={group} style={{borderRadius:8,overflow:"hidden",border:`1px solid ${C.border}`}}>
            {(()=>{const GT={"Disaster Record":"Recorded deaths, affected people and economic losses. Coverage varies widely -- most events lack quantitative data.","Infrastructure":"Physical infrastructure condition and urban exposure factors that amplify disaster impact.","Climate & Future":"Projected changes in hazard frequency and intensity under climate scenarios to 2050.","Economic Exposure":"Economic vulnerability: GDP exposure, livelihood dependencies and recorded losses.","Governance & Capacity":"Status of national DRR/adaptation frameworks, early warning, planning processes and institutional gaps. Sourced from NDC, NAP and UNDP assessments."};return(
            <button onClick={()=>setOpen(isOpen?null:group)} title={GT[group]||""} style={{
              width:"100%",padding:"10px 14px",background:isOpen?"rgba(255,255,255,0.055)":C.surface,
              border:"none",color:isOpen?"white":"rgba(255,255,255,0.55)",cursor:"pointer",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              fontSize:10,fontFamily:"'DM Mono',monospace",letterSpacing:"0.5px"}}>
              <span>{group.toUpperCase()}</span>
              <span style={{opacity:0.4,fontSize:9}}>{isOpen?"▲":"▼"} {items.length}</span>
            </button>);})()}
            {isOpen&&items.map((ind,i)=>(
              <div key={i} style={{
                padding:"9px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",
                borderTop:`1px solid rgba(255,255,255,0.04)`,
                background:i%2===0?"transparent":"rgba(255,255,255,0.01)"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.65)"}}>{ind.label}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.42)",marginTop:2,fontFamily:"'DM Mono',monospace"}}>
                    {ind.note}<ConfPill level={ind.conf}/>
                  </div>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:"white",fontFamily:"'DM Mono',monospace",marginLeft:16,flexShrink:0}}>{ind.val}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── POLICY PANEL ─────────────────────────────────────────────────────────────
function PolicyPanel({country}){
  const [openArea,setOpenArea]=useState("Disaster Risk");
  const trendCounts=Object.entries(TREND).map(([k,v])=>{
    const n=country.policy.filter(p=>p.trend===k).length;
    return n>0?{...v,key:k,n}:null;
  }).filter(Boolean);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{...SL}}>POLICY & COMMITMENT TRACKER <span title="Qualitative direction assessment of national policy commitments under NAP and NDC frameworks. Validate with country office before external sharing." style={{cursor:"help",color:"rgba(255,255,255,0.2)",fontSize:9}}>?</span></div>
      {/* Summary */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {trendCounts.map(t=>(
          <div key={t.key} style={{padding:"6px 12px",borderRadius:7,background:`${t.color}12`,border:`1px solid ${t.color}30`,display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:11,color:t.color}}>{t.icon}</span>
            <span style={{fontSize:11,fontWeight:600,color:t.color,fontFamily:"'DM Mono',monospace"}}>{t.n}</span>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* By area */}
      {POL_AREAS.map(area=>{
        const items=country.policy.filter(p=>p.area===area);
        if(!items.length) return null;
        const isOpen=openArea===area;
        return(
          <div key={area} style={{borderRadius:8,overflow:"hidden",border:`1px solid ${C.border}`}}>
            <button onClick={()=>setOpenArea(isOpen?null:area)} style={{
              width:"100%",padding:"10px 14px",background:isOpen?"rgba(255,255,255,0.055)":C.surface,
              border:"none",color:isOpen?"white":"rgba(255,255,255,0.55)",cursor:"pointer",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              fontSize:10,fontFamily:"'DM Mono',monospace",letterSpacing:"0.5px"}}>
              <span>{area.toUpperCase()}</span>
              <span style={{opacity:0.4,fontSize:9}}>{isOpen?"▲":"▼"} {items.length}</span>
            </button>
            {isOpen&&items.map((pol,i)=>(
              <div key={i} style={{
                padding:"11px 14px",borderTop:`1px solid rgba(255,255,255,0.04)`,
                background:i%2===0?"transparent":"rgba(255,255,255,0.01)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginBottom:4}}>{pol.indicator}</div>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                      <TrendBadge trend={pol.trend}/>
                      {pol.val!=="—"&&<span style={{fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace"}}>Current: <strong style={{color:"white"}}>{pol.val}</strong></span>}
                      {pol.target&&<span style={{fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace"}}>Target: {pol.target}</span>}
                    </div>
                  </div>
                </div>
                <div style={{fontSize:8,color:"rgba(255,255,255,0.38)",fontFamily:"'DM Mono',monospace",marginTop:5}}>
                  {pol.source}{pol.year?` · ${pol.year}`:""}
                </div>
              </div>
            ))}
          </div>
        );
      })}
      <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",fontFamily:"'DM Mono',monospace",lineHeight:1.7}}>
        Policy indicators extracted from NAPs, NDCs, and UNDP project documents. Trend assessment is qualitative — based on available evidence. Team should review and validate before external sharing.
      </div>
    </div>
  );
}

// ─── EVENT LOG ────────────────────────────────────────────────────────────────
function EventLog({country}){
  const [sel,setSel]=useState(null);
  const [filter,setFilter]=useState("All");
  const evs=filter==="All"?country.events:country.events.filter(e=>e.group===filter);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {["All",...Object.keys(GROUP_COLOR)].map(g=>(
          <button key={g} onClick={()=>setFilter(g)} style={{
            padding:"3px 9px",borderRadius:20,cursor:"pointer",fontSize:8,
            background:filter===g?`${GROUP_COLOR[g]||"rgba(255,255,255,0.1)"}18`:"transparent",
            border:filter===g?`1px solid ${GROUP_COLOR[g]||"rgba(255,255,255,0.3)"}50`:"1px solid rgba(255,255,255,0.07)",
            color:filter===g?(GROUP_COLOR[g]||"white"):"rgba(255,255,255,0.3)",
            fontFamily:"'DM Mono',monospace"}}>
            {g}
          </button>
        ))}
      </div>
      {sel&&(
        <div style={{padding:"10px 13px",background:`${GROUP_COLOR[sel.group]}12`,border:`1px solid ${GROUP_COLOR[sel.group]}30`,borderRadius:8}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
            <span style={{fontSize:10,color:GROUP_COLOR[sel.group],fontFamily:"'DM Mono',monospace"}}>{MONTHS[sel.month]} {sel.year} · {sel.type}</span>
            <button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:12}}>✕</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"5px 10px"}}>
            {[{l:"Deaths",v:sel.deaths,c:C.future},{l:"Affected",v:sel.affected?fmtN(sel.affected):null,c:C.hazard},{l:"Econ. loss",v:sel.econLoss?fmtM(sel.econLoss):null,c:C.vuln},{l:"Location",v:sel.location,c:"rgba(255,255,255,0.6)"}].map(({l,v,c},i)=>(
              <div key={i}>
                <div style={{fontSize:7,color:"rgba(255,255,255,0.4)",fontFamily:"'DM Mono',monospace",marginBottom:2}}>{l}</div>
                <div style={{fontSize:11,fontWeight:600,color:v!=null?c:"rgba(255,255,255,0.18)",fontStyle:v==null?"italic":"normal"}}>{v!=null?String(v):"—"}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:8,color:"rgba(255,255,255,0.38)",fontFamily:"'DM Mono',monospace",marginTop:6}}>{sel.source} · {sel.sl===1.0?"Primary verified":"Secondary 0.6"}</div>
        </div>
      )}
      {evs.sort((a,b)=>b.year-a.year).map((ev,i)=>{
        const c=GROUP_COLOR[ev.group],hasData=ev.deaths!=null||ev.affected!=null||ev.econLoss!=null,isSel=sel===ev;
        return(
          <div key={i} onClick={()=>setSel(isSel?null:ev)} style={{
            display:"flex",alignItems:"center",gap:8,padding:"6px 9px",borderRadius:6,cursor:"pointer",
            background:isSel?`${c}14`:C.surface,border:isSel?`1px solid ${c}30`:"1px solid transparent",transition:"all 0.15s"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:c,flexShrink:0,opacity:hasData?1:0.3}}/>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",fontFamily:"'DM Mono',monospace",width:30,flexShrink:0}}>{ev.year}</div>
            <div style={{flex:1,fontSize:10,color:hasData?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.3)",fontWeight:hasData?500:400}}>{ev.type}</div>
            <div style={{display:"flex",gap:7,flexShrink:0}}>
              {ev.deaths!=null&&<span style={{fontSize:9,color:C.future,fontFamily:"'DM Mono',monospace"}}>{ev.deaths}✝</span>}
              {ev.affected!=null&&<span style={{fontSize:9,color:C.hazard,fontFamily:"'DM Mono',monospace"}}>{fmtN(ev.affected)}</span>}
              {ev.econLoss!=null&&<span style={{fontSize:9,color:C.vuln,fontFamily:"'DM Mono',monospace"}}>{fmtM(ev.econLoss)}</span>}
              {!hasData&&<span style={{fontSize:8,color:"rgba(255,255,255,0.14)",fontFamily:"'DM Mono',monospace"}}>no data</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── RISK SCORE BARS ─────────────────────────────────────────────────────────
const LAYER_TIPS={
  hazard:"Composite score of hazard frequency, intensity and geographic reach based on recorded events.",
  vulnerability:"Exposure of population and infrastructure — building quality, poverty rates, access to services.",
  future:"Projected change in risk by 2050 under climate scenarios — temperature, water stress, hazard frequency.",
};

function RiskScoreBars({country}){
  const [hov,setHov]=useState(null);
  const conf=country.confidence;
  const confCol=conf>0.65?C.good:conf>0.5?C.warn:C.bad;
  const tip=(text,right)=>(
    <div style={{position:"absolute",bottom:"calc(100% + 6px)",
      left:right?undefined:0,right:right?0:undefined,
      zIndex:99,background:"#0a1929",border:`1px solid ${C.border}`,
      borderRadius:6,padding:"8px 10px",width:200,fontSize:10,
      color:"rgba(255,255,255,0.75)",lineHeight:1.5,pointerEvents:"none",
      boxShadow:"0 4px 24px rgba(0,0,0,0.6)"}}>
      {text}
    </div>
  );
  return(
    <div style={{display:"flex",gap:12,alignItems:"flex-end"}}>
      {/* Risk score group */}
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:0}}>
        <div style={{fontSize:7,color:"rgba(255,255,255,0.3)",fontFamily:"'DM Mono',monospace",letterSpacing:"1px",marginBottom:4,paddingLeft:2}}>RISK SCORES</div>
        <div style={{display:"flex",gap:7}}>
      {LAYERS.map(layer=>{
        const val=country[layer.key], isH=hov===layer.key;
        return(
          <div key={layer.key}
            style={{flex:1,background:"rgba(255,255,255,0.03)",borderRadius:7,
              padding:"8px 11px",border:`1px solid ${layer.color}18`,
              position:"relative",cursor:"default"}}
            onMouseEnter={()=>setHov(layer.key)} onMouseLeave={()=>setHov(null)}>
            {isH&&tip(<><span style={{fontWeight:700,color:layer.color}}>{layer.label}</span><br/>{LAYER_TIPS[layer.key]}</>)}
            <div style={{fontSize:7,color:"rgba(255,255,255,0.5)",fontFamily:"'DM Mono',monospace",letterSpacing:"1px",marginBottom:5}}>{layer.label.toUpperCase()}</div>
            <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,marginBottom:5}}>
              <div style={{width:`${val*100}%`,height:"100%",background:layer.color,borderRadius:2}}/>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:layer.color,fontFamily:"'DM Mono',monospace"}}>{Math.round(val*100)}</div>
          </div>
        );
      })}
        </div>
      </div>
      {/* Confidence is metadata, not a risk score — visually distinct */}
      <div style={{display:"flex",flexDirection:"column",gap:0,marginLeft:6}}>
        <div style={{fontSize:7,color:"rgba(255,255,255,0.3)",fontFamily:"'DM Mono',monospace",letterSpacing:"1px",marginBottom:4,paddingLeft:2}}>DATA QUALITY</div>
        <div style={{background:"rgba(255,255,255,0.025)",borderRadius:7,
            padding:"8px 11px",border:"1px dashed rgba(255,255,255,0.12)",
            minWidth:96,position:"relative",cursor:"default",flex:1,display:"flex",flexDirection:"column",justifyContent:"space-between"}}
          onMouseEnter={()=>setHov("conf")} onMouseLeave={()=>setHov(null)}>
          {hov==="conf"&&tip("How complete and reliable the underlying data is. Low score = few events have quantitative records. Not a measure of risk level.",true)}
          <div style={{fontSize:7,color:"rgba(255,255,255,0.5)",fontFamily:"'DM Mono',monospace",letterSpacing:"1px",marginBottom:5,display:"flex",alignItems:"center",gap:4}}>
            <span>◈</span> CONFIDENCE
          </div>
          <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,marginBottom:5}}>
            <div style={{width:`${conf*100}%`,height:"100%",background:confCol,borderRadius:2}}/>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:confCol,fontFamily:"'DM Mono',monospace"}}>{Math.round(conf*100)}%</div>
        </div>
      </div>
    </div>
  );
}

function ChatbotFAB(){
  const [open,setOpen]=useState(false);
  return(
    <>
      {/* Tooltip bubble when open */}
      {open&&(
        <div style={{
          position:"fixed",bottom:80,right:24,zIndex:200,
          background:"#0d2137",border:"1px solid rgba(56,189,248,0.25)",
          borderRadius:12,padding:"16px 18px",width:260,
          boxShadow:"0 8px 40px rgba(0,0,0,0.6)",
          animation:"fadeUp 0.15s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:11,fontWeight:700,color:"white",fontFamily:"'DM Mono',monospace",letterSpacing:"0.5px"}}>UNDP RISK ASSISTANT</span>
            <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:14,padding:0}}>✕</button>
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.6,marginBottom:12}}>
            AI-powered analysis of country risk profiles, cross-country comparisons, and policy gap identification.
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(56,189,248,0.06)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(56,189,248,0.15)"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#fbbf24",flexShrink:0}}/>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.55)",fontFamily:"'DM Mono',monospace",letterSpacing:"0.5px"}}>COMING SOON — Q2 2026</span>
          </div>
        </div>
      )}
      {/* FAB button */}
      <button
        onClick={()=>setOpen(o=>!o)}
        style={{
          position:"fixed",bottom:24,right:24,zIndex:200,
          width:52,height:52,borderRadius:"50%",
          background:open?"rgba(56,189,248,0.2)":"rgba(15,30,50,0.95)",
          border:`1px solid ${open?"rgba(56,189,248,0.5)":"rgba(56,189,248,0.2)"}`,
          cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 4px 20px rgba(0,0,0,0.5)",
          transition:"all 0.2s ease"}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
            stroke={open?"#38bdf8":"rgba(255,255,255,0.6)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="8" cy="11" r="1" fill={open?"#38bdf8":"rgba(255,255,255,0.5)"}/>
          <circle cx="12" cy="11" r="1" fill={open?"#38bdf8":"rgba(255,255,255,0.5)"}/>
          <circle cx="16" cy="11" r="1" fill={open?"#38bdf8":"rgba(255,255,255,0.5)"}/>
        </svg>
      </button>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  );
}

function downloadReport(){
  const a = document.createElement("a");
  a.href = "/country_profile.pdf";
  a.download = "country_profile.pdf";
  a.click();
}


function DownloadButton({country}){
  const [status,setStatus]=useState("idle");

  const handle=async()=>{
    if(status==="loading") return;
    setStatus("loading");
    try{ await downloadReport(); setStatus("done"); }
    catch(e){ console.error(e); setStatus("idle"); }
    setTimeout(()=>setStatus("idle"),2000);
  };

  const s = status==="loading"
    ? {label:"Generating…", color:"rgba(56,189,248,0.5)", border:"rgba(56,189,248,0.2)", icon:"◌"}
    : status==="done"
    ? {label:"✓ Downloaded",  color:"#22c55e",             border:"rgba(34,197,94,0.35)",  icon:null}
    : {label:"↓ Export",      color:"#38bdf8",             border:"rgba(56,189,248,0.3)",  icon:null};

  return(
    <button onClick={handle} style={{
      padding:"5px 11px", borderRadius:6, cursor:status==="loading"?"wait":"pointer",
      fontSize:9, fontFamily:"'DM Mono',monospace", letterSpacing:"1px",
      background:"transparent", border:`1px solid ${s.border}`,
      color:s.color, transition:"all 0.2s", outline:"none",
      animation: status==="loading" ? "pulse 1s ease infinite" : "none"
    }}>
      {s.label}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </button>
  );
}

function CountryDetail({country, onClose, wbCache, setWbCache}){
  const [tab,setTab]=useState("overview");
  const [wbData,setWbData]=useState(wbCache[country.id]||null);

  const WB_FB={
    ARM:{pop:"2.97M",gdp:"$7,254",poverty:"26.5%",water:"96.2%",urban:"63.1%"},
    BLR:{pop:"9.46M",gdp:"$22,900",poverty:"5.1%",water:"99.7%",urban:"80.4%"},
    TJK:{pop:"10.1M",gdp:"$4,700",poverty:"26.3%",water:"74.8%",urban:"27.4%"},
    KGZ:{pop:"7.1M",gdp:"$5,700",poverty:"33.3%",water:"81.5%",urban:"37.8%"},
    BIH:{pop:"3.21M",gdp:"$18,800",poverty:"16.9%",water:"99.1%",urban:"49.6%"},
    CYP:{pop:"1.26M",gdp:"$47,900",poverty:"13.1%",water:"99.9%",urban:"67.0%"},
    GEO:{pop:"3.76M",gdp:"$18,600",poverty:"15.6%",water:"98.8%",urban:"60.4%"},
    KAZ:{pop:"19.6M",gdp:"$31,100",poverty:"5.1%",water:"96.4%",urban:"58.9%"},
    KOS:{pop:"1.78M",gdp:"$13,200",poverty:"17.6%",water:"95.3%",urban:"41.0%"},
    MDA:{pop:"2.62M",gdp:"$14,700",poverty:"25.5%",water:"85.2%",urban:"42.7%"},
    MNE:{pop:"0.62M",gdp:"$24,200",poverty:"21.8%",water:"99.4%",urban:"68.1%"},
    MKD:{pop:"2.08M",gdp:"$19,700",poverty:"21.8%",water:"99.8%",urban:"58.5%"},
    UKR:{pop:"43.5M",gdp:"$13,400",poverty:"1.1%",water:"96.2%",urban:"70.0%"},
    UZB:{pop:"35.3M",gdp:"$9,700",poverty:"11.0%",water:"88.1%",urban:"50.4%"},
    TKM:{pop:"6.12M",gdp:"$22,100",poverty:"--",water:"73.8%",urban:"52.4%"},
    // Mock World Bank-style fallbacks for new prototype countries
    ALB:{pop:"2.79M",gdp:"$17,500",poverty:"23.0%",water:"96.0%",urban:"63.0%"},
    SRB:{pop:"6.80M",gdp:"$19,800",poverty:"21.0%",water:"97.0%",urban:"56.0%"},
    TUR:{pop:"85.0M",gdp:"$32,000",poverty:"13.5%",water:"99.0%",urban:"76.0%"},
  };
  const fb=WB_FB[country.id]||{};

  useEffect(()=>{
    if(wbData) return;
    const inds={pop:"SP.POP.TOTL",gdp:"NY.GDP.PCAP.PP.CD",poverty:"SI.POV.NAHC",water:"SH.H2O.SMDW.ZS",urban:"SP.URB.TOTL.IN.ZS"};
    Promise.all(Object.entries(inds).map(([k,c])=>
      fetch(`https://api.worldbank.org/v2/country/${country.wbISO}/indicator/${c}?format=json&mrv=1`)
        .then(r=>r.json()).then(d=>{const v=d[1]?.[0];return[k,v?{value:v.value,year:v.date}:null];})
        .catch(()=>[k,null])
    )).then(res=>{const d=Object.fromEntries(res);setWbData(d);setWbCache(prev=>({...prev,[country.id]:d}));});
  },[country.id]);

  const fmtWB=(key)=>{
    if(wbData?.[key]?.value!=null){
      const v=wbData[key].value;
      if(key==="pop") return `${(v/1e6).toFixed(2)}M`;
      if(key==="gdp") return `$${Math.round(v).toLocaleString()}`;
      return `${v.toFixed(1)}%`;
    }
    return fb[key]||"—";
  };

  const TABS=[{k:"overview",l:"Overview"},{k:"indicators",l:"Indicators"},{k:"policy",l:"Policy"},{k:"events",l:"Event Log"}];

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"18px 24px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div>
            <div style={{fontSize:8,color:C.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"2px",marginBottom:4}}>{country.region.toUpperCase()} · {country.totalEvents} EVENTS · {country.yearRange}</div>
            <h2 style={{fontSize:24,fontWeight:700,margin:0,letterSpacing:"-0.5px"}}>{country.name}</h2>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <DownloadButton country={country}/>
            <button onClick={onClose} style={{...ghostBtn,fontSize:10}}>← ALL COUNTRIES</button>
          </div>
        </div>
        <RiskScoreBars country={country}/>
        {/* Tabs */}
        <div style={{display:"flex",gap:4,marginTop:12}}>
          {TABS.map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{
              padding:"5px 14px",borderRadius:6,cursor:"pointer",fontSize:10,
              background:tab===t.k?"rgba(56,189,248,0.12)":C.surface,
              border:tab===t.k?`1px solid ${C.hazard}40`:`1px solid ${C.border}`,
              color:tab===t.k?C.hazard:"rgba(255,255,255,0.55)",
              fontFamily:"'DM Mono',monospace",letterSpacing:"0.5px"}}>
              {t.l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,overflow:"hidden",display:"flex"}}>
        {/* Left sidebar: WB stats always visible */}
        <div style={{width:200,flexShrink:0,borderRight:`1px solid ${C.border}`,padding:"16px 14px",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{...SL, marginBottom:0}}>WORLD BANK</div>
            <span style={{fontSize:7,color:wbData?C.good:C.warn,fontFamily:"'DM Mono',monospace",border:`1px solid ${wbData?C.good+"40":C.warn+"40"}`,borderRadius:3,padding:"1px 5px"}}>
              {wbData?"LIVE":"…"}
            </span>
          </div>
          {[{k:"pop",l:"Population"},{k:"gdp",l:"GDP/cap (PPP)"},{k:"poverty",l:"Below poverty"},{k:"water",l:"Safe water"},{k:"urban",l:"Urban pop."}].map(({k,l})=>(
            <div key={k} style={{marginBottom:10,paddingBottom:10,borderBottom:`1px solid rgba(255,255,255,0.04)`}}>
              <div style={{fontSize:8,color:C.muted}}>{l}</div>
              <div style={{fontSize:14,fontWeight:700,color:"white",fontFamily:"'DM Mono',monospace",marginTop:2}}>{fmtWB(k)}</div>
            </div>
          ))}
          <div style={{marginTop:6}}>
            <div style={{...SL,marginBottom:8}}>HAZARD MIX</div>
            <HazardBar breakdown={country.hazardBreakdown}/>
            <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:5}}>
              {Object.entries(country.hazardBreakdown).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([g,v])=>(
                <div key={g} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    <div style={{width:5,height:5,borderRadius:"50%",background:GROUP_COLOR[g]}}/>
                    <span style={{fontSize:9,color:"rgba(255,255,255,0.62)"}}>{g.slice(0,15)}</span>
                  </div>
                  <span style={{fontSize:9,fontWeight:600,color:GROUP_COLOR[g],fontFamily:"'DM Mono',monospace"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
          {tab==="overview"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <NarrativePanel country={country}/>
              {/* Key stats */}
              <div>
                <div style={SL}>RECORDED DISASTER TOTALS</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {[
                    {l:"Deaths",v:fmtN(country.knownDeaths),c:C.future,cov:`${country.deathCov}/${country.totalEvents} events`},
                    {l:"People affected",v:fmtN(country.knownAffected),c:C.hazard,cov:`${country.affCov}/${country.totalEvents} events`},
                    {l:"Economic losses",v:fmtM(country.knownLoss),c:C.vuln,cov:`${country.lossCov}/${country.totalEvents} events`},
                  ].map((s,i)=>(
                    <div key={i} style={{background:C.surface,borderRadius:8,padding:"11px 13px",border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:20,fontWeight:700,color:s.c,fontFamily:"'DM Mono',monospace",letterSpacing:"-0.5px"}}>{s.v}</div>
                      <div style={{fontSize:9,color:"rgba(255,255,255,0.58)",marginTop:2}}>{s.l}</div>
                      <div style={{fontSize:8,color:"rgba(255,255,255,0.38)",fontFamily:"'DM Mono',monospace",marginTop:3}}>⚠ {s.cov} with data</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Dominant hazards */}
              <div>
                <div style={SL}>DOMINANT HAZARDS</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                  {country.dominantHazards.map(h=>(
                    <div key={h} style={{padding:"4px 12px",borderRadius:20,fontSize:11,background:`${C.hazard}0d`,border:`1px solid ${C.hazard}25`,color:"#7dd3fc",fontFamily:"'DM Mono',monospace"}}>{h}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {tab==="indicators"&&<IndicatorsPanel country={country}/>}
          {tab==="policy"&&<PolicyPanel country={country}/>}
          {tab==="events"&&<EventLog country={country}/>}
        </div>
      </div>
    </div>
  );
}

// ─── COMPARE VIEW ─────────────────────────────────────────────────────────────
function CompareView({countries}){
  const ids=Object.keys(countries);
  const [idA,setIdA]=useState(ids[2]); // TJK
  const [idB,setIdB]=useState(ids[3]); // KGZ
  const [mode,setMode]=useState("risk");
  const cA=countries[idA], cB=countries[idB];

  const Picker=({val,onChange,excl})=>(
    <select value={val} onChange={e=>onChange(e.target.value)}
      style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,color:"white",padding:"7px 12px",borderRadius:7,fontSize:12,fontFamily:"'DM Mono',monospace",cursor:"pointer",outline:"none"}}>
      {ids.filter(id=>id!==excl).map(id=>(
        <option key={id} value={id} style={{background:"#0f1a2e"}}>{countries[id].name}</option>
      ))}
    </select>
  );

  const sharedGroups=IND_GROUPS.filter(g=>cA.indicators.some(i=>i.group===g)&&cB.indicators.some(i=>i.group===g));

  return(
    <div style={{height:"100%",overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:18}}>
      {/* Controls */}
      <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <Picker val={idA} onChange={setIdA} excl={idB}/>
        <span style={{color:"rgba(255,255,255,0.2)",fontFamily:"'DM Mono',monospace",fontSize:11}}>vs</span>
        <Picker val={idB} onChange={setIdB} excl={idA}/>
        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          {[{k:"risk",l:"Risk Layers"},{k:"indicators",l:"Indicators"},{k:"policy",l:"Policy"}].map(t=>(
            <button key={t.k} onClick={()=>setMode(t.k)} style={{
              padding:"5px 12px",borderRadius:6,cursor:"pointer",fontSize:9,
              background:mode===t.k?"rgba(56,189,248,0.12)":C.surface,
              border:mode===t.k?`1px solid ${C.hazard}40`:`1px solid ${C.border}`,
              color:mode===t.k?C.hazard:"rgba(255,255,255,0.35)",
              fontFamily:"'DM Mono',monospace"}}>
              {t.l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* RISK MODE: dumbbell */}
      {mode==="risk"&&(
        <div style={{background:C.surface,borderRadius:10,padding:"18px 20px",border:`1px solid ${C.border}`}}>
          <div style={SL}>RISK LAYER COMPARISON</div>
          {LAYERS.map(layer=>{
            const vA=cA[layer.key],vB=cB[layer.key];
            const minV=Math.min(vA,vB),maxV=Math.max(vA,vB);
            return(
              <div key={layer.key} style={{marginBottom:30}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontFamily:"'DM Mono',monospace",marginBottom:8}}>{layer.label.toUpperCase()}</div>
                <div style={{position:"relative",height:36}}>
                  <div style={{position:"absolute",top:"50%",left:"5%",right:"5%",height:1,background:"rgba(255,255,255,0.07)",transform:"translateY(-50%)"}}/> 
                  <div style={{position:"absolute",top:"50%",height:2,borderRadius:1,
                    left:`${5+minV*90}%`,width:`${(maxV-minV)*90}%`,
                    background:layer.color,opacity:0.3,transform:"translateY(-50%)"}}/>
                  {/* A dot */}
                  <div style={{position:"absolute",left:`${5+vA*90}%`,top:"50%",transform:"translate(-50%,-50%)"}}>
                    <div style={{width:14,height:14,borderRadius:"50%",background:layer.color,border:`2px solid ${C.bg}`}}/>
                    <div style={{position:"absolute",bottom:18,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",fontSize:9,color:layer.color,fontFamily:"'DM Mono',monospace"}}>
                      {cA.short} · {Math.round(vA*100)}
                    </div>
                  </div>
                  {/* B dot */}
                  <div style={{position:"absolute",left:`${5+vB*90}%`,top:"50%",transform:"translate(-50%,-50%)"}}>
                    <div style={{width:14,height:14,borderRadius:"50%",background:"rgba(255,255,255,0.6)",border:`2px solid ${C.bg}`}}/>
                    <div style={{position:"absolute",top:18,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",fontSize:9,color:"rgba(255,255,255,0.45)",fontFamily:"'DM Mono',monospace"}}>
                      {cB.short} · {Math.round(vB*100)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INDICATORS MODE */}
      {mode==="indicators"&&sharedGroups.map(group=>{
        const iA=cA.indicators.filter(i=>i.group===group);
        const iB=cB.indicators.filter(i=>i.group===group);
        const allLabels=[...new Set([...iA.map(i=>i.label),...iB.map(i=>i.label)])];
        return(
          <div key={group} style={{borderRadius:9,overflow:"hidden",border:`1px solid ${C.border}`}}>
            <div style={{padding:"9px 14px",background:"rgba(255,255,255,0.04)",fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"1px"}}>{group.toUpperCase()}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:`1px solid rgba(255,255,255,0.04)`}}>
              <div style={{padding:"7px 14px",fontSize:8,color:C.muted,fontFamily:"'DM Mono',monospace"}}>INDICATOR</div>
              <div style={{padding:"7px 14px",fontSize:8,color:C.hazard,fontFamily:"'DM Mono',monospace"}}>{cA.short} — {cA.name}</div>
              <div style={{padding:"7px 14px",fontSize:8,color:"rgba(255,255,255,0.4)",fontFamily:"'DM Mono',monospace"}}>{cB.short} — {cB.name}</div>
            </div>
            {allLabels.map((label,i)=>{
              const a=iA.find(x=>x.label===label),b=iB.find(x=>x.label===label);
              return(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:`1px solid rgba(255,255,255,0.04)`,background:i%2===0?"transparent":"rgba(255,255,255,0.01)"}}>
                  <div style={{padding:"9px 14px",fontSize:10,color:"rgba(255,255,255,0.45)"}}>{label}</div>
                  <div style={{padding:"9px 14px",fontSize:12,fontWeight:700,color:a?"white":"rgba(255,255,255,0.15)",fontFamily:"'DM Mono',monospace"}}>
                    {a?<>{a.val}<ConfPill level={a.conf}/></>:"—"}
                  </div>
                  <div style={{padding:"9px 14px",fontSize:12,fontWeight:700,color:b?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.15)",fontFamily:"'DM Mono',monospace"}}>
                    {b?<>{b.val}<ConfPill level={b.conf}/></>:"—"}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* POLICY MODE */}
      {mode==="policy"&&POL_AREAS.map(area=>{
        const pA=cA.policy.filter(p=>p.area===area);
        const pB=cB.policy.filter(p=>p.area===area);
        const allInds=[...new Set([...pA.map(p=>p.indicator),...pB.map(p=>p.indicator)])];
        return(
          <div key={area} style={{borderRadius:9,overflow:"hidden",border:`1px solid ${C.border}`}}>
            <div style={{padding:"9px 14px",background:"rgba(255,255,255,0.04)",fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"1px"}}>{area.toUpperCase()}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:`1px solid rgba(255,255,255,0.04)`}}>
              <div style={{padding:"7px 14px",fontSize:8,color:C.muted,fontFamily:"'DM Mono',monospace"}}>INDICATOR</div>
              <div style={{padding:"7px 14px",fontSize:8,color:C.hazard,fontFamily:"'DM Mono',monospace"}}>{cA.name}</div>
              <div style={{padding:"7px 14px",fontSize:8,color:"rgba(255,255,255,0.4)",fontFamily:"'DM Mono',monospace"}}>{cB.name}</div>
            </div>
            {allInds.map((ind,i)=>{
              const a=pA.find(p=>p.indicator===ind),b=pB.find(p=>p.indicator===ind);
              return(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:`1px solid rgba(255,255,255,0.04)`,background:i%2===0?"transparent":"rgba(255,255,255,0.01)"}}>
                  <div style={{padding:"9px 14px",fontSize:10,color:"rgba(255,255,255,0.45)"}}>{ind}</div>
                  <div style={{padding:"9px 14px"}}>{a?<TrendBadge trend={a.trend}/>:<span style={{fontSize:9,color:"rgba(255,255,255,0.15)"}}>—</span>}</div>
                  <div style={{padding:"9px 14px"}}>{b?<TrendBadge trend={b.trend}/>:<span style={{fontSize:9,color:"rgba(255,255,255,0.15)"}}>—</span>}</div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",fontFamily:"'DM Mono',monospace",lineHeight:1.7}}>
        ⚠ Cross-country comparisons require caution. Data collection methods and coverage vary. Risk layer scores are indicative composites — not standardised national statistics. Policy indicators are qualitative assessments based on available documents.
      </div>
    </div>
  );
}

// ─── OVERVIEW PANEL ───────────────────────────────────────────────────────────
function OverviewPanel({countries, onSelect}){
  return(
    <div style={{padding:"20px 24px",overflowY:"auto",height:"100%"}}>
      <div style={{fontSize:8,color:C.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"2px",marginBottom:8}}>REGIONAL OVERVIEW · CLICK RADAR OR CARD TO EXPLORE</div>
      <div style={{display:"flex",gap:14,marginBottom:20,flexWrap:"wrap"}}>
        {LAYERS.map(l=>(
          <div key={l.key} style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:20,height:3,borderRadius:2,background:l.color}}/>
            <span style={{fontSize:8,color:"rgba(255,255,255,0.3)",fontFamily:"'DM Mono',monospace"}}>{l.label}</span>
          </div>
        ))}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:10,height:10,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.25)"}}/>
          <span style={{fontSize:8,color:"rgba(255,255,255,0.3)",fontFamily:"'DM Mono',monospace"}}>Data confidence</span>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {Object.values(countries).sort((a,b)=>b.hazard-a.hazard).map(c=>(
          <div key={c.id} onClick={()=>onSelect(c)}
            style={{padding:"13px 15px",borderRadius:9,cursor:"pointer",background:C.surface,border:`1px solid ${C.border}`,transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.055)";e.currentTarget.style.borderColor="rgba(255,255,255,0.12)";}}
            onMouseLeave={e=>{e.currentTarget.style.background=C.surface;e.currentTarget.style.borderColor=C.border;}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
              <div>
                <div style={{fontSize:8,color:C.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"1.5px",marginBottom:2}}>{c.region.toUpperCase()} · {c.totalEvents} EVENTS</div>
                <div style={{fontSize:14,fontWeight:600,color:"white"}}>{c.name}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                {LAYERS.map(l=>(
                  <div key={l.key} style={{textAlign:"center"}}>
                    <div style={{fontSize:13,fontWeight:700,color:l.color,fontFamily:"'DM Mono',monospace"}}>{Math.round(c[l.key]*100)}</div>
                    <div style={{fontSize:7,color:"rgba(255,255,255,0.2)",fontFamily:"'DM Mono',monospace"}}>{l.label.slice(0,4).toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
            <HazardBar breakdown={c.hazardBreakdown}/>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",marginTop:7,lineHeight:1.5}}>{c.headline}</div>
            <div style={{display:"flex",gap:5,marginTop:7,flexWrap:"wrap"}}>
              {c.dominantHazards.slice(0,3).map(h=>(
                <span key={h} style={{fontSize:7,color:C.muted,fontFamily:"'DM Mono',monospace",border:`1px solid rgba(255,255,255,0.08)`,borderRadius:3,padding:"2px 6px"}}>{h}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:14,fontSize:8,color:"rgba(255,255,255,0.15)",fontFamily:"'DM Mono',monospace",lineHeight:1.8}}>
        15 countries · Scores are indicative composites · Indicators sourced from NDC, NAP & UNDP documents · Made with care 💙 by the Cool UNV Team
      </div>
    </div>
  );
}

// ─── PASSWORD GATE ────────────────────────────────────────────────────────────
const PASSWORD_HASH = "8e1462065332a3b50a9c3ecd27f5135e"; // md5: coolunvteam

function simpleHash(str){
  // djb2-style — good enough for a soft gate
  let h = 5381;
  for(let i=0;i<str.length;i++) h = ((h<<5)+h)+str.charCodeAt(i);
  // convert to hex-like string for comparison
  return Math.abs(h).toString(16).padStart(8,"0");
}

// actual check: compare against stored value
const CORRECT = "coolunvteam";

function PasswordGate({onUnlock}){
  const [val,setVal]=useState("");
  const [shake,setShake]=useState(false);
  const [show,setShow]=useState(false);

  // persist unlock across refreshes in this session
  useEffect(()=>{
    if(sessionStorage.getItem("riskanalytics_auth")==="1") onUnlock();
  },[]);

  const attempt=()=>{
    if(val===CORRECT){
      sessionStorage.setItem("riskanalytics_auth","1");
      onUnlock();
    } else {
      setShake(true);
      setVal("");
      setTimeout(()=>setShake(false),500);
    }
  };

  return(
    <div style={{
      position:"fixed",inset:0,background:"#06101f",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'DM Sans',sans-serif",gap:0,zIndex:9999
    }}>
      
      {/* Input card */}
      <div style={{
        background:"rgba(255,255,255,0.03)",
        border:"1px solid rgba(255,255,255,0.08)",
        borderRadius:14,padding:"28px 32px",
        display:"flex",flexDirection:"column",gap:14,
        width:300,
        animation: shake ? "shake 0.4s ease" : "none"
      }}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontFamily:"'DM Mono',monospace",letterSpacing:"1px"}}>
          ACCESS CODE
        </div>
        <div style={{position:"relative"}}>
          <input
            type={show?"text":"password"}
            value={val}
            onChange={e=>setVal(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&attempt()}
            placeholder="Enter password"
            autoFocus
            style={{
              width:"100%",boxSizing:"border-box",
              background:"rgba(255,255,255,0.05)",
              border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:8,padding:"10px 38px 10px 14px",
              color:"white",fontSize:13,outline:"none",
              fontFamily:"'DM Sans',sans-serif",
              caretColor:"#38bdf8"
            }}
          />
          <span
            onClick={()=>setShow(s=>!s)}
            style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",
              cursor:"pointer",fontSize:14,color:"rgba(255,255,255,0.3)",userSelect:"none"}}
          >{show?"🙈":"👁"}</span>
        </div>
        <button
          onClick={attempt}
          style={{
            background:"rgba(56,189,248,0.12)",
            border:"1px solid rgba(56,189,248,0.3)",
            borderRadius:8,padding:"10px",
            color:"#38bdf8",fontSize:12,cursor:"pointer",
            fontFamily:"'DM Mono',monospace",letterSpacing:"1px",
            transition:"background 0.15s"
          }}
          onMouseEnter={e=>e.target.style.background="rgba(56,189,248,0.2)"}
          onMouseLeave={e=>e.target.style.background="rgba(56,189,248,0.12)"}
        >
          ENTER →
        </button>
      </div>

      <div style={{marginTop:20,fontSize:10,color:"rgba(255,255,255,0.12)",fontFamily:"'DM Mono',monospace"}}>
        Made with care 💙 by the Cool UNV Team
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const [unlocked,setUnlocked]=useState(false);
  const [selected,setSelected]=useState(null);
  const [mainTab,setMainTab]=useState("overview"); // overview | compare
  const [animIn,setAnimIn]=useState(true);
  const [wbCache,setWbCache]=useState({});
  const [leftWidth,setLeftWidth]=useState(520);
  const [isDragging,setIsDragging]=useState(false);
  const [language,setLanguage]=useState("ENG"); // ENG | RUS | ALB | SRB | TUR

  useEffect(()=>{
    if(!isDragging) return;
    const handleMove=e=>{
      setLeftWidth(prev=>{
        const next=prev+e.movementX;
        const min=420;
        const max=800;
        return Math.min(max,Math.max(min,next));
      });
    };
    const handleUp=()=>setIsDragging(false);
    window.addEventListener("mousemove",handleMove);
    window.addEventListener("mouseup",handleUp);
    return()=>{
      window.removeEventListener("mousemove",handleMove);
      window.removeEventListener("mouseup",handleUp);
    };
  },[isDragging]);

  const handleSelect=useCallback((c)=>{
    setAnimIn(false);
    setTimeout(()=>{setSelected(c);setMainTab("overview");setAnimIn(true);},120);
  },[]);

  const handleClose=useCallback(()=>{
    setAnimIn(false);
    setTimeout(()=>{setSelected(null);setAnimIn(true);},120);
  },[]);

  if(!unlocked) return <PasswordGate onUnlock={()=>setUnlocked(true)}/>;

  return(
    <>
    <div style={{height:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",color:"white",display:"flex",flexDirection:"column",overflow:"hidden",zoom:1.25}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <div style={{padding:"11px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:26,height:26,borderRadius:6,background:"linear-gradient(135deg,#38bdf8,#818cf8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>U</div>
          <div>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:"-0.2px"}}>UNDP Risk Analytics</div>
            <div style={{fontSize:7,color:C.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"1.5px"}}>ISTANBUL REGIONAL HUB · DISASTER RISK & CLIMATE RESILIENCE</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            {!selected&&[{k:"overview",l:"Regional"},{k:"compare",l:"Compare"}].map(t=>(
              <button key={t.k} onClick={()=>setMainTab(t.k)} style={{
                padding:"5px 14px",borderRadius:6,cursor:"pointer",fontSize:9,
                background:mainTab===t.k?"rgba(56,189,248,0.12)":C.surface,
                border:mainTab===t.k?`1px solid ${C.hazard}40`:`1px solid ${C.border}`,
                color:mainTab===t.k?C.hazard:"rgba(255,255,255,0.35)",
                fontFamily:"'DM Mono',monospace",letterSpacing:"0.5px"}}>
                {t.l.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{width:1,height:18,background:"rgba(148,163,184,0.35)"}}/>
          <div>
            <select
              value={language}
              onChange={e=>setLanguage(e.target.value)}
              style={{
                background:"rgba(15,23,42,0.95)",
                border:`1px solid ${C.border}`,
                color:"rgba(248,250,252,0.9)",
                padding:"4px 12px",
                borderRadius:999,
                fontSize:9,
                fontFamily:"'DM Mono',monospace",
                letterSpacing:"0.8px",
                cursor:"pointer",
                outline:"none",
                minWidth:64,
                textAlign:"center"
              }}
            >
              {LANGUAGES.map(l=>(
                <option key={l.code} value={l.code} style={{background:"#020617",color:"#e5e7eb"}}>
                  {l.code}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* LEFT: Radar always present */}
        <div style={{width:leftWidth,flexShrink:0,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"8px 0 12px",position:"relative"}}>
          <Radar countries={COUNTRIES} selected={selected} onSelect={handleSelect}/>
         </div>

        {/* DRAG HANDLE */}
        <div
          onMouseDown={()=>setIsDragging(true)}
          style={{
            width:10,
            flexShrink:0,
            cursor:"col-resize",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            background:"rgba(15,23,42,0.9)",
            borderRight:`1px solid ${C.border}`
          }}
        >
          <div style={{
            width:3,
            height:70,
            borderRadius:999,
            background:"rgba(148,163,184,0.7)"
          }}/>
        </div>

        {/* RIGHT: context */}
        <div style={{flex:1,overflow:"hidden",opacity:animIn?1:0,transition:"opacity 0.15s"}}>
          {selected
            ? <CountryDetail country={selected} onClose={handleClose} wbCache={wbCache} setWbCache={setWbCache}/>
            : mainTab==="compare"
              ? <CompareView countries={COUNTRIES}/>
              : <OverviewPanel countries={COUNTRIES} onSelect={handleSelect}/>
          }
        </div>
      </div>
    </div>
    <ChatbotFAB/>
    </>
  );
}
