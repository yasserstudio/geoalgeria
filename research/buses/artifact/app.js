(function () {
  "use strict";

  const data = window.BUS_ARTIFACT;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const classificationLabels = {
    urban_suburban_candidate: "Urban / suburban candidate",
    inter_wilaya_candidate: "Inter-wilaya candidate",
    cross_wilaya_review: "Cross-wilaya review",
    unresolved: "Unresolved",
    taxi_excluded: "Taxi excluded",
  };
  const readinessLabels = {
    geometry_candidate: "Geometry candidate",
    needs_identity: "Needs identity",
    review_only: "Review only",
    blocked_no_geometry: "No geometry",
  };
  const stationLabels = {
    station_members_available: "Station members available",
    missing_station_members: "No Station members",
  };
  const wilayaByCode = new Map(data.wilayas.map(function (wilaya) {
    return [wilaya.code, wilaya];
  }));
  const lineById = new Map(data.lines.map(function (line) {
    return [line.id, line];
  }));
  const state = {
    search: "",
    classification: "all",
    readiness: "all",
    operator: "all",
    wilaya: "all",
    stations: false,
    selected: null,
    visible: data.lines,
  };

  const dom = {
    map: document.getElementById("atlasMap"),
    boundaryLayer: document.getElementById("boundaryLayer"),
    wilayaLabelLayer: document.getElementById("wilayaLabelLayer"),
    lineLayer: document.getElementById("lineLayer"),
    stationLayer: document.getElementById("stationLayer"),
    searchInput: document.getElementById("searchInput"),
    classificationFilter: document.getElementById("classificationFilter"),
    readinessFilter: document.getElementById("readinessFilter"),
    operatorFilter: document.getElementById("operatorFilter"),
    wilayaFilter: document.getElementById("wilayaFilter"),
    clearFilters: document.getElementById("clearFilters"),
    lineList: document.getElementById("lineList"),
    resultCount: document.getElementById("resultCount"),
    visibleGeometryCount: document.getElementById("visibleGeometryCount"),
    stationToggle: document.getElementById("stationToggle"),
    detail: document.getElementById("lineDetail"),
    detailContent: document.getElementById("lineDetailContent"),
    closeDetail: document.getElementById("closeDetail"),
    sourceList: document.getElementById("sourceList"),
    fitMap: document.getElementById("fitMap"),
    zoomIn: document.getElementById("zoomIn"),
    zoomOut: document.getElementById("zoomOut"),
  };

  const pathNodes = new Map();
  const stationNodes = [];
  let currentViewBox = boundsToViewBox(data.home_bounds);
  let drag = null;
  let dragged = false;

  function svgElement(name, attributes) {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attributes || {}).forEach(function (entry) {
      element.setAttribute(entry[0], String(entry[1]));
    });
    return element;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[character];
    });
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function fold(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function humanize(value) {
    return String(value ?? "unknown")
      .replaceAll("_", " ")
      .replace(/\b\w/g, function (character) {
        return character.toUpperCase();
      });
  }

  function formatCount(value) {
    return new Intl.NumberFormat("en-DZ").format(value ?? 0);
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return "Unknown date";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  function lineDirectionLabel(line) {
    const direction = line.directions.find(function (item) {
      return item.from && item.to;
    });
    if (direction) return direction.from + " → " + direction.to;
    if (line.name) return line.name.replace(/^Bus:\s*/i, "");
    return "Unidentified candidate";
  }

  function lineSubtitle(line) {
    if (line.operator_name_fr) return line.operator_name_fr;
    return classificationLabels[line.classification.value] || humanize(line.classification.value);
  }

  function wilayaLabel(codes) {
    if (!codes.length) return "Unassigned";
    return codes.map(function (code) {
      const wilaya = wilayaByCode.get(code);
      return code + (wilaya ? " · " + wilaya.name_fr : "");
    }).join(", ");
  }

  function lineSearchText(line) {
    return fold([
      line.ref,
      line.refs.join(" "),
      line.name,
      lineDirectionLabel(line),
      line.operator_id,
      line.operator_name_fr,
      line.wilaya_codes.join(" "),
      wilayaLabel(line.wilaya_codes),
      line.relation_ids.join(" "),
    ].join(" "));
  }

  function boundsToViewBox(bounds) {
    return {
      x: bounds.minX,
      y: bounds.minY,
      width: Math.max(bounds.maxX - bounds.minX, 1),
      height: Math.max(bounds.maxY - bounds.minY, 1),
    };
  }

  function applyViewBox() {
    dom.map.setAttribute("viewBox", [
      currentViewBox.x,
      currentViewBox.y,
      currentViewBox.width,
      currentViewBox.height,
    ].join(" "));
  }

  function updateStationRadius() {
    const mapWidth = dom.map.clientWidth || 1200;
    const mapUnitsPerPixel = currentViewBox.width / mapWidth;
    stationNodes.forEach(function (entry) {
      const selected = entry.node.classList.contains("is-selected");
      entry.node.setAttribute("r", mapUnitsPerPixel * (selected ? 3.4 : 2.2));
    });
  }

  function fitBounds(bounds, padding) {
    if (!bounds) return;
    const clientWidth = dom.map.clientWidth || 1200;
    const clientHeight = dom.map.clientHeight || 700;
    const aspect = clientWidth / clientHeight;
    let width = Math.max(bounds.maxX - bounds.minX, 4);
    let height = Math.max(bounds.maxY - bounds.minY, 4);
    const centreX = (bounds.minX + bounds.maxX) / 2;
    const centreY = (bounds.minY + bounds.maxY) / 2;
    if (width / height > aspect) height = width / aspect;
    else width = height * aspect;
    const expansion = 1 + (padding ?? 0.08) * 2;
    width *= expansion;
    height *= expansion;
    currentViewBox = {
      x: centreX - width / 2,
      y: centreY - height / 2,
      width: width,
      height: height,
    };
    applyViewBox();
    updateStationRadius();
  }

  function combinedBounds(lines) {
    const available = lines.map(function (line) {
      return line.bounds;
    }).filter(Boolean);
    if (!available.length) return null;
    return {
      minX: Math.min.apply(null, available.map(function (bounds) { return bounds.minX; })),
      minY: Math.min.apply(null, available.map(function (bounds) { return bounds.minY; })),
      maxX: Math.max.apply(null, available.map(function (bounds) { return bounds.maxX; })),
      maxY: Math.max.apply(null, available.map(function (bounds) { return bounds.maxY; })),
    };
  }

  function zoom(factor, anchor) {
    const homeWidth = data.home_bounds.maxX - data.home_bounds.minX;
    const targetWidth = Math.min(homeWidth * 1.7, Math.max(homeWidth / 45, currentViewBox.width * factor));
    const actualFactor = targetWidth / currentViewBox.width;
    const targetHeight = currentViewBox.height * actualFactor;
    const point = anchor || {
      x: currentViewBox.x + currentViewBox.width / 2,
      y: currentViewBox.y + currentViewBox.height / 2,
    };
    const xRatio = (point.x - currentViewBox.x) / currentViewBox.width;
    const yRatio = (point.y - currentViewBox.y) / currentViewBox.height;
    currentViewBox = {
      x: point.x - targetWidth * xRatio,
      y: point.y - targetHeight * yRatio,
      width: targetWidth,
      height: targetHeight,
    };
    applyViewBox();
    updateStationRadius();
  }

  function clientToMap(clientX, clientY) {
    const rect = dom.map.getBoundingClientRect();
    return {
      x: currentViewBox.x + ((clientX - rect.left) / rect.width) * currentViewBox.width,
      y: currentViewBox.y + ((clientY - rect.top) / rect.height) * currentViewBox.height,
    };
  }

  function renderMap() {
    const boundaryFragment = document.createDocumentFragment();
    data.boundaries.forEach(function (boundary) {
      boundaryFragment.appendChild(svgElement("path", {
        class: "boundary-shape",
        d: boundary.path,
        "data-code": boundary.code,
      }));
    });
    dom.boundaryLayer.appendChild(boundaryFragment);

    const coveredWilayas = new Set(data.summary.by_wilaya.map(function (row) {
      return row.code;
    }));
    const labelFragment = document.createDocumentFragment();
    data.wilayas.filter(function (wilaya) {
      return coveredWilayas.has(wilaya.code);
    }).forEach(function (wilaya) {
      const label = svgElement("text", {
        class: "wilaya-label",
        x: wilaya.x,
        y: wilaya.y,
      });
      label.textContent = wilaya.code + " · " + wilaya.name_fr;
      labelFragment.appendChild(label);
    });
    dom.wilayaLabelLayer.appendChild(labelFragment);

    const classificationOrder = {
      unresolved: 0,
      taxi_excluded: 1,
      cross_wilaya_review: 2,
      inter_wilaya_candidate: 3,
      urban_suburban_candidate: 4,
    };
    const lineFragment = document.createDocumentFragment();
    data.lines.filter(function (line) {
      return Boolean(line.path);
    }).sort(function (a, b) {
      return classificationOrder[a.classification.value] - classificationOrder[b.classification.value];
    }).forEach(function (line) {
      const path = svgElement("path", {
        class: "candidate-path " + line.classification.value,
        d: line.path,
        "data-id": line.id,
      });
      const title = svgElement("title");
      title.textContent = (line.ref ? "Line " + line.ref + " · " : "") + lineDirectionLabel(line);
      path.appendChild(title);
      path.addEventListener("click", function (event) {
        event.stopPropagation();
        if (!dragged) selectLine(line.id, false);
      });
      pathNodes.set(line.id, path);
      lineFragment.appendChild(path);
    });
    dom.lineLayer.appendChild(lineFragment);

    const stationFragment = document.createDocumentFragment();
    data.stations.forEach(function (station) {
      const circle = svgElement("circle", {
        class: "station-dot",
        cx: station.x,
        cy: station.y,
        r: 1.45,
      });
      circle.style.display = "none";
      stationNodes.push({ node: circle, station: station });
      stationFragment.appendChild(circle);
    });
    dom.stationLayer.appendChild(stationFragment);
  }

  function addOption(select, value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  function populateFilters() {
    addOption(dom.classificationFilter, "all", "All classifications");
    Object.keys(classificationLabels).forEach(function (value) {
      const count = data.summary.classification[value] || 0;
      if (count) addOption(dom.classificationFilter, value, classificationLabels[value] + " (" + count + ")");
    });

    addOption(dom.readinessFilter, "all", "All readiness states");
    Object.keys(data.summary.map_readiness).forEach(function (value) {
      addOption(dom.readinessFilter, value, (readinessLabels[value] || humanize(value)) + " (" + data.summary.map_readiness[value] + ")");
    });

    addOption(dom.operatorFilter, "all", "All Operators");
    data.summary.by_operator.filter(function (row) {
      return row.candidate_lines > 0;
    }).forEach(function (row) {
      addOption(dom.operatorFilter, row.operator_id, row.operator_id.toUpperCase() + " (" + row.candidate_lines + ")");
    });
    addOption(dom.operatorFilter, "__unmatched", "Unmatched (" + data.summary.unmatched_operator_candidates + ")");

    addOption(dom.wilayaFilter, "all", "All Wilayas");
    data.summary.by_wilaya.forEach(function (row) {
      const value = row.code === "(missing)" ? "__missing" : row.code;
      const label = row.code === "(missing)" ? "Unassigned" : row.code + " · " + (row.name_fr || "Unknown");
      addOption(dom.wilayaFilter, value, label + " (" + row.candidates + ")");
    });
  }

  function matchesFilters(line) {
    if (state.search && !lineSearchText(line).includes(state.search)) return false;
    if (state.classification !== "all" && line.classification.value !== state.classification) return false;
    if (state.readiness !== "all" && line.map_readiness !== state.readiness) return false;
    if (state.operator === "__unmatched" && line.operator_id) return false;
    if (!["all", "__unmatched"].includes(state.operator) && line.operator_id !== state.operator) return false;
    if (state.wilaya === "__missing" && line.wilaya_codes.length) return false;
    if (!["all", "__missing"].includes(state.wilaya) && !line.wilaya_codes.includes(state.wilaya)) return false;
    return true;
  }

  function makeTag(text, className) {
    const tag = document.createElement("span");
    tag.className = "mini-tag" + (className ? " " + className : "");
    tag.textContent = text;
    return tag;
  }

  function renderLineList() {
    dom.lineList.replaceChildren();
    const fragment = document.createDocumentFragment();
    state.visible.forEach(function (line) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "line-card" + (line.id === state.selected ? " is-selected" : "");
      card.dataset.id = line.id;
      card.dataset.classification = line.classification.value;

      const ref = document.createElement("span");
      ref.className = "line-ref";
      ref.textContent = line.ref || "—";

      const copy = document.createElement("span");
      copy.className = "line-copy";
      const title = document.createElement("strong");
      title.textContent = lineDirectionLabel(line);
      const subtitle = document.createElement("span");
      subtitle.textContent = lineSubtitle(line);
      const tags = document.createElement("span");
      tags.className = "line-tags";
      tags.appendChild(makeTag(wilayaLabel(line.wilaya_codes)));
      tags.appendChild(makeTag(
        line.map_readiness === "geometry_candidate" ? "Map-ready" : (readinessLabels[line.map_readiness] || humanize(line.map_readiness)),
        line.map_readiness === "geometry_candidate" ? "is-ready" : "",
      ));
      copy.append(title, subtitle, tags);
      card.append(ref, copy);
      card.addEventListener("click", function () {
        selectLine(line.id, true);
      });
      fragment.appendChild(card);
    });

    if (!state.visible.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No candidate Lines match these filters.";
      fragment.appendChild(empty);
    }
    dom.lineList.appendChild(fragment);
  }

  function updateMapVisibility() {
    const visibleIds = new Set(state.visible.map(function (line) {
      return line.id;
    }));
    pathNodes.forEach(function (path, id) {
      path.style.display = visibleIds.has(id) ? "" : "none";
    });
    if (state.selected && !visibleIds.has(state.selected)) selectLine(null, false);
    const drawableCount = state.visible.filter(function (line) {
      return line.path;
    }).length;
    dom.visibleGeometryCount.textContent = formatCount(drawableCount);
  }

  function updateStations() {
    stationNodes.forEach(function (entry) {
      const selected = Boolean(state.selected && entry.station.candidate_ids.includes(state.selected));
      entry.node.classList.toggle("is-selected", selected);
      entry.node.style.display = state.stations || selected ? "" : "none";
    });
    updateStationRadius();
  }

  function applyFilters() {
    state.visible = data.lines.filter(matchesFilters);
    dom.resultCount.textContent = formatCount(state.visible.length) + " of " + formatCount(data.lines.length) + " candidate Lines";
    renderLineList();
    updateMapVisibility();
  }

  function detailHtml(line) {
    const length = line.max_length_km == null
      ? "Unknown"
      : line.min_length_km === line.max_length_km
        ? formatCount(line.max_length_km) + " km"
        : formatCount(line.min_length_km) + "–" + formatCount(line.max_length_km) + " km";
    const badges = [
      classificationLabels[line.classification.value] || humanize(line.classification.value),
      readinessLabels[line.map_readiness] || humanize(line.map_readiness),
      stationLabels[line.station_readiness] || humanize(line.station_readiness),
    ].concat(line.quality_flags.map(humanize));
    const directionRows = line.directions.map(function (direction) {
      const label = direction.from && direction.to
        ? escapeHtml(direction.from) + " → " + escapeHtml(direction.to)
        : "Direction not identified";
      return "<li><span>" + label + " · <a href=\"https://www.openstreetmap.org/relation/" +
        encodeURIComponent(direction.relation_id) + "\" target=\"_blank\" rel=\"noreferrer\">OSM " +
        escapeHtml(direction.relation_id) + "</a></span></li>";
    }).join("");
    const reason = escapeHtml(line.classification.reason);
    return [
      "<div class=\"detail-head\">",
      "<span class=\"detail-ref ", escapeHtml(line.classification.value), "\">", escapeHtml(line.ref || "—"), "</span>",
      "<div><p class=\"eyebrow\">", escapeHtml(line.id), "</p><h3>", escapeHtml(lineDirectionLabel(line)), "</h3>",
      "<p>", escapeHtml(line.operator_name_fr || "Operator not matched"), " · ", escapeHtml(wilayaLabel(line.wilaya_codes)), "</p></div></div>",
      "<div class=\"detail-badges\">", badges.map(function (badge) {
        return "<span class=\"mini-tag\">" + escapeHtml(badge) + "</span>";
      }).join(""), "</div>",
      "<div class=\"detail-grid\">",
      "<div><span>Relations</span><strong>", escapeHtml(line.relation_count), "</strong></div>",
      "<div><span>Length</span><strong>", escapeHtml(length), "</strong></div>",
      "<div><span>Stations</span><strong>", escapeHtml(line.station_member_count), "</strong></div>",
      "<div><span>Geometry</span><strong>", line.path ? "Yes" : "No", "</strong></div>",
      "</div>",
      "<div class=\"detail-relations\"><p>Why it is classified this way</p><ul><li><span>", reason, "</span></li></ul></div>",
      "<div class=\"detail-relations\"><p>Directional OSM relations</p><ul>", directionRows, "</ul></div>",
    ].join("");
  }

  function selectLine(id, shouldFit) {
    state.selected = id && lineById.has(id) ? id : null;
    pathNodes.forEach(function (path, pathId) {
      path.classList.toggle("is-selected", pathId === state.selected);
      path.classList.toggle("is-muted", Boolean(state.selected && pathId !== state.selected));
    });
    dom.lineList.querySelectorAll(".line-card").forEach(function (card) {
      const selected = card.dataset.id === state.selected;
      card.classList.toggle("is-selected", selected);
      if (selected) card.scrollIntoView({ block: "nearest" });
    });
    updateStations();

    if (!state.selected) {
      dom.detail.hidden = true;
      return;
    }
    const line = lineById.get(state.selected);
    dom.detailContent.innerHTML = detailHtml(line);
    dom.detail.hidden = false;
    if (shouldFit && line.bounds) fitBounds(line.bounds, 0.3);
  }

  function evidenceLabel(source, discovery) {
    if (discovery) return "Lead";
    if (source.kind === "community_map" && source.reuse_status === "odbl") return "Map";
    if (source.evidence_type === "official") return "Official";
    if (source.kind === "knowledge_graph") return "Identity";
    if (source.kind === "secondary_line_list") return "Attributes";
    return "Context";
  }

  function evidenceRows(evidence) {
    if (!evidence.length) {
      return "<div class=\"evidence-row\"><span class=\"evidence-type\">None</span><div>No captured public Source beyond discovery.</div></div>";
    }
    return evidence.map(function (item) {
      const url = safeUrl(item.source.url);
      const linkedName = url
        ? "<a href=\"" + escapeHtml(url) + "\" target=\"_blank\" rel=\"noreferrer\">" + escapeHtml(item.source.id) + "</a>"
        : "<span>" + escapeHtml(item.source.id) + "</span>";
      return [
        "<div class=\"evidence-row\"><span class=\"evidence-type\">", escapeHtml(item.type), "</span><div>",
        linkedName,
        "<small>", escapeHtml(item.source.claims.map(humanize).join(" · ")), " · ", escapeHtml(humanize(item.source.reuse_status)), "</small>",
        "</div></div>",
      ].join("");
    }).join("");
  }

  function renderSources() {
    const operators = data.operators.slice().sort(function (a, b) {
      return b.candidate_lines - a.candidate_lines || a.id.localeCompare(b.id);
    });
    const comparisons = data.comparison_sources.map(function (comparison) {
      const evidence = comparison.receipts.map(function (source) {
        return { type: "Legacy", source: source };
      });
      return [
        "<article class=\"operator-card comparison-card\"><div class=\"operator-card-header\"><div><h4>",
        escapeHtml(comparison.name), "</h4><span class=\"operator-id\">", escapeHtml(comparison.description),
        "</span></div><span class=\"operator-count\">", escapeHtml(comparison.receipts.length), " receipts</span></div>",
        "<ul class=\"comparison-limitations\">", comparison.limitations.map(function (limitation) {
          return "<li>" + escapeHtml(limitation) + "</li>";
        }).join(""), "</ul>", evidenceRows(evidence), "</article>",
      ].join("");
    }).join("");
    const operatorCards = operators.map(function (operator) {
      const evidence = operator.sources.map(function (source) {
        return { type: evidenceLabel(source, false), source: source };
      }).concat(operator.discovery_leads.map(function (source) {
        return { type: evidenceLabel(source, true), source: source };
      }));
      return [
        "<article class=\"operator-card\"><div class=\"operator-card-header\"><div><h4>",
        escapeHtml(operator.name_fr), "</h4><span class=\"operator-id\">", escapeHtml(operator.id), " · ",
        escapeHtml(operator.wilaya_codes.join(", ")), "</span></div><span class=\"operator-count\">",
        escapeHtml(operator.candidate_lines), " Lines</span></div>",
        "<div class=\"operator-stats\"><span>", escapeHtml(operator.relations), " relations</span><span>",
        escapeHtml(operator.geometry_candidates), " map-ready</span><span>", escapeHtml(operator.with_station_members),
        " with Stations</span></div>", evidenceRows(evidence), "</article>",
      ].join("");
    }).join("");
    dom.sourceList.innerHTML = comparisons + operatorCards;
  }

  function setStaticContent() {
    document.getElementById("snapshotDate").textContent = formatDate(data.snapshot_at);
    document.getElementById("metricLines").textContent = formatCount(data.summary.candidate_lines);
    document.getElementById("metricReady").textContent = formatCount(data.summary.map_readiness.geometry_candidate);
    document.getElementById("metricStations").textContent = formatCount(data.summary.unique_stations);
    document.getElementById("metricReceipts").textContent = formatCount(data.summary.source_receipts);
    document.getElementById("mappedDistance").textContent = formatCount(data.summary.mapped_relation_km) + " mapped km";
  }

  dom.searchInput.addEventListener("input", function () {
    state.search = fold(dom.searchInput.value);
    applyFilters();
  });
  dom.classificationFilter.addEventListener("change", function () {
    state.classification = dom.classificationFilter.value;
    applyFilters();
  });
  dom.readinessFilter.addEventListener("change", function () {
    state.readiness = dom.readinessFilter.value;
    applyFilters();
  });
  dom.operatorFilter.addEventListener("change", function () {
    state.operator = dom.operatorFilter.value;
    applyFilters();
  });
  dom.wilayaFilter.addEventListener("change", function () {
    state.wilaya = dom.wilayaFilter.value;
    applyFilters();
  });
  dom.clearFilters.addEventListener("click", function () {
    state.search = "";
    state.classification = "all";
    state.readiness = "all";
    state.operator = "all";
    state.wilaya = "all";
    dom.searchInput.value = "";
    dom.classificationFilter.value = "all";
    dom.readinessFilter.value = "all";
    dom.operatorFilter.value = "all";
    dom.wilayaFilter.value = "all";
    applyFilters();
    fitBounds(data.home_bounds, 0);
  });
  dom.stationToggle.addEventListener("change", function () {
    state.stations = dom.stationToggle.checked;
    updateStations();
  });
  dom.closeDetail.addEventListener("click", function () {
    selectLine(null, false);
  });
  dom.fitMap.addEventListener("click", function () {
    fitBounds(combinedBounds(state.visible) || data.home_bounds, 0.05);
  });
  dom.zoomIn.addEventListener("click", function () {
    zoom(0.75);
  });
  dom.zoomOut.addEventListener("click", function () {
    zoom(1.33);
  });

  document.querySelectorAll(".rail-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      const panel = tab.dataset.panel;
      document.querySelectorAll(".rail-tab").forEach(function (item) {
        const active = item === tab;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", String(active));
      });
      document.getElementById("linesPanel").hidden = panel !== "lines";
      document.getElementById("sourcesPanel").hidden = panel !== "sources";
      if (panel === "sources") {
        selectLine(null, false);
        fitBounds(data.home_bounds, 0);
      }
    });
  });

  dom.map.addEventListener("wheel", function (event) {
    event.preventDefault();
    zoom(Math.exp(event.deltaY * 0.0013), clientToMap(event.clientX, event.clientY));
  }, { passive: false });
  dom.map.addEventListener("pointerdown", function (event) {
    if (event.button !== 0) return;
    dragged = false;
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      viewX: currentViewBox.x,
      viewY: currentViewBox.y,
    };
    dom.map.setPointerCapture(event.pointerId);
    dom.map.classList.add("is-dragging");
  });
  dom.map.addEventListener("pointermove", function (event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = dom.map.getBoundingClientRect();
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragged = true;
    currentViewBox.x = drag.viewX - (dx / rect.width) * currentViewBox.width;
    currentViewBox.y = drag.viewY - (dy / rect.height) * currentViewBox.height;
    applyViewBox();
  });
  function stopDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    dom.map.classList.remove("is-dragging");
    window.setTimeout(function () {
      dragged = false;
    }, 0);
  }
  dom.map.addEventListener("pointerup", stopDrag);
  dom.map.addEventListener("pointercancel", stopDrag);
  dom.map.addEventListener("click", function (event) {
    if (!dragged && !event.target.closest(".candidate-path")) selectLine(null, false);
  });
  window.addEventListener("resize", updateStationRadius);

  renderMap();
  populateFilters();
  renderSources();
  setStaticContent();
  applyFilters();
  applyViewBox();
  updateStationRadius();
  window.requestAnimationFrame(function () {
    fitBounds(data.home_bounds, 0);
  });
})();
