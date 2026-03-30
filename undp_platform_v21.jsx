import { useState, useEffect, useCallback, useRef, useMemo } from "react";

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

// CRISP 5-pillar architecture
const CRISP_PILLARS = [
  { key:"hp", label:"Hazard Pressure",      short:"HP", color:"#38bdf8", desc:"Frequency, intensity and trend acceleration of recorded hazard events. Compound hazard likelihood and observed climate exposure." },
  { key:"ex", label:"Exposure",             short:"EX", color:"#a78bfa", desc:"Population and GDP in hazard-prone zones. Critical infrastructure density and urban concentration risk." },
  { key:"fr", label:"Fragility",            short:"FR", color:"#f87171", desc:"Failure probability across socioeconomic, institutional and system dimensions. Captures cascading collapse potential." },
  { key:"ac", label:"Adaptive Capacity",    short:"AC", color:"#34d399", desc:"Disaster preparedness, EWS coverage, fiscal space, infrastructure resilience and speed of recovery from events." },
  { key:"fs", label:"Future Stress",        short:"FS", color:"#fb923c", desc:"Forward-looking climate projections (IPCC AR6 SSP), glacier retreat, land degradation and food-water-energy nexus stress." },
];

// Legacy 3-layer alias kept for CompareView compatibility
const LAYERS = CRISP_PILLARS;

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
    hp:0.52, ex:0.55, fr:0.68, ac:0.38, fs:0.65, crisp:58, crispClass:"Medium",
    dominantHazards:["Flash Floods","Earthquakes","Mass Movement"],
    knownDeaths:448, knownAffected:388496, knownLoss:56876650,
    deathCov:8, affCov:11, lossCov:3,
    hazardBreakdown:{ Hydrological:14, Meteorological:6, Geophysical:5, Biological:1 },

    narrative: "Armenia faces a compound risk profile where hydrological hazards — primarily flash floods — account for over half of all recorded events, while Soviet-era infrastructure consistently amplifies their impact. The 1982 earthquake (400 deaths) and 2014 floods (25 deaths, 4,700 houses, $5M loss) define the upper bound of recorded losses, but data coverage remains partial across most events. Infrastructure decay rates of 79–97% in heating and electricity networks mean any moderate event can cascade rapidly. Looking forward, projected temperature rises of +5°C by 2100 and growing water stress will compound an already stretched system.",

    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"1.8 /yr/1M",    note:"Events per 100yr window per million pop — Event Database",  conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"Moderate-High", note:"Deaths + affected weighted per event; earthquakes & floods dominate — Event Database", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"Moderate",      note:"Flood–landslide co-occurrence elevated in northern provinces — Event Database", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.4×",          note:"5-yr rate vs 100-yr baseline — increasing flash flood frequency since 2010", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.23°C anomaly",note:"1929–2016 vs 1961–1990 baseline; precip –9% — 4th Nat. Comm. 2020 / NAP 2021", conf:"high" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"Medium-High",   note:"Kura-Araks basin under increasing pressure — FAO AQUASTAT 2023", conf:"medium" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~38%",          note:"Flood inundation + seismic zones; mountainous terrain amplifies — GFDRR est.", conf:"low" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~30%",          note:"Gridded GDP in hazard corridors — World Bank est. mock", conf:"low" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~55%",          note:"Road network intersected with landslide & flood zones — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"High",  note:"Hospitals and schools in seismic and flood zones — GFDRR/WHO est.", conf:"low" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"~18%",          note:"World Bank PovcalNet 2023 — amplifies disaster mortality", conf:"medium" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"Moderate",      note:"Drought risk to agricultural output — FAO FAOSTAT 2023",  conf:"medium" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"3.1 per 1,000", note:"Physicians + nurses; strained during mass-casualty events — WHO GHO 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.228",         note:"UNDP HDR 2023 — moderate inequality amplifies impact",    conf:"high"   },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"60th pct",      note:"World Bank WGI 2023 — functional but capacity-constrained", conf:"high"  },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"46/100",        note:"Transparency International 2023 — moderate risk of diversion", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"~70%",          note:"High gas import share — IEA 2023; vulnerability to supply disruption", conf:"medium" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Moderate-Low",  note:"Import dependency + yield variability in drought years — World Bank WDI", conf:"medium" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"~72%",          note:"Partial — not nationwide; CO-verified figure — UNDRR Sendai Monitor / NAP 2021 §2.3", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"2/3",           note:"Platform + budget exist; legal mandate limited — UNDRR Sendai Monitor 2023", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. 28% GDP",  note:"IMF WEO 2024 — moderate capacity to mobilise recovery spending", conf:"high" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Low",           note:"Electricity 97% worn, heating 79%, water 58–62% — Yerevan City Passport 2025", conf:"medium" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+2.1°C by 2050", note:"IPCC AR6 South Caucasus regional downscale — Copernicus CCS", conf:"medium" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"Moderate risk", note:"Minor glacial contribution to Kura-Araks; increasing summer low flows — WGMS est.", conf:"low" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.3%/yr",      note:"Forest cover loss + pasture degradation — Hansen GFC 2023 est.", conf:"low" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"Moderate-High", note:"Projected crop yield –15%, runoff –20% by 2050 — FAO/IPCC AR6 / Aqueduct WRI", conf:"low" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"Moderate",      note:"Climate-driven displacement risk by 2030–2050 — IDMC projections", conf:"low" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"15,000 Gg trend ↓",note:"NDC target 40% below 1990 by 2030; emissions declining — OWID/Global Carbon Project", conf:"high" },
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
    hp:0.35, ex:0.4, fr:0.45, ac:0.55, fs:0.5, crisp:35, crispClass:"Low",
    dominantHazards:["Extreme Temperature","Floods","Epidemics"],
    knownDeaths:7189, knownAffected:1204079, knownLoss:73300000,
    deathCov:8, affCov:13, lossCov:1,
    hazardBreakdown:{ Hydrological:12, Meteorological:9, Biological:3, Geophysical:0 },

    narrative: "Belarus presents a fundamentally different risk profile from Central Asian neighbours — no seismic exposure, lower hazard frequency, and relatively stronger baseline infrastructure. The dominant threats are extreme temperature events (heat waves accounting for 4 of 8 recorded death events) and epidemics, including COVID-19 which generated 99% of all recorded affected figures. Flood risk is present but moderate, concentrated in western oblasts. The more significant long-term concern is climate trajectory: heat extremes that were once rare are now recurring annually, and the country lacks a comprehensive DRR framework aligned to this shifting pattern.",

    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"0.9 /yr/1M",    note:"Events per 100yr window per million pop — low-moderate rate — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"Low-Moderate",  note:"Heat waves dominate mortality; COVID-19 skews affected count — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"Low",           note:"Flood–heat co-occurrence possible; no major compound events recorded — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.6× heat",     note:"Heat event frequency rising — 5 events since 2006 vs rare prior — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.5°C anomaly",note:"1990–2023 warming trend — Belarus State Committee for Hydrometeorology", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"Low",           note:"Abundant freshwater — FAO AQUASTAT; drought risk emerging in east — est.", conf:"medium" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~15%",          note:"Flood zones in western oblasts; low seismic exposure — GFDRR est.", conf:"low" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~12%",          note:"Agricultural GDP in floodplain areas — World Bank est. mock", conf:"low" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~20%",          note:"River corridor road network — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"Low-Moderate", note:"Pripyat basin flood exposure — GFDRR est.", conf:"low" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"~5.6%",         note:"World Bank 2022 — lower than regional average", conf:"high" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"Low",           note:"Domestic food production adequate — FAO FAOSTAT 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"5.8 per 1,000", note:"Physicians + nurses; above regional average — WHO GHO 2023", conf:"high" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.115",         note:"UNDP HDR 2023 — relatively low gender inequality", conf:"high" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"45th pct",      note:"World Bank WGI 2023 — centralised; coordination capacity exists", conf:"medium" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"41/100",        note:"Transparency International 2023 — moderate corruption risk", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"~85%",          note:"Gas import dependency from Russia — IEA 2023; high systemic fragility", conf:"high" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Moderate",      note:"Low import dependency but yield variability under heat stress — World Bank WDI", conf:"medium" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"Operational",   note:"Multi-hazard EWS in place — Belarus MES Annual Report 2023", conf:"high" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"2/3",           note:"Platform and budget exist; mandate scope limited — UNDRR Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. ~40% GDP", note:"IMF WEO 2024 — state-led economy; capacity to mobilise spending", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Moderate",      note:"Soviet-era stock; ageing but functional — UNDP Belarus 2022", conf:"medium" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+2.1°C by 2050", note:"IPCC AR6 Eastern Europe regional downscale — Belarus Nat. Comm. 2022", conf:"medium" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"N/A",           note:"No glaciated terrain — excluded from composite; FS weights renormalised", conf:"high" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.2%/yr",      note:"Stable forest cover; some peat degradation — Hansen GFC 2023 est.", conf:"low" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"Low-Moderate",  note:"Crop yield –5–10% projected by 2050; adequate water buffer — FAO/IPCC est.", conf:"low" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"Low",           note:"Climate-driven displacement risk low — IDMC 2030 projections", conf:"medium" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"35% below 1990 target", note:"Unconditional NDC; emissions trend declining — OWID/UNFCCC", conf:"high" },
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
    hp:0.71, ex:0.65, fr:0.78, ac:0.34, fs:0.72, crisp:74, crispClass:"High",
    dominantHazards:["Flash Floods","Earthquakes","Landslides","Extreme Heat"],
    knownDeaths:502, knownAffected:5655379, knownLoss:719973434,
    deathCov:57, affCov:52, lossCov:18,
    hazardBreakdown:{ Hydrological:38, Geophysical:23, Meteorological:6, Biological:3 },

    narrative: "Tajikistan carries the highest compound risk of any country in this dataset — driven by the convergence of annual flash floods, active seismicity, glacial hazards, and extreme heat, all concentrated on a population with limited adaptive capacity. Recorded economic losses exceed $720M across 18 events, almost certainly a fraction of actual impact given that only 26% of events have any economic data. The 1998 floods alone killed 134 people and caused $60M in damage. In the capital Dushanbe alone, annual losses from natural hazards are estimated at 1–1.5% of GRP today, rising to 2–3% by the second half of the century without proactive DRR/CCA measures. Infrastructure decay is severe: water losses reach 60% in urban supply networks and 40% in district heating. Average annual temperatures in Dushanbe have already risen by 3.2°C over the past 50 years — nearly triple the global average — with crop yield losses projected at up to 50% by 2050 and a water deficit deepening as glaciers retreat.",

    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"3.1 /yr/1M",    note:"Events per 100yr window per million pop — highest in portfolio — Event Database", conf:"high" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"High",          note:"Deaths + affected weighted per event; 1998 floods 134 dead / $60M — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"High",          note:"Flood–landslide co-occurrence: high — primary proprietary signal — Event Database", conf:"high" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.5×",          note:"5-yr event rate vs 100-yr baseline — accelerating since 2010 — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+3.2°C (Dushanbe)", note:"1975–2025 city-level rise; 3× global avg — Dushanbe Risk Profile 2025 / ADB-WB 2021", conf:"high" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"High",          note:"Intensive irrigation agriculture; Amu Darya basin under stress — FAO AQUASTAT 2023", conf:"high" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~54%",          note:"Mountainous high-risk areas; flood inundation + seismic zones — GFDRR / World Bank", conf:"medium" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~45%",          note:"Agricultural GDP concentrated in river valleys exposed to floods — World Bank est.", conf:"low" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"70%+ exposed",  note:"Road network in landslide + flood corridors — UNDRR/ADB 2022", conf:"medium" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"High",  note:"Hospitals and schools in seismic and flood zones — GFDRR/WHO est.", conf:"low" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"26.3%",         note:"World Bank PovcalNet 2023 — primary mortality amplifier", conf:"high" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"High",          note:"50% crop yield loss risk by 2050; current food stress elevated — FAO FAOSTAT 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"2.3 per 1,000", note:"Physicians + nurses; thin system amplifies disaster mortality — WHO GHO 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.317",         note:"UNDP HDR 2023 — high inequality reduces evacuation and recovery agency", conf:"high" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"18th pct",      note:"World Bank WGI 2023 — low institutional capacity for disaster response", conf:"high" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"20/100",        note:"Transparency International 2023 — high diversion risk for reconstruction funds", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"High — Uzbekistan gas", note:"External energy dependency; supply disruption cascades across systems — IEA 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Low",           note:"High import dependency + volatile cereal yields — World Bank WDI / FAO FAOSTAT", conf:"medium" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"~28%",          note:"Low — CO-verified; Sendai Monitor self-report revised downward — UNDRR Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"2/3",           note:"Platform and DRR strategy exist; budget and mandate weak — UNDRR Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. 33% GDP (aid-dependent)", note:"IMF WEO 2024 — highly aid-dependent; limited independent recovery capacity", conf:"high" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Low",           note:"Water losses 60%, heating 40% — Dushanbe GCAP 2022 / ESCAP Review 2020", conf:"medium" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+3.1°C by 2050", note:"Central Asia — highest regional warming rate — IPCC AR6 SRCCL / Copernicus", conf:"medium" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"−41% vol. by 2100", note:"RCP4.5; dominant long-run risk driver — Zemp et al. (2019) / WGMS", conf:"medium" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.8%/yr",      note:"Forest cover + pasture degradation accelerating — Hansen GFC 2023 / ESA CCI", conf:"medium" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"Very High",     note:"Crop yield –50% by 2050; runoff –30%; hydropower capacity at risk — FAO/IPCC/IEA", conf:"medium" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"High",          note:"Climate displacement risk 2030–2050 elevated — IOM / IDMC projections", conf:"medium" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"Low absolute; NDC 50–65% ↓", note:"Low emitter but trajectory rising — OWID/Global Carbon Project / Tajikistan NDC 2021", conf:"medium" },
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
    hp:0.62, ex:0.6, fr:0.72, ac:0.4, fs:0.68, crisp:63, crispClass:"Medium",
    dominantHazards:["Floods","Earthquakes","Landslides","Mudslides"],
    knownDeaths:2927, knownAffected:258992, knownLoss:5060000,
    deathCov:16, affCov:12, lossCov:3,
    hazardBreakdown:{ Hydrological:24, Geophysical:13, Biological:4, Meteorological:4 },

    narrative: "Kyrgyzstan's risk landscape is defined by the combination of active seismicity, dense informal settlements on hazard-prone slopes, and rapid glacier-driven hydrological change. The record extends to 1911 (Chon-Kemin earthquake, 452 deaths), giving one of the longest time horizons in the dataset. The 2008 Nura earthquake (75 deaths) and 2003–2004 landslide cluster (67 deaths across two events) illustrate the persistent geophysical threat. Osh city — 478K population, growing at 8% annually on seismic slopes — represents the single highest urban concentration risk in the region. Projected 30% water deficit by 2030 from glacier retreat will compound food and livelihood insecurity significantly.",

    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"2.3 /yr/1M",    note:"45 events over period; floods + landslides dominant — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"High",          note:"1911 Chon-Kemin EQ (452 dead); 2003–2004 landslides (67 dead) — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"High",          note:"Flood–landslide co-occurrence high in Osh and Jalal-Abad — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.4×",          note:"5-yr event rate exceeds 100-yr baseline — accelerating floods — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.2°C anomaly",note:"1935–2020 — Kyrgyzstan Nat. Comm. 2022; increasing event intensity", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"High (south)",  note:"Fergana Valley irrigation stress; Naryn glacier-fed rivers at risk — FAO AQUASTAT", conf:"medium" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~60%",          note:"Mountainous terrain; majority in flood + landslide exposed valleys — GFDRR est.", conf:"low" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~50%",          note:"Agricultural GDP concentrated in Fergana and Chuy valleys — World Bank est.", conf:"low" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~65%",          note:"Mountain road network in landslide + flood corridors — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"High",  note:"Osh urban infrastructure in seismic and flood zones — Osh Risk Profile 2025", conf:"medium" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"33.3%",         note:"World Bank 2022 — high disaster mortality amplifier", conf:"high" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"High",          note:"30% water deficit by 2030 from glacier retreat threatens food systems — FAO est.", conf:"medium" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"2.9 per 1,000", note:"Physicians + nurses; strained — WHO GHO 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.364",         note:"UNDP HDR 2023 — high inequality reduces adaptive agency", conf:"high" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"25th pct",      note:"World Bank WGI 2023 — limited institutional disaster response capacity", conf:"medium" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"26/100",        note:"Transparency International 2023 — high diversion risk", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"~40%",          note:"Hydro-dominant but fossil fuel imports for heating — IEA 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Low",           note:"High cereal import dependency; glacier retreat threatens irrigation — World Bank WDI", conf:"medium" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"Partial",       note:"Not full national coverage — UNDP Kyrgyzstan DRR 2024 / Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"2/3",           note:"Platform and strategy confirmed; local mandate weak — UNDRR Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. ~25% GDP", note:"IMF WEO 2024 — remittance-dependent economy; limited recovery capacity", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Low",           note:"Water network 50%+ worn in Osh — Osh Risk Profile 2025", conf:"low" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+2.5°C by 2050", note:"IPCC AR6 Central Asia — Kyrgyzstan Nat. Comm. 2022", conf:"medium" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"High — Tian Shan", note:"30% glacier volume loss projected; Naryn and Kara Darya flow reduction — WGMS", conf:"medium" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.6%/yr",      note:"Pasture degradation + forest loss — Hansen GFC 2023 / ESA CCI est.", conf:"low" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"Very High",     note:"Glacier retreat drives crop yield –25% and runoff –20% by 2050 — FAO/IPCC/IEA", conf:"medium" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"High",          note:"Climate + poverty driven displacement risk by 2050 — IDMC projections", conf:"medium" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"44% below 1990 target", note:"Conditional NDC; low absolute emitter — OWID / Kyrgyzstan NDC 2021", conf:"high" },
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
    hp:0.55, ex:0.5, fr:0.62, ac:0.45, fs:0.6, crisp:52, crispClass:"Medium",
    dominantHazards:["Floods","Extreme Heat","Fires","Droughts"],
    knownDeaths:1005, knownAffected:2511642, knownLoss:3376579500,
    deathCov:25, affCov:28, lossCov:8,
    hazardBreakdown:{ Hydrological:25, Meteorological:9, Biological:3, Geophysical:1 },
    narrative:"Bosnia and Herzegovina is defined by two converging threats: exceptional flood exposure along the Sava, Bosna and Neretva river systems, and rapidly intensifying heat extremes. The 2014 floods caused $3.3 billion in losses and displaced over a million people -- the largest non-seismic disaster in this entire dataset. The 2024 heat event killed 909 people, signalling that extreme temperature is no longer a background risk but an acute annual threat. Post-war infrastructure fragmentation across entity lines complicates coordinated disaster response.",
    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"1.4 /yr/1M",    note:"38 events over period; floods + heat dominant — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"Very High",     note:"2014 floods ($3.3B loss, 1M displaced); 2024 heat (909 dead) — Event Database", conf:"high" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"Moderate",      note:"Flood–landslide co-occurrence in river basins — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.5× heat",     note:"Heat event frequency and severity rising steeply since 2010 — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.7°C anomaly",note:"1961–2020 — Bosnia Hydromet Institute 2022; precip –5%", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"Low-Moderate",  note:"Sava/Bosna/Neretva well-supplied but flood-prone — FAO AQUASTAT 2023", conf:"medium" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~35%",          note:"Sava, Bosna, Neretva floodplains; urban concentration — Global Flood Database", conf:"medium" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~30%",          note:"Industry and agriculture in river floodplains — World Bank est.", conf:"low" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~40%",          note:"River corridor roads exposed to flood damage — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"Moderate-High", note:"Power and water infrastructure in flood zones — GFDRR est.", conf:"low" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"~16.9%",        note:"World Bank 2022 — moderate vulnerability", conf:"high" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"Moderate",      note:"Agricultural flood damage chronic — FAO FAOSTAT 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"3.5 per 1,000", note:"Physicians + nurses; entity fragmentation limits coordination — WHO GHO 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.174",         note:"UNDP HDR 2023 — relatively low gender inequality", conf:"high" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"40th pct",      note:"World Bank WGI 2023 — entity-level fragmentation hinders DRR coordination", conf:"medium" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"36/100",        note:"Transparency International 2023 — significant risk", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"~45%",          note:"Coal and gas imports; transition-dependent — IEA 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Moderate",      note:"Domestic production adequate in normal years; flood disruption risk — World Bank WDI", conf:"medium" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"Partial",       note:"Entity-level gaps — UNDRR BiH Review 2023 / Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"2/3",           note:"Platform exists; budget fragmented across entities; mandate weak — UNDRR Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. ~42% GDP", note:"IMF WEO 2024 — adequate but reconstruction spending constrained post-2014", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Low-Moderate",  note:"Post-war infrastructure fragmentation; flood protection incomplete — UNDP BiH 2023", conf:"medium" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+2.2°C by 2050", note:"IPCC AR6 Western Balkans regional downscale — Copernicus CCS", conf:"medium" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"N/A",           note:"No glaciated terrain — excluded from composite", conf:"high" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.3%/yr",      note:"Forest cover stable; some riparian degradation — Hansen GFC 2023 est.", conf:"low" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"Moderate",      note:"Crop yield –10% and hydropower stress projected by 2050 — FAO/IPCC/IEA", conf:"low" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"Moderate",      note:"Economic + climate out-migration overlapping — IDMC est.", conf:"low" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"35% below 1990 target", note:"NDC adopted; coal-dominant; slow transition — OWID / BiH NDC 2021", conf:"medium" },
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
    hp:0.42, ex:0.38, fr:0.35, ac:0.7, fs:0.55, crisp:32, crispClass:"Low",
    dominantHazards:["Extreme Heat","Fires","Earthquakes","Floods"],
    knownDeaths:155, knownAffected:8081, knownLoss:4600000,
    deathCov:7, affCov:10, lossCov:2,
    hazardBreakdown:{ Meteorological:10, Hydrological:6, Geophysical:4, Biological:1 },
    narrative:"Cyprus presents lower hazard frequency than most countries here, but its Mediterranean island geography concentrates converging risks. Extreme heat events are now the dominant killer -- 101 deaths in 2022 -- and are projected to intensify significantly. Wildfire seasons are extending with reduced winter rainfall. Future risk is rated considerably higher than current hazard because the Eastern Mediterranean climate trajectory is among the most severe in the region: temperatures rising 2-3x the global average, precipitation declining 20-30% by 2100.",
    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"0.6 /yr/1M",    note:"Low-moderate event rate; heat and drought dominant — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"High (heat)",   note:"2022 heat event 101 dead — highest per-event impact in dataset — Event Database", conf:"high" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"Moderate",      note:"Drought–wildfire co-occurrence elevated — Eastern Mediterranean pattern — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"2.0× heat",     note:"Heat event frequency doubling — Mediterranean hotspot signal — Copernicus CCS", conf:"high" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.8°C anomaly; –15% precip",note:"1961–2020 — Cyprus Met Dept 2022; Mediterranean drying accelerating", conf:"high" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"Very High",     note:"Desalination-dependent; freshwater resources near depletion — FAO AQUASTAT 2023", conf:"high" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~25%",          note:"Coastal and wildfire-prone terrain — GFDRR est.", conf:"low" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~30%",          note:"Tourism sector (~20% GDP) highly exposed to heat and drought — World Bank est.", conf:"medium" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~20%",          note:"Fire and flood corridor road network — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"Moderate", note:"Power and water infrastructure in fire and drought zones — GFDRR est.", conf:"low" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"~13.1%",        note:"EU-SILC 2022 — lower than regional average", conf:"high" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"Moderate",      note:"Water scarcity constrains agriculture; high food import dependency — FAO FAOSTAT", conf:"medium" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"6.2 per 1,000", note:"Physicians + nurses; EU-standard — WHO GHO 2023", conf:"high" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.073",         note:"UNDP HDR 2023 — low gender inequality", conf:"high" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"78th pct",      note:"World Bank WGI 2023 — strong EU-aligned institutions", conf:"high" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"59/100",        note:"Transparency International 2023 — moderate risk", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"~94%",          note:"Nearly fully import-dependent on fossil fuels — IEA 2023; high systemic exposure", conf:"high" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Low",           note:"Very high food import dependency; water scarcity compounds — World Bank WDI", conf:"medium" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"Operational",   note:"EU civil protection framework — Cyprus DDPM 2023 / Sendai Monitor", conf:"high" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"3/3",           note:"Platform, budget and mandate confirmed — EU alignment — UNDRR Sendai Monitor", conf:"high" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. ~40% GDP", note:"IMF WEO 2024 — EU member; access to European recovery funds", conf:"high" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Moderate-High", note:"Desalination active; EU-standard utilities — Cyprus Water Strategy 2023", conf:"high" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+2.8°C by 2050", note:"Eastern Mediterranean hotspot — 2–3× global average — IPCC AR6 / Copernicus", conf:"high" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"N/A",           note:"No glaciated terrain — excluded from composite", conf:"high" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.4%/yr",      note:"Forest and scrub degradation under drought — Hansen GFC 2023 / ESA CCI", conf:"medium" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"Very High",     note:"Freshwater –30%, crop yield –20%, energy import stress — all worsening by 2050", conf:"medium" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"Moderate",      note:"Destination country but climate-driven regional displacement pressure — IDMC est.", conf:"low" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"55% below 1990 target (EU)", note:"EU-aligned NDC; per capita still high — OWID / Cyprus NDC 2021", conf:"high" },
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
    hp:0.52, ex:0.44, fr:0.41, ac:0.68, fs:0.48, crisp:38, crispClass:"Low",
    dominantHazards:["Floods","Earthquakes","Extreme Heat"],
    knownDeaths:50, knownAffected:9088687, knownLoss:218700000,
    deathCov:17, affCov:20, lossCov:5,
    hazardBreakdown:{ Hydrological:16, Geophysical:2, Meteorological:2 },
    narrative:"Georgia's hazard record is almost entirely hydrological with 15 of 20 events being floods. The 2015 Tbilisi floods (19 deaths, $30M loss) demonstrated how rapidly flash floods through mountain gorges can devastate an urban centre. The 2002 Tbilisi earthquake caused $180M in losses. Affected population figures near 9 million likely reflect national-level reporting. Climate projections point to increased precipitation variability -- wetter wet seasons amplifying flood frequency alongside long-term drying in eastern lowlands.",
    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"1.6 /yr/1M",    note:"Events per 100yr window per million pop — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"Moderate",      note:"2015 Tbilisi flood (19 dead, $30M) is benchmark event — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"Low-Moderate",  note:"Flood–landslide co-occurrence in mountain gorges — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.2×",          note:"Flood frequency steady but intensifying — Event Database est.", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.3°C anomaly",note:"1961–2020 — Georgia Hydromet Dept 2022; precip variable", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"Moderate",      note:"Kura-Araks transboundary pressure increasing — FAO AQUASTAT 2023", conf:"medium" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~22%",          note:"Flood inundation zones + seismic exposure — Global Flood Database", conf:"medium" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~18%",          note:"Urban GDP in Tbilisi flood corridor — World Bank est.", conf:"low" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~40%",          note:"Mountain road network exposed to landslide + flood corridors — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"Moderate", note:"Tbilisi urban concentration in seismic and flood zones — GFDRR est.", conf:"low" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"21.7%",         note:"World Bank 2022", conf:"high" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"Low-Moderate",  note:"Domestic production adequate; import dependency modest — FAO FAOSTAT 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"5.5 per 1,000", note:"Physicians + nurses — WHO GHO 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.331",         note:"UNDP HDR 2023 — moderate inequality", conf:"high" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"60th pct",      note:"World Bank WGI 2023 — functional institutions", conf:"high" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"55/100",        note:"Transparency International 2023 — improving trajectory", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"~80%",          note:"Gas imports from Azerbaijan and Russia — IEA 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Moderate",      note:"Import dependency moderate; cereal yield stable — World Bank WDI", conf:"medium" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"~72% (partial)", note:"River flood EWS partial — UNDP Georgia DRR 2023 / Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"3/3",           note:"Platform, budget and mandate all confirmed — UNDRR Sendai Monitor", conf:"high" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. 28% GDP",  note:"IMF WEO 2024 — reasonable recovery capacity", conf:"high" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Moderate",      note:"Urban flood infrastructure investment active in Tbilisi — EU-GEO 2023", conf:"medium" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+2.1°C by 2050", note:"IPCC AR6 South Caucasus regional downscale — Copernicus CCS", conf:"medium" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"Moderate risk", note:"Small Caucasus glaciers retreating; Kura-Araks low-flow risk — WGMS", conf:"low" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.3%/yr",      note:"Forest cover loss in eastern highlands — Hansen GFC 2023 est.", conf:"low" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"Moderate",      note:"Crop yield –10–15% projected by 2050; water stress increasing — FAO/IPCC", conf:"low" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"Low-Moderate",  note:"Climate displacement risk modest — IDMC 2030 projections", conf:"medium" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"35% below 1990 target", note:"Conditional NDC; hydro-dominant grid — OWID / Georgia NDC 2021", conf:"high" },
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
    hp:0.5, ex:0.48, fr:0.52, ac:0.5, fs:0.62, crisp:46, crispClass:"Medium",
    dominantHazards:["Fires","Floods","Droughts","Storms"],
    knownDeaths:297, knownAffected:1054901, knownLoss:285570,
    deathCov:18, affCov:42, lossCov:8,
    hazardBreakdown:{ Meteorological:87, Hydrological:39, Biological:4, Geophysical:3 },
    narrative:"Kazakhstan's hazard profile is shaped by its vast steppe geography and continental climate extremes. Fires account for 83 of 133 recorded events, many affecting enormous grassland areas with limited response capacity. Flood risk concentrates in spring snowmelt events -- the 2024 Ural floods displaced over 100,000 people. The near-absence of economic loss data ($286K recorded) reflects collection gaps rather than low impact. Future risk is elevated by projected aridification and the loss of glacial water sources from the Tian Shan.",
    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"1.5 /yr/1M",    note:"Events per 100yr window per million pop; fires inflate count — Event Database", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"Low-Moderate",  note:"Individual event impact relatively low except 2024 Ural floods — Event Database", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"Low",           note:"Drought–fire co-occurrence in steppe; limited compound event record — Event Database", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.3× fires",    note:"Wildfire frequency rising with aridification — Event Database / Copernicus", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.7°C anomaly",note:"1940–2020 continental amplification — Kazakhstan Hydromet Service 2022", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"High (south)",  note:"Aral Sea basin; Syr Darya severely over-allocated — FAO AQUASTAT 2023", conf:"high" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~22%",          note:"Flood plains + steppe fire zones; vast geography limits precision — GFDRR est.", conf:"low" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~20%",          note:"Oil sector + agriculture in hazard corridors — World Bank est.", conf:"low" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~30%",          note:"Spring flood road corridors in northern oblasts — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"Moderate", note:"Energy infrastructure in flood/fire zones — GFDRR est.", conf:"low" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"~5.2%",         note:"World Bank 2022 — lower regional vulnerability", conf:"high" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"Low-Moderate",  note:"Domestic cereal production adequate; drought risk to south — FAO FAOSTAT", conf:"medium" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"6.8 per 1,000", note:"Physicians + nurses; above regional average — WHO GHO 2023", conf:"high" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.197",         note:"UNDP HDR 2023 — moderate", conf:"high" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"55th pct",      note:"World Bank WGI 2023 — central government capacity functional", conf:"medium" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"36/100",        note:"Transparency International 2023 — significant risk of diversion", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"~5% (net exporter)", note:"Major oil/gas exporter; energy self-sufficient — IEA 2023", conf:"high" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Moderate",      note:"Export-oriented grain sector; southern water dependency — World Bank WDI", conf:"medium" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"Partial",       note:"Spring snowmelt flood coverage exists; steppe fire EWS limited — UNDRR Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"2/3",           note:"Platform + strategy; local mandate weak — UNDRR Sendai Monitor 2023", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. ~22% GDP", note:"IMF WEO 2024 — oil revenue dependent; adequate in normal years", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Moderate",      note:"Urban-rural gap in infrastructure quality; steppe coverage limited — World Bank WDI", conf:"medium" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+3.0°C by 2050", note:"Continental amplification — IPCC AR6 Central Asia", conf:"medium" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"High — Tian Shan", note:"Tian Shan glacier retreat threatens Syr Darya dry-season flow — WGMS 2023", conf:"medium" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.5%/yr",      note:"Steppe desertification + pasture degradation — Hansen GFC / ESA CCI", conf:"medium" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"High",          note:"Crop yield –20% and runoff –25% projected by 2050 in south — FAO/IPCC/Aqueduct", conf:"medium" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"Moderate",      note:"South Kazakhstan climate displacement risk by 2050 — IDMC projections", conf:"low" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"374 Gg base; 15% ↓ target", note:"High per-capita emitter; oil-dependent trajectory — Kazakhstan NDC 2021 / OWID", conf:"high" },
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
    hp:0.45, ex:0.52, fr:0.6, ac:0.28, fs:0.52, crisp:55, crispClass:"Medium",
    dominantHazards:["Storms","Landslides","Fires","Floods"],
    knownDeaths:28, knownAffected:92096, knownLoss:0,
    deathCov:8, affCov:81, lossCov:0,
    hazardBreakdown:{ Meteorological:61, Geophysical:18, Hydrological:14, Biological:3 },
    narrative:"Kosovo's disaster record reveals a significant data gap: zero economic losses are recorded across 96 events, reflecting systemic under-reporting rather than low impact. Storm events dominate by count (44), with landslides (17) and fires (16) as persistent secondary threats across the highland terrain. The 2012 Restelice landslide (10 deaths) and concurrent heat event (9 deaths) represent the worst natural hazard year on record. Institutional capacity for DRR remains limited relative to exposure.",
    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"2.8 /yr/1M",    note:"96 events over period; storm events dominate count — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"Low-Moderate",  note:"Low death count per event; data gaps limit severity assessment — Event Database", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"Moderate",      note:"Storm–landslide co-occurrence in highland terrain — Event Database", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.4× storms",   note:"Storm and fire frequency rising since 2000 — Event Database est.", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.5°C anomaly",note:"1961–2020 — Kosovo Hydrometeorological Institute", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"Moderate",      note:"Drin/White Drin basin; seasonal stress increasing — FAO AQUASTAT est.", conf:"low" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~35%",          note:"Flood plains + highland landslide terrain — GFDRR est.", conf:"low" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~30%",          note:"Agricultural and energy GDP in hazard corridors — World Bank est.", conf:"low" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~45%",          note:"Mountain road network in landslide and flood zones — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"Moderate", note:"Kosovo-B power plant in flood zone — GFDRR est.", conf:"low" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"17.6%",         note:"World Bank 2022 — amplifies disaster vulnerability", conf:"high" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"Moderate",      note:"Import dependency; flash flood risk to agriculture — FAO FAOSTAT est.", conf:"low" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"2.8 per 1,000", note:"Physicians + nurses; limited capacity — WHO GHO 2023 est.", conf:"low" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.244",         note:"UNDP HDR 2023 est. — moderate", conf:"low" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"35th pct",      note:"World Bank WGI 2023 — limited institutional DRR capacity", conf:"medium" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"42/100",        note:"Transparency International 2023", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"~60% coal-based",note:"Kosovo-B dominant; coal dependency with import exposure — IEA est.", conf:"medium" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Low",           note:"High import dependency; no food system resilience framework — World Bank WDI", conf:"low" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"Absent",        note:"Flash flood EWS absent — UNDP Kosovo 2024 — critical gap", conf:"high" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"0/3",           note:"No confirmed platform, budget or mandate — UNDRR Sendai Monitor", conf:"high" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. ~26% GDP", note:"IMF WEO 2024 — constrained; diaspora-dependent economy", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Low",           note:"Critical infrastructure gaps; DRR investment absent — UNDP Kosovo 2024", conf:"high" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+2.3°C by 2050", note:"IPCC AR6 Western Balkans regional projection", conf:"medium" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"N/A",           note:"No glaciated terrain — excluded from composite", conf:"high" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.6%/yr",      note:"Forest cover loss — deforestation pressure — Hansen GFC 2023 est.", conf:"low" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"Moderate-High", note:"Crop yield –15% and water stress increasing by 2050 — FAO/IPCC est.", conf:"low" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"Moderate",      note:"Climate and economic out-migration overlapping — IDMC est.", conf:"low" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"No NDC submitted", note:"Not submitted to UNFCCC — emissions from coal dominant — OWID est.", conf:"medium" },
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
    hp:0.48, ex:0.5, fr:0.58, ac:0.44, fs:0.55, crisp:48, crispClass:"Medium",
    dominantHazards:["Floods","Droughts","Extreme Heat"],
    knownDeaths:234, knownAffected:2806737, knownLoss:2176476900,
    deathCov:9, affCov:12, lossCov:12,
    hazardBreakdown:{ Meteorological:18, Hydrological:3, Biological:1 },
    narrative:"Moldova stands out in this dataset for relatively good economic loss documentation -- $2.18 billion recorded across 12 events, making it one of the better-evidenced countries. Floods along the Prut and Dniester rivers are the acute threat. Droughts are the persistent slow-onset risk: five recorded events between 1994 and 2020 consistently affect agricultural production. The 2007 heat event killed 146 people. Moldova's landlocked geography and rain-fed agriculture make it particularly exposed to the drying and temperature-rise trajectory projected for Eastern Europe.",
    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"1.1 /yr/1M",    note:"22 events over period; droughts and heat dominant — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"High",          note:"2007 heat (146 dead, $530M); 2010 Prut floods (500K affected) — Event Database", conf:"high" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"Moderate",      note:"Drought–heat co-occurrence elevated — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.3×",          note:"Drought and heat frequency rising — Event Database / Copernicus", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.4°C anomaly",note:"1961–2020 — Moldova State Hydrometeorological Service; precip –5%", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"Moderate-High", note:"Prut and Dniester seasonal stress; groundwater depletion — FAO AQUASTAT 2023", conf:"medium" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~25%",          note:"Prut/Dniester floodplains; drought-exposed farmland — Global Flood Database", conf:"medium" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~35%",          note:"Agriculture ~12% GDP highly drought-exposed — World Bank est.", conf:"medium" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~30%",          note:"River corridor road network flood exposure — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"Moderate", note:"Rural water and energy infrastructure in flood zones — GFDRR est.", conf:"low" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"27.0%",         note:"World Bank 2022 — high vulnerability; remittance-dependent", conf:"high" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"High",          note:"Drought-prone agriculture; dominant economic sector — FAO FAOSTAT 2023", conf:"high" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"4.5 per 1,000", note:"Physicians + nurses — WHO GHO 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.218",         note:"UNDP HDR 2023 — moderate", conf:"high" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"42nd pct",      note:"World Bank WGI 2023 — improving but constrained capacity", conf:"medium" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"42/100",        note:"Transparency International 2023", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"~85%",          note:"High gas import dependency — IEA 2023; systemic fragility", conf:"high" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Low",           note:"Rain-fed agriculture; high cereal import dependency — World Bank WDI / FAO", conf:"high" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"Active (rivers)", note:"Prut/Dniester EWS operational — Moldova Hydromet 2023 / Sendai Monitor", conf:"high" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"3/3",           note:"Platform, budget and mandate confirmed — UNDRR Sendai Monitor 2023", conf:"high" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. ~32% GDP", note:"IMF WEO 2024 — constrained; significant aid dependence", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Low-Moderate",  note:"Post-Soviet ageing stock; flood protection partial — UNDP Moldova 2022", conf:"medium" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+2.0°C by 2050", note:"IPCC AR6 Eastern Europe regional downscale — Moldova Nat. Comm.", conf:"medium" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"N/A",           note:"No glaciated terrain — excluded from composite", conf:"high" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.4%/yr",      note:"Soil degradation and erosion on rain-fed farmland — Hansen GFC / ESA CCI", conf:"medium" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"High",          note:"Crop yield –20%, runoff –15% projected by 2050 — FAO/IPCC/Aqueduct WRI", conf:"medium" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"Moderate-High", note:"Climate + economic out-migration overlapping — IDMC 2030 projections", conf:"medium" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"70% below 1990 target", note:"Most ambitious NDC in region; low emitter — OWID / Moldova NDC 2021", conf:"high" },
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
    hp:0.38, ex:0.4, fr:0.42, ac:0.58, fs:0.48, crisp:34, crispClass:"Low",
    dominantHazards:["Floods","Fires","Extreme Heat"],
    knownDeaths:11, knownAffected:44387, knownLoss:90,
    deathCov:15, affCov:11, lossCov:1,
    hazardBreakdown:{ Hydrological:10, Meteorological:7, Biological:1 },
    narrative:"Montenegro has among the lowest compound risk scores in this dataset, reflecting its small size, moderate hazard exposure, and relatively intact natural systems including intact forest cover and Adriatic coastal resilience. Floods are the most frequent threat (10 events). Fires have increased in frequency as Mediterranean drying conditions extend northward. The near-zero economic loss data ($90 recorded) is a data gap rather than a reflection of actual impact.",
    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"1.0 /yr/1M",    note:"Low-moderate event rate; floods and fires dominant — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"Low-Moderate",  note:"Low recorded death counts; data gaps limit assessment — Event Database", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"Low-Moderate",  note:"Flood–fire co-occurrence possible in coastal terrain — Event Database est.", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.3× fires",    note:"Fire frequency rising under Mediterranean drying — Copernicus EFFIS", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.6°C anomaly",note:"1961–2020 — Montenegro Hydromet est. / IPCC AR6 Western Balkans", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"Low-Moderate",  note:"Adequate freshwater supply; seasonal coastal drought stress — FAO AQUASTAT", conf:"medium" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~28%",          note:"Coastal flood + fire zones; Skadar Lake basin — GFDRR est.", conf:"low" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~25%",          note:"Tourism (~25% GDP) exposed to fire and flood — World Bank est.", conf:"low" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~35%",          note:"Coastal mountain road network in flood + fire zones — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"Low-Moderate", note:"Limited critical infrastructure exposure — GFDRR est.", conf:"low" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"~8%",           note:"World Bank 2022 est. — moderate", conf:"medium" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"Low-Moderate",  note:"High food import dependency but domestic production adequate — FAO FAOSTAT", conf:"medium" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"3.4 per 1,000", note:"Physicians + nurses — WHO GHO 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.142",         note:"UNDP HDR 2023 — low", conf:"high" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"52nd pct",      note:"World Bank WGI 2023 — EU accession candidate; improving", conf:"medium" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"46/100",        note:"Transparency International 2023", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"~50%",          note:"Hydro plus coal and gas imports — IEA 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Low-Moderate",  note:"High import dependency; fire and drought risk to agriculture — World Bank WDI", conf:"low" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"Partial",       note:"Montenegro DRR Strategy 2020 — coverage expanding — Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"2/3",           note:"Platform and strategy confirmed; budget fragmented — UNDRR Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. ~44% GDP", note:"IMF WEO 2024 — moderate; tourism revenue volatile", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Moderate",      note:"44% renewable energy; coastal infrastructure investment — Montenegro Energy 2030", conf:"medium" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+2.1°C by 2050", note:"IPCC AR6 Western Balkans regional downscale", conf:"medium" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"N/A",           note:"No glaciated terrain — excluded from composite", conf:"high" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.3%/yr",      note:"Forest degradation under fire pressure — Hansen GFC 2023 / ESA CCI", conf:"low" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"Moderate",      note:"Hydropower stress + agricultural drought by 2050 — FAO/IPCC/IEA", conf:"low" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"Low",           note:"Small population; low climate displacement risk — IDMC est.", conf:"medium" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"35% below 1990 target", note:"Montenegro NDC 2021; 44% renewable energy — OWID", conf:"high" },
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
    hp:0.45, ex:0.44, fr:0.5, ac:0.5, fs:0.52, crisp:40, crispClass:"Low",
    dominantHazards:["Floods","Fires","Extreme Heat","Earthquakes"],
    knownDeaths:33, knownAffected:423919, knownLoss:13006913,
    deathCov:5, affCov:23, lossCov:5,
    hazardBreakdown:{ Hydrological:16, Meteorological:15, Geophysical:3, Biological:1 },
    narrative:"North Macedonia's disaster profile is shaped by flash flood exposure -- 16 hydrological events in 35 total, with the 2016 Skopje floods killing 22 people in a single afternoon event. The country sits at a seismic junction with three recorded earthquake events. Fires are increasing (11 events since 2000) under Mediterranean drying conditions. Skopje's Vardar river corridor and hillslope settlements combine high hazard exposure with limited drainage infrastructure.",
    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"1.7 /yr/1M",    note:"35 events over period; floods and fires dominant — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"Moderate-High", note:"2016 Skopje flash flood (22 dead) benchmark — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"Moderate",      note:"Flood–fire co-occurrence elevated; Vardar basin — Event Database est.", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.4× fires",    note:"Fire frequency rising under Mediterranean drying — Copernicus EFFIS / Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.6°C anomaly; –8% precip",note:"1961–2020 — N.Macedonia Hydromet Inst. 2022", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"Moderate",      note:"Vardar basin seasonal stress; increasing drought frequency — FAO AQUASTAT", conf:"medium" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~30%",          note:"Vardar floodplain + seismic zones — Global Flood Database", conf:"medium" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~25%",          note:"Industry in Vardar corridor; agriculture in lowland zones — World Bank est.", conf:"low" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~40%",          note:"Mountain and river corridor road network — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"Moderate", note:"Skopje infrastructure in flood + seismic zones — GFDRR est.", conf:"low" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"21.8%",         note:"World Bank 2022", conf:"high" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"Moderate",      note:"Drought and flood risk to agriculture — FAO FAOSTAT 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"3.0 per 1,000", note:"Physicians + nurses — WHO GHO 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.149",         note:"UNDP HDR 2023 — low", conf:"high" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"48th pct",      note:"World Bank WGI 2023 — EU candidate; moderate capacity", conf:"medium" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"43/100",        note:"Transparency International 2023", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"~60%",          note:"Coal + gas imports — IEA 2023; transition in progress", conf:"medium" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Moderate",      note:"Domestic production + imports; drought risk to yields — World Bank WDI", conf:"medium" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"Active (flash flood)", note:"Flash flood EWS active — N.Macedonia NAP 2023 / Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"2/3",           note:"Platform and strategy confirmed; budget limited — UNDRR Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. ~33% GDP", note:"IMF WEO 2024 — moderate capacity", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Low-Moderate",  note:"Limited drainage in Skopje urban corridor — UNDP MKD est.", conf:"medium" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+2.3°C by 2050", note:"IPCC AR6 Western Balkans regional downscale", conf:"medium" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"N/A",           note:"No glaciated terrain — excluded from composite", conf:"high" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.5%/yr",      note:"Forest cover loss + fire damage — Hansen GFC 2023 / ESA CCI", conf:"medium" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"Moderate-High", note:"Crop yield –15% and water stress increasing by 2050 — FAO/IPCC/Aqueduct", conf:"low" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"Moderate",      note:"Economic + climate out-migration overlapping — IDMC est.", conf:"low" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"43% below 1990 target", note:"NDC adopted; coal-dependent base — OWID / N.Macedonia NDC 2021", conf:"medium" },
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
    hp:0.48, ex:0.68, fr:0.78, ac:0.22, fs:0.58, crisp:68, crispClass:"High",
    dominantHazards:["Extreme Heat","Floods","Fires","Storms"],
    knownDeaths:1369, knownAffected:2147067, knownLoss:1683931960,
    deathCov:18, affCov:20, lossCov:6,
    hazardBreakdown:{ Meteorological:17, Hydrological:14, Biological:2 },
    narrative:"This dataset covers natural hazards only and predates the 2022 Russian invasion, which caused infrastructure damage exceeding $150 billion. Within the natural hazard record, extreme heat is the dominant killer: twin heat waves in 2006 caused 919 deaths. Vulnerability is scored higher than natural hazard frequency alone would suggest because conflict damage to heating systems, water infrastructure and evacuation capacity means current resilience is substantially below any pre-2022 baseline. Any risk assessment for Ukraine must be read alongside conflict impact data.",
    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"0.8 /yr/1M",    note:"Moderate natural hazard frequency; flood + drought dominant — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"Moderate",      note:"Chronic agricultural drought; flood events moderate severity — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"Low-Moderate",  note:"Drought–heat co-occurrence in steppe zone — Event Database est.", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.2×",          note:"Heat and drought frequency rising — Copernicus / Event Database", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.4°C anomaly",note:"1961–2020 — Ukraine Hydromet Service; precip variable by region", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"Moderate",      note:"Dnieper and Donets seasonal stress; war-related infrastructure damage compounds — FAO AQUASTAT", conf:"medium" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~20%",          note:"Dnieper floodplain + steppe drought zone — Global Flood Database", conf:"low" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~30%",          note:"Agricultural sector (~10% GDP) highly drought-exposed — World Bank est.", conf:"low" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~25%",          note:"River corridor road network flood exposure — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"Elevated (war)", note:"War-damaged infrastructure dramatically increases disaster exposure — UNDP Ukraine 2024", conf:"high" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"~5% pre-war",   note:"World Bank est. — war has significantly worsened vulnerability since 2022", conf:"low" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"Severe (war)",  note:"Global breadbasket disrupted; domestic food insecurity elevated — FAO 2024", conf:"high" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"3.6 per 1,000", note:"Physicians + nurses; pre-war figure — WHO GHO 2023; war has degraded capacity", conf:"low" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.227",         note:"UNDP HDR 2023 pre-war est.", conf:"medium" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"40th pct (pre-war)", note:"World Bank WGI 2022 — institutional capacity severely disrupted by conflict", conf:"low" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"33/100",        note:"Transparency International 2023 — improving pre-war but significant risk", conf:"medium" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"High (post-war)", note:"War disruption to domestic energy production — IEA 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Disrupted",     note:"Major grain exporter; domestic supply chains fragmented by conflict — World Bank WDI", conf:"medium" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"Disrupted",     note:"War has severely degraded EWS infrastructure — UNDRR est. 2024", conf:"low" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"1/3",           note:"Platform exists; budget and mandate under war conditions — UNDRR Sendai Monitor", conf:"low" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Severely constrained", note:"IMF WEO 2024 — massive war spending; international aid dependent", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Very Low",      note:"War damage to power, water, and transport — UNDP Ukraine Needs Assessment 2024", conf:"high" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+2.0°C by 2050", note:"IPCC AR6 Eastern Europe regional downscale — Ukraine Nat. Comm.", conf:"medium" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"N/A",           note:"No glaciated terrain — excluded from composite", conf:"high" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.5%/yr",      note:"War damage + agricultural degradation — Hansen GFC / ESA CCI 2023 est.", conf:"low" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"Very High",     note:"War damage compounds climate stress; crop yield –15% and water scarcity by 2050", conf:"low" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"Very High",     note:"Largest displacement crisis in Europe; climate compounds conflict drivers — IDMC 2024", conf:"high" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"65% below 1990 target", note:"NDC adopted; emissions falling due to war disruption — OWID / Ukraine NDC 2021", conf:"low" },
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
    hp:0.55, ex:0.62, fr:0.68, ac:0.35, fs:0.72, crisp:62, crispClass:"Medium",
    dominantHazards:["Floods","Fires","Earthquakes","Droughts","Landslides"],
    knownDeaths:4675, knownAffected:822217, knownLoss:391083000,
    deathCov:13, affCov:9, lossCov:2,
    hazardBreakdown:{ Hydrological:12, Meteorological:9, Geophysical:6, Biological:2 },
    narrative:"Uzbekistan's hazard record spans over a century with the 1902 earthquake (4,500 deaths) as the defining historical event. But the most significant vulnerability driver is outside this dataset entirely: the collapse of the Aral Sea has degraded agricultural systems, created toxic dust storm hazards, and left 60,000 km2 of exposed seabed. Future risk is high -- projected temperature increases of 3-4C by 2050, 30% water deficit from glacier retreat, and crop yield losses that threaten food systems for 35 million people.",
    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"1.2 /yr/1M",    note:"Events per 100yr window per million pop — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"Moderate-High", note:"1966 Tashkent earthquake (113K affected) benchmark — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"Moderate",      note:"Drought–heat co-occurrence elevated in Aral Sea basin — Event Database est.", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.3×",          note:"Heat and drought frequency rising under continental warming — Event Database", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.5°C anomaly",note:"1961–2020 — Uzbekistan Hydromet Service; Aral Sea desiccation driver", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"Very High",     note:"Amu Darya and Syr Darya severely over-allocated; Aral Sea crisis — FAO AQUASTAT", conf:"high" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~40%",          note:"Fergana Valley flood + seismic zones; Aral Sea dust exposure — GFDRR est.", conf:"low" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~35%",          note:"Agriculture (~25% GDP) in irrigation-dependent zones — World Bank est.", conf:"low" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~35%",          note:"Fergana corridor roads in flood and seismic zones — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"Moderate-High", note:"Irrigation infrastructure in drought and seismic zones — GFDRR est.", conf:"low" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"~9.5%",         note:"World Bank 2022", conf:"medium" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"Moderate-High", note:"Water-intensive agriculture highly exposed to Aral Sea crisis — FAO FAOSTAT", conf:"medium" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"2.8 per 1,000", note:"Physicians + nurses — WHO GHO 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.243",         note:"UNDP HDR 2023", conf:"high" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"28th pct",      note:"World Bank WGI 2023 — limited institutional transparency", conf:"medium" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"33/100",        note:"Transparency International 2023 — significant risk", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"~15% (net exporter)", note:"Gas exporter but energy infrastructure aged — IEA 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Low",           note:"Irrigation-dependent; water deficit critical — World Bank WDI / FAO FAOSTAT", conf:"medium" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"Partial",       note:"Limited national coverage; improving — UNDRR Sendai Monitor 2023", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"2/3",           note:"Platform and strategy exist; mandate and budget limited — UNDRR Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. ~30% GDP", note:"IMF WEO 2024 — moderate; gas revenue improving fiscal position", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Low",           note:"Aged Soviet-era irrigation and urban infrastructure — World Bank WDI", conf:"medium" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+2.8°C by 2050", note:"IPCC AR6 Central Asia — continental amplification", conf:"medium" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"High — Pamir/Tian Shan", note:"Upstream glacier retreat threatens Amu Darya/Syr Darya flow — WGMS 2023", conf:"medium" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.7%/yr",      note:"Aral Sea basin desertification + salinisation — Hansen GFC / ESA CCI", conf:"medium" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"Very High",     note:"Crop yield –30%, runoff –25%, hydropower at risk by 2050 — FAO/IPCC/IEA", conf:"medium" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"High",          note:"Aral Sea region depopulation + climate displacement — IDMC 2030 projections", conf:"medium" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"35% below 1990; trajectory ↑", note:"High per-capita; emissions rising with growth — OWID / Uzbekistan NDC 2021", conf:"medium" },
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
    hp:0.45, ex:0.65, fr:0.72, ac:0.25, fs:0.75, crisp:65, crispClass:"High",
    dominantHazards:["Earthquakes","Storms","Floods","Droughts"],
    knownDeaths:113298, knownAffected:176420, knownLoss:45000000,
    deathCov:6, affCov:2, lossCov:2,
    hazardBreakdown:{ Hydrological:10, Meteorological:9, Geophysical:7 },
    narrative:"Turkmenistan's disaster record is dominated by the 1948 Ashgabat earthquake (110,000 deaths -- one of the deadliest of the 20th century) and the 1929 Ashgabat earthquake (3,257 deaths). Outside these seismic catastrophes the contemporary picture is storms and floods, but data availability is severely constrained by political opacity. Vulnerability is scored high because critical infrastructure is opaque to external assessment. Future risk is driven by extreme aridification threatening the already water-stressed Amu Darya basin.",
    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"0.4 /yr/1M",    note:"Very low recorded event rate; data severely incomplete — Event Database", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"Extreme (historical)", note:"1948 Ashgabat earthquake: 110K–120K dead — deadliest in dataset — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"Low-Moderate",  note:"Drought–heat co-occurrence elevated; limited event record — Event Database est.", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"Unknown",       note:"Sparse event record prevents reliable trend calculation — Event Database", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.8°C anomaly",note:"1961–2020 — Turkmenistan Hydromet est.; extreme heat increasing", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"Extreme",       note:"Amu Darya nearly dry at delta; Aral Sea collapse — FAO AQUASTAT 2023", conf:"high" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~45%",          note:"Seismic active zones + drought/heat exposed territory — GFDRR est.", conf:"low" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~20%",          note:"Gas sector dominates; agriculture exposed to drought — World Bank est.", conf:"low" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~30%",          note:"Desert corridor roads in seismic and heat zones — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"High (seismic)", note:"Major infrastructure in Ashgabat seismic zone — GFDRR est.", conf:"low" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"~10% est.",     note:"World Bank est. — data opacity makes precise estimation difficult", conf:"low" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"Moderate-High", note:"Water-scarce agriculture; high food import dependency — FAO FAOSTAT est.", conf:"low" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"2.2 per 1,000 est.", note:"Physicians + nurses; very limited external verification — WHO GHO est.", conf:"low" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.306 est.",    note:"UNDP HDR est. — significant inequality limiting adaptive agency", conf:"low" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"5th pct",       note:"World Bank WGI 2023 — authoritarian system; very limited institutional transparency", conf:"medium" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"18/100",        note:"Transparency International 2023 — extreme corruption risk; 4th lowest globally", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"Net exporter (gas)", note:"Massive gas reserves; but domestic delivery infrastructure fragile — IEA 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Very Low",      note:"Irrigation agriculture near collapse in Amu Darya delta — World Bank WDI / FAO", conf:"medium" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"Unknown",       note:"No verifiable EWS data — Sendai Monitor: no submission; data opacity — UNDRR", conf:"low" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"0/3",           note:"No confirmed platform, budget or mandate in public domain — UNDRR Sendai Monitor", conf:"low" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Unknown",       note:"IMF WEO: data limited — gas revenue likely adequate but opaque — est.", conf:"low" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Low est.",      note:"Soviet-era infrastructure; no public reporting — World Bank WDI est.", conf:"low" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+3.2°C by 2050 est.", note:"IPCC AR6 Central Asia — extreme continental amplification", conf:"low" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"High — upstream", note:"Upstream Pamir/Tian Shan glacier retreat threatens Amu Darya — WGMS 2023", conf:"medium" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~1.2%/yr",      note:"Aral Sea desertification among worst globally — Hansen GFC / ESA CCI", conf:"medium" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"Extreme",       note:"Water collapse + crop yield –40% projected by 2050 — FAO/IPCC/Aqueduct WRI", conf:"low" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"High",          note:"Aral Sea basin depopulation ongoing; worsening — IDMC 2030 projections", conf:"medium" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"Very high; no NDC committed", note:"Among highest per-capita flaring globally — OWID / Global Carbon Project", conf:"medium" },
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
    hp:0.58, ex:0.52, fr:0.6, ac:0.45, fs:0.63, crisp:53, crispClass:"Medium",
    dominantHazards:["Floods","Earthquakes","Landslides"],
    knownDeaths:420, knownAffected:520000, knownLoss:320000000,
    deathCov:14, affCov:18, lossCov:7,
    hazardBreakdown:{ Hydrological:18, Geophysical:9, Meteorological:4, Biological:1 },

    narrative: "Albania faces a classic coastal-mountain risk profile where winter river floods and shallow earthquakes intersect with dense urban growth in floodplains. Recurrent Drin and Vjosa basin floods have displaced tens of thousands of people since the 1990s, while seismic risk remains elevated around Tirana and Durres. Ageing water, energy and road infrastructure amplify even moderate events, and future sea‑level rise plus more intense rainfall could significantly increase annual losses without proactive adaptation.",

    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"1.8 /yr/1M",    note:"Floods + earthquakes dominant — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"Moderate-High", note:"2019 Durrës earthquake ($1B+ losses) sets benchmark — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"Moderate",      note:"Flood–landslide co-occurrence in Drin and Vjosa basins — Event Database est.", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.2×",          note:"Flood frequency steady but intensity increasing — Event Database / Copernicus", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.4°C anomaly",note:"1961–2020 — Albania Hydromet est. / IPCC AR6 Western Balkans", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"Moderate",      note:"Drin and Vjosa seasonal stress; increasing drought frequency — FAO AQUASTAT", conf:"medium" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~40%",          note:"Drin/Vjosa floodplains + seismic active zones — GFDRR est.", conf:"low" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~35%",          note:"Tourism + agriculture in coastal flood + seismic zones — World Bank est.", conf:"low" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~45%",          note:"River corridor and coastal road network — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"High",  note:"Durrës port and Tirana urban infrastructure in seismic + flood zones — GFDRR", conf:"low" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"~12% est.",     note:"World Bank 2022 est. — moderate vulnerability", conf:"medium" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"Moderate",      note:"Flood and drought risk to agriculture — FAO FAOSTAT 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"3.5 per 1,000 est.", note:"Physicians + nurses — WHO GHO 2023 est.", conf:"low" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.181",         note:"UNDP HDR 2023", conf:"high" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"48th pct",      note:"World Bank WGI 2023 — EU candidate; improving", conf:"medium" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"37/100",        note:"Transparency International 2023 — significant risk", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"~40%",          note:"Hydro-dominant but gas and oil imports — IEA 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Moderate",      note:"Import dependency moderate; flood risk to coastal agriculture — World Bank WDI", conf:"low" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"Partial",       note:"Flood EWS in place; expanding — Albania DRR Strategy / Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"2/3",           note:"Platform and strategy confirmed; mandate scope limited — UNDRR Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. ~28% GDP", note:"IMF WEO 2024 — moderate; EU accession driving investment", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Moderate",      note:"Legacy infrastructure; EU-funded flood protection improving — World Bank WDI", conf:"medium" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+2.3°C by 2050", note:"IPCC AR6 Western Balkans regional downscale", conf:"medium" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"N/A",           note:"No glaciated terrain — excluded from composite", conf:"high" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.4%/yr",      note:"Forest + riparian degradation — Hansen GFC 2023 / ESA CCI est.", conf:"low" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"Moderate",      note:"Crop yield –12% and hydropower stress by 2050 — FAO/IPCC/IEA est.", conf:"low" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"Moderate",      note:"Economic + climate out-migration overlapping — IDMC est.", conf:"low" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"NDC in development", note:"EU alignment target; low absolute emitter — OWID / Albania NDC 2022", conf:"medium" },
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
    hp:0.5, ex:0.48, fr:0.55, ac:0.5, fs:0.57, crisp:44, crispClass:"Medium",
    dominantHazards:["River Floods","Heatwaves","Storms"],
    knownDeaths:310, knownAffected:760000, knownLoss:1800000000,
    deathCov:10, affCov:16, lossCov:6,
    hazardBreakdown:{ Hydrological:17, Meteorological:7, Geophysical:2, Biological:2 },

    narrative: "Serbia’s risk profile is dominated by the Sava–Danube river system, where large‑scale floods periodically affect Belgrade and northern municipalities. The 2014 floods remain the benchmark loss event, but smaller annual floods, heatwaves and winter storms steadily erode infrastructure and household resilience. Climate projections suggest more intense rainfall events and hotter, drier summers, increasing both flood and heat‑related health risks.",

    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"1.3 /yr/1M",    note:"Floods + heat dominant — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"High",          note:"2014 Sava–Danube floods ($1.4B, 57 dead) benchmark — Event Database", conf:"high" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"Moderate",      note:"Flood–drought co-occurrence emerging in Morava basin — Event Database est.", conf:"low" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.3×",          note:"Heat frequency rising; flood events concentrated — Event Database / Copernicus", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.5°C anomaly",note:"1961–2020 — Serbia Hydromet Service; precipitation increasingly variable", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"Moderate",      note:"Sava/Danube flow adequate; Morava basin seasonally stressed — FAO AQUASTAT", conf:"medium" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~28%",          note:"Sava–Danube floodplain + Morava basin — Global Flood Database", conf:"medium" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~25%",          note:"Industry in river corridors; agriculture in floodplains — World Bank est.", conf:"low" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~30%",          note:"River corridor road network flood exposure — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"Moderate-High", note:"Belgrade energy and water infrastructure in flood zone — GFDRR est.", conf:"low" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"~7% est.",      note:"World Bank 2022 est. — moderate", conf:"medium" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"Low-Moderate",  note:"Domestic production adequate; drought stress increasing — FAO FAOSTAT 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"3.2 per 1,000", note:"Physicians + nurses — WHO GHO 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.217",         note:"UNDP HDR 2023", conf:"high" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"50th pct",      note:"World Bank WGI 2023 — EU candidate; moderate institutional capacity", conf:"medium" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"36/100",        note:"Transparency International 2023 — significant risk", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"~55%",          note:"Coal + gas imports; transition in progress — IEA 2023", conf:"medium" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Moderate",      note:"Grain exporter; domestic supply robust; drought risk increasing — World Bank WDI", conf:"medium" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"Active (floods)", note:"Flood risk management plan post-2014; EWS operational — Serbia MES / Sendai Monitor", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"3/3",           note:"Platform, budget and mandate confirmed — UNDRR Sendai Monitor 2023", conf:"high" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. ~40% GDP", note:"IMF WEO 2024 — moderate recovery capacity", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Moderate",      note:"Post-2014 flood protection investment; urban heat plans piloting — UNDP SRB", conf:"medium" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+2.2°C by 2050", note:"IPCC AR6 Western Balkans regional downscale", conf:"medium" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"N/A",           note:"No glaciated terrain — excluded from composite", conf:"high" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.3%/yr",      note:"Forest cover stable; riparian zone degradation — Hansen GFC 2023 est.", conf:"low" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"Moderate",      note:"Crop yield –10% and hydropower stress projected by 2050 — FAO/IPCC/IEA", conf:"low" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"Moderate",      note:"Economic + climate out-migration overlapping — IDMC est.", conf:"low" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"~33% below 1990 target", note:"NDC adopted; coal-dependent — OWID / Serbia NDC 2021", conf:"medium" },
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
    hp:0.82, ex:0.72, fr:0.65, ac:0.55, fs:0.78, crisp:66, crispClass:"High",
    dominantHazards:["Earthquakes","Floods","Wildfires","Heatwaves"],
    knownDeaths:32000, knownAffected:5200000, knownLoss:48000000000,
    deathCov:24, affCov:30, lossCov:15,
    hazardBreakdown:{ Geophysical:28, Hydrological:16, Meteorological:10, Biological:6 },

    narrative: "Türkiye combines one of the world’s highest seismic risk corridors with rapidly growing coastal and metropolitan exposure along the Marmara, Aegean and Mediterranean. Catastrophic earthquakes set the upper bound of recorded losses, while recurrent river and flash floods, wildfires and heatwaves place chronic pressure on local systems. Future climate signals point to hotter summers, higher fire weather risk and more intense rainfall events, particularly in urban areas with limited drainage capacity.",

    indicators: [
      // HP · Hazard Pressure
      { group:"HP · Hazard Pressure",   label:"Disaster frequency",              val:"3.5 /yr/1M",    note:"High event rate; earthquakes + floods + wildfires — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Severity index",                  val:"Very High",     note:"2023 Kahramanmaraş EQ (24K dead, $35B); compound multi-hazard — Event Database", conf:"high" },
      { group:"HP · Hazard Pressure",   label:"Compound hazard score",           val:"High",          note:"Earthquake–flood and drought–wildfire co-occurrence elevated — Event Database", conf:"medium" },
      { group:"HP · Hazard Pressure",   label:"Trend acceleration",              val:"1.6× fire",     note:"Wildfire frequency and intensity rising steeply — Copernicus EFFIS", conf:"high" },
      { group:"HP · Hazard Pressure",   label:"Observed climate exposure",       val:"+1.4°C anomaly; –8% precip", note:"1961–2020 — Turkish Met Service; Mediterranean drying", conf:"high" },
      { group:"HP · Hazard Pressure",   label:"Water stress",                    val:"High (south)",  note:"Tigris/Euphrates headwater stress; southeastern Turkey severe — FAO AQUASTAT", conf:"high" },
      // EX · Exposure
      { group:"EX · Exposure",          label:"Population in hazard zones",      val:"~45%",          note:"Marmara/Aegean seismic + coastal flood zones; 85M population — GFDRR", conf:"medium" },
      { group:"EX · Exposure",          label:"GDP exposed",                     val:"~35%",          note:"Istanbul metro GDP in seismic zone; coastal tourism exposed — World Bank est.", conf:"medium" },
      { group:"EX · Exposure",          label:"Roads in risk corridors",         val:"~40%",          note:"Seismic + flood corridor road network — UNDRR/ADB est.", conf:"low" },
      { group:"EX · Exposure",          label:"Critical infrastructure in hazard zones", val:"Very High", note:"Istanbul critical infrastructure in highest seismic hazard zone — GFDRR", conf:"medium" },
      // FR · Fragility
      { group:"FR · Fragility",         label:"Poverty rate ($3.65/day)",        val:"~12% est.",     note:"World Bank 2022 est. — mixed economy; inequality high", conf:"medium" },
      { group:"FR · Fragility",         label:"Food insecurity",                 val:"Moderate",      note:"Domestic production adequate; drought risk to southeastern agriculture — FAO", conf:"medium" },
      { group:"FR · Fragility",         label:"Health system capacity",          val:"2.3 per 1,000", note:"Physicians + nurses — WHO GHO 2023; post-earthquake system strained", conf:"medium" },
      { group:"FR · Fragility",         label:"Gender inequality index (GII)",   val:"0.301",         note:"UNDP HDR 2023 — moderately high", conf:"high" },
      { group:"FR · Fragility",         label:"Governance effectiveness",        val:"55th pct",      note:"World Bank WGI 2023 — centralised coordination; seismic code enforcement improving", conf:"medium" },
      { group:"FR · Fragility",         label:"Corruption perception (CPI)",     val:"34/100",        note:"Transparency International 2023 — significant risk", conf:"high" },
      { group:"FR · Fragility",         label:"Energy import dependence",        val:"~75%",          note:"High fossil fuel import dependency — IEA 2023; systemic fragility", conf:"high" },
      { group:"FR · Fragility",         label:"Food system resilience",          val:"Moderate",      note:"Significant agricultural sector; drought and heat stress increasing — World Bank WDI", conf:"medium" },
      // AC · Adaptive Capacity
      { group:"AC · Adaptive Capacity", label:"Early warning coverage",          val:"Operational",   note:"Multi-hazard EWS — AFAD; seismic + weather monitoring — Sendai Monitor", conf:"high" },
      { group:"AC · Adaptive Capacity", label:"DRR institutional score",         val:"3/3",           note:"AFAD platform, dedicated budget and mandate confirmed — UNDRR Sendai Monitor", conf:"high" },
      { group:"AC · Adaptive Capacity", label:"Fiscal space",                    val:"Rev. ~32% GDP", note:"IMF WEO 2024 — moderate; earthquake reconstruction spending constrained by inflation", conf:"medium" },
      { group:"AC · Adaptive Capacity", label:"Infrastructure resilience",       val:"Mixed",         note:"Modern assets co-exist with vulnerable stock; post-2023 seismic retrofit scaling up", conf:"medium" },
      // FS · Future Stress
      { group:"FS · Future Stress",     label:"Climate warming trajectory (SSP4.5)", val:"+2.5°C by 2050", note:"IPCC AR6 Mediterranean/Eastern Europe — Turkish Met Service 2023", conf:"high" },
      { group:"FS · Future Stress",     label:"Glacier & water system retreat",  val:"Moderate",      note:"Small Turkish glaciers retreating; Euphrates headwater flow reduction — WGMS est.", conf:"low" },
      { group:"FS · Future Stress",     label:"Land degradation rate",           val:"~0.5%/yr",      note:"Forest + scrub degradation under fire pressure — Hansen GFC 2023 / ESA CCI", conf:"medium" },
      { group:"FS · Future Stress",     label:"Food–water–energy nexus stress",  val:"High",          note:"Crop yield –15%, water stress, wildfire risk all worsening by 2050 — FAO/IPCC/IEA", conf:"medium" },
      { group:"FS · Future Stress",     label:"Migration pressure potential",    val:"High",          note:"Transit and destination country for climate-displaced populations — IDMC 2030", conf:"medium" },
      { group:"FS · Future Stress",     label:"GHG emissions trajectory",        val:"21% below 1990; trajectory ↑", note:"High absolute emitter; NDC below ambition — OWID / Türkiye NDC 2021", conf:"high" },
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
const IND_GROUPS = ["HP · Hazard Pressure","EX · Exposure","FR · Fragility","AC · Adaptive Capacity","FS · Future Stress"];
const POL_AREAS  = ["Disaster Risk","Climate","Adaptation"];

// ─── SMALL ATOMS ─────────────────────────────────────────────────────────────
const SL = { fontSize:11, color:C.muted, fontFamily:"'DM Mono',monospace", letterSpacing:"2px", marginBottom:10 };

function ConfPill({level}){
  const c=CONF_COLOR[level]||C.nodata;
  return <span style={{fontSize:10,color:c,border:`1px solid ${c}40`,borderRadius:3,padding:"1px 5px",marginLeft:6,fontFamily:"'DM Mono',monospace",textTransform:"uppercase"}}>{level}</span>;
}

function TrendBadge({trend}){
  const t=TREND[trend]||TREND.NODATA;
  return(
    <div style={{display:"flex",alignItems:"center",gap:5}}>
      <span style={{fontSize:11,color:t.color}}>{t.icon}</span>
      <span style={{fontSize:12,color:t.color,fontFamily:"'DM Mono',monospace"}}>{t.label}</span>
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

// ─── COUNTRY PINWHEEL (5-pillar spider for selected country) ─────────────────
function CountryPinwheel({country, activePillar, onPillarClick}){
  const cx=200, cy=200, maxR=150;
  const n=CRISP_PILLARS.length; // 5
  const segAngle=360/n;
  const GAP_DEG=4;
  const BAND_PAD=2;
  // Single ring per pillar (each pillar fills its own radial band)
  // Use a single ring: each pillar segment fills from 0 → its score
  const [hov,setHov]=useState(null);

  const arc=(iR,oR,sa,ea)=>{
    const laf=ea-sa>180?1:0;
    const p1=polar(cx,cy,iR,sa), p2=polar(cx,cy,oR,sa);
    const p3=polar(cx,cy,oR,ea), p4=polar(cx,cy,iR,ea);
    return `M${p1.x},${p1.y} L${p2.x},${p2.y} A${oR},${oR} 0 ${laf} 1 ${p3.x},${p3.y} L${p4.x},${p4.y} A${iR},${iR} 0 ${laf} 0 ${p1.x},${p1.y}Z`;
  };

  const crispScore=country.crisp||0;
  const crispClass=country.crispClass||"—";
  const crispColor=crispScore>=65?C.bad:crispScore>=45?C.warn:C.good;

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0,width:"100%"}}>

      <svg width={400} height={400} viewBox="0 0 400 400" style={{overflow:"visible"}}>
        <defs>
          <filter id="pwGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id="pwAtmos" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a3a5c" stopOpacity="0.8"/>
            <stop offset="100%" stopColor={C.bg} stopOpacity="0"/>
          </radialGradient>
          {CRISP_PILLARS.map((p,pi)=>(
            <radialGradient key={`pwg${pi}`} id={`pwg${pi}`} cx={cx} cy={cy} r={maxR} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.color} stopOpacity="0.02"/>
              <stop offset="70%" stopColor={p.color} stopOpacity="0.45"/>
              <stop offset="100%" stopColor={p.color} stopOpacity="0.9"/>
            </radialGradient>
          ))}
        </defs>

        {/* Atmosphere */}
        <circle cx={cx} cy={cy} r={maxR+25} fill="url(#pwAtmos)"/>

        {/* Guide rings at 25%, 50%, 75%, 100% */}
        {[0.25,0.5,0.75,1.0].map((t,i)=>(
          <circle key={`gr${i}`} cx={cx} cy={cy} r={maxR*t}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={i===3?1:0.5}
            strokeDasharray={i===3?"none":"3 8"}/>
        ))}

        {/* Ring labels */}
        {[25,50,75].map(v=>(
          <text key={v} x={cx+3} y={cy-(maxR*v/100)+3} fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="'DM Mono',monospace">{v}</text>
        ))}

        {/* Spoke dividers */}
        {CRISP_PILLARS.map((_,pi)=>{
          const deg=pi*segAngle;
          const inner=polar(cx,cy,8,deg);
          const outer=polar(cx,cy,maxR+4,deg);
          return <line key={`spk${pi}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="rgba(255,255,255,0.07)" strokeWidth={1}/>;
        })}

        {/* Ghost arcs (full extent) */}
        {CRISP_PILLARS.map((_,pi)=>{
          const mid=pi*segAngle, sa=mid-segAngle/2+GAP_DEG/2, ea=mid+segAngle/2-GAP_DEG/2;
          return <path key={`gh${pi}`} d={arc(BAND_PAD,maxR-BAND_PAD,sa,ea)} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} style={{pointerEvents:"none"}}/>;
        })}

        {/* Data segments — each pillar fills from center to its score */}
        {CRISP_PILLARS.map((p,pi)=>{
          const val=country[p.key]||0;
          const mid=pi*segAngle, sa=mid-segAngle/2+GAP_DEG/2, ea=mid+segAngle/2-GAP_DEG/2;
          const oR=BAND_PAD+((maxR-BAND_PAD*2)*val);
          if(oR<=BAND_PAD+2) return null;
          const isActive=activePillar===p.key, isHov=hov===p.key;
          const edgeD=arc(oR-2,oR+1.5,sa+1,ea-1);
          return(
            <g key={`pw${pi}`} style={{cursor:"pointer"}}
              onClick={()=>onPillarClick(isActive?null:p.key)}
              onMouseEnter={()=>setHov(p.key)}
              onMouseLeave={()=>setHov(null)}>
              {(isActive||isHov)&&(
                <path d={arc(BAND_PAD,oR,sa,ea)} fill={p.color} fillOpacity={0.14} filter="url(#pwGlow)" style={{pointerEvents:"none"}}/>
              )}
              <path d={arc(BAND_PAD,oR,sa,ea)} fill={`url(#pwg${pi})`}
                fillOpacity={isActive?1.0:isHov?0.8:0.55}
                stroke={isActive?p.color:"none"} strokeWidth={isActive?1:0}
                style={{transition:"fill-opacity 0.2s,stroke 0.2s"}}/>
              <path d={edgeD} fill={p.color}
                fillOpacity={isActive?1:isHov?0.7:0.3}
                style={{pointerEvents:"none",transition:"fill-opacity 0.2s"}}/>
            </g>
          );
        })}

        {/* Pillar labels */}
        {CRISP_PILLARS.map((p,pi)=>{
          const mid=pi*segAngle;
          const labelR=maxR+22;
          const lpos=polar(cx,cy,labelR,mid);
          const isActive=activePillar===p.key, isHov=hov===p.key;
          const val=country[p.key]||0;
          return(
            <g key={`pl${pi}`} style={{cursor:"pointer"}}
              onClick={()=>onPillarClick(isActive?null:p.key)}
              onMouseEnter={()=>setHov(p.key)}
              onMouseLeave={()=>setHov(null)}>
              {/* Score arc track */}
              <path d={arc(maxR+8,maxR+11,mid-segAngle/2+GAP_DEG,mid+segAngle/2-GAP_DEG)} fill="rgba(255,255,255,0.06)" style={{pointerEvents:"none"}}/>
              {/* Score arc fill */}
              {val>0&&<path d={arc(maxR+8,maxR+11,mid-((segAngle/2-GAP_DEG)*val),mid+((segAngle/2-GAP_DEG)*val))} fill={p.color} fillOpacity={isActive?0.9:0.45} style={{pointerEvents:"none"}}/>}
              {/* Label text */}
              <text x={lpos.x} y={lpos.y-5} textAnchor="middle"
                fill={isActive?p.color:isHov?"rgba(255,255,255,0.75)":"rgba(255,255,255,0.35)"}
                fontSize={isActive?9.5:8.5} fontWeight={isActive?700:500}
                fontFamily="'DM Mono',monospace" letterSpacing="0.5"
                style={{transition:"all 0.2s",userSelect:"none"}}>
                {p.short}
              </text>
              <text x={lpos.x} y={lpos.y+6} textAnchor="middle"
                fill={isActive?p.color:"rgba(255,255,255,0.25)"}
                fontSize={7} fontFamily="'DM Mono',monospace"
                style={{transition:"all 0.2s",userSelect:"none"}}>
                {Math.round(val*100)}
              </text>
            </g>
          );
        })}

        {/* Centre hub — CRISP score */}
        <circle cx={cx} cy={cy} r={32} fill={C.bg} stroke={`${crispColor}40`} strokeWidth={1.5}/>
        <circle cx={cx} cy={cy} r={26} fill="none" stroke={`${crispColor}20`} strokeWidth={0.75}/>
        <text x={cx} y={cy-8} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={6.5}
          fontFamily="'DM Mono',monospace" letterSpacing="1.5">CRISP</text>
        <text x={cx} y={cy+5} textAnchor="middle" fill={crispColor} fontSize={16} fontWeight={700}
          fontFamily="'DM Mono',monospace">{crispScore}</text>
        <text x={cx} y={cy+15} textAnchor="middle" fill={`${crispColor}99`} fontSize={6}
          fontFamily="'DM Mono',monospace" letterSpacing="0.5">{crispClass.toUpperCase()}</text>
      </svg>

      {/* Active pillar description tooltip */}
      {activePillar&&(()=>{
        const p=CRISP_PILLARS.find(x=>x.key===activePillar);
        return(
          <div style={{
            margin:"-10px 12px 0",padding:"9px 13px",borderRadius:8,
            background:`${p.color}12`,border:`1px solid ${p.color}30`,
            maxWidth:376
          }}>
            <div style={{fontSize:11,color:p.color,fontFamily:"'DM Mono',monospace",letterSpacing:"1px",marginBottom:4}}>
              {p.short} · {p.label.toUpperCase()}
            </div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",lineHeight:1.6}}>{p.desc}</div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── RADAR (regional overview — all countries, 5 bands) ───────────────────────
function Radar({countries, selected, onSelect}){
  const cx=250, cy=250, maxR=190;
  const ids=Object.keys(countries);
  const n=ids.length;
  const segAngle=360/n;
  const GAP_DEG=3; // gap between segments in degrees
  const BAND_PAD=3; // px padding between bands
  // 5 equal bands for 5 CRISP pillars
  const bands=[0, maxR*0.20, maxR*0.40, maxR*0.60, maxR*0.80, maxR];
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
    <svg width={680} height={680} viewBox="-10,-10,520,520" style={{overflow:"visible"}}>
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
          CRISP_PILLARS.map((layer,li)=>(
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
        {CRISP_PILLARS.map((layer,li)=>(
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
      {CRISP_PILLARS.map((layer,li)=>(
        <circle key={`zone${li}`} cx={cx} cy={cy} r={bands[li+1]}
          fill={`${layer.color}07`}/>
      ))}
      {/* Punch out inner bands so they don't stack */}
      {CRISP_PILLARS.map((layer,li)=> li>0 &&(
        <circle key={`punch${li}`} cx={cx} cy={cy} r={bands[li]-1}
          fill={C.bg}/>
      ))}

      {/* ── GUIDE RING LINES ────────────────────────────────────── */}
      {CRISP_PILLARS.map((layer,li)=>(
        <circle key={`ring${li}`} cx={cx} cy={cy} r={bands[li+1]}
          fill="none"
          stroke={`url(#rg${li})`}
          strokeWidth={li===4?1.5:0.8}
          strokeDasharray={li===4?"none":"3 8"}/>
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
        return CRISP_PILLARS.map((_,li)=>{
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

            {CRISP_PILLARS.map((layer,li)=>{
              const val=c[layer.key]||0;
              const bandStart=bands[li]+BAND_PAD;
              const bandTotal=bands[li+1]-bands[li]-BAND_PAD*2;
              const oR=bandStart+bandTotal*val;
              if(oR<=bandStart+1) return null;

              const d=arc(bandStart, oR, sa, ea);
              const edgeD=arc(oR-1.5, oR+1, sa+0.8, ea-0.8);

              return(
                <g key={`seg${li}`}>
                  {isSel&&(
                    <path d={d}
                      fill={layer.color}
                      fillOpacity={0.18}
                      filter="url(#segGlow)"
                      style={{pointerEvents:"none"}}/>
                  )}
                  <path d={d}
                    fill={`url(#${gid(ci,li)})`}
                    fillOpacity={isSel?1.0:isHov?0.75:0.5}
                    style={{transition:"fill-opacity 0.22s ease"}}/>
                  <path d={edgeD}
                    fill={layer.color}
                    fillOpacity={isSel?0.95:isHov?0.6:0.22}
                    style={{transition:"fill-opacity 0.22s ease",pointerEvents:"none"}}/>
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

        const labelR=maxR+22;
        const lpos=polar(cx,cy,labelR,mid);

        return(
          <g key={`lbl${id}`}
            style={{cursor:"pointer"}}
            onClick={()=>onSelect(isSel?null:c)}
            onMouseEnter={()=>setHov(id)}
            onMouseLeave={()=>setHov(null)}>
            <text
              x={lpos.x} y={lpos.y+4}
              textAnchor="middle"
              fill={isSel?"#ffffff":isHov?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.4)"}
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

const ghostBtn={padding:"5px 11px",borderRadius:6,cursor:"pointer",fontSize:12,background:"transparent",
  border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.4)",
  fontFamily:"'DM Mono',monospace",letterSpacing:"0.5px"};

// ─── INDICATORS ACCORDION ─────────────────────────────────────────────────────
// Pillar → indicator group mapping
const PILLAR_TO_GROUPS = {
  hp: ["HP · Hazard Pressure"],
  ex: ["EX · Exposure"],
  fr: ["FR · Fragility"],
  ac: ["AC · Adaptive Capacity"],
  fs: ["FS · Future Stress"],
};

function IndicatorsPanel({country, activePillar}){
  const defaultGroup = activePillar
    ? (PILLAR_TO_GROUPS[activePillar]?.[0] || "Disaster Record")
    : "Disaster Record";
  const [open,setOpen]=useState(defaultGroup);

  // Sync to pillar changes
  useEffect(()=>{
    if(activePillar && PILLAR_TO_GROUPS[activePillar]) {
      setOpen(PILLAR_TO_GROUPS[activePillar][0]);
    }
  },[activePillar]);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {/* Active pillar banner */}
      {activePillar&&(()=>{
        const p=CRISP_PILLARS.find(x=>x.key===activePillar);
        const groups=PILLAR_TO_GROUPS[activePillar]||[];
        return(
          <div style={{padding:"8px 12px",borderRadius:7,background:`${p.color}10`,
            border:`1px solid ${p.color}30`,display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:p.color,flexShrink:0}}/>
            <div>
              <span style={{fontSize:12,color:p.color,fontFamily:"'DM Mono',monospace",letterSpacing:"1px",fontWeight:700}}>
                {p.short} · {p.label.toUpperCase()}
              </span>
              <span style={{fontSize:12,color:"rgba(255,255,255,0.35)",fontFamily:"'DM Mono',monospace",marginLeft:8}}>
                → {groups.join(", ")}
              </span>
            </div>
          </div>
        );
      })()}
      {IND_GROUPS.map(group=>{
        const items=country.indicators.filter(i=>i.group===group);
        if(!items.length) return null;
        const isOpen=open===group;
        const isPillarGroup=activePillar&&(PILLAR_TO_GROUPS[activePillar]||[]).includes(group);
        const pillar=isPillarGroup?CRISP_PILLARS.find(x=>x.key===activePillar):null;
        return(
          <div key={group} style={{borderRadius:8,overflow:"hidden",
            border:isPillarGroup?`1px solid ${pillar.color}40`:`1px solid ${C.border}`,
            transition:"border 0.2s"}}>
            {(()=>{const GT={"HP · Hazard Pressure":"Frequency, intensity, compound likelihood and trend acceleration of hazard events. Observed climate exposure and water stress.","EX · Exposure":"Population and GDP in hazard-prone zones. Roads and critical infrastructure intersecting flood, seismic and landslide corridors.","FR · Fragility":"Failure probability across socioeconomic (poverty, food, health, gender), institutional (governance, corruption) and system (energy, food) dimensions.","AC · Adaptive Capacity":"Early warning coverage (CO-verified), DRR institutional score, fiscal space and infrastructure resilience.","FS · Future Stress":"Forward-looking indicators only: climate warming trajectory (IPCC AR6), glacier retreat, land degradation, food–water–energy nexus stress, migration pressure and GHG emissions trajectory."};return(
            <button onClick={()=>setOpen(isOpen?null:group)} title={GT[group]||""} style={{
              width:"100%",padding:"10px 14px",
              background:isOpen?(isPillarGroup?`${pillar?.color}12`:"rgba(255,255,255,0.055)"):(isPillarGroup?`${pillar?.color}06`:C.surface),
              border:"none",color:isOpen?"white":"rgba(255,255,255,0.55)",cursor:"pointer",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              fontSize:10,fontFamily:"'DM Mono',monospace",letterSpacing:"0.5px"}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                {isPillarGroup&&<div style={{width:5,height:5,borderRadius:"50%",background:pillar.color,flexShrink:0}}/>}
                <span style={{color:isPillarGroup?(isOpen?pillar.color:`${pillar.color}cc`):undefined}}>{group.toUpperCase()}</span>
              </div>
              <span style={{opacity:0.4,fontSize:12}}>{isOpen?"▲":"▼"} {items.length}</span>
            </button>);})()}
            {isOpen&&items.map((ind,i)=>(
              <div key={i} style={{
                padding:"9px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",
                borderTop:`1px solid rgba(255,255,255,0.04)`,
                background:i%2===0?"transparent":"rgba(255,255,255,0.01)"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.65)"}}>{ind.label}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.42)",marginTop:2,fontFamily:"'DM Mono',monospace"}}>
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
              <span style={{opacity:0.4,fontSize:12}}>{isOpen?"▲":"▼"} {items.length}</span>
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
                      {pol.val!=="—"&&<span style={{fontSize:12,color:C.muted,fontFamily:"'DM Mono',monospace"}}>Current: <strong style={{color:"white"}}>{pol.val}</strong></span>}
                      {pol.target&&<span style={{fontSize:12,color:C.muted,fontFamily:"'DM Mono',monospace"}}>Target: {pol.target}</span>}
                    </div>
                  </div>
                </div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",fontFamily:"'DM Mono',monospace",marginTop:5}}>
                  {pol.source}{pol.year?` · ${pol.year}`:""}
                </div>
              </div>
            ))}
          </div>
        );
      })}
      <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",fontFamily:"'DM Mono',monospace",lineHeight:1.7}}>
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
            padding:"3px 9px",borderRadius:20,cursor:"pointer",fontSize:11,
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
                <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"'DM Mono',monospace",marginBottom:2}}>{l}</div>
                <div style={{fontSize:11,fontWeight:600,color:v!=null?c:"rgba(255,255,255,0.18)",fontStyle:v==null?"italic":"normal"}}>{v!=null?String(v):"—"}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",fontFamily:"'DM Mono',monospace",marginTop:6}}>{sel.source} · {sel.sl===1.0?"Primary verified":"Secondary 0.6"}</div>
        </div>
      )}
      {evs.sort((a,b)=>b.year-a.year).map((ev,i)=>{
        const c=GROUP_COLOR[ev.group],hasData=ev.deaths!=null||ev.affected!=null||ev.econLoss!=null,isSel=sel===ev;
        return(
          <div key={i} onClick={()=>setSel(isSel?null:ev)} style={{
            display:"flex",alignItems:"center",gap:8,padding:"6px 9px",borderRadius:6,cursor:"pointer",
            background:isSel?`${c}14`:C.surface,border:isSel?`1px solid ${c}30`:"1px solid transparent",transition:"all 0.15s"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:c,flexShrink:0,opacity:hasData?1:0.3}}/>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontFamily:"'DM Mono',monospace",width:30,flexShrink:0}}>{ev.year}</div>
            <div style={{flex:1,fontSize:10,color:hasData?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.3)",fontWeight:hasData?500:400}}>{ev.type}</div>
            <div style={{display:"flex",gap:7,flexShrink:0}}>
              {ev.deaths!=null&&<span style={{fontSize:12,color:C.future,fontFamily:"'DM Mono',monospace"}}>{ev.deaths}✝</span>}
              {ev.affected!=null&&<span style={{fontSize:12,color:C.hazard,fontFamily:"'DM Mono',monospace"}}>{fmtN(ev.affected)}</span>}
              {ev.econLoss!=null&&<span style={{fontSize:12,color:C.vuln,fontFamily:"'DM Mono',monospace"}}>{fmtM(ev.econLoss)}</span>}
              {!hasData&&<span style={{fontSize:11,color:"rgba(255,255,255,0.14)",fontFamily:"'DM Mono',monospace"}}>no data</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CRISP PINWHEEL (canvas) ────────────────────────────────────────────────
function CRISPWheel({country, activePillar, onPillarChange}){
  const canvasRef = useRef(null);
  const [hov, setHov] = useState(null);
  const CX=115, CY=115;

  // Pillar ring definitions — outermost to innermost, radii chosen to fit 190px canvas
  const RINGS = [
    {key:"hp", r:102, w:15},
    {key:"ex", r:82, w:15},
    {key:"fr", r:62, w:15},
    {key:"ac", r:42, w:15},
    {key:"fs", r:22, w:15},
  ];

  const dimCol = (hex) => {
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return `rgba(${Math.round(r*0.16)},${Math.round(g*0.16)},${Math.round(b*0.16)},1)`;
  };

  useEffect(()=>{
    const cvs = canvasRef.current; if(!cvs) return;
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0,0,230,230);

    RINGS.forEach(ring => {
      const pillar = CRISP_PILLARS.find(p=>p.key===ring.key);
      const score = (country[ring.key]||0.5);
      const isActive = activePillar===ring.key;
      const isHov = hov===ring.key;
      const isDim = activePillar && !isActive;
      const sw = isActive ? ring.w+5 : isHov ? ring.w+2 : ring.w;

      // Track (background arc)
      ctx.beginPath(); ctx.arc(CX,CY,ring.r,-Math.PI/2,1.5*Math.PI);
      ctx.strokeStyle=dimCol(pillar.color); ctx.lineWidth=sw; ctx.globalAlpha=isDim?0.07:1; ctx.stroke(); ctx.globalAlpha=1;

      // Fill arc (score)
      if(!isDim){
        ctx.beginPath(); ctx.arc(CX,CY,ring.r,-Math.PI/2,(Math.PI*2*score)-Math.PI/2);
        ctx.strokeStyle=pillar.color; ctx.lineWidth=sw; ctx.globalAlpha=isActive?1:0.55; ctx.stroke(); ctx.globalAlpha=1;
      }
    });

    // Centre hub
    ctx.fillStyle='#06101f'; ctx.beginPath(); ctx.arc(CX,CY,8,0,Math.PI*2); ctx.fill();
    if(activePillar){
      const p = CRISP_PILLARS.find(x=>x.key===activePillar);
      const score = Math.round((country[activePillar]||0)*100);
      ctx.fillStyle=p.color; ctx.font='700 10px DM Mono,monospace';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(score,CX,CY);
    } else {
      const score = country.crisp||country.crispScore||'—';
      const scoreColor = (country.crisp||50)>=65?'#ef4444':(country.crisp||50)>=45?'#f59e0b':'#34d399';
      ctx.fillStyle=scoreColor; ctx.font='700 9px DM Mono,monospace';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(score,CX,CY);
    }
  }, [country, activePillar, hov]);

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(230/rect.width), my=(e.clientY-rect.top)*(230/rect.height);
    const dist=Math.sqrt((mx-CX)**2+(my-CY)**2);
    let hit=null; RINGS.forEach(r=>{ if(dist>=r.r-r.w/2-4&&dist<=r.r+r.w/2+4) hit=r.key; });
    setHov(hit); canvasRef.current.style.cursor=hit?'pointer':'default';
  };
  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(230/rect.width), my=(e.clientY-rect.top)*(230/rect.height);
    const dist=Math.sqrt((mx-CX)**2+(my-CY)**2);
    RINGS.forEach(r=>{ if(dist>=r.r-r.w/2-3&&dist<=r.r+r.w/2+3) onPillarChange(activePillar===r.key?null:r.key); });
  };

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
      <canvas ref={canvasRef} width={230} height={230}
        onMouseMove={handleMouseMove} onMouseLeave={()=>setHov(null)} onClick={handleClick}
        style={{cursor:"default"}}/>
      <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:4,fontFamily:"'DM Mono',monospace", textTransform:"uppercase"}}>
        {activePillar?"Click ring to deselect":"Click ring to explore"}
      </div>
    </div>
  );
}

// ─── DOWNLOAD BUTTON ──────────────────────────────────────────────────────────
function downloadReport(){ const a=document.createElement("a"); a.href="/country_profile.pdf"; a.download="country_profile.pdf"; a.click(); }

function DownloadButton({country}){
  const [status,setStatus]=useState("idle");
  const handle=async()=>{
    if(status==="loading") return; setStatus("loading");
    try{ await downloadReport(); setStatus("done"); } catch(e){ console.error(e); setStatus("idle"); }
    setTimeout(()=>setStatus("idle"),2000);
  };
  const s=status==="loading"?{label:"Generating…",color:"rgba(56,189,248,0.5)",border:"rgba(56,189,248,0.2)"}
    :status==="done"?{label:"✓ Downloaded",color:"#22c55e",border:"rgba(34,197,94,0.35)"}
    :{label:"↓ Export",color:"#38bdf8",border:"rgba(56,189,248,0.3)"};
  return(
    <button onClick={handle} style={{padding:"5px 11px",borderRadius:6,cursor:status==="loading"?"wait":"pointer",
      fontSize:12,fontFamily:"'DM Mono',monospace",letterSpacing:"1px",background:"transparent",
      border:`1px solid ${s.border}`,color:s.color,transition:"all 0.2s",outline:"none"}}>
      {s.label}
    </button>
  );
}

// ─── COUNTRY DETAIL — PINWHEEL LAYOUT ────────────────────────────────────────
// ─── COUNTRY SIDEBAR (left panel when country is selected) ───────────────────
function CountrySidebar({country, activePillar, onPillarChange}){
  const [wbData, setWbData] = useState(null);

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
    ALB:{pop:"2.79M",gdp:"$17,500",poverty:"23.0%",water:"96.0%",urban:"63.0%"},
    SRB:{pop:"6.80M",gdp:"$19,800",poverty:"21.0%",water:"97.0%",urban:"56.0%"},
    TUR:{pop:"85.0M",gdp:"$32,000",poverty:"13.5%",water:"99.0%",urban:"76.0%"},
  };
  const fb = WB_FB[country.id]||{};

  useEffect(()=>{
    const inds={pop:"SP.POP.TOTL",gdp:"NY.GDP.PCAP.PP.CD",poverty:"SI.POV.NAHC",water:"SH.H2O.SMDW.ZS",urban:"SP.URB.TOTL.IN.ZS"};
    Promise.all(Object.entries(inds).map(([k,c])=>
      fetch(`https://api.worldbank.org/v2/country/${country.wbISO}/indicator/${c}?format=json&mrv=1`)
        .then(r=>r.json()).then(d=>{const v=d[1]?.[0];return[k,v?{value:v.value,year:v.date}:null];})
        .catch(()=>[k,null])
    )).then(res=>{setWbData(Object.fromEntries(res));});
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

  const crispScore = country.crisp||50;
  const crispColor = crispScore>=65?"#ef4444":crispScore>=45?"#f59e0b":"#34d399";
  const crispClass = crispScore>=80?"Very High":crispScore>=65?"High":crispScore>=45?"Medium":crispScore>=25?"Low":"Very Low";
  const conf = country.confidence||0.5;
  const confCol = conf>0.65?C.good:conf>0.5?C.warn:C.bad;

  return(
    <div style={{width:400,flexShrink:0,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflowY:"auto"}}>

      {/* CRISP score + wheel */}
      <div style={{padding:"24px 20px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
        <div style={{textAlign:"center",marginBottom:2}}>
          <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
            <span style={{fontSize:42,fontWeight:700,color:crispColor,fontFamily:"'DM Mono',monospace",lineHeight:1}}>{crispScore}</span>
            <span style={{fontSize:13,color:crispColor,background:`${crispColor}18`,border:`1px solid ${crispColor}35`,borderRadius:4,padding:"2px 9px",fontWeight:600}}>{crispClass}</span>
          </div>
        </div>
        <CRISPWheel country={country} activePillar={activePillar} onPillarChange={onPillarChange}/>
      </div>

      {/* Pillar nav */}
      <div style={{padding:"4px 16px 10px"}}>
        {CRISP_PILLARS.map(p=>{
          const val=country[p.key]||0;
          const isActive=activePillar===p.key;
          return(
            <div key={p.key} onClick={()=>onPillarChange(isActive?null:p.key)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:7,cursor:"pointer",
                border:`1.5px solid ${isActive?p.color:"transparent"}`,
                background:isActive?`${p.color}10`:"transparent",
                marginBottom:4,transition:"all 0.12s"}}>
              <div style={{fontSize:11,fontWeight:700,color:p.color,width:18,flexShrink:0,fontFamily:"'DM Mono',monospace"}}>{p.short}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.9)",lineHeight:1.2}}>{p.label}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:2}}>{p.desc?.split(".")[0]||""}</div>
                <div style={{width:"100%",height:2,background:"rgba(255,255,255,0.07)",borderRadius:1,marginTop:6}}>
                  <div style={{width:`${val*100}%`,height:"100%",background:p.color,borderRadius:1}}/>
                </div>
              </div>
              <div style={{fontSize:14,fontWeight:700,color:p.color,fontFamily:"'DM Mono',monospace",flexShrink:0}}>{Math.round(val*100)}</div>
            </div>
          );
        })}
      </div>

      {/* Confidence */}
      <div style={{padding:"12px 16px 14px",borderTop:`1px solid ${C.border}`,marginTop:"auto"}}>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontFamily:"'DM Mono',monospace",letterSpacing:"1px",marginBottom:4}}>DATA CONFIDENCE</div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{flex:1,height:3,background:"rgba(255,255,255,0.07)",borderRadius:2}}>
            <div style={{width:`${conf*100}%`,height:"100%",background:confCol,borderRadius:2}}/>
          </div>
          <span style={{fontSize:10,fontWeight:700,color:confCol,fontFamily:"'DM Mono',monospace"}}>{Math.round(conf*100)}%</span>
        </div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.25)",marginTop:3}}>
          {country.lossCov}/{country.totalEvents} events with loss data
        </div>
      </div>
    </div>
  );
}

// ─── SIMULATION MODE (indicator sliders → pillar + composite) ─────────────
function SimulationModePanel({country, onExit}){
  const WHITE_BG = "#ffffff";
  const TEXT_DARK = "#0b1220";
  const MUTED = "#64748b";
  const BORDER = "#e5e7eb";
  const ROW_BORDER = "#eef2f7";
  const CARD_SOFT = "#f8fafc";
  const hexToRgba = (hex, alpha) => {
    const clean = String(hex || "").replace("#", "");
    if (clean.length !== 6) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const PILLAR_GROUP = {
    hp: "HP · Hazard Pressure",
    ex: "EX · Exposure",
    fr: "FR · Fragility",
    ac: "AC · Adaptive Capacity",
    fs: "FS · Future Stress",
  };

  const PILLAR_BY_GROUP = {
    "HP · Hazard Pressure": "hp",
    "EX · Exposure": "ex",
    "FR · Fragility": "fr",
    "AC · Adaptive Capacity": "ac",
    "FS · Future Stress": "fs",
  };

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const signFmt = (n) => `${n > 0 ? "+" : ""}${n}`;

  // Dummy indicator baseline scoring mirrors the existing placeholder logic used in v20.
  const getDummyScore = (ind) => {
    const hash = ind.label.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const groupScores = {
      "Disaster Record": [85, 74, 68, 82, 71],
      "Infrastructure": [79, 65, 58, 72, 61],
      "Climate & Future": [88, 76, 83, 91, 68],
      "Economic Exposure": [73, 69, 77, 64, 70],
      "Governance & Capacity": [55, 62, 48, 59, 51],
    };
    const scores = groupScores[ind.group] || [65, 70, 75, 68, 72];
    return scores[hash % scores.length];
  };

  // MVP mapping: treat indicator `val` as the score=50 equivalent, then scale numeric part linearly.
  const approxRealEquivalent = (ind, score0to100) => {
    const v = String(ind.val || "");
    const m = v.match(/[-+]?\d*\.?\d+/);
    if (!m) return v || "—";

    const base = parseFloat(m[0]);
    if (!Number.isFinite(base)) return v;

    const scaled = base * (score0to100 / 50);
    const unitSuffix = v.slice((m.index || 0) + m[0].length).trim();

    const abs = Math.abs(scaled);
    const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
    const formatted = scaled.toFixed(decimals);

    if (!unitSuffix) return formatted;
    const joiner = unitSuffix.startsWith("%") || unitSuffix.startsWith("°") ? "" : " ";
    return `${formatted}${joiner}${unitSuffix}`;
  };

  const allCountries = useMemo(() => Object.values(COUNTRIES), []);
  const compRiskVals = useMemo(() => {
    const compRiskFromCountry = (c) => {
      const hp = c.hp || 0;
      const ex = c.ex || 0;
      const fr = c.fr || 0;
      const ac = c.ac || 0;
      const fs = c.fs || 0;
      // Higher AC reduces risk (protective capacity).
      return (hp + ex + fr + (1 - ac) + fs) / 5;
    };
    return allCountries.map(compRiskFromCountry).sort((a, b) => a - b);
  }, [allCountries]);

  const compRiskFromPillars = (pillars01) => {
    const {hp, ex, fr, ac, fs} = pillars01;
    return (hp + ex + fr + (1 - ac) + fs) / 5;
  };

  const baselineIndicatorScores = useMemo(() => {
    const keys = {};
    for (const ind of country.indicators) {
      const k = `${ind.group}::${ind.label}`;
      keys[k] = getDummyScore(ind);
    }

    // Calibrate each pillar so the average indicator score equals the displayed pillar score.
    const baselineByPillar = {};
    for (const p of CRISP_PILLARS) {
      const pk = p.key;
      const pillarInds = country.indicators.filter(i => i.group === PILLAR_GROUP[pk]);
      const target = (country[pk] || 0) * 100;
      if (!pillarInds.length) continue;

      const dummyAvg = pillarInds.reduce((s, ind) => s + keys[`${ind.group}::${ind.label}`], 0) / pillarInds.length;
      const shift = target - dummyAvg;
      baselineByPillar[pk] = { pillarInds, target, shift };
    }

    const out = {};
    for (const ind of country.indicators) {
      const pk = PILLAR_BY_GROUP[ind.group];
      const baseDummy = keys[`${ind.group}::${ind.label}`];
      const meta = baselineByPillar[pk];
      const shift = meta?.shift || 0;
      out[`${ind.group}::${ind.label}`] = clamp(baseDummy + shift, 0, 100);
    }
    return out;
  }, [country]);

  const [sliderScores, setSliderScores] = useState(baselineIndicatorScores);
  useEffect(() => setSliderScores(baselineIndicatorScores), [baselineIndicatorScores]);

  const indicatorsByPillar = useMemo(() => {
    const out = {hp: [], ex: [], fr: [], ac: [], fs: []};
    for (const ind of country.indicators) {
      const pk = PILLAR_BY_GROUP[ind.group];
      if (out[pk]) out[pk].push(ind);
    }
    return out;
  }, [country]);

  const pillarSim01 = useMemo(() => {
    const avg01 = (pk) => {
      const inds = indicatorsByPillar[pk] || [];
      if (!inds.length) return 0;
      const sum = inds.reduce((s, ind) => s + ((sliderScores[`${ind.group}::${ind.label}`] ?? 0) / 100), 0);
      return sum / inds.length;
    };
    return {
      hp: avg01("hp"),
      ex: avg01("ex"),
      fr: avg01("fr"),
      ac: avg01("ac"),
      fs: avg01("fs"),
    };
  }, [indicatorsByPillar, sliderScores]);

  const compRiskScenario01 = useMemo(() => compRiskFromPillars(pillarSim01), [pillarSim01]);
  const compRiskBaseline01 = useMemo(() => compRiskFromPillars({
    hp: country.hp || 0,
    ex: country.ex || 0,
    fr: country.fr || 0,
    ac: country.ac || 0,
    fs: country.fs || 0,
  }), [country]);

  const crispFromCompRisk = (compRisk01) => {
    const n = compRiskVals.length || 1;
    let count = 0;
    for (const v of compRiskVals) {
      if (v <= compRisk01) count++;
    }
    return 100 * (count / n);
  };

  const crispScenario = useMemo(() => crispFromCompRisk(compRiskScenario01), [compRiskScenario01, compRiskVals]);
  const crispBaselineFormula = useMemo(() => crispFromCompRisk(compRiskBaseline01), [compRiskBaseline01, compRiskVals]);
  const crispBaseline = country.crisp ?? crispBaselineFormula;

  const crispColorScenario = crispScenario >= 65 ? C.bad : crispScenario >= 45 ? C.warn : C.good;
  const crispClassScenario = crispScenario >= 80 ? "Very High" : crispScenario >= 65 ? "High" : crispScenario >= 45 ? "Medium" : crispScenario >= 25 ? "Low" : "Very Low";
  const crispDelta = Math.round(crispScenario - crispBaseline);

  const deltaColor = (delta, {positiveGood}={positiveGood:false}) => {
    if (delta === 0) return MUTED;
    if (delta > 0) return positiveGood ? C.good : C.bad;
    return positiveGood ? C.bad : C.good;
  };

  const getPillarDeltaColor = (pk, deltaPct) => {
    // AC is inverted: higher AC => lower risk.
    if (pk === "ac") return deltaColor(deltaPct, {positiveGood: true});
    return deltaColor(deltaPct, {positiveGood: false});
  };

  const summaryCard = ({title, valuePct, baselinePct, color, deltaPct, subtitle, positiveGood, isComposite}) => {
    const d = Math.round(deltaPct);
    const dCol = deltaColor(d, {positiveGood: !!positiveGood});
    const valueSize = isComposite ? 34 : 28;
    const badgeColor = color || "#111827";
    return (
      <div
        style={{
          border: isComposite ? `2px solid ${hexToRgba(badgeColor, 0.35)}` : `1px solid ${BORDER}`,
          borderLeft: isComposite ? `6px solid ${hexToRgba(badgeColor, 0.8)}` : undefined,
          borderRadius:12,
          padding:12,
          background: isComposite ? `linear-gradient(180deg, ${hexToRgba(badgeColor, 0.08)}, #ffffff 55%)` : CARD_SOFT,
          boxShadow: isComposite ? `0 12px 35px ${hexToRgba(badgeColor, 0.14)}` : "none",
          // Prevent flex-shrink so cards keep their intended size; container can horizontally scroll instead.
          flex: "0 0 auto",
          minWidth: 160
        }}
      >
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:12}}>
          <div>
            <div style={{fontSize:12, color:MUTED, fontFamily:"'DM Mono',monospace", letterSpacing:"0.5px"}}>{title.toUpperCase()}</div>
            <div style={{fontSize:valueSize, fontWeight:900, color:color, fontFamily:"'DM Mono',monospace", lineHeight:1}}>{Math.round(valuePct)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            {subtitle && (
              <div style={{fontSize:12, fontWeight:800, color:color, background:hexToRgba(badgeColor, 0.10), border:`1px solid ${hexToRgba(badgeColor, 0.25)}`, borderRadius:6, padding:"2px 8px", display:"inline-block"}}>
                {subtitle}
              </div>
            )}
            <div style={{marginTop:6, fontSize:12, fontWeight:800, color:dCol, fontFamily:"'DM Mono',monospace"}}>
              {d === 0 ? "Δ 0" : `Δ ${signFmt(d)}`}
            </div>
          </div>
        </div>
        <div style={{marginTop:10, fontSize:11, color:MUTED, fontFamily:"'DM Mono',monospace"}}>
          Baseline: {Math.round(baselinePct)}
        </div>
      </div>
    );
  };

  // Empirical CDF rank details for the formula panel.
  const cdfCount = useMemo(() => {
    let count = 0;
    for (const v of compRiskVals) if (v <= compRiskScenario01) count++;
    return count;
  }, [compRiskVals, compRiskScenario01]);
  const cdfN = compRiskVals.length || 1;

  return (
    <div style={{background:WHITE_BG, border:`1px solid ${BORDER}`, borderRadius:14, padding:18, color:TEXT_DARK}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:14}}>
        <div>
          <div style={{fontSize:12, fontFamily:"'DM Mono',monospace", letterSpacing:"1.2px", color:MUTED}}>SIMULATION MODE</div>
          <div style={{marginTop:6, fontSize:16, fontWeight:800}}>Scenario</div>
          <div style={{marginTop:3, fontSize:12, color:MUTED, fontFamily:"'DM Mono',monospace"}}>Baseline uses currently displayed pillars; sliders explore “what would it take” impacts.</div>
        </div>
        <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end"}}>
          <button
            onClick={() => setSliderScores(baselineIndicatorScores)}
            style={{
              padding:"8px 12px",
              borderRadius:10,
              cursor:"pointer",
              fontSize:12,
              fontFamily:"'DM Mono',monospace",
              border:`1px solid rgba(15,23,42,0.12)`,
              background:"#fff",
              color:TEXT_DARK
            }}
          >
            Reset to Baseline
          </button>
          <button
            onClick={onExit}
            style={{
              padding:"8px 12px",
              borderRadius:10,
              cursor:"pointer",
              fontSize:12,
              fontFamily:"'DM Mono',monospace",
              border:`1px solid rgba(15,23,42,0.12)`,
              background:"#fff",
              color:TEXT_DARK
            }}
          >
            Exit Simulation
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{display:"flex", flexWrap:"nowrap", gap:12, overflowX:"auto", alignItems:"stretch"}}>
        {summaryCard({
          title: "Composite",
          valuePct: crispScenario,
          baselinePct: crispBaseline,
          color: crispColorScenario,
          deltaPct: crispDelta,
          subtitle: crispClassScenario,
          positiveGood: false,
          isComposite: true
        })}
        {CRISP_PILLARS.map(p => {
          const pk = p.key;
          const basePct = (country[pk] || 0) * 100;
          const valuePct = pillarSim01[pk] * 100;
          const deltaPct = valuePct - basePct;
          const label = p.short;
          return summaryCard({
            title: label,
            valuePct,
            baselinePct: basePct,
            color: p.color,
            deltaPct,
            subtitle: null,
            positiveGood: pk === "ac",
            isComposite: false
          });
        })}
      </div>

      {/* Indicator sliders */}
      <div style={{marginTop:14}}>
        {CRISP_PILLARS.map(p => {
          const pk = p.key;
          const inds = indicatorsByPillar[pk] || [];
          if (!inds.length) return null;

          return (
            <div key={pk} style={{marginTop:14, border:`1px solid ${BORDER}`, borderRadius:14, overflow:"hidden"}}>
              <div style={{padding:"10px 12px", background:`rgba(0,0,0,0.02)`, borderBottom:`1px solid ${ROW_BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12, color:MUTED, fontFamily:"'DM Mono',monospace", letterSpacing:"0.6px"}}>{PILLAR_GROUP[pk].toUpperCase()}</div>
                  <div style={{marginTop:3, fontSize:13, fontWeight:800, color:TEXT_DARK}}>{p.desc ? p.desc.split(".")[0] : ""}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:12, color:MUTED, fontFamily:"'DM Mono',monospace"}}>Scenario pillar</div>
                  <div style={{fontSize:20, fontWeight:900, color:p.color, fontFamily:"'DM Mono',monospace"}}>{Math.round(pillarSim01[pk] * 100)}</div>
                </div>
              </div>

              <div style={{padding:14, display:"flex", flexDirection:"column", gap:12}}>
                {inds.map((ind) => {
                  const k = `${ind.group}::${ind.label}`;
                  const baseline = baselineIndicatorScores[k] ?? 0;
                  const value = sliderScores[k] ?? baseline;
                  const delta = value - baseline;

                  const deltaPct = Math.round(delta);
                  const dCol = pk === "ac" ? deltaColor(deltaPct, {positiveGood: true}) : deltaColor(deltaPct, {positiveGood: false});

                  const approxNow = approxRealEquivalent(ind, value);
                  const approx25 = approxRealEquivalent(ind, 25);
                  const approx50 = approxRealEquivalent(ind, 50);
                  const approx75 = approxRealEquivalent(ind, 75);

                  return (
                    <div key={k} style={{border:`1px solid ${ROW_BORDER}`, borderRadius:12, padding:14, background:"#fff"}}>
                      <div style={{display:"flex", justifyContent:"space-between", gap:12, alignItems:"flex-start", flexWrap:"wrap"}}>
                        <div style={{minWidth:240, flex:1}}>
                          <div style={{fontSize:12, fontWeight:800, color:TEXT_DARK}}>{ind.label}</div>
                          <div style={{marginTop:4, fontSize:12, color:MUTED, lineHeight:1.3}}>
                            ≈ {approxNow}
                          </div>
                          <div style={{marginTop:6, fontSize:10, color:"#94a3b8", fontFamily:"'DM Mono',monospace"}}>
                            P25 ≈ {approx25} · P50 ≈ {approx50} · P75 ≈ {approx75}
                          </div>
                        </div>

                        <div style={{textAlign:"right", minWidth:140}}>
                          <div style={{fontSize:22, fontWeight:900, fontFamily:"'DM Mono',monospace", color:pk === "ac" ? C.good : C.bad}}>
                            {Math.round(value)}
                          </div>
                          <div style={{marginTop:4, fontSize:12, fontWeight:900, fontFamily:"'DM Mono',monospace", color:dCol}}>
                            {deltaPct === 0 ? "Δ 0" : `Δ ${signFmt(deltaPct)}`}
                          </div>
                        </div>
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={value}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          setSliderScores(prev => ({...prev, [k]: next}));
                        }}
                        style={{
                          width:"100%",
                          marginTop:12,
                          accentColor:p.color
                        }}
                        aria-label={`Simulated indicator score ${ind.label}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Formula / trace */}
      <div style={{marginTop:18, background:"#f8fafc", border:`1px solid ${BORDER}`, borderRadius:14, padding:14}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:10}}>
          <div>
            <div style={{fontSize:12, fontFamily:"'DM Mono',monospace", letterSpacing:"0.8px", color:MUTED}}>FORMULA TRACE</div>
            <div style={{marginTop:4, fontSize:14, fontWeight:900}}>Indicator → Pillar → Composite</div>
          </div>
          <div style={{fontSize:12, color:MUTED, fontFamily:"'DM Mono',monospace"}}>All outputs are scenario values (unpublished).</div>
        </div>

        <div style={{fontSize:12, lineHeight:1.65, fontFamily:"'DM Mono',monospace", color:TEXT_DARK}}>
          <div>HP = {pillarSim01.hp.toFixed(2)} · EX = {pillarSim01.ex.toFixed(2)} · FR = {pillarSim01.fr.toFixed(2)} · AC = {pillarSim01.ac.toFixed(2)} · FS = {pillarSim01.fs.toFixed(2)}</div>
          <div style={{marginTop:6}}>
            compRisk = (HP + EX + FR + (1 − AC) + FS) / 5
            {" = "}
            ({pillarSim01.hp.toFixed(2)} + {pillarSim01.ex.toFixed(2)} + {pillarSim01.fr.toFixed(2)} + (1 − {pillarSim01.ac.toFixed(2)}) + {pillarSim01.fs.toFixed(2)}) / 5
            {" = "}
            {compRiskScenario01.toFixed(3)}
          </div>
          <div style={{marginTop:6}}>
            CRISP = 100 × ( #{cdfCount} countries with compRisk ≤ {compRiskScenario01.toFixed(3)} ) / {cdfN}
            {" = "}
            {crispScenario.toFixed(1)}
          </div>
          <div style={{marginTop:8, color:MUTED}}>
            Baseline (pillars): HP {Math.round((country.hp || 0) * 100)} · EX {Math.round((country.ex || 0) * 100)} · FR {Math.round((country.fr || 0) * 100)} · AC {Math.round((country.ac || 0) * 100)} · FS {Math.round((country.fs || 0) * 100)}
          </div>
          <div style={{marginTop:2, color:MUTED}}>
            Published baseline CRISP (dataset): {country.crisp} · Formula baseline: {crispBaselineFormula.toFixed(1)} · Delta: {crispDelta}
          </div>
          <div style={{marginTop:6, color:MUTED}}>
            Percentile interpretation: 50 means the 50th percentile in the country distribution (empirical CDF), not “50% of a raw value”.
          </div>
        </div>
      </div>
    </div>
  );
}

function CountryDetail({country, onClose, activePillar, onPillarChange}){
  const setActivePillar = onPillarChange;
  const [simOpen, setSimOpen] = useState(false);

  useEffect(() => {
    // Keep exec-summary context while in simulation.
    if (simOpen && activePillar) setActivePillar(null);
  }, [simOpen, activePillar, setActivePillar]);

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>

      {/* ── Compact header: country name + actions only ── */}
      <div style={{padding:"12px 20px 10px",borderBottom:`1px solid ${C.border}`,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:700,margin:0,letterSpacing:"-0.5px"}}>{country.name}</h2>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={onClose} style={{...ghostBtn,fontSize:12}}>← ALL COUNTRIES</button>
          {!activePillar && !simOpen && (
            <button
              onClick={() => {
                setActivePillar(null);
                setSimOpen(true);
              }}
              style={{
                padding:"5px 12px",
                borderRadius:6,
                cursor:"pointer",
                fontSize:12,
                background:"rgba(255,255,255,0.04)",
                border:`1px solid rgba(255,255,255,0.12)`,
                color:"rgba(255,255,255,0.55)",
                fontFamily:"'DM Mono',monospace",
                letterSpacing:"0.5px",
                transition:"all 0.2s ease"
              }}
            >
              Simulation Mode
            </button>
          )}
          <DownloadButton country={country}/>
        </div>
      </div>

      {/* ── Body: pillar content ── */}
      <div style={{flex:1,overflow:"hidden",display:"flex"}}>

        {/* CONTENT — full width, no internal sidebar */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",animation:"fadeIn 0.15s ease"}}>
          <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}`}</style>

          {simOpen ? (
            <SimulationModePanel
              country={country}
              onExit={() => setSimOpen(false)}
            />
          ) : (
            <>

            {/* ── NO PILLAR SELECTED: overview ── */}
            {!activePillar&&(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <NarrativePanel country={country}/>
              </div>
            )}

          {/* ── HP: Hazard Pressure — totals + mix + hazards + indicators + events ── */}
          {activePillar==="hp"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{fontSize:10,fontWeight:600,color:CRISP_PILLARS.find(p=>p.key==="hp").color,letterSpacing:"0.05em",textTransform:"uppercase"}}>
                HP · Hazard Pressure — What hits the country
              </div>

              {/* Recorded disaster totals */}
              <div>
                <div style={SL}>RECORDED DISASTER TOTALS</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {[
                    {l:"Deaths",v:fmtN(country.knownDeaths),c:C.future,cov:`${country.deathCov}/${country.totalEvents} events`},
                    {l:"People affected",v:fmtN(country.knownAffected),c:C.hazard,cov:`${country.affCov}/${country.totalEvents} events`},
                    {l:"Economic losses",v:fmtM(country.knownLoss),c:C.vuln,cov:`${country.lossCov}/${country.totalEvents} events`},
                  ].map((s,i)=>(
                    <div key={i} style={{background:C.surface,borderRadius:8,padding:"11px 13px",border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:18,fontWeight:700,color:s.c,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginTop:2}}>{s.l}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontFamily:"'DM Mono',monospace",marginTop:3}}>⚠ {s.cov} with data</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hazard mix + dominant hazards */}
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:160}}>
                  <div style={SL}>HAZARD MIX</div>
                  <HazardBar breakdown={country.hazardBreakdown}/>
                  <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>
                    {Object.entries(country.hazardBreakdown).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([g,v])=>(
                      <div key={g} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",gap:5,alignItems:"center"}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:GROUP_COLOR[g]}}/>
                          <span style={{fontSize:12,color:"rgba(255,255,255,0.55)"}}>{g}</span>
                        </div>
                        <span style={{fontSize:12,fontWeight:600,color:GROUP_COLOR[g],fontFamily:"'DM Mono',monospace"}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{flex:1,minWidth:160}}>
                  <div style={SL}>DOMINANT HAZARDS</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                    {country.dominantHazards.map(h=>(
                      <div key={h} style={{padding:"5px 13px",borderRadius:20,fontSize:11,background:`${C.hazard}0d`,border:`1px solid ${C.hazard}25`,color:"#7dd3fc",fontFamily:"'DM Mono',monospace"}}>{h}</div>
                    ))}
                  </div>
                </div>
              </div>

              <IndicatorsByGroup country={country} groups={["HP · Hazard Pressure"]}/>
              <div style={SL}>EVENT LOG</div>
              <EventLog country={country}/>
            </div>
          )}

          {/* ── EX: Exposure ── */}
          {activePillar==="ex"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:10,fontWeight:600,color:CRISP_PILLARS.find(p=>p.key==="ex").color,letterSpacing:"0.05em",textTransform:"uppercase"}}>
                EX · Exposure — What's in harm's way
              </div>
              <IndicatorsByGroup country={country} groups={["EX · Exposure"]}/>
            </div>
          )}

          {/* ── FR: Fragility ── */}
          {activePillar==="fr"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:10,fontWeight:600,color:CRISP_PILLARS.find(p=>p.key==="fr").color,letterSpacing:"0.05em",textTransform:"uppercase"}}>
                FR · Fragility — How likely systems break
              </div>
              <IndicatorsByGroup country={country} groups={["FR · Fragility"]}/>
            </div>
          )}

          {/* ── AC: Adaptive Capacity ── */}
          {activePillar==="ac"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:10,fontWeight:600,color:CRISP_PILLARS.find(p=>p.key==="ac").color,letterSpacing:"0.05em",textTransform:"uppercase"}}>
                AC · Adaptive Capacity — Ability to respond and recover
              </div>
              <IndicatorsByGroup country={country} groups={["AC · Adaptive Capacity"]}/>
            </div>
          )}

          {/* ── FS: Future Stress — indicators + policies ── */}
          {activePillar==="fs"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:10,fontWeight:600,color:CRISP_PILLARS.find(p=>p.key==="fs").color,letterSpacing:"0.05em",textTransform:"uppercase"}}>
                FS · Future Stress ★ — Where things may break next
              </div>
              <div style={{background:"rgba(184,134,11,0.06)",border:"1px solid rgba(184,134,11,0.18)",borderRadius:6,padding:"8px 11px",fontSize:10,color:"rgba(255,255,255,0.5)",fontStyle:"italic"}}>
                All indicators in this pillar are forward-looking only. Observed trends are captured in HP.
              </div>
              <IndicatorsByGroup country={country} groups={["FS · Future Stress"]}/>
              <PolicyPanel country={country}/>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── INDICATOR BY GROUP (pillar-filtered accordion) ────────────────────────
function IndicatorsByGroup({country, groups}){
  const [open, setOpen] = useState(groups[0]);
  const [expandedItems, setExpandedItems] = useState({});
  const filtered = country.indicators.filter(i=>groups.includes(i.group));
  const presentGroups = groups.filter(g=>filtered.some(i=>i.group===g));

  const toggleItem = (group, index) => {
    const key = `${group}-${index}`;
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Dummy score mapping - will be replaced with real data
  const getDummyScore = (ind) => {
    // Create consistent scores based on indicator label hash for stability
    const hash = ind.label.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Define score ranges by group
    const groupScores = {
      "Disaster Record": [85, 74, 68, 82, 71],
      "Infrastructure": [79, 65, 58, 72, 61],
      "Climate & Future": [88, 76, 83, 91, 68],
      "Economic Exposure": [73, 69, 77, 64, 70],
      "Governance & Capacity": [55, 62, 48, 59, 51]
    };
    
    const scores = groupScores[ind.group] || [65, 70, 75, 68, 72];
    return scores[hash % scores.length];
  };

  const getScoreColor = (score) => {
    if (score >= 70) return "#f87171"; // red/bad
    if (score >= 50) return "#fbbf24"; // yellow/warn
    return "#34d399"; // green/good
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {presentGroups.map(group=>{
        const items = filtered.filter(i=>i.group===group);
        const isOpen = open===group;
        return(
          <div key={group} style={{borderRadius:8,overflow:"hidden",border:`1px solid ${C.border}`}}>
            <button onClick={()=>setOpen(isOpen?null:group)} style={{
              width:"100%",padding:"10px 14px",background:isOpen?"rgba(255,255,255,0.055)":C.surface,
              border:"none",color:isOpen?"white":"rgba(255,255,255,0.55)",cursor:"pointer",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              fontSize:10,fontFamily:"'DM Mono',monospace",letterSpacing:"0.5px"}}>
              <span>{group.toUpperCase()}</span>
              <span style={{opacity:0.4,fontSize:12}}>{isOpen?"▲":"▼"} {items.length}</span>
            </button>
            {isOpen&&items.map((ind,i)=>{
              const itemKey = `${group}-${i}`;
              const isExpanded = expandedItems[itemKey];
              const score = getDummyScore(ind);
              const scoreColor = getScoreColor(score);
              
              return(
                <div key={i} style={{
                  borderTop:`1px solid rgba(255,255,255,0.04)`,
                  background:i%2===0?"transparent":"rgba(255,255,255,0.01)",
                  overflow:"hidden"
                }}>
                  <div 
                    onClick={() => toggleItem(group, i)}
                    style={{
                      padding:"9px 14px",
                      display:"flex",
                      justifyContent:"space-between",
                      alignItems:"center",
                      cursor:"pointer",
                      transition:"background 0.15s"
                    }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"rgba(255,255,255,0.01)"}
                  >
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",flex:1}}>{ind.label}</div>
                    <div style={{display:"flex",alignItems:"center",gap:12,marginLeft:16}}>
                      {/* Progress bar */}
                      <div style={{width:80,height:4,background:"rgba(255,255,255,0.1)",borderRadius:2,position:"relative"}}>
                        <div style={{
                          position:"absolute",
                          left:0,
                          top:0,
                          height:"100%",
                          width:`${score}%`,
                          background:scoreColor,
                          borderRadius:2,
                          transition:"width 0.3s ease"
                        }}/>
                      </div>
                      {/* Score */}
                      <div style={{fontSize:14,fontWeight:700,color:scoreColor,fontFamily:"'DM Mono',monospace",width:28,textAlign:"right",flexShrink:0}}>{score}</div>
                      {/* Arrow */}
                      <div style={{
                        fontSize:14,
                        color:"rgba(255,255,255,0.3)",
                        transition:"transform 0.2s ease",
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        width:16,
                        textAlign:"center",
                        flexShrink:0
                      }}>
                        ▼
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{
                      padding:"8px 14px 12px 14px",
                      borderTop:"1px solid rgba(255,255,255,0.04)",
                      background:"rgba(0,0,0,0.2)"
                    }}>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",lineHeight:"1.5",fontFamily:"'DM Mono',monospace"}}>
                        {ind.note}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      {presentGroups.length===0&&(
        <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontStyle:"italic",padding:"8px 0"}}>No indicators mapped to this pillar yet.</div>
      )}
    </div>
  );
}


// ─── OVERVIEW PANEL ───────────────────────────────────────────────────────────
function OverviewPanel({countries, onSelect}){
  return(
    <div style={{flex:1,minHeight:0,overflowY:"auto",padding:"20px 24px"}}>
      {/* CRISP pillar legend */}
      <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        {CRISP_PILLARS.map(p=>(
          <div key={p.key} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:16,height:3,borderRadius:2,background:p.color}}/>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"'DM Mono',monospace"}}>{p.short} {p.label}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {Object.values(countries).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>{
          const crispCol=(c.crisp||0)>=65?C.bad:(c.crisp||0)>=45?C.warn:C.good;
          return(
          <div key={c.id} onClick={()=>onSelect(c)}
            style={{padding:"10px 14px",borderRadius:9,cursor:"pointer",background:C.surface,border:`1px solid ${C.border}`,transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.055)";e.currentTarget.style.borderColor="rgba(255,255,255,0.12)";}}
            onMouseLeave={e=>{e.currentTarget.style.background=C.surface;e.currentTarget.style.borderColor=C.border;}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:"white"}}>{c.name}</div>
              </div>
              <div style={{textAlign:"center",background:`${crispCol}0d`,borderRadius:6,padding:"4px 0",border:`1px solid ${crispCol}25`,width:72,flexShrink:0}}>
                <div style={{fontSize:16,fontWeight:700,color:crispCol,fontFamily:"'DM Mono',monospace",lineHeight:1}}>{c.crisp||"—"}</div>
                <div style={{fontSize:12,color:`${crispCol}99`,fontFamily:"'DM Mono',monospace",letterSpacing:"0.5px",marginTop:1}}>{(c.crispClass||"").toUpperCase()}</div>
              </div>
            </div>

          </div>
        );})}
      </div>
      <div style={{marginTop:14,fontSize:11,color:"rgba(255,255,255,0.15)",fontFamily:"'DM Mono',monospace",lineHeight:1.8}}>
        Made with care 💙 by the Cool UNV Team
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
    <div style={{flex:1,minHeight:0,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:18}}>
      {/* Controls */}
      <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <Picker val={idA} onChange={setIdA} excl={idB}/>
        <span style={{color:"rgba(255,255,255,0.2)",fontFamily:"'DM Mono',monospace",fontSize:11}}>vs</span>
        <Picker val={idB} onChange={setIdB} excl={idA}/>
        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          {[{k:"risk",l:"Risk Layers"},{k:"indicators",l:"Indicators"},{k:"policy",l:"Policy"}].map(t=>(
            <button key={t.k} onClick={()=>setMode(t.k)} style={{
              padding:"5px 12px",borderRadius:6,cursor:"pointer",fontSize:12,
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
          <div style={SL}>CRISP PILLAR COMPARISON</div>
          {CRISP_PILLARS.map(layer=>{
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
                    <div style={{position:"absolute",bottom:18,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",fontSize:12,color:layer.color,fontFamily:"'DM Mono',monospace"}}>
                      {cA.short} · {Math.round(vA*100)}
                    </div>
                  </div>
                  {/* B dot */}
                  <div style={{position:"absolute",left:`${5+vB*90}%`,top:"50%",transform:"translate(-50%,-50%)"}}>
                    <div style={{width:14,height:14,borderRadius:"50%",background:"rgba(255,255,255,0.6)",border:`2px solid ${C.bg}`}}/>
                    <div style={{position:"absolute",top:18,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",fontSize:12,color:"rgba(255,255,255,0.45)",fontFamily:"'DM Mono',monospace"}}>
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
            <div style={{padding:"9px 14px",background:"rgba(255,255,255,0.04)",fontSize:12,color:C.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"1px"}}>{group.toUpperCase()}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:`1px solid rgba(255,255,255,0.04)`}}>
              <div style={{padding:"7px 14px",fontSize:11,color:C.muted,fontFamily:"'DM Mono',monospace"}}>INDICATOR</div>
              <div style={{padding:"7px 14px",fontSize:11,color:C.hazard,fontFamily:"'DM Mono',monospace"}}>{cA.short} — {cA.name}</div>
              <div style={{padding:"7px 14px",fontSize:11,color:"rgba(255,255,255,0.4)",fontFamily:"'DM Mono',monospace"}}>{cB.short} — {cB.name}</div>
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
            <div style={{padding:"9px 14px",background:"rgba(255,255,255,0.04)",fontSize:12,color:C.muted,fontFamily:"'DM Mono',monospace",letterSpacing:"1px"}}>{area.toUpperCase()}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:`1px solid rgba(255,255,255,0.04)`}}>
              <div style={{padding:"7px 14px",fontSize:11,color:C.muted,fontFamily:"'DM Mono',monospace"}}>INDICATOR</div>
              <div style={{padding:"7px 14px",fontSize:11,color:C.hazard,fontFamily:"'DM Mono',monospace"}}>{cA.name}</div>
              <div style={{padding:"7px 14px",fontSize:11,color:"rgba(255,255,255,0.4)",fontFamily:"'DM Mono',monospace"}}>{cB.name}</div>
            </div>
            {allInds.map((ind,i)=>{
              const a=pA.find(p=>p.indicator===ind),b=pB.find(p=>p.indicator===ind);
              return(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:`1px solid rgba(255,255,255,0.04)`,background:i%2===0?"transparent":"rgba(255,255,255,0.01)"}}>
                  <div style={{padding:"9px 14px",fontSize:10,color:"rgba(255,255,255,0.45)"}}>{ind}</div>
                  <div style={{padding:"9px 14px"}}>{a?<TrendBadge trend={a.trend}/>:<span style={{fontSize:12,color:"rgba(255,255,255,0.15)"}}>—</span>}</div>
                  <div style={{padding:"9px 14px"}}>{b?<TrendBadge trend={b.trend}/>:<span style={{fontSize:12,color:"rgba(255,255,255,0.15)"}}>—</span>}</div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",fontFamily:"'DM Mono',monospace",lineHeight:1.7}}>
        ⚠ Cross-country comparisons require caution. Data collection methods and coverage vary. Risk layer scores are indicative composites — not standardised national statistics. Policy indicators are qualitative assessments based on available documents.
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const [unlocked,setUnlocked]=useState(false);
  const [selected,setSelected]=useState(null);
  const [mainTab,setMainTab]=useState("overview"); // overview | compare
  const [animIn,setAnimIn]=useState(true);
  const [leftWidth,setLeftWidth]=useState(520);
  const [isDragging,setIsDragging]=useState(false);
  const [language,setLanguage]=useState("ENG");
  const [activePillar,setActivePillar]=useState(null);

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
    setActivePillar(null);
    setTimeout(()=>{setSelected(c);setMainTab("overview");setAnimIn(true);},120);
  },[]);

  const handleClose=useCallback(()=>{
    setAnimIn(false);
    setActivePillar(null);
    setTimeout(()=>{setSelected(null);setAnimIn(true);},120);
  },[]);

  if(!unlocked) return <PasswordGate onUnlock={()=>setUnlocked(true)}/>;

  return(
    <>
    <div style={{height:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",color:"white",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <div style={{padding:"11px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:26,height:26,borderRadius:6,background:"linear-gradient(135deg,#38bdf8,#818cf8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>U</div>
          <div>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:"-0.2px"}}>UNDP Risk Analytics</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            {!selected&&[{k:"overview",l:"Regional"},{k:"compare",l:"Compare"}].map(t=>(
              <button key={t.k} onClick={()=>setMainTab(t.k)} style={{
                padding:"5px 14px",borderRadius:6,cursor:"pointer",fontSize:12,
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
                fontSize:12,
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

        {selected ? (
          <>
            {/* LEFT: country pillar sidebar — CRISPWheel + pillar nav + WB stats */}
            <CountrySidebar
              country={selected}
              activePillar={activePillar}
              onPillarChange={setActivePillar}
            />
            {/* RIGHT: pillar content */}
            <div style={{flex:1,overflow:"hidden",opacity:animIn?1:0,transition:"opacity 0.15s"}}>
              <CountryDetail
                country={selected}
                onClose={handleClose}
                activePillar={activePillar}
                onPillarChange={setActivePillar}
              />
            </div>
          </>
        ) : (
          <>
            {/* LEFT: regional radar — centered */}
            <div style={{width:"52%",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0",position:"relative"}}>
              <Radar countries={COUNTRIES} selected={selected} onSelect={handleSelect}/>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:4,fontFamily:"'DM Mono',monospace"}}>
                CLICK A COUNTRY TO EXPLORE 
              </div>
            </div>

            {/* RIGHT: overview/compare */}
            <div style={{flex:1,minHeight:0,display:"flex",flexDirection:"column",opacity:animIn?1:0,transition:"opacity 0.15s",borderLeft:`1px solid ${C.border}`}}>
              {mainTab==="compare"
                ? <CompareView countries={COUNTRIES}/>
                : <OverviewPanel countries={COUNTRIES} onSelect={handleSelect}/>
              }
            </div>
          </>
        )}

      </div>
    </div>
    <ChatbotFAB/>
    </>
  );
}
