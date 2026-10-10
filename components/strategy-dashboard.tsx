"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import data from "@/data/africa.json";
import sources from "@/data/sources.json";

type ConfidenceName = "sourced" | "derived" | "assumption";
type TabId =
  | "overview"
  | "market"
  | "countries"
  | "product"
  | "simulator"
  | "rider"
  | "competitors"
  | "roadmap"
  | "risks"
  | "decision"
  | "supplyChain"
  | "liveDashboard"
  | "assumptions"
  | "sources";

const tabs: { id: TabId; label: string; short: string }[] = [
  { id: "overview", label: "Overview", short: "01" },
  { id: "market", label: "Market", short: "02" },
  { id: "countries", label: "Countries", short: "03" },
  { id: "product", label: "Product fit", short: "04" },
  { id: "simulator", label: "Entry economics", short: "05" },
  { id: "rider", label: "Rider economics", short: "06" },
  { id: "competitors", label: "Competition", short: "07" },
  { id: "roadmap", label: "Roadmap", short: "08" },
  { id: "risks", label: "Risks", short: "09" },
  { id: "decision", label: "Recommendation", short: "10" },
  { id: "supplyChain", label: "Supply chain", short: "11" },
  { id: "liveDashboard", label: "Live dashboard plan", short: "12" },
  { id: "assumptions", label: "Assumptions", short: "A" },
  { id: "sources", label: "Sources", short: "S" }
];

const countryWeights = [
  { id: "market", label: "Market size" },
  { id: "eshare", label: "E-share potential" },
  { id: "policy", label: "Policy stability" },
  { id: "competition", label: "Competitive intensity" },
  { id: "price", label: "Price fit" },
  { id: "fx", label: "FX risk" },
  { id: "entry", label: "Ease of entry" }
] as const;

type WeightId = (typeof countryWeights)[number]["id"];

const initialWeights: Record<WeightId, number> = data.countryRankingWeights;

const sourceById = new Map(sources.map((source) => [source.id, source]));

function money(value: number, decimals = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  }).format(value);
}

function integer(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}k`;
  return integer(value);
}

function Confidence({ level }: { level: ConfidenceName }) {
  return <span className={`confidence confidence-${level}`}>{data.confidenceLabels[level]}</span>;
}

function SourceRefs({ ids }: { ids: readonly string[] }) {
  const validSources = ids.map((id) => sourceById.get(id)).filter((item) => item !== undefined);
  if (validSources.length === 0) return null;

  return (
    <details className="source-popover">
      <summary aria-label={`Show ${validSources.length} source details`}>
        {validSources.map((source) => source.id).join(" · ")}
      </summary>
      <div className="source-popover-panel">
        {validSources.map((source) => (
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
            <span className="source-popover-id">{source.id}</span>
            <span>
              <strong>{source.title}</strong>
              <small>
                Grade {source.grade}
                {source.grade === "C" ? " · Verify before relying" : ""}
              </small>
            </span>
            <span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </details>
  );
}

function DataTag({
  level,
  sources: sourceIds = [],
  formula,
  formulaLabel = "Formula"
}: {
  level: ConfidenceName;
  sources?: readonly string[];
  formula?: string;
  formulaLabel?: string;
}) {
  return (
    <span className="data-tag">
      <Confidence level={level} />
      {formula ? (
        <details className="formula-popover">
          <summary>{formulaLabel}</summary>
          <span className="formula-popover-panel">{formula}</span>
        </details>
      ) : null}
      {sourceIds.length > 0 ? <SourceRefs ids={sourceIds} /> : null}
    </span>
  );
}

function Counter({
  value,
  label,
  suffix = "",
  confidence,
  sourceIds = [],
  formula
}: {
  value: number;
  label: string;
  suffix?: string;
  confidence: ConfidenceName;
  sourceIds?: readonly string[];
  formula?: string;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 1100;
    const update = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [reduced, value]);

  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">
        {integer(display)}
        {suffix}
      </strong>
      <DataTag level={confidence} sources={sourceIds} formula={formula} />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function Card({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

function SectionReveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function WorldMap({
  selected,
  onSelect
}: {
  selected: (typeof data.countries)[number];
  onSelect: (country: (typeof data.countries)[number]) => void;
}) {
  const features = useMemo(() => {
    const topology = world as unknown as Topology;
    const geo = feature(topology, topology.objects.countries);
    return "features" in geo ? (geo.features as Feature<Geometry | null>[]) : [];
  }, []);
  const projection = useMemo(
    () => geoMercator().center([20, 0]).scale(175).translate([300, 245]),
    []
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const countryByMapId = new Map(data.countries.map((country) => [country.mapId, country]));

  return (
    <div className="map-frame">
      <svg
        viewBox="0 0 600 480"
        role="img"
        aria-label="Interactive map of Africa. Select a highlighted country for market details."
      >
        <defs>
          <pattern id="map-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#24302d" strokeWidth=".6" />
          </pattern>
        </defs>
        <rect width="600" height="480" fill="url(#map-grid)" />
        {features.map((item) => {
          const id = String(item.id ?? "").padStart(3, "0");
          const country = countryByMapId.get(id);
          const active = country?.iso === selected.iso;
          const d = path(item);
          if (!d) return null;
          return (
            <path
              key={id}
              d={d}
              className={country ? `map-country ${active ? "is-selected" : ""}` : "map-land"}
              tabIndex={country ? 0 : undefined}
              role={country ? "button" : undefined}
              aria-label={country ? `Select ${country.name}` : undefined}
              aria-pressed={country ? active : undefined}
              onClick={() => country && onSelect(country)}
              onKeyDown={(event) => {
                if (country && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onSelect(country);
                }
              }}
            />
          );
        })}
      </svg>
      <div className="map-legend">
        <span><i className="legend-dot active" /> Selected</span>
        <span><i className="legend-dot" /> Modelled country</span>
      </div>
      <p className="map-caption">Select a highlighted country or use the list below.</p>
    </div>
  );
}

function CountryExplorer() {
  const [selectedIso, setSelectedIso] = useState("KEN");
  const [weights, setWeights] = useState(initialWeights);
  const selected = data.countries.find((country) => country.iso === selectedIso) ?? data.countries[0];
  const importPrice = "averageImportPriceUSD" in selected ? selected.averageImportPriceUSD : null;
  const kenyaEShare = "eShare2024" in selected ? selected.eShare2024 : null;
  const sam2030 =
    selected.tam.base !== null && selected.eShare2030 !== null && selected.fitShare !== null
      ? selected.tam.base * selected.eShare2030 * selected.fitShare
      : null;

  const ranked = useMemo(
    () =>
      data.countries
        .map((country) => ({
          ...country,
          rankScore: countryWeights.reduce(
            (score, weight) => score + country.scores[weight.id] * weights[weight.id],
            0
          )
        }))
        .sort((left, right) => right.rankScore - left.rankScore),
    [weights]
  );

  const updateWeight = (id: WeightId, value: number) => {
    setWeights((current) => ({ ...current, [id]: value }));
  };
  const tam = selected.tam;

  return (
    <div className="country-layout">
      <div className="country-left">
        <WorldMap selected={selected} onSelect={(country) => setSelectedIso(country.iso)} />
        <div className="country-selector" aria-label="Choose a country">
          {data.countries.map((country) => (
            <button
              type="button"
              key={country.iso}
              onClick={() => setSelectedIso(country.iso)}
              className={country.iso === selected.iso ? "country-chip selected" : "country-chip"}
            >
              {country.name}
            </button>
          ))}
        </div>
      </div>
      <div className="country-right">
        <Card className="country-profile">
          <div className="profile-top">
            <span className="eyebrow">{selected.region}</span>
            <span className="verdict-pill">{selected.verdict}</span>
          </div>
          <h3>{selected.name}</h3>
          <p className="profile-policy">{selected.policy}</p>
          <DataTag level={selected.policyConfidence} sources={selected.policySources} />
          <div className="country-stat-grid">
            <div>
              <span className="stat-label">Two-wheeler TAM · annual</span>
              {tam.base === null ? (
                <strong>Data gap</strong>
              ) : (
                <strong>{compact(tam.low ?? tam.base)}–{compact(tam.high ?? tam.base)}</strong>
              )}
              <DataTag
                level={tam.confidence}
                sources={tam.sources}
                formula={tam.whyRange}
                formulaLabel="Why this range?"
              />
            </div>
            <div>
              <span className="stat-label">e2W today</span>
              <strong>{selected.e2wToday.value === null ? "Not available" : compact(selected.e2wToday.value)}</strong>
              {"period" in selected.e2wToday ? <small className="stat-period">{selected.e2wToday.period}</small> : null}
              <DataTag level={selected.e2wToday.confidence} sources={selected.e2wToday.sources} />
              {kenyaEShare ? <span className="stat-extra">2024 e-share · {(kenyaEShare.value * 100).toFixed(1)}% <DataTag level={kenyaEShare.confidence} sources={kenyaEShare.sources} /></span> : null}
            </div>
            <div>
              <span className="stat-label">SAM · {data.modelYear} units / yr</span>
              <strong>{sam2030 === null ? "Not sized" : compact(sam2030)}</strong>
              <DataTag
                level={sam2030 === null ? "assumption" : "derived"}
                sources={selected.tam.sources}
                formula="SAM = TAM base × 2030 e-share × Ather-fit share. Country adoption and fit rates are modelling assumptions."
              />
            </div>
            <div>
              <span className="stat-label">{data.modelYear} SOM · units / yr</span>
              <strong>{selected.som2030 === null ? "Not sized" : `~${integer(selected.som2030)}`}</strong>
              <DataTag
                level={selected.somConfidence}
                sources={selected.sources}
                formula={sam2030 === null ? "Placeholder pending comparable country market-size and adoption data." : "SOM = SAM × Ather share of SAM; rounded to the base-case planning figure shown."}
              />
            </div>
          </div>
          {importPrice ? (
            <div className="import-price-note">
              <span>Indicative low-cost e2W import anchor</span>
              <strong>{money(importPrice.value)} / unit</strong>
              <DataTag level={importPrice.confidence} sources={importPrice.sources} formula={importPrice.formula} />
            </div>
          ) : null}
          <p className="muted-note">Base-case SOM is a model output, not a sales forecast. Country values include explicit placeholders where market evidence is missing.</p>
        </Card>
        <Card className="weights-card">
          <div className="card-heading-row">
            <div>
              <span className="eyebrow">Live ranking</span>
              <h3>Change the priorities</h3>
            </div>
            <button type="button" className="text-button" onClick={() => setWeights(initialWeights)}>Reset</button>
          </div>
          <div className="weight-controls">
            {countryWeights.map((weight) => (
              <label className="weight-control" key={weight.id}>
                <span>{weight.label}<b>{weights[weight.id]}</b></span>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={weights[weight.id]}
                  aria-label={`${weight.label} weight`}
                  onChange={(event) => updateWeight(weight.id, Number(event.target.value))}
                />
              </label>
            ))}
          </div>
          <div className="ranking-list">
            {ranked.slice(0, 5).map((country, index) => (
              <button
                className={country.iso === selected.iso ? "ranking-row active" : "ranking-row"}
                type="button"
                key={country.iso}
                onClick={() => setSelectedIso(country.iso)}
              >
                <span className="rank-number">{String(index + 1).padStart(2, "0")}</span>
                <span>{country.name}</span>
                <span className="rank-score">{country.rankScore}</span>
              </button>
            ))}
          </div>
          <p className="microcopy">Scores are directional management judgments (scale 1–5), not sourced market statistics.</p>
        </Card>
      </div>
    </div>
  );
}

function MarketFunnel() {
  const [scenarioIndex, setScenarioIndex] = useState(1);
  const scenario = data.headline.somScenarios[scenarioIndex];
  const serviceable = data.headline.market2030.value * data.headline.mix2030.eShare * data.headline.mix2030.fitShare;

  return (
    <Card className="funnel-card">
      <div className="funnel-heading">
        <div><span className="eyebrow">The 2030 sizing funnel</span><div className="scenario-toggle" role="group" aria-label="2030 SOM scenario">
          {data.headline.somScenarios.map((item, index) => (
            <button
              type="button"
              key={item.name}
              className={index === scenarioIndex ? "scenario-toggle-button active" : "scenario-toggle-button"}
              aria-pressed={index === scenarioIndex}
              onClick={() => setScenarioIndex(index)}
            >{item.name}</button>
          ))}
        </div></div>
        <span>Illustrative continent-level model · units / year</span>
      </div>
      <div className="funnel">
        <div className="funnel-stage funnel-tam"><span>01 · TAM</span><strong>{compact(data.headline.market2030.value)}</strong><small>Motorcycle + scooter market</small><DataTag level="sourced" sources={data.headline.market2030.sources} /></div>
        <div className="funnel-drop">× {Math.round(data.headline.mix2030.eShare * 100)}% e-share</div>
        <div className="funnel-stage funnel-sam"><span>02 · SAM</span><strong>{compact(serviceable)}</strong><small>e2W × Ather-fit buyer pool</small><DataTag level="assumption" formula="TAM × assumed 2030 e-share × assumed Ather-fit share." /></div>
        <div className="funnel-drop">× {Math.round(data.headline.mix2030.atherShare * 100)}% share</div>
        <div className="funnel-stage funnel-som"><span>03 · SOM · {scenario.name}</span><strong>{compact(scenario.value)}</strong><small>Ather scenario · units / year</small><DataTag level="assumption" formula="TAM × e-share × Ather-fit share × Ather share of SAM. Scenario endpoint is a strategic sensitivity." /></div>
      </div>
      <div className="funnel-footer"><DataTag level="sourced" sources={["S5"]} /><DataTag level="assumption" formula="2030 e-share, product-fit share and Ather share of SAM are modelling assumptions. Scenario endpoints are strategic sensitivities, not a forecast." /></div>
    </Card>
  );
}

function ProductFork() {
  const [focus, setFocus] = useState<"compare" | "pathA" | "pathB">("compare");
  return (
    <>
      <div className="product-toggle" role="group" aria-label="Emphasize a product pathway">
        <span>Compare options</span>
        {(["compare", "pathA", "pathB"] as const).map((option) => (
          <button
            type="button"
            key={option}
            className={focus === option ? "scenario-toggle-button active" : "scenario-toggle-button"}
            aria-pressed={focus === option}
            onClick={() => setFocus(option)}
          >{option === "compare" ? "Side by side" : option === "pathA" ? "Focus A" : "Focus B"}</button>
        ))}
      </div>
      <div className="product-fork">
        {(["pathA", "pathB"] as const).map((key) => {
          const path = data.products[key];
          const highlighted = focus === key;
          const dimmed = focus !== "compare" && focus !== key;
          return (
            <Card className={`product-card ${key === "pathB" ? "featured-path" : ""} ${highlighted ? "path-highlight" : ""} ${dimmed ? "path-dimmed" : ""}`} key={key}>
              <div className="product-card-top"><span className="eyebrow">{path.name}</span><DataTag level={path.priceConfidence} sources={path.sources} /></div>
              <div className="product-price">{money(path.priceLow)}<span>–</span>{money(path.priceHigh)}<small>target retail band · USD</small></div>
              <div className="product-meta"><span>Capital intensity</span><b>{path.capitalIntensity}</b></div>
              <div className="product-meta"><span>Target rider</span><b>{path.fit}</b></div>
              <p className="product-challenge">{path.challenge}</p>
              <span className="product-verdict">{key === "pathA" ? "Requires a new product + ecosystem" : "Pilot with existing portfolio"}</span>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function CostSimulator() {
  const model = data.costModel;
  const [usdInr, setUsdInr] = useState(model.usdInr);
  const [priceInr, setPriceInr] = useState(model.atherPriceInr);
  const [freight, setFreight] = useState(model.containerRate40ft);
  const [cbuUnits, setCbuUnits] = useState(model.unitsCbu);
  const [skdUnits, setSkdUnits] = useState(model.unitsSkd);
  const [ckdUnits, setCkdUnits] = useState(model.unitsCkd);
  const [dutyCbu, setDutyCbu] = useState(model.dutyCbu);
  const [dutyCkd, setDutyCkd] = useState(model.dutyCkd);
  const [cbuOther, setCbuOther] = useState(model.otherLogisticsCbu);
  const [ckdOther, setCkdOther] = useState(model.ckdLogisticsLow);
  const [portInland, setPortInland] = useState(model.insurancePortInland);
  const [fixedCost, setFixedCost] = useState(model.annualFixedAssembly);
  const [distributorMargin, setDistributorMargin] = useState(model.distributorMargin);
  const [dealerMargin, setDealerMargin] = useState(model.dealerMargin);

  const exFactory = priceInr / usdInr;
  const freightCbu = freight / cbuUnits;
  const freightCkd = freight / ckdUnits;
  const logisticsCbu = freightCbu + cbuOther;
  const logisticsCkd = freightCkd + ckdOther;
  const cifCbu = exFactory + freightCbu + portInland;
  const cifCkd = exFactory + freightCkd + portInland;
  const dutySaving = cifCbu * dutyCbu - cifCkd * dutyCkd;
  const logisticsSaving = logisticsCbu - logisticsCkd;
  const saving = logisticsSaving + dutySaving;
  const savingLogOnly = logisticsSaving;
  const breakEven = saving > 0 ? Math.ceil(fixedCost / saving) : null;
  const breakEvenLogOnly = savingLogOnly > 0 ? Math.ceil(fixedCost / savingLogOnly) : null;
  const cbuLanded = (exFactory + logisticsCbu + cifCbu * dutyCbu) * (1 + distributorMargin) * (1 + dealerMargin);
  const ckdLanded = (exFactory + logisticsCkd + cifCkd * dutyCkd) * (1 + distributorMargin) * (1 + dealerMargin);
  const chartData = [
    { name: "Conservative", units: data.headline.somScenarios[0].value },
    { name: "Base case", units: data.headline.somScenarios[1].value },
    { name: "Aggressive", units: data.headline.somScenarios[2].value },
    { name: "CKD · with duty gap", units: breakEven ?? 0 },
    { name: "CKD · logistics only", units: breakEvenLogOnly ?? 0 }
  ];

  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void,
    display: (value: number) => string,
    confidence: ConfidenceName = "assumption",
    sourceIds: readonly string[] = [],
    formula?: string
  ) => (
    <label className="sim-slider">
      <span>{label}<b>{display(value)}</b></span>
      <DataTag level={confidence} sources={sourceIds} formula={formula} />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );

  return (
    <div className="simulator-grid">
      <Card className="sim-controls">
        <div className="card-heading-row">
          <div><span className="eyebrow">Editable model</span><h3>Change the inputs</h3></div>
          <span className="input-state">Client-side</span>
        </div>
        {slider("USD / INR", usdInr, 75, 110, 1, setUsdInr, (v) => `${v}`)}
        {slider("India price proxy · INR", priceInr, 70000, 180000, 1000, setPriceInr, (v) => `₹${integer(v)}`, "assumption", ["S29"], "Rizta S ex-showroom price is used as an ex-factory proxy; this can overstate export cost.")}
        {slider("40ft container freight", freight, 1000, 6000, 100, setFreight, (v) => money(v), "sourced", model.freightSources)}
        {slider("CBU units / container", cbuUnits, 20, 100, 1, setCbuUnits, (v) => `${v}`)}
        {slider("SKD units / container", skdUnits, 60, 220, 1, setSkdUnits, (v) => `${v}`)}
        {slider("CKD units / container", ckdUnits, 100, 400, 5, setCkdUnits, (v) => `${v}`)}
        {slider("CBU duty", dutyCbu, 0, 0.4, 0.01, setDutyCbu, (v) => `${(v * 100).toFixed(0)}%`, "sourced", model.dutySources, "EAC duty remission is dated; verify current rates and the country-specific eligibility of this kit.")}
        {slider("CKD duty", dutyCkd, 0, 0.3, 0.01, setDutyCkd, (v) => `${(v * 100).toFixed(0)}%`, "sourced", model.dutySources, "EAC duty remission is dated; verify current rates and the country-specific eligibility of this kit.")}
        {slider("CBU other logistics / unit", cbuOther, 40, 250, 5, setCbuOther, (v) => money(v))}
        {slider("CKD other logistics / unit", ckdOther, 15, 120, 5, setCkdOther, (v) => money(v))}
        {slider("Insurance / port / inland", portInland, 20, 300, 5, setPortInland, (v) => money(v))}
        {slider("Annual assembly fixed cost", fixedCost, 250000, 5000000, 50000, setFixedCost, (v) => `${money(v / 1_000_000, 2)}M`)}
        {slider("Distributor margin", distributorMargin, 0, 0.4, 0.01, setDistributorMargin, (v) => `${(v * 100).toFixed(0)}%`)}
        {slider("Dealer margin", dealerMargin, 0, 0.4, 0.01, setDealerMargin, (v) => `${(v * 100).toFixed(0)}%`)}
        <p className="sim-caveat">{model.caveats[0]}</p>
      </Card>
      <div className="sim-results">
        <div className="result-grid">
          <Card className="result-card">
            <span className="stat-label">CBU landed / unit</span>
            <strong>{money(cbuLanded)}</strong>
            <span className="result-detail">Calculated using the India price proxy</span>
            <DataTag level="derived" sources={["S26", ...model.freightSources, "S29"]} formula="(Ex-factory + CBU logistics + CBU duty × CIF) × (1 + distributor margin) × (1 + dealer margin)." />
          </Card>
          <Card className="result-card">
            <span className="stat-label">CKD landed / unit</span>
            <strong>{money(ckdLanded)}</strong>
            <span className="result-detail">At selected duties, logistics and margin</span>
            <DataTag level="derived" sources={["S26", ...model.freightSources, "S29"]} formula="(Ex-factory + CKD logistics + CKD duty × CIF) × (1 + distributor margin) × (1 + dealer margin)." />
          </Card>
          <Card className="result-card accent-result">
            <span className="stat-label">Break-even · duty gap</span>
            <strong>{breakEven === null ? "No saving" : `${compact(breakEven)} units`}</strong>
            <span className="result-detail">Annual fixed cost ÷ saving per unit</span>
            <DataTag level="derived" sources={["S26", ...model.freightSources]} formula="Annual fixed assembly cost ÷ [(CBU logistics − CKD logistics) + (CBU duty × CIF − CKD duty × CIF)]." />
          </Card>
          <Card className="result-card">
            <span className="stat-label">Break-even · logistics only</span>
            <strong>{breakEvenLogOnly === null ? "No saving" : `${compact(breakEvenLogOnly)} units`}</strong>
            <span className="result-detail">Excludes any duty differential</span>
            <DataTag level="derived" sources={model.freightSources} formula="Annual fixed assembly cost ÷ (CBU logistics − CKD logistics)." />
          </Card>
        </div>
        <Card className="chart-card">
          <div className="card-heading-row">
            <div><span className="eyebrow">Threshold test</span><h3>Break-even vs 2030 SOM</h3></div>
            <DataTag level="derived" formula="Break-even volume = annual fixed assembly cost ÷ CKD saving per unit. Saving = (CBU logistics − CKD logistics) + (CBU duty − CKD duty on CIF). Margins are excluded from this cost saving." />
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
                <CartesianGrid stroke="#293431" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#9ca9a3", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fill: "#819089", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#101715", border: "1px solid #34413c", borderRadius: 10 }}
                  labelStyle={{ color: "#e8eee9" }}
                  formatter={(value) => [integer(Number(value)), "Units / year"]}
                />
                <ReferenceLine y={data.headline.somScenarios[1].value} stroke="#b8f36b" strokeDasharray="4 4" />
                <Bar dataKey="units" radius={[5, 5, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={entry.name} fill={index < 3 ? "#65824c" : "#b8f36b"} opacity={index < 3 ? 0.8 : 0.95} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            {chartData.map((item, index) => (
              <span key={item.name}><i className={index < 3 ? "legend-swatch som" : "legend-swatch breakeven"} />{item.name}</span>
            ))}
          </div>
        </Card>
        <Card className="route-card">
          <div>
            <span className="eyebrow">Export first</span>
            <h3>India → Mombasa</h3>
            <p>Direct transit: {data.shipping.transitLowDays}–{data.shipping.transitHighDays} days; allow up to ~{data.shipping.transitTransshipDays} with transshipment.</p>
            <DataTag level="sourced" sources={data.shipping.sources} />
          </div>
          <div className="route-art" aria-label="Schematic shipping route from India to Mombasa">
            <div className="route-point india-point"><i />India</div>
            <div className="route-line"><span className="route-vessel">◆</span></div>
            <div className="route-point kenya-point"><i />Mombasa</div>
            <span className="route-label">ARABIAN SEA · INDIAN OCEAN</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SourcesPanel() {
  const grades = ["A", "B", "C"];
  return (
    <div className="sources-layout">
      <Card className="verification-card">
        <span className="eyebrow">Before a decision</span>
        <h3>Open verification items</h3>
        <ol className="verification-list">
          {data.verificationItems.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}
        </ol>
      </Card>
      <div className="sources-main">
        <div className="source-grade-legend">
          {grades.map((grade) => (
            <span key={grade}><b>Grade {grade}</b>{grade === "C" ? " · verify before relying" : grade === "A" ? " · primary / strong" : " · secondary reporting"}</span>
          ))}
        </div>
        <div className="source-list">
          {sources.map((source) => (
            <article className="source-row" key={source.id}>
              <span className="source-id">{source.id}</span>
              <div className="source-info">
                <a href={source.url} target="_blank" rel="noreferrer">{source.title}<span aria-hidden="true"> ↗</span></a>
                <span className={`grade-badge grade-${source.grade[0].toLowerCase()}`}>Grade {source.grade}</span>
                {source.grade === "C" ? <span className="verify-warning">Verify before relying</span> : null}
                <code>{source.url}</code>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StrategyDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const reduceMotion = useReducedMotion();

  const selectTab = useCallback((id: TabId) => {
    setActiveTab(id);
    document.getElementById(`tab-panel-${id}`)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start"
    });
  }, [reduceMotion]);

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, current: TabId) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === current);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.id);
    document.getElementById(`tab-${nextTab.id}`)?.focus();
    document.getElementById(`tab-panel-${nextTab.id}`)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start"
    });
  };

  const panels: Record<TabId, React.ReactNode> = {
    overview: (
      <SectionReveal>
        <SectionHeading
          eyebrow={`Executive brief · ${new Date(`${data.reportDate}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}`}
          title="Africa is a strategic option, not yet a volume engine."
          description="Export from India first. Build in Africa only at a volume gate. The market is moving; Ather’s addressable premium opportunity remains a hypothesis to prove."
        />
        <div className="metric-grid">
          <Counter value={data.headline.marketUnits2025.value} label="African e2W sales · 2025" confidence="sourced" sourceIds={data.headline.marketUnits2025.sources} />
          <Counter value={data.headline.motorcyclesUnits2024.value} label="Motorcycles & scooters · 2024" suffix=" total" confidence="sourced" sourceIds={data.headline.motorcyclesUnits2024.sources} />
          <Counter value={data.headline.atherCapacityAnnual.value} label="Ather Hosur capacity / yr" confidence="sourced" sourceIds={data.headline.atherCapacityAnnual.sources} />
          <Counter value={data.headline.baseSom2030.value} label="Ather base-case SOM · 2030 / yr" confidence="derived" sourceIds={data.headline.baseSom2030.sources} formula={data.headline.baseSom2030.formula} />
        </div>
        <div className="overview-bottom">
          <Card className="core-thesis">
            <span className="eyebrow">Strategic read-through</span>
            <h3>Capacity is not the constraint.<br /><em>Proof of product-market fit is.</em></h3>
            <p>Africa’s e2W transition is real, but today’s addressable market is concentrated in high-utilization, price-sensitive commercial fleets with closed swap ecosystems. Ather should learn through a disciplined export pilot before committing manufacturing capital. Current e2W sales are about <strong>{((data.headline.marketUnits2025.value / data.headline.motorcyclesUnits2024.value) * 100).toFixed(1)}%</strong> of the annual motorcycle market.</p>
            <div className="thesis-foot">
              <div className="thesis-foot-item"><span>Base-case revenue · {data.modelYear}</span><b>${compact(data.headline.annualBaseRevenueUSD.low)}–${compact(data.headline.annualBaseRevenueUSD.high)} / yr</b><Confidence level={data.headline.annualBaseRevenueUSD.confidence} /></div>
              <div className="thesis-foot-item"><span>Decision posture</span><b>Option value · gated investment</b></div>
              <DataTag level="derived" sources={[...data.headline.marketUnits2025.sources, ...data.headline.motorcyclesUnits2024.sources]} formula="2025 e2W sales ÷ 2024 motorcycle and scooter sales. Years differ; treat this as an approximate market-share indicator." />
            </div>
          </Card>
          <Card className="thesis-numbers">
            <div className="card-heading-row"><div><span className="eyebrow">Scale perspective</span><h3>2030 scenario range</h3></div><Confidence level="assumption" /></div>
            {data.headline.somScenarios.map((scenario) => (
              <div className="scenario-row" key={scenario.name}>
                <span>{scenario.name}</span>
                <div className="scenario-track"><i style={{ width: `${(scenario.value / data.headline.somScenarios[2].value) * 100}%` }} /></div>
                <b>{compact(scenario.value)} / yr</b>
                <Confidence level="assumption" />
              </div>
            ))}
            <p className="microcopy">Scenario endpoints are modelling assumptions, not sourced forecasts.</p>
          </Card>
        </div>
      </SectionReveal>
    ),
    market: (
      <SectionReveal>
        <SectionHeading eyebrow="01 · Market sizing" title="A large TAM does not equal an Ather market." description="Apply progressively tighter filters to the African two-wheeler base. The continent-level funnel makes each assumption explicit." />
        <div className="market-intro">
          <Card className="market-context">
            <span className="eyebrow">From total market to served market</span>
            <p>2024 motorcycle and scooter sales provide the broad base. African e2W sales grew from below {compact(data.headline.marketUnits2020UpperBound.value)} in 2020 to {compact(data.headline.marketUnits2025.value)} in 2025. The funnel overlays {data.modelYear} electrification, product affordability / fit and a realistic Ather share of serviceable demand.</p>
            <DataTag level="sourced" sources={["S4", "S5"]} />
          </Card>
          <Card className="formula-card">
            <span className="eyebrow">Formula · continent, 2030</span>
            <strong>{compact(data.headline.market2030.value)} × {(data.headline.mix2030.eShare * 100).toFixed(0)}% × {(data.headline.mix2030.fitShare * 100).toFixed(0)}% × {(data.headline.mix2030.atherShare * 100).toFixed(0)}% ≈ {compact(data.headline.baseSom2030.value)}</strong>
            <div className="formula-steps"><span>TAM</span><span>e-share</span><span>fit-share</span><span>Ather share</span></div>
            <DataTag level="assumption" sources={["S5"]} formula={data.headline.baseSom2030.formula} />
          </Card>
        </div>
        <MarketFunnel />
        <div className="section-callout"><b>Strategic implication</b><span>Even the aggressive scenario is small beside Ather’s existing annual capacity. Do not confuse manufacturing capacity with African demand.</span></div>
      </SectionReveal>
    ),
    countries: (
      <SectionReveal>
        <SectionHeading eyebrow="02 · Country explorer" title="Lead with Kenya. Earn the right to expand." description="Country sizing is uneven. Select a market to inspect its range, policy context and placeholder discipline; adjust ranking weights to reflect management priorities." />
        <CountryExplorer />
      </SectionReveal>
    ),
    product: (
      <SectionReveal>
        <SectionHeading eyebrow="03 · Product strategy" title="Choose the rider before choosing the vehicle." description="A commercial swap-first offer and a premium consumer scooter are different businesses, with different capital and channel requirements." />
        <ProductFork />
        <Card className="competitor-price-card">
          <div className="card-heading-row"><div><span className="eyebrow">Price context</span><h3>Premium is a positioning choice—not a market-wide default.</h3></div><span className="chart-unit">USD · reported / converted</span></div>
          <div className="price-range-list">
            {data.products.rivalPriceAnchor.map((item) => {
              const width = Math.max(3, ((item.high - item.low) / 2500) * 100);
              return (
                <div className="price-range-row" key={item.name}>
                  <span>{item.name}</span>
                  <div className="price-axis"><i style={{ left: `${(item.low / 3200) * 100}%`, width: `${width}%` }} /><b style={{ left: `${(item.low / 3200) * 100}%` }} /></div>
                  <strong>{money(item.low)}{item.high !== item.low ? `–${money(item.high)}` : ""}</strong>
                  <SourceRefs ids={[item.source]} />
                </div>
              );
            })}
          </div>
          <p className="chart-caption">Indicative public price points; models, markets and landed-vs-retail basis differ.</p>
        </Card>
        <div className="insight-grid">
          <Card className="insight-card"><span className="insight-icon">01</span><h3>Commercial use cases run hard.</h3><p>Riders reportedly swap batteries around {data.riderEconomics.swapsPerDay} times daily. Range and uptime are core product requirements, not optional extras.</p><DataTag level="sourced" sources={["S19"]} /></Card>
          <Card className="insight-card"><span className="insight-icon">02</span><h3>Battery ecosystems are closed.</h3><p>Existing operators largely control their own swap networks. Ather currently home-charges; Path A needs a compatible variant or a committed partner.</p><DataTag level="sourced" sources={["S11", "S13"]} /></Card>
          <Card className="insight-card"><span className="insight-icon">03</span><h3>Petrol remains the real rival.</h3><p>Incumbent motorcycles set the affordability, service and residual-value benchmark for commercial riders.</p><DataTag level="sourced" sources={["S14"]} /></Card>
        </div>
      </SectionReveal>
    ),
    simulator: (
      <SectionReveal>
        <SectionHeading eyebrow="04 · Entry-mode simulator" title="Assembly only clears at meaningful scale." description="Adjust FX, price, freight, packing, duty and fixed cost. All calculations run in the browser; the model below shows the volume hurdle against the continental SOM scenarios." />
        <CostSimulator />
      </SectionReveal>
    ),
    rider: (
      <SectionReveal>
        <SectionHeading eyebrow="05 · Rider economics" title="Operating savings matter. Upfront affordability still decides." description="A directional Nairobi boda economics view. Change the vehicle price to see the cash payback before financing, downtime, maintenance or residual value." />
        <RiderEconomics />
      </SectionReveal>
    ),
    competitors: (
      <SectionReveal>
        <SectionHeading eyebrow="06 · Competitive landscape" title="The competitive set is an ecosystem—not just a badge." description="Map vehicle makers, swapping platforms and petrol incumbents together. Price bands are indicative and cited individually." />
        <CompetitorLandscape />
      </SectionReveal>
    ),
    roadmap: (
      <SectionReveal>
        <SectionHeading eyebrow="07 · Go-to-market roadmap" title="Export. Learn. Localize at a gate." description="A staged path protects capital while building proof in-market. Each phase has an explicit go/no-go condition; cost and timing are planning assumptions." />
        <Roadmap />
      </SectionReveal>
    ),
    risks: (
      <SectionReveal>
        <SectionHeading eyebrow="08 · Risk register" title="The biggest risks are execution and evidence." description="Mitigate the known unknowns before committing to inventory, localized assembly or a proprietary battery network." />
        <RiskRegister />
      </SectionReveal>
    ),
    decision: (
      <SectionReveal>
        <SectionHeading eyebrow="09 · Leadership decision" title={data.recommendation.title} description={data.recommendation.summary} />
        <div className="decision-gates">
          {data.recommendation.gates.map((gate) => (
            <Card className="decision-gate" key={gate.number}>
              <span className="gate-number">{gate.number}</span><span className="eyebrow">Go / no-go gate</span><h3>{gate.title}</h3><p>{gate.text}</p>
              {gate.number === "03" ? <Confidence level="assumption" /> : null}
            </Card>
          ))}
        </div>
        <Card className="decision-request">
          <span className="eyebrow">Decision requested</span><h3>{data.recommendation.decision}</h3>
          <a className="button-link" href="#tab-panel-assumptions" onClick={() => selectTab("assumptions")}>Review assumptions <span aria-hidden="true">↗</span></a>
          <button type="button" className="text-button" onClick={() => selectTab("sources")}>Review sources & verification list</button>
        </Card>
      </SectionReveal>
    ),
    supplyChain: (
      <SectionReveal>
        <SectionHeading
          eyebrow="10 · Supply chain & logistics"
          title="Design the Africa route around a proven India supply base."
          description="The proposed flow connects sourcing and Hosur production to an export-led Kenya pilot, then local after-sales. These operating details were supplied for this brief and need Ather validation."
        />
        <SupplyChainFlow />
      </SectionReveal>
    ),
    liveDashboard: (
      <SectionReveal>
        <SectionHeading
          eyebrow="11 · Possible next phase"
          title="Turn the strategy brief into a living decision system."
          description="A live dashboard could replace periodic market snapshots with an auditable, frequently refreshed view of demand, country economics and pilot performance. Start with a narrow decision-support MVP—not a promise of real-time Africa-wide data."
        />
        <LiveDashboardPlan />
      </SectionReveal>
    ),
    assumptions: (
      <SectionReveal>
        <SectionHeading eyebrow="Appendix A · Assumptions" title="Separate the knowns from the model." description="Every editable modelling choice is labelled. Assumptions are inputs for discussion—not external facts or management commitments." />
        <AssumptionsPanel />
      </SectionReveal>
    ),
    sources: (
      <SectionReveal>
        <SectionHeading eyebrow="Appendix S · Sources & verification" title="Evidence, reliability and open checks." description="Source IDs are attached to sourced and derived metrics throughout. Grade C references should be verified before relying on them." />
        <SourcesPanel />
      </SectionReveal>
    )
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" onClick={() => selectTab("overview")} aria-label="Ather Africa strategy home">
          <span className="brand-mark">A</span><span>ATHER<span className="brand-separator"> / </span>AFRICA</span>
        </a>
        <div className="topbar-right"><span className="live-dot" /> STRATEGY BRIEF <span className="topbar-divider">·</span> {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${data.reportDate}T00:00:00Z`)).toUpperCase()}</div>
      </header>
      <div id="top" className="hero-strip">
        <div className="hero-copy">
          <span className="eyebrow">Market entry · leadership decision</span>
          <h1>Scale later.<br /><i>Learn first.</i></h1>
          <p>A gated, export-led entry strategy for Africa’s electric two-wheeler market.</p>
        </div>
        <div className="hero-side">
          <div className="hero-side-line"><span>RECOMMENDATION</span><b>Kenya CBU pilot</b></div>
          <div className="hero-side-line"><span>MANUFACTURING</span><b>Defer to volume gate</b></div>
          <div className="hero-side-line"><span>CONFIDENCE</span><b>Evidence mixed · verify key inputs</b></div>
        </div>
        <div className="hero-watermark" aria-hidden="true">AFRICA</div>
      </div>
      <nav className="tab-shell" aria-label="Strategy topics">
        <div className="tab-bar" role="tablist" aria-label="Strategy topics">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tab-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={activeTab === tab.id ? "topic-tab active" : "topic-tab"}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
            >
              <span className="tab-index">{tab.short}</span>{tab.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="tab-content">
        {tabs.map((tab) => (
          <section
            id={`tab-panel-${tab.id}`}
            className={activeTab === tab.id ? "tab-panel active" : "tab-panel"}
            key={tab.id}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            tabIndex={0}
          >
            {panels[tab.id]}
          </section>
        ))}
      </div>
      <footer className="footer">
        <div><span className="brand-mark small">A</span><span>ATHER <span className="brand-separator">/</span> AFRICA</span></div>
        <span>Internal strategy discussion · All assumptions subject to validation</span>
        <button type="button" onClick={() => selectTab("sources")}>Sources & verification ↑</button>
      </footer>
    </main>
  );
}

function RiderEconomics() {
  const rider = data.riderEconomics;
  const [priceKes, setPriceKes] = useState(rider.priceKes);
  const [petrol, setPetrol] = useState(rider.petrolPerDayKes);
  const [electric, setElectric] = useState(rider.electricPerDayKes);
  const dailySavings = petrol - electric;
  const daysToPayback = dailySavings > 0 ? Math.ceil(priceKes / dailySavings) : null;
  const earningsMidpoint = (rider.earningsLowKes + rider.earningsHighKes) / 2;
  const savingsShare = petrol > 0 ? (dailySavings / petrol) * 100 : 0;

  return (
    <div className="rider-layout">
      <Card className="rider-calculator">
        <div className="card-heading-row"><div><span className="eyebrow">Editable · daily economics</span><h3>Nairobi commercial rider</h3></div><span className="input-state">Client-side</span></div>
        <RiderSlider label="Vehicle purchase price" value={priceKes} min={80000} max={600000} step={5000} format={(v) => `KSh ${integer(v)}`} onChange={setPriceKes} sources={["S10"]} />
        <RiderSlider label="Petrol / day" value={petrol} min={250} max={2500} step={50} format={(v) => `KSh ${integer(v)}`} onChange={setPetrol} sources={["S19"]} />
        <RiderSlider label="Electric / day" value={electric} min={50} max={1000} step={25} format={(v) => `KSh ${integer(v)}`} onChange={setElectric} sources={["S19"]} />
        <div className="rider-result"><span>Daily operating-cost saving</span><strong>KSh {integer(dailySavings)}</strong><span>~{savingsShare.toFixed(0)}% below petrol operating cost</span><DataTag level="derived" sources={rider.sources} formula="Petrol spend per day − electric spend per day; savings share = daily saving ÷ petrol spend." /></div>
        <p className="sim-caveat">{rider.priceAssumption}</p>
      </Card>
      <div className="rider-side">
        <Card className="rider-payback">
          <span className="eyebrow">Simple payback · no financing</span>
          <strong>{daysToPayback === null ? "Not reached" : `${integer(daysToPayback)} days`}</strong>
          <span className="muted-note">Daily vehicle-price recovery at current assumed saving; excludes financing, maintenance, uptime and resale.</span>
          <DataTag level="derived" sources={rider.sources} formula="Vehicle purchase price ÷ (petrol spend per day − electric spend per day); excludes financing and other ownership costs." />
        </Card>
        <Card className="rider-context">
          <span className="eyebrow">Reported daily earnings</span>
          <strong>KSh {integer(rider.earningsLowKes)}–{integer(rider.earningsHighKes)}</strong>
          <span>Midpoint: KSh {integer(earningsMidpoint)} / day</span>
          <div className="rider-income-bar"><i style={{ width: `${Math.min(100, (dailySavings / earningsMidpoint) * 100)}%` }} /></div>
          <p>Energy savings are material relative to take-home earnings, but daily cash flow and access to affordable finance remain decisive.</p>
          <DataTag level="sourced" sources={rider.sources} />
        </Card>
      </div>
    </div>
  );
}

function RiderSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  sources
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  sources: readonly string[];
}) {
  return (
    <label className="sim-slider rider-slider">
      <span>{label}<b>{format(value)}</b></span>
      <DataTag level="sourced" sources={sources} />
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function CompetitorLandscape() {
  const categories = ["Vehicle / fleet", "Battery swap network", "Petrol incumbent"] as const;
  const [filter, setFilter] = useState<(typeof categories)[number] | "All">("All");
  const items = data.competitors.filter((competitor) => {
    if (filter === "All") return true;
    if (filter === "Vehicle / fleet") return !competitor.segment.toLowerCase().includes("swapping") && !competitor.segment.toLowerCase().includes("petrol");
    if (filter === "Battery swap network") return competitor.segment.toLowerCase().includes("swap");
    return competitor.segment.toLowerCase().includes("petrol");
  });
  return (
    <div className="competitor-layout">
      <Card className="competitor-quote">
        <span className="eyebrow">Competitive reality</span>
        <blockquote>“The real competitor is the petrol bike.”</blockquote>
        <DataTag level="sourced" sources={["S14"]} />
        <p>Winning a rider means beating the incumbent on cost, uptime, service access and financing—not only offering an electric drivetrain.</p>
      </Card>
      <Card className="competitor-table-card">
        <div className="card-heading-row">
          <div><span className="eyebrow">Market map</span><h3>Who owns the vehicle—and the energy?</h3></div>
          <div className="filter-row" aria-label="Filter competitors">
            {(["All", ...categories] as const).map((option) => (
              <button type="button" key={option} className={filter === option ? "filter-chip selected" : "filter-chip"} onClick={() => setFilter(option)}>{option}</button>
            ))}
          </div>
        </div>
        <div className="competitor-table">
          <div className="competitor-table-head"><span>Operator / brand</span><span>Focus</span><span>Presence</span><span>Indicative USD</span></div>
          {items.map((item) => (
            <div className="competitor-table-row" key={item.name}>
              <div><strong>{item.name}</strong><small>{item.note}</small><DataTag level={item.confidence} sources={item.sources} /></div>
              <span>{item.segment}</span><span>{item.presence}</span>
              <strong>{item.priceLow === null ? "—" : `${money(item.priceLow)}${item.priceHigh !== item.priceLow ? `–${money(item.priceHigh)}` : ""}`}</strong>
            </div>
          ))}
        </div>
      </Card>
      <div className="section-callout"><b>Implication for Ather</b><span>A partner-first battery strategy is the lower-capital route into commercial fleets; a premium home-charge offer is a cleaner pilot hypothesis for existing products.</span></div>
    </div>
  );
}

function Roadmap() {
  return (
    <div className="roadmap">
      <div className="roadmap-spine" aria-hidden="true" />
      {data.roadmap.map((phase, index) => (
        <article className="roadmap-phase" key={phase.phase}>
          <div className="phase-marker"><span>{phase.phase}</span></div>
          <Card className={`phase-card ${index === 0 ? "phase-current" : ""}`}>
            <div className="phase-card-top"><span className="eyebrow">{phase.timing}</span><span className="phase-cost"><Confidence level={phase.costConfidence} /> {phase.costRange}</span></div>
            <h3>{phase.name}</h3><p className="phase-mode">{phase.mode}</p>
            <div className="phase-gate"><span>GO / NO-GO GATE</span><p>{phase.gate}</p></div>
            <DataTag level={phase.durationConfidence} sources={phase.sources} formula="Planning range only; timing and cost require bottom-up validation." />
          </Card>
        </article>
      ))}
    </div>
  );
}

function RiskRegister() {
  const levelClass = (exposure: string) => exposure.toLowerCase() === "high" ? "risk-high" : "risk-medium";
  return (
    <Card className="risk-card">
      <div className="risk-table">
        <div className="risk-head"><span>Risk</span><span>Exposure</span><span>Mitigation / control</span><span>Source</span></div>
        {data.risks.map((item) => (
          <div className="risk-row" key={item.risk}>
            <strong>{item.risk}</strong><span className={`risk-level ${levelClass(item.exposure)}`}>{item.exposure}</span><p>{item.mitigation}</p><SourceRefs ids={item.sourceIds} />
          </div>
        ))}
      </div>
      <div className="risk-footnote"><span>Priority: resolve duty, freight and registration evidence before pilot purchase orders.</span><button type="button" onClick={() => document.getElementById("tab-sources")?.click()}>Open verification list →</button></div>
    </Card>
  );
}

function AssumptionsPanel() {
  return (
    <>
      <div className="assumption-banner"><span className="assumption-symbol">!</span><div><b>Assumptions are not facts.</b><p>Use the simulator sliders to challenge landed-cost assumptions live. Change country-screening weights in the Country Explorer. Core source values remain visible with citation links.</p></div></div>
      <div className="assumption-grid">
        <Card className="assumption-card"><span className="eyebrow">Market model</span><h3>Top-down 2030 sizing</h3><div className="assumption-equation">{compact(data.headline.market2030.value)} × {Math.round(data.headline.mix2030.eShare * 100)}% × {Math.round(data.headline.mix2030.fitShare * 100)}% × {Math.round(data.headline.mix2030.atherShare * 100)}%</div><p>Market base is a sourced forecast; adoption, fit and attainable share are modelling assumptions.</p><DataTag level="assumption" sources={["S5"]} formula="2.3M × 15% e-share × 12% Ather-fit share × 6% Ather share of SAM = 2,484 units (~2,500)." /></Card>
        <Card className="assumption-card"><span className="eyebrow">FX + factory gate</span><h3>Pricing & capacity inputs</h3><AssumptionRow label="USD / INR" value={String(data.costModel.usdInr)} /><AssumptionRow label="Rizta S ex-showroom proxy" value={`₹${integer(data.products.atherPriceInr)}`} /><AssumptionRow label="Ather 450 ex-showroom" value={`₹${integer(data.products.atherPriceRizta450Inr)}`} /><AssumptionRow label="Hosur capacity / yr" value={integer(data.headline.atherCapacityAnnual.value)} /><AssumptionRow label="With Factory 3.0 / yr" value={integer(data.headline.atherCapacityWithFactory3Annual.value)} /><AssumptionRow label="Ather revenue / unit" value={money(data.costModel.revenuePerUnit)} /><AssumptionRow label="Landed retail target" value={`${money(data.products.pathB.priceLow)}–${money(data.products.pathB.priceHigh)}`} /><DataTag level="assumption" sources={["S29", "S30"]} formula="India ex-showroom used as an ex-factory proxy overstates export cost; capacity and retail values are source-backed or stated modelling assumptions." /></Card>
        <Card className="assumption-card"><span className="eyebrow">Logistics + assembly</span><h3>Container & fixed cost</h3><AssumptionRow label="40ft spot freight" value={money(data.costModel.containerRate40ft)} /><AssumptionRow label="CBU / SKD / CKD units" value={`${data.costModel.unitsCbu} / ${data.costModel.unitsSkd} / ${data.costModel.unitsCkd}`} /><AssumptionRow label="CBU logistics / unit" value={`${money(data.costModel.cbuLogisticsLow)}–${money(data.costModel.cbuLogisticsHigh)}`} /><AssumptionRow label="CKD logistics / unit" value={`${money(data.costModel.ckdLogisticsLow)}–${money(data.costModel.ckdLogisticsHigh)}`} /><AssumptionRow label="Assembly fixed cost / yr" value={money(data.costModel.annualFixedAssembly)} /><DataTag level="assumption" sources={["S27", "S28"]} formula="Packing counts, logistics ranges and assembly fixed cost are assumptions; source freight quote is dated/refresh-sensitive." /></Card>
        <Card className="assumption-card"><span className="eyebrow">Country adoption</span><h3>Fit share & 2030 e-share</h3>{data.countries.filter((country) => country.fitShare !== null).map((country) => <AssumptionRow key={country.iso} label={`${country.name} fit-share`} value={`${(country.fitShare! * 100).toFixed(0)}%`} />)}<p className="microcopy">Country e-share assumptions (where modelled): {data.countries.filter((country) => country.eShare2030 !== null).map((country) => `${country.name} ${(country.eShare2030! * 100).toFixed(0)}%`).join(", ")}. Ather share of SAM range: {(data.headline.atherShareOfSamRange.low * 100).toFixed(0)}–{(data.headline.atherShareOfSamRange.high * 100).toFixed(0)}%.</p><Confidence level="assumption" /></Card>
        <Card className="assumption-card"><span className="eyebrow">Rider calculator</span><h3>Representative Nairobi day</h3><AssumptionRow label="Petrol spend / day" value={`KSh ${integer(data.riderEconomics.petrolPerDayKes)}`} /><AssumptionRow label="Electric spend / day" value={`KSh ${integer(data.riderEconomics.electricPerDayKes)}`} /><AssumptionRow label="Earnings / day" value={`KSh ${integer(data.riderEconomics.earningsLowKes)}–${integer(data.riderEconomics.earningsHighKes)}`} /><AssumptionRow label="KES / USD conversion" value={String(data.riderEconomics.kesPerUsd)} /><DataTag level="derived" sources={data.riderEconomics.sources} formula={`Approximate conversion = KSh ${integer(data.riderEconomics.kesUsdDerivation.kes)} ÷ ${money(data.riderEconomics.kesUsdDerivation.usd)}. Vehicle price and financing are unverified.`} /></Card>
        <Card className="assumption-card"><span className="eyebrow">Rider calculator</span><h3>Representative Nairobi day</h3><AssumptionRow label="Petrol spend / day" value={`KSh ${integer(data.riderEconomics.petrolPerDayKes)}`} /><AssumptionRow label="Electric spend / day" value={`KSh ${integer(data.riderEconomics.electricPerDayKes)}`} /><AssumptionRow label="Earnings / day" value={`KSh ${integer(data.riderEconomics.earningsLowKes)}–${integer(data.riderEconomics.earningsHighKes)}`} /><AssumptionRow label="KES / USD conversion" value={String(data.riderEconomics.kesPerUsd)} /><DataTag level="sourced" sources={data.riderEconomics.sources} formula="Approximate conversion inferred from reported Yadea KSh388,320 / $3,000. Vehicle price and financing are unverified." /></Card>
        <Card className="assumption-card"><span className="eyebrow">Volume scenarios</span><h3>Strategic scenarios—not forecasts</h3>{data.headline.somScenarios.map((scenario) => <AssumptionRow key={scenario.name} label={`${scenario.name} SOM / yr`} value={`~${integer(scenario.value)}`} />)}<AssumptionRow label="Country base-case total" value={`~${integer(data.countries.reduce((sum, c) => sum + (c.som2030 ?? 0), 0))}`} /><p className="microcopy">Includes placeholders for Rwanda and Ethiopia; no underlying volume series located.</p><Confidence level="assumption" /></Card>
      </div>
      <Card className="caveat-card">
        <span className="eyebrow">Model limitations</span>
        {data.costModel.caveats.map((caveat) => <p key={caveat}>• {caveat}</p>)}
      </Card>
      <Card className="caveat-card international-card">
        <span className="eyebrow">International-entry precedent</span>
        <div className="international-list">
          {data.atherInternationalExperience.map((entry) => (
            <div className="international-row" key={`${entry.market}-${entry.timing}`}>
              <strong>{entry.market}</strong><span>{entry.timing}</span><span>{entry.route}</span><SourceRefs ids={entry.sources} />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function AssumptionRow({ label, value }: { label: string; value: string }) {
  return <div className="assumption-row"><span>{label}</span><b>{value}</b></div>;
}

function SupplyChainFlow() {
  return (
    <>
      <div className="supply-validation-banner">
        <span className="assumption-symbol">!</span>
        <div>
          <b>Working hypothesis · verify with Ather</b>
          <p>The specific supplier origins, in-house manufacturing scope, ERP / SAP use, IoT coverage and warehouse footprint below were supplied in the brief. This website has not independently verified them.</p>
        </div>
      </div>
      <Card className="supply-flow-card">
        <div className="card-heading-row">
          <div><span className="eyebrow">Indicative export-led network</span><h3>From component supply to rider support</h3></div>
          <Confidence level="assumption" />
        </div>
        <div className="supply-flow" role="img" aria-label="Supply chain flow from tier-one and global suppliers through Hosur factory and ocean freight to country distributors and riders, with a service-parts loop.">
          {data.supplyChain.flow.map((stage, index) => (
            <div className="supply-flow-unit" key={stage.stage}>
              <article className={`supply-stage supply-${stage.category}`}>
                <span className="supply-stage-number">{stage.stage}</span>
                <h4>{stage.title}</h4>
                <span className="supply-stage-subtitle">{stage.subtitle}</span>
                <p>{stage.details}</p>
                <Confidence level={stage.confidence} />
              </article>
              {index < data.supplyChain.flow.length - 1 ? <span className="supply-arrow" aria-hidden="true">→</span> : null}
            </div>
          ))}
        </div>
        <div className="supply-transit">
          <span>OCEAN LANE · INDIA → EAST AFRICA</span>
          <b>{data.shipping.transitLowDays}–{data.shipping.transitHighDays} days direct</b>
          <DataTag level="sourced" sources={data.shipping.sources} />
          <small>Up to ~{data.shipping.transitTransshipDays} days with transshipment. Separate freight and customs quote required.</small>
        </div>
        <div className="supply-channel-options">
          <div><span className="eyebrow">Pilot mode · now</span><b>Export CBU via distributor</b><small>Ship finished vehicles, learn service and demand, preserve capital.</small></div>
          <span aria-hidden="true">→</span>
          <div><span className="eyebrow">Localization · only at gate</span><b>Contract SKD / CKD</b><small>{data.supplyChain.africaAssemblyGate}</small></div>
        </div>
      </Card>
      <div className="supply-support-grid">
        {data.supplyChain.supportFlows.map((item, index) => (
          <Card className="supply-support-card" key={item.title}>
            <span className="insight-icon">{String(index + 1).padStart(2, "0")}</span>
            <h3>{item.title}</h3>
            <p>{item.details}</p>
            <Confidence level="assumption" />
          </Card>
        ))}
      </div>
      <Card className="supply-validation-card">
        <div className="card-heading-row"><div><span className="eyebrow">Before treating this as an operating map</span><h3>Validate the connections, owners and costs</h3></div><span className="input-state">Due diligence</span></div>
        <div className="supply-verify-grid">
          <p><b>Procurement:</b> confirm supplier locations, in-house vs outsourced content, cell chemistry, concentration, lead times and approved alternates.</p>
          <p><b>Hosur:</b> confirm plant scope, capacity allocation, quality gates, export readiness, traceability and actual systems available for data access.</p>
          <p><b>Export route:</b> obtain current shipment quote, HS classification, country duty, homologation, port-to-dealer time and Incoterms.</p>
          <p><b>Country operations:</b> identify importer of record, distributor, warranty obligations, service locations, spare stock and returns process.</p>
          <p><b>Charging:</b> distinguish Ather Grid's current India network from any proposed Africa deployment or local partner arrangement.</p>
          <p><b>Reverse flow:</b> map warranty returns, battery transport, repair / refurbishment and country rules for used cells and end-of-life packs.</p>
        </div>
      </Card>
      <div className="section-callout"><b>Leadership implication</b><span>Use the India supply base for a limited pilot; validate the export lane and after-sales loop before adding assembly. The supply chain is a hypothesis to diligence, not yet an Africa-ready design.</span></div>
    </>
  );
}

function LiveDashboardPlan() {
  const dataGroups = [
    {
      phase: "01",
      title: "Market signals",
      cadence: "Monthly / quarterly",
      fields: "Country registrations, new sales, e2W imports and exports, make/model, retail prices, market share, published EV-policy and tax changes.",
      sources: "KNBS, NBS, KRA and customs data; country ministries; importer / dealer checks; public company reporting.",
      confidence: "Data definitions, coverage and release dates differ by country. Record source, observation period and revision history."
    },
    {
      phase: "02",
      title: "Ather pilot operations",
      cadence: "Weekly / monthly",
      fields: "Orders, invoices, inventory, active vehicles, utilization, realized price, refunds, dealer funnel, warranty events, service turnaround and unit contribution.",
      sources: "Ather ERP / CRM / service systems; distributor submissions; opt-in pilot fleet telemetry where lawful.",
      confidence: "Requires agreed metric definitions, stable identifiers and distributor data-sharing obligations."
    },
    {
      phase: "03",
      title: "Unit economics & execution",
      cadence: "Per shipment / monthly",
      fields: "USD/INR and local FX, freight quotes and actual invoices, HS-code duty, port and inland cost, container fill, assembly cost, margin and payment / repatriation status.",
      sources: "Treasury, freight forwarders, customs brokers, purchase orders, finance and country tax counsel.",
      confidence: "Rates are date-, route-, Incoterm- and eligibility-specific; show quote dates and scenarios, not timeless single values."
    },
    {
      phase: "04",
      title: "Rider & ecosystem",
      cadence: "Quarterly research",
      fields: "Rider income and energy spend, charging / swapping access, uptime, financing terms, willingness to pay, competitor launches and service footprint.",
      sources: "Structured rider research, dealer surveys, partner network coverage and public price observations.",
      confidence: "Survey samples may not represent all riders; consent and privacy limits apply, especially to location and vehicle telemetry."
    }
  ];

  const phases = [
    { stage: "Scope + data handoff", duration: "Days 1–2", items: "Confirm one decision owner, Kenya-only scope, a small KPI set, sample CSVs and privacy/security requirements." },
    { stage: "Build the MVP", duration: "Days 3–7", items: "Adapt this Next.js brief into a restricted Vercel preview; add a small set of manually updated, source-labelled pilot and landed-cost metrics." },
    { stage: "Review + handover", duration: "Days 8–10", items: "Validate sample outputs with owners, fix obvious data-quality issues, document updates and agree what must be automated later." }
  ];

  return (
    <>
      <div className="dashboard-plan-callout">
        <span className="plan-spark" aria-hidden="true">↗</span>
        <div>
          <span className="eyebrow">Potential leadership value</span>
          <p>Make market-entry decisions using one current, traceable view: spot a deteriorating country case sooner, compare realized pilot economics to the approved case, and make localization a measured gate rather than an intuition.</p>
        </div>
      </div>
      <div className="live-benefit-grid">
        <Card className="live-benefit">
          <span className="insight-icon">01</span><h3>Focus investment</h3>
          <p>Rank countries against adjustable strategic weights and see the specific evidence gaps behind each ranking.</p>
        </Card>
        <Card className="live-benefit">
          <span className="insight-icon">02</span><h3>Control pilot performance</h3>
          <p>Compare orders, utilization, service and contribution against pilot gates before expanding the commitment.</p>
        </Card>
        <Card className="live-benefit">
          <span className="insight-icon">03</span><h3>See economics move</h3>
          <p>Refresh FX, freight and tariff sensitivities by shipment and distinguish actual costs from quotes and assumptions.</p>
        </Card>
        <Card className="live-benefit">
          <span className="insight-icon">04</span><h3>Keep evidence auditable</h3>
          <p>Expose source, period, refresh date, owner, confidence and methodology alongside important metrics.</p>
        </Card>
      </div>
      <div className="live-plan-columns">
        <Card className="live-data-card">
          <div className="card-heading-row"><div><span className="eyebrow">What needs to feed it</span><h3>Data before dashboards</h3></div><span className="input-state">Illustrative</span></div>
          <div className="live-data-list">
            {dataGroups.map((group) => (
              <article className="live-data-item" key={group.phase}>
                <span className="live-data-number">{group.phase}</span>
                <div>
                  <div className="live-data-heading"><h4>{group.title}</h4><span>{group.cadence}</span></div>
                  <p><b>Fields:</b> {group.fields}</p>
                  <p><b>Likely owners / inputs:</b> {group.sources}</p>
                  <p className="live-data-caveat"><b>Watch-out:</b> {group.confidence}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="live-prereq"><b>Minimum prerequisite</b><span>Named business owner + data owners, approved definitions, sample data, access rights, refresh commitments and permission for leadership use.</span></div>
        </Card>
        <Card className="live-value-card">
          <span className="eyebrow">Decision outputs</span>
          <h3>Useful from the first release</h3>
          <ul className="live-output-list">
            <li><span>01</span><div><b>Country entry cockpit</b><small>Demand range, policy status, evidence freshness and a transparent rank.</small></div></li>
            <li><span>02</span><div><b>Pilot operating scorecard</b><small>Orders, active fleet, service performance and realized economics vs gate.</small></div></li>
            <li><span>03</span><div><b>Landed-cost monitor</b><small>CBU / SKD / CKD scenarios, current quotes and duty verification state.</small></div></li>
            <li><span>04</span><div><b>Assumptions & evidence register</b><small>Named owner, source, date, confidence, range and next validation action.</small></div></li>
          </ul>
          <div className="live-mvp-boundary"><b>Keep the MVP lean</b><p>Read-only leadership insights first. Do not start with live fleet tracking, automated customs decisions or an Africa-wide prediction model.</p></div>
        </Card>
      </div>
      <Card className="live-architecture-card">
        <div className="card-heading-row"><div><span className="eyebrow">Indicative implementation</span><h3>A secure, traceable pipeline—not just more charts</h3></div><Confidence level="assumption" /></div>
        <div className="architecture-flow" aria-label="Indicative dashboard architecture">
          <div className="architecture-node"><span>01</span><b>Authoritative inputs</b><small>Company feeds · approved external datasets · documented manual inputs</small></div>
          <span className="architecture-arrow" aria-hidden="true">→</span>
          <div className="architecture-node"><span>02</span><b>Ingestion & QA</b><small>Scheduled import · validation · reconciliation · freshness alerts</small></div>
          <span className="architecture-arrow" aria-hidden="true">→</span>
          <div className="architecture-node"><span>03</span><b>Governed data store</b><small>Versioned source values · role-based access · auditable metric definitions</small></div>
          <span className="architecture-arrow" aria-hidden="true">→</span>
          <div className="architecture-node"><span>04</span><b>Leadership views</b><small>Authenticated Next.js / Vercel application · decisions and scenario outputs</small></div>
        </div>
        <div className="architecture-security"><b>Security boundary:</b> this proposal is in a public repository. A production dashboard with Ather data should be moved to an approved private repository / organization and environment before connecting any confidential, personal or telemetry data. Do not place secrets or customer data in Git or public client-side JSON.</div>
      </Card>
      <Card className="live-timeline-card">
        <div className="card-heading-row"><div><span className="eyebrow">Indicative timing</span><h3>One–two week prototype plan</h3></div><Confidence level="assumption" formula="An aggressive estimate for one developer and a tightly scoped prototype, provided access, example files, owner decisions, Vercel access and security approval are ready on day one. Not a commitment to multiple automated live integrations or production hardening." /></div>
        <div className="live-timeline">
          {phases.map((phase) => (
            <article key={phase.stage} className="live-timeline-step">
              <span className="timeline-duration">{phase.duration}</span>
              <h4>{phase.stage}</h4>
              <p>{phase.items}</p>
            </article>
          ))}
        </div>
        <div className="timeline-total"><span>Target prototype</span><strong>~5–10 working days</strong><Confidence level="assumption" formula="One developer, one initial market, simple existing data files, and no procurement delay. Automated external feeds, enterprise authentication, security review and production-grade monitoring are explicitly out of this timebox." /></div>
        <div className="token-plan">
          <div><span className="eyebrow">AI usage · estimate, not a quote</span><h4>Tokens depend on the model and workflow.</h4></div>
          <p><b>Prototype build allowance:</b> roughly 1–3 million input tokens and 100,000–300,000 output tokens across AI-assisted coding / review is a planning assumption, not a guaranteed bill or a measured usage result.</p>
          <p><b>API cost formula:</b> (input tokens ÷ 1,000,000 × the chosen model’s input rate) + (output tokens ÷ 1,000,000 × its output rate), plus any tool charges. Check current provider rates and measure actual usage; a Copilot subscription may be billed differently from API tokens.</p>
          <p><b>Dashboard runtime:</b> no AI tokens are needed for the MVP as scoped. AI-generated commentary is optional and would add ongoing token cost; ordinary data refresh, hosting and any licensed feeds have separate costs.</p>
          <Confidence level="assumption" formula="Illustrative token envelope for an AI-assisted build; actual consumption depends on context size, model, retries and code review. It is not the token cost of using this dashboard." />
        </div>
      </Card>
      <Card className="live-limitations-card">
        <div className="card-heading-row"><div><span className="eyebrow">Limitations & controls</span><h3>What a live dashboard cannot fix</h3></div><span className="input-state">Plan for these</span></div>
        <div className="limitation-grid">
          <div><b>Missing / inconsistent data</b><p>Country registrations, imports and sales can disagree; refresh cannot make weak data representative. Preserve ranges and show gaps.</p></div>
          <div><b>Delayed, paid or changing feeds</b><p>Official releases may be slow; commercial datasets may require licences and change methodology. Show source timestamps and stale-data states.</p></div>
          <div><b>Forecasts remain assumptions</b><p>Scenario outputs depend on uncertain demand, adoption, price and policy. Do not present directional models as predictions.</p></div>
          <div><b>Operational metrics need owners</b><p>Distributor / ERP feeds need definitions, timely submission, reconciliation and escalation when they stop arriving.</p></div>
          <div><b>FX, tariff and landed cost move</b><p>Quotes and duty depend on the date, shipment, HS classification and eligibility; require human and local-counsel verification.</p></div>
          <div><b>Privacy and access are product work</b><p>Vehicle telemetry and rider data require consent, minimization, retention rules, controls, and the right security review—not just a Vercel URL.</p></div>
        </div>
      </Card>
      <div className="section-callout"><b>Recommended next action</b><span>Nominate an Ather business owner and analytics / data owner; agree the first Kenya pilot decisions and KPI definitions; test real sample feeds before committing to a dashboard schedule.</span></div>
    </>
  );
}
