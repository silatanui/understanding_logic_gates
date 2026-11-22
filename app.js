(() => {
  "use strict";

  const GATE_DEFS = {
    INPUT: {
      label: "INPUT",
      category: "io",
      inputs: 0,
      outputs: 1,
      truth: null,
      eval: (node) => [!!node.state],
    },
    OUTPUT: {
      label: "OUTPUT",
      category: "io",
      inputs: 1,
      outputs: 0,
      truth: null,
      eval: () => [],
    },
    NOT: {
      label: "NOT",
      category: "gate",
      inputs: 1,
      outputs: 1,
      truth: [
        { in: [0], out: 1 },
        { in: [1], out: 0 },
      ],
      eval: (a) => [!a[0]],
    },
    AND: {
      label: "AND",
      category: "gate",
      inputs: 2,
      outputs: 1,
      truth: [
        { in: [0, 0], out: 0 },
        { in: [0, 1], out: 0 },
        { in: [1, 0], out: 0 },
        { in: [1, 1], out: 1 },
      ],
      eval: (a) => [a[0] && a[1]],
    },
    OR: {
      label: "OR",
      category: "gate",
      inputs: 2,
      outputs: 1,
      truth: [
        { in: [0, 0], out: 0 },
        { in: [0, 1], out: 1 },
        { in: [1, 0], out: 1 },
        { in: [1, 1], out: 1 },
      ],
      eval: (a) => [a[0] || a[1]],
    },
    NAND: {
      label: "NAND",
      category: "gate",
      inputs: 2,
      outputs: 1,
      truth: [
        { in: [0, 0], out: 1 },
        { in: [0, 1], out: 1 },
        { in: [1, 0], out: 1 },
        { in: [1, 1], out: 0 },
      ],
      eval: (a) => [!(a[0] && a[1])],
    },
    NOR: {
      label: "NOR",
      category: "gate",
      inputs: 2,
      outputs: 1,
      truth: [
        { in: [0, 0], out: 1 },
        { in: [0, 1], out: 0 },
        { in: [1, 0], out: 0 },
        { in: [1, 1], out: 0 },
      ],
      eval: (a) => [!(a[0] || a[1])],
    },
    XOR: {
      label: "XOR",
      category: "gate",
      inputs: 2,
      outputs: 1,
      truth: [
        { in: [0, 0], out: 0 },
        { in: [0, 1], out: 1 },
        { in: [1, 0], out: 1 },
        { in: [1, 1], out: 0 },
      ],
      eval: (a) => [a[0] !== a[1]],
    },
    XNOR: {
      label: "XNOR",
      category: "gate",
      inputs: 2,
      outputs: 1,
      truth: [
        { in: [0, 0], out: 1 },
        { in: [0, 1], out: 0 },
        { in: [1, 0], out: 0 },
        { in: [1, 1], out: 1 },
      ],
      eval: (a) => [a[0] === a[1]],
    },
  };

  const state = {
    nodes: new Map(),
    wires: new Map(),
    selectedId: null,
    selectedWireId: null,
    tool: "select",
    linkDrag: null,
    cutStroke: null,
    cutHoverIds: new Set(),
    dragNode: null,
    dragOffset: { x: 0, y: 0 },
    snapWireId: null,
    live: true,
    nextId: 1,
  };

  const SNAP_DISTANCE = 42;

  const el = {
    board: document.getElementById("board"),
    boardWrap: document.getElementById("board-wrap"),
    wires: document.getElementById("wires"),
    wirePreview: document.getElementById("wire-preview"),
    emptyHint: document.getElementById("empty-hint"),
    paletteIo: document.getElementById("palette-io"),
    paletteGates: document.getElementById("palette-gates"),
    probePanel: document.getElementById("probe-panel"),
    truthPanel: document.getElementById("truth-panel"),
    truthTable: document.getElementById("truth-table"),
    statusText: document.getElementById("status-text"),
    simLive: document.getElementById("sim-live"),
  };

  function uid(prefix) {
    return `${prefix}_${state.nextId++}`;
  }

  function setStatus(msg) {
    el.statusText.textContent = msg;
  }

  function symbolSvg(type, mini = false) {
    const stroke = "#12202a";
    const fill = "#f4f7f9";
    const w = mini ? 54 : 64;
    const h = mini ? 36 : 40;
    const common = `viewBox="0 0 64 40" width="${w}" height="${h}" fill="none"`;

    const shapes = {
      AND: `<path d="M10 6h18c10 0 18 6.5 18 14s-8 14-18 14H10V6z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M46 20h10" stroke="${stroke}" stroke-width="2"/><path d="M4 12h6M4 28h6" stroke="${stroke}" stroke-width="2"/>`,
      OR: `<path d="M10 6c8 0 16 4 22 14C26 30 18 34 10 34c4-6 4-22 0-28z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M8 6c5 7 5 21 0 28" stroke="${stroke}" stroke-width="2"/><path d="M32 20h16" stroke="${stroke}" stroke-width="2"/><path d="M4 12h6M4 28h6" stroke="${stroke}" stroke-width="2"/>`,
      NOT: `<path d="M12 6v28l26-14L12 6z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="42" cy="20" r="4" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M46 20h10" stroke="${stroke}" stroke-width="2"/><path d="M4 20h8" stroke="${stroke}" stroke-width="2"/>`,
      NAND: `<path d="M10 6h18c10 0 18 6.5 18 14s-8 14-18 14H10V6z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><circle cx="50" cy="20" r="3.5" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M53.5 20H58" stroke="${stroke}" stroke-width="2"/><path d="M4 12h6M4 28h6" stroke="${stroke}" stroke-width="2"/>`,
      NOR: `<path d="M10 6c8 0 16 4 22 14C26 30 18 34 10 34c4-6 4-22 0-28z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M8 6c5 7 5 21 0 28" stroke="${stroke}" stroke-width="2"/><circle cx="38" cy="20" r="3.5" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M41.5 20H50" stroke="${stroke}" stroke-width="2"/><path d="M4 12h6M4 28h6" stroke="${stroke}" stroke-width="2"/>`,
      XOR: `<path d="M14 6c8 0 16 4 22 14C30 30 22 34 14 34c4-6 4-22 0-28z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M12 6c5 7 5 21 0 28" stroke="${stroke}" stroke-width="2"/><path d="M7 6c5 7 5 21 0 28" stroke="${stroke}" stroke-width="2"/><path d="M36 20h14" stroke="${stroke}" stroke-width="2"/><path d="M4 12h4M4 28h4" stroke="${stroke}" stroke-width="2"/>`,
      XNOR: `<path d="M14 6c8 0 16 4 22 14C30 30 22 34 14 34c4-6 4-22 0-28z" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M12 6c5 7 5 21 0 28" stroke="${stroke}" stroke-width="2"/><path d="M7 6c5 7 5 21 0 28" stroke="${stroke}" stroke-width="2"/><circle cx="42" cy="20" r="3.5" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M45.5 20H54" stroke="${stroke}" stroke-width="2"/><path d="M4 12h4M4 28h4" stroke="${stroke}" stroke-width="2"/>`,
      INPUT: `<rect x="10" y="8" width="28" height="24" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M38 20h16" stroke="${stroke}" stroke-width="2"/><circle cx="54" cy="20" r="3" fill="${stroke}"/>`,
      OUTPUT: `<circle cx="34" cy="20" r="12" fill="${fill}" stroke="${stroke}" stroke-width="2"/><path d="M8 20h14" stroke="${stroke}" stroke-width="2"/><circle cx="8" cy="20" r="3" fill="${stroke}"/>`,
    };

    return `<svg ${common}>${shapes[type] || shapes.AND}</svg>`;
  }

  function buildPalette() {
    Object.entries(GATE_DEFS).forEach(([type, def]) => {
      const item = document.createElement("div");
      item.className = "palette-item";
      item.draggable = true;
      item.dataset.type = type;
      item.innerHTML = `${symbolSvg(type, true)}<span>${def.label}</span>`;
      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/gate-type", type);
        e.dataTransfer.effectAllowed = "copy";
        state._paletteDragType = type;
        setStatus(
          canSeriesInsert(type)
            ? `Placing ${def.label}… drop on a wire to snap in between`
            : `Placing ${def.label}… drop on the board`
        );
      });
      item.addEventListener("dragend", () => {
        state._paletteDragType = null;
        if (state.snapWireId) {
          state.snapWireId = null;
          drawWires();
        }
      });
      (def.category === "io" ? el.paletteIo : el.paletteGates).appendChild(item);
    });
  }

  function createNode(type, x, y) {
    const def = GATE_DEFS[type];
    const id = uid("n");
    const node = {
      id,
      type,
      x: Math.max(20, x),
      y: Math.max(20, y),
      state: type === "INPUT" ? false : null,
      inputs: Array(def.inputs).fill(null),
      outputs: Array(def.outputs).fill(false),
    };
    state.nodes.set(id, node);
    renderNode(node);
    selectNode(id);
    updateEmptyHint();
    if (state.live) simulate();
    setStatus(`Added ${def.label}`);
    return node;
  }

  function renderNode(node) {
    const def = GATE_DEFS[node.type];
    let dom = document.getElementById(node.id);
    if (!dom) {
      dom = document.createElement("div");
      dom.className = "node";
      dom.id = node.id;
      el.board.appendChild(dom);

      dom.addEventListener("mousedown", (e) => {
        if (e.target.closest(".port") || e.target.closest(".switch-btn")) return;
        if (state.tool !== "select" || e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        selectNode(node.id);
        state.dragNode = node.id;
        const rect = dom.getBoundingClientRect();
        state.dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      });
    }

    dom.style.left = `${node.x}px`;
    dom.style.top = `${node.y}px`;
    dom.classList.toggle("selected", state.selectedId === node.id);

    const inLabels = def.inputs === 1 ? ["IN"] : ["A", "B"];
    const outLabels = ["OUT"];

    let center = "";
    if (node.type === "INPUT") {
      center = `<button type="button" class="switch-btn ${node.state ? "on" : ""}" data-toggle="${node.id}">${node.state ? "1" : "0"}</button>`;
    } else if (node.type === "OUTPUT") {
      const lit = node.inputs[0] === true;
      center = `<div class="led-bulb ${lit ? "on" : ""}" title="${lit ? "HIGH" : node.inputs[0] === false ? "LOW" : "FLOAT"}"></div>`;
    } else {
      center = `<div class="node-symbol">${symbolSvg(node.type)}</div>`;
    }

    const inputsHtml = Array.from({ length: def.inputs }, (_, i) => {
      const val = node.inputs[i];
      const cls = val === true ? "high" : val === false ? "low" : "float";
      return `<button type="button" class="port input ${cls}" data-node="${node.id}" data-port="in" data-index="${i}" data-label="${inLabels[i]}" title="Input ${inLabels[i]}"></button>`;
    }).join("");

    const outputsHtml = Array.from({ length: def.outputs }, (_, i) => {
      const val = node.outputs[i];
      const cls = val === true ? "high" : "low";
      return `<button type="button" class="port output ${cls}" data-node="${node.id}" data-port="out" data-index="${i}" data-label="${outLabels[i]}" title="Output"></button>`;
    }).join("");

    dom.innerHTML = `
      <div class="node-header"><span>${def.label}</span></div>
      <div class="node-body">
        <div class="ports inputs">${inputsHtml}</div>
        <div class="node-symbol">${center}</div>
        <div class="ports outputs">${outputsHtml}</div>
      </div>
    `;

    if (state.linkDrag) {
      const d = state.linkDrag;
      if (d.nodeId === node.id) {
        const sel = `.port.${d.port === "out" ? "output" : "input"}[data-index="${d.index}"]`;
        const p = dom.querySelector(sel);
        if (p) p.classList.add("wiring");
      }
    }
  }

  function refreshAllNodes() {
    state.nodes.forEach((n) => renderNode(n));
  }

  function selectNode(id) {
    state.selectedId = id;
    state.selectedWireId = null;
    refreshAllNodes();
    drawWires();
    updateInspector();
  }

  function selectWire(id) {
    state.selectedWireId = id;
    state.selectedId = null;
    refreshAllNodes();
    drawWires();
    updateInspector();
  }

  function clearSelection() {
    state.selectedId = null;
    state.selectedWireId = null;
    cancelLinkDrag();
    refreshAllNodes();
    drawWires();
    updateInspector();
  }

  function updateEmptyHint() {
    el.emptyHint.classList.toggle("hidden", state.nodes.size > 0);
  }

  function getPortCenter(nodeId, port, index) {
    const btn = document.querySelector(
      `.port[data-node="${nodeId}"][data-port="${port}"][data-index="${index}"]`
    );
    if (!btn) return null;
    // board.getBoundingClientRect already reflects scroll — do not add scrollLeft/Top
    const boardRect = el.board.getBoundingClientRect();
    const r = btn.getBoundingClientRect();
    return {
      x: r.left - boardRect.left + r.width / 2,
      y: r.top - boardRect.top + r.height / 2,
    };
  }

  function clientToBoard(clientX, clientY) {
    const boardRect = el.board.getBoundingClientRect();
    return {
      x: clientX - boardRect.left,
      y: clientY - boardRect.top,
    };
  }

  function wireControls(x1, y1, x2, y2) {
    const dx = Math.max(40, Math.abs(x2 - x1) * 0.45);
    return {
      p0: { x: x1, y: y1 },
      p1: { x: x1 + dx, y: y1 },
      p2: { x: x2 - dx, y: y2 },
      p3: { x: x2, y: y2 },
    };
  }

  function wirePath(x1, y1, x2, y2) {
    const { p0, p1, p2, p3 } = wireControls(x1, y1, x2, y2);
    return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;
  }

  function cubicPoint(t, p0, p1, p2, p3) {
    const u = 1 - t;
    const uu = u * u;
    const tt = t * t;
    return {
      x: uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
      y: uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y,
    };
  }

  function distPointToWire(px, py, wire) {
    const a = getPortCenter(wire.fromNode, "out", wire.fromIndex);
    const b = getPortCenter(wire.toNode, "in", wire.toIndex);
    if (!a || !b) return { dist: Infinity, point: null, a, b };
    const { p0, p1, p2, p3 } = wireControls(a.x, a.y, b.x, b.y);
    let best = Infinity;
    let bestPoint = null;
    for (let i = 0; i <= 24; i++) {
      const pt = cubicPoint(i / 24, p0, p1, p2, p3);
      const d = Math.hypot(px - pt.x, py - pt.y);
      if (d < best) {
        best = d;
        bestPoint = pt;
      }
    }
    return { dist: best, point: bestPoint, a, b };
  }

  function canSeriesInsert(type) {
    const def = GATE_DEFS[type];
    return !!(def && def.inputs >= 1 && def.outputs >= 1);
  }

  function nodeCenter(node) {
    const dom = document.getElementById(node.id);
    const w = dom ? dom.offsetWidth : 110;
    const h = dom ? dom.offsetHeight : 80;
    return { x: node.x + w / 2, y: node.y + h / 2, w, h };
  }

  function findSnapWire(px, py, excludeNodeId, type) {
    if (!canSeriesInsert(type)) return null;
    let bestId = null;
    let bestDist = SNAP_DISTANCE;
    state.wires.forEach((wire) => {
      if (excludeNodeId && (wire.fromNode === excludeNodeId || wire.toNode === excludeNodeId)) {
        return;
      }
      const hit = distPointToWire(px, py, wire);
      if (hit.dist < bestDist) {
        bestDist = hit.dist;
        bestId = wire.id;
      }
    });
    return bestId;
  }

  function setSnapWire(wireId, { announce = true } = {}) {
    const changed = state.snapWireId !== wireId;
    state.snapWireId = wireId;
    if (state.dragNode) {
      const dom = document.getElementById(state.dragNode);
      if (dom) dom.classList.toggle("snap-ready", !!wireId);
    }
    if (announce && changed && wireId) {
      setStatus("Release to snap this gate into the wire");
    }
  }

  function clearNodeSnapClass() {
    document.querySelectorAll(".node.snap-ready").forEach((n) => n.classList.remove("snap-ready"));
  }

  function insertNodeOnWire(nodeId, wireId) {
    const node = state.nodes.get(nodeId);
    const wire = state.wires.get(wireId);
    if (!node || !wire || !canSeriesInsert(node.type)) return false;
    if (wire.fromNode === nodeId || wire.toNode === nodeId) return false;

    // Free the ports we will use for the series connection
    for (const [id, w] of [...state.wires.entries()]) {
      if (w.toNode === nodeId && w.toIndex === 0) state.wires.delete(id);
      if (w.fromNode === nodeId && w.fromIndex === 0) state.wires.delete(id);
    }

    const { fromNode, fromIndex, toNode, toIndex } = wire;
    state.wires.delete(wireId);

    const idIn = uid("w");
    state.wires.set(idIn, {
      id: idIn,
      fromNode,
      fromIndex,
      toNode: nodeId,
      toIndex: 0,
    });
    const idOut = uid("w");
    state.wires.set(idOut, {
      id: idOut,
      fromNode: nodeId,
      fromIndex: 0,
      toNode,
      toIndex,
    });

    // Nudge the gate onto the wire midpoint
    const c = nodeCenter(node);
    const a = getPortCenter(fromNode, "out", fromIndex);
    const b = getPortCenter(toNode, "in", toIndex);
    if (a && b) {
      node.x = Math.max(0, (a.x + b.x) / 2 - c.w / 2);
      node.y = Math.max(0, (a.y + b.y) / 2 - c.h / 2);
    }

    state.snapWireId = null;
    clearNodeSnapClass();
    selectNode(nodeId);
    if (state.live) simulate();
    else {
      refreshAllNodes();
      drawWires();
    }
    setStatus(`${GATE_DEFS[node.type].label} snapped into the wire`);
    return true;
  }

  function drawWires() {
    const parts = [];
    state.wires.forEach((wire) => {
      const a = getPortCenter(wire.fromNode, "out", wire.fromIndex);
      const b = getPortCenter(wire.toNode, "in", wire.toIndex);
      if (!a || !b) return;
      const fromNode = state.nodes.get(wire.fromNode);
      const val = fromNode ? fromNode.outputs[wire.fromIndex] : null;
      const cls = val === true ? "high" : val === false ? "low" : "float";
      const selected = state.selectedWireId === wire.id ? " selected" : "";
      const snap = state.snapWireId === wire.id ? " snap-target" : "";
      const cutH = state.cutHoverIds.has(wire.id) ? " cut-hover" : "";
      parts.push(
        `<path class="wire-path ${cls}${selected}${snap}${cutH}" data-wire="${wire.id}" d="${wirePath(a.x, a.y, b.x, b.y)}" />`
      );
    });
    el.wires.innerHTML = parts.join("");

    el.wires.querySelectorAll(".wire-path").forEach((path) => {
      path.addEventListener("mousedown", (e) => {
        if (state.tool === "cut" || e.ctrlKey || e.metaKey) return;
        e.stopPropagation();
        selectWire(path.dataset.wire);
        setStatus("Wire selected — press Delete to remove");
      });
    });
  }

  function findWireInto(nodeId, index) {
    for (const w of state.wires.values()) {
      if (w.toNode === nodeId && w.toIndex === index) return w;
    }
    return null;
  }

  function removeWiresInto(nodeId, index) {
    for (const [id, w] of [...state.wires.entries()]) {
      if (w.toNode === nodeId && w.toIndex === index) state.wires.delete(id);
    }
  }

  function connectPorts(outNodeId, outIndex, inNodeId, inIndex) {
    if (outNodeId === inNodeId) {
      setStatus("Cannot link a component to itself");
      return false;
    }
    removeWiresInto(inNodeId, inIndex);
    const id = uid("w");
    state.wires.set(id, {
      id,
      fromNode: outNodeId,
      fromIndex: outIndex,
      toNode: inNodeId,
      toIndex: inIndex,
    });
    if (state.live) simulate();
    else {
      drawWires();
      refreshAllNodes();
    }
    setStatus("Link connected");
    return true;
  }

  function beginLinkDrag(portEl, clientX, clientY) {
    const nodeId = portEl.dataset.node;
    const port = portEl.dataset.port;
    const index = Number(portEl.dataset.index);

    if (port === "in") {
      const existing = findWireInto(nodeId, index);
      if (existing) {
        // Blender-style: pick up the link — keep the output end, free the input
        state.wires.delete(existing.id);
        state.linkDrag = {
          nodeId: existing.fromNode,
          port: "out",
          index: existing.fromIndex,
          pickedUp: true,
          startX: clientX,
          startY: clientY,
          hover: null,
        };
        if (state.live) simulate();
        else drawWires();
        setStatus("Move the link to another input — drop empty to disconnect");
      } else {
        state.linkDrag = {
          nodeId,
          port: "in",
          index,
          pickedUp: false,
          startX: clientX,
          startY: clientY,
          hover: null,
        };
        setStatus("Drop on an output port to connect");
      }
    } else {
      state.linkDrag = {
        nodeId,
        port: "out",
        index,
        pickedUp: false,
        startX: clientX,
        startY: clientY,
        hover: null,
      };
      setStatus("Drop on an input port to connect");
    }

    document.getElementById("workspace").classList.add("linking");
    el.wires.style.pointerEvents = "none";
    refreshAllNodes();
  }

  function cancelLinkDrag() {
    state.linkDrag = null;
    el.wirePreview.innerHTML = "";
    document.getElementById("workspace").classList.remove("linking");
    el.wires.style.pointerEvents = "";
    document.querySelectorAll(".port.link-target").forEach((p) => p.classList.remove("link-target"));
    refreshAllNodes();
  }

  function isCompatibleLinkTarget(drag, portEl) {
    const nodeId = portEl.dataset.node;
    const port = portEl.dataset.port;
    if (nodeId === drag.nodeId) return false;
    if (drag.port === "out" && port === "in") return true;
    if (drag.port === "in" && port === "out") return true;
    return false;
  }

  function findNearestLinkTarget(drag, boardX, boardY, maxDist = 56) {
    let best = null;
    let bestDist = maxDist;
    document.querySelectorAll(".port").forEach((portEl) => {
      if (!isCompatibleLinkTarget(drag, portEl)) return;
      const c = getPortCenter(portEl.dataset.node, portEl.dataset.port, Number(portEl.dataset.index));
      if (!c) return;
      const d = Math.hypot(c.x - boardX, c.y - boardY);
      if (d < bestDist) {
        bestDist = d;
        best = portEl;
      }
    });
    return best;
  }

  function updateLinkPreview(clientX, clientY) {
    const drag = state.linkDrag;
    if (!drag) {
      el.wirePreview.innerHTML = "";
      return;
    }
    const anchor = getPortCenter(drag.nodeId, drag.port, drag.index);
    if (!anchor) return;
    const cursor = clientToBoard(clientX, clientY);

    // Magnetic snap toward nearest compatible port
    const target = findNearestLinkTarget(drag, cursor.x, cursor.y);
    drag.hover = target
      ? { nodeId: target.dataset.node, port: target.dataset.port, index: Number(target.dataset.index) }
      : null;

    let endX = cursor.x;
    let endY = cursor.y;
    if (target) {
      const tc = getPortCenter(target.dataset.node, target.dataset.port, Number(target.dataset.index));
      if (tc) {
        endX = tc.x;
        endY = tc.y;
      }
    }

    const d =
      drag.port === "out"
        ? wirePath(anchor.x, anchor.y, endX, endY)
        : wirePath(endX, endY, anchor.x, anchor.y);
    el.wirePreview.innerHTML = `<path class="wire-preview-path" d="${d}" />`;

    document.querySelectorAll(".port.link-target").forEach((p) => p.classList.remove("link-target"));
    if (target) target.classList.add("link-target");
  }

  function finishLinkDrag(clientX, clientY) {
    const drag = state.linkDrag;
    if (!drag) return;

    const moved = Math.hypot(clientX - drag.startX, clientY - drag.startY);
    const cursor = clientToBoard(clientX, clientY);
    const port =
      (drag.hover &&
        document.querySelector(
          `.port[data-node="${drag.hover.nodeId}"][data-port="${drag.hover.port}"][data-index="${drag.hover.index}"]`
        )) ||
      findNearestLinkTarget(drag, cursor.x, cursor.y);

    let connected = false;
    if (port && isCompatibleLinkTarget(drag, port)) {
      const tNode = port.dataset.node;
      const tPort = port.dataset.port;
      const tIndex = Number(port.dataset.index);
      if (drag.port === "out" && tPort === "in") {
        connected = connectPorts(drag.nodeId, drag.index, tNode, tIndex);
      } else if (drag.port === "in" && tPort === "out") {
        connected = connectPorts(tNode, tIndex, drag.nodeId, drag.index);
      }
    } else if (drag.pickedUp) {
      setStatus("Link disconnected");
    } else if (moved > 8) {
      setStatus("Link cancelled — drop on a highlighted port");
    }

    cancelLinkDrag();
    if (state.live) simulate();
    else {
      drawWires();
      refreshAllNodes();
    }
  }

  function segmentsIntersect(a, b, c, d) {
    const det = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
    if (Math.abs(det) < 1e-8) return false;
    const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / det;
    const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / det;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  function wirePolyline(wire) {
    const a = getPortCenter(wire.fromNode, "out", wire.fromIndex);
    const b = getPortCenter(wire.toNode, "in", wire.toIndex);
    if (!a || !b) return [];
    const { p0, p1, p2, p3 } = wireControls(a.x, a.y, b.x, b.y);
    const pts = [];
    for (let i = 0; i <= 16; i++) pts.push(cubicPoint(i / 16, p0, p1, p2, p3));
    return pts;
  }

  function wiresHitByStroke(points) {
    const hit = new Set();
    if (points.length < 2) return hit;
    state.wires.forEach((wire) => {
      const poly = wirePolyline(wire);
      for (let i = 0; i < points.length - 1 && !hit.has(wire.id); i++) {
        for (let j = 0; j < poly.length - 1; j++) {
          if (segmentsIntersect(points[i], points[i + 1], poly[j], poly[j + 1])) {
            hit.add(wire.id);
            break;
          }
        }
      }
    });
    return hit;
  }

  function beginCut(pt) {
    state.cutStroke = { points: [pt] };
    state.cutHoverIds = new Set();
    document.getElementById("workspace").classList.add("cutting");
    setStatus("Drag across links to cut them");
  }

  function updateCut(pt) {
    if (!state.cutStroke) return;
    const last = state.cutStroke.points[state.cutStroke.points.length - 1];
    if (Math.hypot(pt.x - last.x, pt.y - last.y) < 4) return;
    state.cutStroke.points.push(pt);
    state.cutHoverIds = wiresHitByStroke(state.cutStroke.points);
    drawWires();
    const pts = state.cutStroke.points;
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    el.wirePreview.innerHTML = `<path class="cut-stroke-path" d="${d}" />`;
  }

  function finishCut() {
    if (!state.cutStroke) return;
    const hit = wiresHitByStroke(state.cutStroke.points);
    hit.forEach((id) => state.wires.delete(id));
    state.cutStroke = null;
    state.cutHoverIds = new Set();
    el.wirePreview.innerHTML = "";
    document.getElementById("workspace").classList.remove("cutting");
    if (hit.size) {
      if (state.live) simulate();
      else drawWires();
      setStatus(`Cut ${hit.size} link${hit.size === 1 ? "" : "s"}`);
    } else {
      drawWires();
      setStatus("No links cut");
    }
  }

  function cancelCut() {
    state.cutStroke = null;
    state.cutHoverIds = new Set();
    el.wirePreview.innerHTML = "";
    document.getElementById("workspace").classList.remove("cutting");
    drawWires();
  }

  function deleteSelected() {
    if (state.selectedWireId) {
      state.wires.delete(state.selectedWireId);
      state.selectedWireId = null;
      if (state.live) simulate();
      else drawWires();
      updateInspector();
      setStatus("Wire removed");
      return;
    }
    if (!state.selectedId) return;
    const id = state.selectedId;
    for (const [wid, w] of [...state.wires.entries()]) {
      if (w.fromNode === id || w.toNode === id) state.wires.delete(wid);
    }
    const dom = document.getElementById(id);
    if (dom) dom.remove();
    state.nodes.delete(id);
    state.selectedId = null;
    updateEmptyHint();
    if (state.live) simulate();
    else drawWires();
    updateInspector();
    setStatus("Component removed");
  }

  function clearBoard() {
    if (state.nodes.size === 0) return;
    if (!confirm("Clear the entire board?")) return;
    state.nodes.clear();
    state.wires.clear();
    state.selectedId = null;
    state.selectedWireId = null;
    cancelLinkDrag();
    cancelCut();
    el.board.innerHTML = "";
    el.wires.innerHTML = "";
    updateEmptyHint();
    updateInspector();
    setStatus("Board cleared");
  }

  function simulate() {
    const nodes = state.nodes;
    nodes.forEach((n) => {
      const def = GATE_DEFS[n.type];
      n.inputs = Array(def.inputs).fill(null);
      if (n.type === "INPUT") {
        n.outputs = [!!n.state];
      } else {
        n.outputs = Array(def.outputs).fill(false);
      }
    });

    state.wires.forEach((w) => {
      const target = nodes.get(w.toNode);
      if (target) target.inputs[w.toIndex] = false;
    });

    const maxPass = nodes.size + 2;
    for (let pass = 0; pass < maxPass; pass++) {
      let changed = false;
      nodes.forEach((n) => {
        const def = GATE_DEFS[n.type];
        if (n.type === "INPUT") {
          const next = [!!n.state];
          if (next[0] !== n.outputs[0]) {
            n.outputs = next;
            changed = true;
          }
          return;
        }
        if (n.type === "OUTPUT") return;

        const vals = n.inputs.map((v) => v === true);
        const next = def.eval(vals).map(Boolean);
        if (next.some((v, i) => v !== n.outputs[i])) {
          n.outputs = next;
          changed = true;
        }
      });

      state.wires.forEach((w) => {
        const src = nodes.get(w.fromNode);
        const dst = nodes.get(w.toNode);
        if (!src || !dst) return;
        const val = src.outputs[w.fromIndex] === true;
        if (dst.inputs[w.toIndex] !== val) {
          dst.inputs[w.toIndex] = val;
          changed = true;
        }
      });

      if (!changed) break;
    }

    // Mark floating inputs that have no wire
    const driven = new Set();
    state.wires.forEach((w) => driven.add(`${w.toNode}:${w.toIndex}`));
    nodes.forEach((n) => {
      n.inputs = n.inputs.map((v, i) => (driven.has(`${n.id}:${i}`) ? v === true : null));
    });

    refreshAllNodes();
    drawWires();
    updateInspector();
  }

  function updateInspector() {
    if (state.selectedWireId) {
      const w = state.wires.get(state.selectedWireId);
      el.truthPanel.hidden = true;
      if (!w) {
        el.probePanel.innerHTML = `<p class="probe-idle">Select a component to inspect its ports and truth.</p>`;
        return;
      }
      const from = state.nodes.get(w.fromNode);
      const to = state.nodes.get(w.toNode);
      const val = from ? from.outputs[w.fromIndex] : null;
      el.probePanel.innerHTML = `
        <p class="probe-title">Wire</p>
        <div class="probe-meta">
          <div><span>From</span><strong>${from ? GATE_DEFS[from.type].label : "?"} OUT</strong></div>
          <div><span>To</span><strong>${to ? GATE_DEFS[to.type].label : "?"} IN</strong></div>
          <div><span>Signal</span><strong>${val === true ? "1 HIGH" : "0 LOW"}</strong></div>
        </div>
      `;
      return;
    }

    const node = state.selectedId ? state.nodes.get(state.selectedId) : null;
    if (!node) {
      el.probePanel.innerHTML = `<p class="probe-idle">Select a component to inspect its ports and truth.</p>`;
      el.truthPanel.hidden = true;
      return;
    }

    const def = GATE_DEFS[node.type];
    const inText = node.inputs
      .map((v, i) => `${def.inputs === 1 ? "IN" : "AB"[i]}=${v === null ? "—" : v ? "1" : "0"}`)
      .join("  ");
    const outText = node.outputs.map((v) => (v ? "1" : "0")).join("  ");

    el.probePanel.innerHTML = `
      <p class="probe-title">${def.label}</p>
      <div class="probe-meta">
        <div><span>Type</span><strong>${node.type}</strong></div>
        ${def.inputs ? `<div><span>Inputs</span><strong>${inText || "—"}</strong></div>` : ""}
        ${def.outputs ? `<div><span>Outputs</span><strong>${outText || "—"}</strong></div>` : ""}
        ${node.type === "INPUT" ? `<div><span>Switch</span><strong>${node.state ? "ON (1)" : "OFF (0)"}</strong></div>` : ""}
        ${node.type === "OUTPUT" ? `<div><span>LED</span><strong>${node.inputs[0] === true ? "LIT" : node.inputs[0] === false ? "OFF" : "FLOAT"}</strong></div>` : ""}
      </div>
    `;

    if (def.truth) {
      el.truthPanel.hidden = false;
      const cols = def.inputs === 1 ? ["IN", "OUT"] : ["A", "B", "OUT"];
      const rows = def.truth
        .map((row) => `<tr>${row.in.map((v) => `<td>${v}</td>`).join("")}<td>${row.out}</td></tr>`)
        .join("");
      el.truthTable.innerHTML = `<table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
    } else {
      el.truthPanel.hidden = true;
    }
  }

  function syncToolButtons() {
    document.querySelectorAll(".tool-btn[data-tool]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.tool === state.tool));
    });
  }

  function boardPointFromEvent(e) {
    return clientToBoard(e.clientX, e.clientY);
  }

  // Events
  el.boardWrap.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const pt = boardPointFromEvent(e);
    const dragType = state._paletteDragType;
    if (dragType && canSeriesInsert(dragType)) {
      setSnapWire(findSnapWire(pt.x, pt.y, null, dragType));
      drawWires();
    }
  });

  el.boardWrap.addEventListener("dragleave", (e) => {
    if (!el.boardWrap.contains(e.relatedTarget)) {
      state.snapWireId = null;
      drawWires();
    }
  });

  el.boardWrap.addEventListener("drop", (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("text/gate-type") || state._paletteDragType;
    state._paletteDragType = null;
    if (!GATE_DEFS[type]) return;
    const pt = boardPointFromEvent(e);
    const snapId = state.snapWireId || findSnapWire(pt.x, pt.y, null, type);
    state.snapWireId = null;
    const node = createNode(type, pt.x - 55, pt.y - 40);
    if (snapId) insertNodeOnWire(node.id, snapId);
  });

  el.boardWrap.addEventListener(
    "mousedown",
    (e) => {
      if (e.button !== 0) return;

      const wantsCut = state.tool === "cut" || e.ctrlKey || e.metaKey;
      if (wantsCut && !e.target.closest(".switch-btn")) {
        e.preventDefault();
        e.stopPropagation();
        beginCut(boardPointFromEvent(e));
        return;
      }

      const port = e.target.closest(".port");
      if (port) {
        e.preventDefault();
        e.stopPropagation();
        beginLinkDrag(port, e.clientX, e.clientY);
        updateLinkPreview(e.clientX, e.clientY);
      }
    },
    true
  );

  el.boardWrap.addEventListener("click", (e) => {
    if (state.linkDrag || state.cutStroke) return;

    const toggle = e.target.closest("[data-toggle]");
    if (toggle) {
      const node = state.nodes.get(toggle.dataset.toggle);
      if (!node) return;
      node.state = !node.state;
      if (state.live) simulate();
      else {
        renderNode(node);
        updateInspector();
      }
      setStatus(`Input set to ${node.state ? "1" : "0"}`);
      return;
    }

    if (e.target.closest(".port")) return;
    if (e.target.closest(".wire-path")) return;
    if (!e.target.closest(".node")) clearSelection();
  });

  window.addEventListener("mousemove", (e) => {
    if (state.cutStroke) {
      updateCut(boardPointFromEvent(e));
      return;
    }

    if (state.linkDrag) {
      updateLinkPreview(e.clientX, e.clientY);
      return;
    }

    if (state.dragNode) {
      const node = state.nodes.get(state.dragNode);
      if (!node) return;
      const wrapRect = el.boardWrap.getBoundingClientRect();
      node.x = Math.max(0, e.clientX - wrapRect.left - state.dragOffset.x + el.boardWrap.scrollLeft);
      node.y = Math.max(0, e.clientY - wrapRect.top - state.dragOffset.y + el.boardWrap.scrollTop);
      const dom = document.getElementById(node.id);
      if (dom) {
        dom.style.left = `${node.x}px`;
        dom.style.top = `${node.y}px`;
      }
      const center = nodeCenter(node);
      setSnapWire(findSnapWire(center.x, center.y, node.id, node.type));
      drawWires();
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (state.cutStroke) {
      finishCut();
      return;
    }

    if (state.linkDrag) {
      finishLinkDrag(e.clientX, e.clientY);
      return;
    }

    const dragging = state.dragNode;
    const snapId = state.snapWireId;
    state.dragNode = null;
    if (dragging && snapId) {
      insertNodeOnWire(dragging, snapId);
    }
    state.snapWireId = null;
    clearNodeSnapClass();
    drawWires();
  });

  document.getElementById("btn-select").addEventListener("click", () => {
    state.tool = "select";
    cancelLinkDrag();
    cancelCut();
    syncToolButtons();
    setStatus("Select — drag ports to link, drag gates to move");
  });

  document.getElementById("btn-cut").addEventListener("click", () => {
    state.tool = "cut";
    cancelLinkDrag();
    syncToolButtons();
    setStatus("Cut mode — drag across links to slice them (or hold Ctrl)");
  });

  document.getElementById("btn-delete").addEventListener("click", deleteSelected);
  document.getElementById("btn-clear").addEventListener("click", clearBoard);

  el.simLive.addEventListener("change", () => {
    state.live = el.simLive.checked;
    if (state.live) {
      simulate();
      setStatus("Live simulation on");
    } else {
      setStatus("Live simulation paused");
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      cancelLinkDrag();
      cancelCut();
      clearSelection();
      state.tool = "select";
      syncToolButtons();
      setStatus("Ready");
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      deleteSelected();
    }
    if (e.key === "v" || e.key === "V") {
      state.tool = "select";
      cancelLinkDrag();
      cancelCut();
      syncToolButtons();
      setStatus("Select — drag ports to link");
    }
    if (e.key === "x" || e.key === "X") {
      state.tool = "cut";
      cancelLinkDrag();
      syncToolButtons();
      setStatus("Cut mode — drag across links to slice them");
    }
  });

  function addWireSilent(fromNodeId, fromIndex, toNodeId, toIndex) {
    const id = uid("w");
    state.wires.set(id, { id, fromNode: fromNodeId, fromIndex, toNode: toNodeId, toIndex });
  }

  // Seed a tiny demo circuit so the board feels alive
  function seedDemo() {
    const liveWas = state.live;
    state.live = false;

    const a = createNode("INPUT", 80, 160);
    const b = createNode("INPUT", 80, 300);
    const andGate = createNode("AND", 320, 220);
    const out = createNode("OUTPUT", 560, 230);
    a.state = true;
    b.state = false;
    addWireSilent(a.id, 0, andGate.id, 0);
    addWireSilent(b.id, 0, andGate.id, 1);
    addWireSilent(andGate.id, 0, out.id, 0);

    state.live = liveWas;
    selectNode(andGate.id);
    simulate();
    setStatus("Demo AND circuit loaded — toggle the inputs");
  }

  buildPalette();
  syncToolButtons();
  seedDemo();
})();
