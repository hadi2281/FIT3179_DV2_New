
const DATA_URL = "data/electricity.csv";
const MAP_DATA_URL = "data/country-map.csv";

const COLORS = {
  Coal: "#444444", Gas: "#D55E00", "Other fossil": "#A6A6A6",
  Hydro: "#0072B2", Wind: "#56B4E9", Solar: "#E69F00",
  Bioenergy: "#009E73", "Other renewables": "#CC79A7", Nuclear: "#6A3D9A",
  Fossil: "#D55E00", Renewables: "#009E73", Clean: "#0072B2"
};

const sourceOrder = [
  "Coal", "Gas", "Other fossil", "Hydro", "Wind",
  "Solar", "Bioenergy", "Other renewables", "Nuclear"
];

const chartConfig = {
  background: "transparent",
  font: "DM Sans, Arial, sans-serif",
  axis: {
    labelColor: "#62736e",
    titleColor: "#62736e",
    gridColor: "#e7e9e1",
    domainColor: "#d9ded5",
    tickColor: "#d9ded5",
    labelFontSize: 11,
    titleFontSize: 11
  },
  legend: {
    labelColor: "#465a53",
    titleColor: "#465a53",
    labelFontSize: 11,
    titleFontSize: 11
  },
  view: { stroke: null }
};

function val(d, key) {
  const n = Number(d[key]);
  return Number.isFinite(n) ? n : null;
}

function yearRows(rows, area, source) {
  return rows.filter(
    d => d.Area === area &&
         d["Electricity source"] === source &&
         val(d, "Year") !== null
  );
}

function latestYear(rows, area, sources) {
  const candidates = rows.filter(
    d => d.Area === area &&
         sources.includes(d["Electricity source"]) &&
         val(d, "Generation (TWh)") !== null
  );

  return candidates.length
    ? Math.max(...candidates.map(d => val(d, "Year")))
    : null;
}

function render(id, spec) {
  return vegaEmbed("#" + id, {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    config: chartConfig,
    ...spec
  }, {
    actions: false,
    renderer: "svg"
  });
}

function noData(id, message) {
  const el = document.querySelector("#" + id);
  if (el) el.innerHTML = `<p class="chart-desc">${message}</p>`;
}

function drawTileGrid(mapRows) {
  /*
   * Simplified tile-grid map.
   * Each listed ISO3 code has an approximate geographic position.
   * Tile colour represents clean electricity generation in TWh.
   *
   * This is a selected-country tile map, not a complete world map.
   */

  const tilePositions = [
    // North America
    ["CAN", 1, 1], ["USA", 2, 2], ["MEX", 2, 3],
    ["GTM", 3, 4], ["CUB", 4, 3], ["HTI", 5, 4],

    // South America
    ["COL", 5, 5], ["VEN", 6, 5], ["ECU", 5, 6],
    ["PER", 6, 6], ["BRA", 7, 7], ["BOL", 7, 8],
    ["CHL", 6, 9], ["ARG", 7, 9], ["URY", 8, 9],
    ["PRY", 8, 8],

    // Europe
    ["ISL", 8, 1], ["IRL", 9, 2], ["GBR", 10, 2],
    ["PRT", 10, 4], ["ESP", 11, 4], ["FRA", 11, 3],
    ["BEL", 12, 2], ["NLD", 13, 2], ["DEU", 13, 3],
    ["CHE", 12, 4], ["ITA", 13, 4], ["AUT", 14, 3],
    ["POL", 14, 2], ["CZE", 14, 4], ["DNK", 14, 1],
    ["NOR", 15, 1], ["SWE", 16, 1], ["FIN", 17, 1],
    ["UKR", 16, 3], ["GRC", 15, 5], ["ROU", 15, 4],

    // Africa
    ["MAR", 10, 5], ["DZA", 11, 6], ["TUN", 12, 5],
    ["EGY", 13, 6], ["SEN", 9, 7], ["GHA", 10, 8],
    ["NGA", 11, 8], ["CMR", 12, 8], ["COD", 13, 9],
    ["ETH", 14, 7], ["KEN", 14, 8], ["TZA", 15, 9],
    ["AGO", 12, 10], ["ZAF", 14, 11], ["MDG", 16, 10],

    // Asia
    ["TUR", 16, 5], ["SAU", 17, 6], ["IRN", 18, 5],
    ["KAZ", 19, 3], ["RUS", 20, 2], ["CHN", 21, 5],
    ["MNG", 22, 4], ["IND", 19, 7], ["PAK", 18, 7],
    ["BGD", 20, 8], ["NPL", 20, 7], ["LKA", 19, 9],
    ["THA", 21, 8], ["VNM", 22, 8], ["KHM", 22, 9],
    ["MYS", 21, 10], ["SGP", 22, 10], ["IDN", 23, 11],
    ["PHL", 24, 9], ["JPN", 25, 6], ["KOR", 24, 6],
    ["TWN", 24, 7],

    // Oceania
    ["AUS", 24, 12], ["NZL", 26, 12]
  ];

  const byIso = new Map(
    mapRows.map(d => [d.iso3, d])
  );

  const tiles = tilePositions
    .map(([iso3, x, y]) => {
      const d = byIso.get(iso3);

      if (
        !d ||
        d.year !== 2024 ||
        d.clean_generation === null ||
        !Number.isFinite(d.clean_generation)
      ) {
        return null;
      }

      return {
        iso3,
        country: d.country,
        x,
        y,
        clean_generation: d.clean_generation
      };
    })
    .filter(Boolean);

  if (!tiles.length) {
    noData(
      "clean-cartogram",
      "No tile-map data matched the listed country codes. Check data/country-map.csv."
    );
    return;
  }

  render("clean-cartogram", {
    width: "container",
    height: 390,
    data: { values: tiles },
    mark: {
      type: "rect",
      cornerRadius: 2,
      stroke: "#fffefa",
      strokeWidth: 2
    },
    encoding: {
      x: {
        field: "x",
        type: "ordinal",
        title: null,
        axis: null,
        scale: {
          paddingInner: 0.08,
          paddingOuter: 0.03
        }
      },
      y: {
        field: "y",
        type: "ordinal",
        title: null,
        axis: null,
        sort: "descending",
        scale: {
          paddingInner: 0.08,
          paddingOuter: 0.03
        }
      },
      color: {
        field: "clean_generation",
        type: "quantitative",
        title: "Clean generation (TWh)",
        scale: {
          scheme: "viridis",
          domainMin: 0
        }
      },
      tooltip: [
        { field: "country", type: "nominal", title: "Country" },
        { field: "clean_generation", type: "quantitative",
          title: "Clean generation (TWh)", format: ",.2f" }
      ]
    }
  }).then(() => {
    const heading = document.querySelector(
      "#clean-cartogram"
    )?.closest(".chart-card");

    const desc = heading?.querySelector(".chart-desc");

    if (desc) {
      desc.textContent =
        "Selected countries arranged approximately by geography. " +
        "Darker tiles indicate more clean electricity generation in 2024. " +
        "Missing tiles indicate countries not included in this simplified layout.";
    }
  }).catch(error => {
    console.error("Figure 08 tile map failed:", error);
  });
}

d3.csv(DATA_URL).then(async rows => {
  // FIG. 01 — Global generation by source over time
  const worldYear = latestYear(rows, "World", sourceOrder);

  const globalSources = rows
    .filter(d =>
      d.Area === "World" &&
      sourceOrder.includes(d["Electricity source"]) &&
      val(d, "Year") !== null &&
      val(d, "Generation (TWh)") !== null &&
      val(d, "Year") <= worldYear
    )
    .map(d => ({
      year: val(d, "Year"),
      source: d["Electricity source"],
      generation: val(d, "Generation (TWh)")
    }));

  render("global-area", {
    width: "container",
    height: 310,
    ...hl("source"),
    data: { values: globalSources },
    mark: { type: "area", opacity: 0.92, tooltip: true },
    encoding: {
      x: {
        field: "year",
        type: "quantitative",
        title: "Year",
        axis: { format: "d", tickCount: 8 }
      },
      y: {
        field: "generation",
        type: "quantitative",
        title: "Generation (TWh)",
        stack: "zero"
      },
      color: {
        field: "source",
        type: "nominal",
        title: "Source",
        scale: {
          domain: sourceOrder,
          range: sourceOrder.map(s => COLORS[s])
        }
      },
      opacity: hlOp,
      order: { field: "source", sort: sourceOrder },
      tooltip: [
        { field: "year", title: "Year", format: "d" },
        { field: "source", title: "Source" },
        { field: "generation", title: "Generation (TWh)", format: ",.1f" }
      ]
    }
  });

  // FIG. 02 — Global aggregate shares
  const globalAggregates = rows
    .filter(d =>
      d.Area === "World" &&
      ["Fossil", "Renewables", "Clean"].includes(d["Electricity source"]) &&
      val(d, "Year") !== null &&
      val(d, "Share of generation (%)") !== null
    )
    .map(d => ({
      year: val(d, "Year"),
      source: d["Electricity source"],
      share: val(d, "Share of generation (%)")
    }));

  render("global-shares", {
    width: "container",
    height: 250,
    data: { values: globalAggregates },
    mark: {
      type: "line",
      strokeWidth: 2.5,
      point: { size: 18 },
      tooltip: true
    },
    encoding: {
      x: {
        field: "year",
        type: "quantitative",
        title: "Year",
        axis: { format: "d", tickCount: 5 }
      },
      y: {
        field: "share",
        type: "quantitative",
        title: "Share of generation (%)",
        scale: { zero: false }
      },
      color: {
        field: "source",
        type: "nominal",
        title: "Category",
        scale: {
          domain: ["Fossil", "Renewables", "Clean"],
          range: [COLORS.Fossil, COLORS.Renewables, COLORS.Clean]
        }
      },
      detail: { field: "source" },
      tooltip: [
        { field: "year", title: "Year", format: "d" },
        { field: "source", title: "Category" },
        { field: "share", title: "Share (%)", format: ".1f" }
      ]
    }
  });

  // FIG. 03 — Top electricity-generating countries
  const topYear = latestYear(rows, "World", ["Total generation"]);

  const topCountries = rows
    .filter(d =>
      d["Area type"] === "Country or economy" &&
      d["Electricity source"] === "Total generation" &&
      val(d, "Year") === topYear &&
      val(d, "Generation (TWh)") !== null
    )
    .map(d => ({
      country: d.Area,
      generation: val(d, "Generation (TWh)")
    }))
    .sort((a, b) => b.generation - a.generation)
    .slice(0, 10);

  render("top-countries", {
    width: "container",
    height: 250,
    data: { values: topCountries },
    mark: {
      type: "bar",
      cornerRadiusEnd: 2,
      color: "#286b54",
      tooltip: true
    },
    encoding: {
      y: {
        field: "country",
        type: "nominal",
        sort: "-x",
        title: null,
        axis: { labelLimit: 140 }
      },
      x: {
        field: "generation",
        type: "quantitative",
        title: `Generation (TWh), ${topYear}`
      },
      tooltip: [
        { field: "country", title: "Country" },
        { field: "generation", title: "Generation (TWh)", format: ",.1f" }
      ]
    }
  });

  // FIG. 05 — Malaysia's clean generation share
  const malaysiaClean = yearRows(rows, "Malaysia", "Clean")
    .filter(d => val(d, "Share of generation (%)") !== null)
    .map(d => ({
      year: val(d, "Year"),
      share: val(d, "Share of generation (%)")
    }));

  render("malaysia-clean", {
    width: "container",
    height: 250,
    data: { values: malaysiaClean },
    mark: {
      type: "line",
      color: "#286b54",
      strokeWidth: 3,
      point: { filled: true, size: 32 },
      tooltip: true
    },
    encoding: {
      x: {
        field: "year",
        type: "quantitative",
        title: "Year",
        axis: { format: "d", tickCount: 5 }
      },
      y: {
        field: "share",
        type: "quantitative",
        title: "Clean share (%)",
        scale: { zero: false }
      },
      tooltip: [
        { field: "year", title: "Year", format: "d" },
        { field: "share", title: "Clean share (%)", format: ".2f" }
      ]
    }
  });

  // Map and comparison data
  const mapRows = await d3.csv(MAP_DATA_URL, d => ({
    iso3: d.iso3,
    country: d.country,
    year: +d.year,
    total_generation: d.total_generation === "" ? null : +d.total_generation,
    renewables_share: d.renewables_share === "" ? null : +d.renewables_share,
    renewables_generation: d.renewables_generation === "" ? null : +d.renewables_generation,
    clean_generation: d.clean_generation === "" ? null : +d.clean_generation
  }));

  const byIso = new Map(mapRows.map(d => [d.iso3, d]));

  const worldUrl =
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

  const world = await d3.json(worldUrl);

  // Malaysia map: selected major stations identified in Energy Commission
  // station-location maps. Coordinates are approximate and markers are not
  // intended to represent every operating generator.
  const malaysiaFeature = world.features.find(feature => {
    const p = feature.properties || {};
    return p.ADMIN === "Malaysia" || p.NAME === "Malaysia" || p.NAME_EN === "Malaysia";
  });

  const malaysiaStations = [
    {name:"Teknologi Tenaga Perlis Consortium", state:"Perlis", type:"Gas", longitude:100.18, latitude:6.44},
    {name:"Manjung Power Station", state:"Perak", type:"Coal", longitude:100.63, latitude:4.19},
    {name:"Kapar Energy Ventures", state:"Selangor", type:"Coal", longitude:101.35, latitude:3.12},
    {name:"Kapar Energy Ventures", state:"Selangor", type:"Gas", longitude:101.35, latitude:3.12},
    {name:"Sungai Perak hydro stations", state:"Perak", type:"Hydro", longitude:101.02, latitude:4.85},
    {name:"Pergau Hydroelectric Power Station", state:"Kelantan", type:"Hydro", longitude:101.83, latitude:5.53},
    {name:"Sultan Mahmud (Kenyir) Power Station", state:"Terengganu", type:"Hydro", longitude:102.75, latitude:5.02},
    {name:"Jimah Power Station", state:"Negeri Sembilan", type:"Coal", longitude:101.70, latitude:2.53},
    {name:"Sepang solar installations", state:"Selangor", type:"Solar", longitude:101.70, latitude:2.66},
    {name:"Tanjung Bin Power Station", state:"Johor", type:"Coal", longitude:103.55, latitude:1.32},
    {name:"Pengerang Power Station", state:"Johor", type:"Gas", longitude:104.11, latitude:1.36},
    {name:"Kimanis Power Station", state:"Sabah", type:"Gas", longitude:116.05, latitude:5.70},
    {name:"Sejingkat Power Station", state:"Sarawak", type:"Coal", longitude:110.40, latitude:1.55},
    {name:"Mukah Power Station", state:"Sarawak", type:"Coal", longitude:112.10, latitude:2.90},
    {name:"Balingian Power Station", state:"Sarawak", type:"Coal", longitude:112.40, latitude:2.95},
    {name:"Bakun Hydroelectric Plant", state:"Sarawak", type:"Hydro", longitude:114.00, latitude:2.75},
    {name:"Murum Hydroelectric Plant", state:"Sarawak", type:"Hydro", longitude:114.85, latitude:2.65}
  ];

  if (malaysiaFeature) {
    stationMap(malaysiaFeature, malaysiaStations);
  } else {
    noData("malaysia-power-map", "The Malaysia boundary could not be loaded. Check the Natural Earth geography source connection.");
  }

  const features = world.features.map(feature => {
    const p = feature.properties || {};
    const iso = p.ISO_A3 && p.ISO_A3 !== "-99" ? p.ISO_A3 : p.ADM0_A3;
    const match = byIso.get(iso);

    feature.properties.renewables_share = match ? match.renewables_share : null;
    feature.properties.total_generation = match ? match.total_generation : null;
    feature.properties.clean_generation = match ? match.clean_generation : null;
    feature.properties.country_data_name =
      match ? match.country : (p.NAME || p.ADMIN || "No data");

    return feature;
  });

  buildMaps(rows, features);
  malaysiaCharts(rows);

  // FIG. 08 — Tile-grid map, replacing the misleading circle-only cartogram
  drawTileGrid(mapRows);

  // FIG. 09 — Country/source heatmap
  const heatCountries = [
    "China", "United States", "India", "Russia", "Japan",
    "Brazil", "Canada", "Germany", "France", "Malaysia"
  ];

  const heatSources = [
    "Coal", "Gas", "Hydro", "Wind", "Solar", "Nuclear", "Bioenergy"
  ];

  const heatRows = rows
    .filter(d =>
      heatCountries.includes(d.Area) &&
      heatSources.includes(d["Electricity source"]) &&
      val(d, "Year") === 2024 &&
      val(d, "Share of generation (%)") !== null
    )
    .map(d => ({
      country: d.Area,
      source: d["Electricity source"],
      share: val(d, "Share of generation (%)")
    }));

  render("country-heatmap", {
    width: "container",
    height: 310,
    data: { values: heatRows },
    mark: {
      type: "rect",
      stroke: "#fffefa",
      strokeWidth: 2,
      tooltip: true,
      cornerRadius: 2
    },
    encoding: {
      x: {
        field: "source",
        type: "nominal",
        title: null,
        sort: heatSources,
        axis: { labelAngle: -35 }
      },
      y: {
        field: "country",
        type: "nominal",
        title: null,
        sort: heatCountries
      },
      color: {
        field: "share",
        type: "quantitative",
        title: "Share (%)",
        scale: { scheme: "viridis", domain: [0, 100] }
      },
      tooltip: [
        { field: "country", title: "Country" },
        { field: "source", title: "Source" },
        { field: "share", title: "Generation share (%)", format: ".1f" }
      ]
    }
  });

  // FIG. 10 — Global fossil vs clean slopegraph
  const slopeRows = rows
    .filter(d =>
      d.Area === "World" &&
      ["Fossil", "Clean"].includes(d["Electricity source"]) &&
      [2000, 2024].includes(val(d, "Year")) &&
      val(d, "Share of generation (%)") !== null
    )
    .map(d => ({
      category: d["Electricity source"],
      year: String(val(d, "Year")),
      share: val(d, "Share of generation (%)")
    }));

  render("global-slope", {
    width: "container",
    height: 260,
    data: { values: slopeRows },
    layer: [
      {
        mark: { type: "line", strokeWidth: 3 },
        encoding: {
          x: { field: "year", type: "ordinal", sort: ["2000", "2024"], title: null },
          y: {
            field: "share",
            type: "quantitative",
            title: "Share of generation (%)",
            scale: { zero: false }
          },
          color: {
            field: "category",
            type: "nominal",
            scale: {
              domain: ["Fossil", "Clean"],
              range: [COLORS.Fossil, COLORS.Clean]
            }
          },
          detail: { field: "category" }
        }
      },
      {
        mark: { type: "point", filled: true, size: 65 },
        encoding: {
          x: { field: "year", type: "ordinal", sort: ["2000", "2024"] },
          y: { field: "share", type: "quantitative" },
          color: {
            field: "category",
            type: "nominal",
            scale: {
              domain: ["Fossil", "Clean"],
              range: [COLORS.Fossil, COLORS.Clean]
            },
            legend: null
          },
          tooltip: [
            { field: "category", title: "Category" },
            { field: "year", title: "Year" },
            { field: "share", title: "Share (%)", format: ".1f" }
          ]
        }
      }
    ]
  });

  // FIG. 11 — Bump chart of top generating countries
  const bumpYears = [2000, 2005, 2010, 2015, 2020, 2024];

  const latestTotals = rows
    .filter(d =>
      d["Area type"] === "Country or economy" &&
      d["Electricity source"] === "Total generation" &&
      val(d, "Year") === 2024 &&
      val(d, "Generation (TWh)") !== null
    )
    .sort((a, b) => val(b, "Generation (TWh)") - val(a, "Generation (TWh)"))
    .slice(0, 8)
    .map(d => d.Area);

  const totals = rows
    .filter(d =>
      latestTotals.includes(d.Area) &&
      d["Electricity source"] === "Total generation" &&
      bumpYears.includes(val(d, "Year")) &&
      val(d, "Generation (TWh)") !== null
    )
    .map(d => ({
      country: d.Area,
      year: String(val(d, "Year")),
      generation: val(d, "Generation (TWh)")
    }));

  const ranksByYear = [];

  bumpYears.forEach(year => {
    const yr = totals
      .filter(d => d.year === String(year))
      .sort((a, b) => b.generation - a.generation);

    yr.forEach((d, i) => {
      ranksByYear.push({
        country: d.country,
        year: d.year,
        rank: i + 1,
        generation: d.generation
      });
    });
  });

  render("country-bump", {
    width: "container",
    height: 260,
    ...hl("country"),
    data: { values: ranksByYear },
    mark: {
      type: "line",
      point: { filled: true, size: 45 },
      strokeWidth: 2.2,
      tooltip: true
    },
    encoding: {
      x: {
        field: "year",
        type: "ordinal",
        title: "Year",
        sort: bumpYears.map(String)
      },
      y: {
        field: "rank",
        type: "quantitative",
        title: "Generation rank",
        scale: { domain: [8, 1] },
        axis: { values: [1, 2, 3, 4, 5, 6, 7, 8], format: "d" }
      },
      color: { field: "country", type: "nominal", title: "Country (click to isolate)", scale: { range: OKABE } },
      opacity: hlOp,
      detail: { field: "country" },
      tooltip: [
        { field: "country", title: "Country" },
        { field: "year", title: "Year" },
        { field: "rank", title: "Rank" },
        { field: "generation", title: "Generation (TWh)", format: ",.1f" }
      ]
    }
  });

  // FIG. 12 — Malaysia vs world electricity mix
  const compareCountries = ["World", "Malaysia"];

  const compareRows = rows
    .filter(d =>
      compareCountries.includes(d.Area) &&
      sourceOrder.includes(d["Electricity source"]) &&
      val(d, "Year") === 2024 &&
      val(d, "Share of generation (%)") !== null
    )
    .map(d => ({
      area: d.Area,
      source: d["Electricity source"],
      share: val(d, "Share of generation (%)")
    }));

  render("mix-comparison", {
    width: "container",
    height: 270,
    data: { values: compareRows },
    mark: { type: "bar", tooltip: true },
    encoding: {
      x: {
        field: "area",
        type: "nominal",
        title: null,
        axis: { labelFontSize: 13 }
      },
      y: {
        aggregate: "sum",
        field: "share",
        type: "quantitative",
        title: "Share of generation (%)",
        scale: { domain: [0, 100] }
      },
      color: {
        field: "source",
        type: "nominal",
        title: "Source",
        scale: {
          domain: sourceOrder,
          range: sourceOrder.map(s => COLORS[s])
        }
      },
      order: { field: "source", sort: sourceOrder },
      tooltip: [
        { field: "area", title: "Area" },
        { field: "source", title: "Source" },
        { field: "share", title: "Share (%)", format: ".1f" }
      ]
    }
  });

}).catch(error => {
  console.error("Could not load electricity data:", error);

  document.querySelectorAll(".chart").forEach(el => {
    el.innerHTML =
      '<p class="chart-desc">Could not load the CSV. Check that the files are in the data folder and open the page through VS Code Live Server.</p>';
  });
});
