/**
 * PDF Siteplan Node Annotator - Core Application Logic (app.js)
 * High-DPI Vector PDF Rendering, Interactive Node Overlay, Multi-Select Batch Delete, Undo/Redo & Instant Auto-Save
 */

(function () {
  'use strict';

  // --- STATE MANAGEMENT ---
  const state = {
    pdfDoc: null,
    pdfPageObj: null,
    renderTask: null,
    rerenderTimeout: null,
    currentPage: 1,
    numPages: 1,
    isPdfLoaded: false,
    pdfFileName: '',
    
    // Canvas & Viewport dimensions
    canvasWidth: 1200,
    canvasHeight: 800,
    
    // Transform State (Pan & Zoom)
    transform: {
      scale: 1,
      x: 0,
      y: 0,
      isDragging: false,
      startX: 0,
      startY: 0
    },

    // Mode: 'SELECT', 'MOVE_NODE', 'ADD_NODE'
    activeMode: 'SELECT',

    // Node Data
    nodes: [],
    selectedNodeId: null,
    draggedNodeId: null,
    dragOffset: { x: 0, y: 0 },
    lastUsedStatus: 'RENCANA',

    // Filters & Search
    activeFilter: 'ALL',
    searchQuery: '',

    // Undo / Redo History Stack
    history: [],
    historyIndex: -1,

    // Pending coords for code modal creation
    pendingNewNodeCoords: null
  };

  // Configure PDF.js Worker
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // --- DOM ELEMENTS ---
  const elements = {
    mainContainer: document.getElementById('main-container'),
    canvasViewport: document.getElementById('canvas-viewport'),
    canvasTransformWrapper: document.getElementById('canvas-transform-wrapper'),
    siteplanCanvas: document.getElementById('siteplan-canvas'),
    nodesOverlay: document.getElementById('nodes-overlay'),
    
    // File inputs & Info
    pdfFileInput: document.getElementById('pdf-file-input'),
    fileInfoLabel: document.getElementById('file-info-label'),
    emptyStateOverlay: document.getElementById('empty-state-overlay'),
    btnExportJson: document.getElementById('btn-export-json'),
    btnExportExcel: document.getElementById('btn-export-excel'),
    jsonImportInput: document.getElementById('json-import-input'),
    btnExportImage: document.getElementById('btn-export-image'),
    btnClearNodes: document.getElementById('btn-clear-nodes'),

    // Undo & Redo
    btnUndo: document.getElementById('btn-undo'),
    btnRedo: document.getElementById('btn-redo'),

    // PDF Nav
    pdfPageNav: document.getElementById('pdf-page-nav'),
    btnPrevPage: document.getElementById('btn-prev-page'),
    btnNextPage: document.getElementById('btn-next-page'),
    currentPageNum: document.getElementById('current-page-num'),
    totalPageCount: document.getElementById('total-page-count'),

    // Modes & Toolbar
    modeSelectBtn: document.getElementById('mode-select'),
    modeMoveNodeBtn: document.getElementById('mode-move-node'),
    modeAddNodeBtn: document.getElementById('mode-add-node'),
    searchInput: document.getElementById('search-input'),
    filterBtns: document.querySelectorAll('.filter-btn'),

    // Stats
    statTotal: document.getElementById('stat-total'),
    statRencana: document.getElementById('stat-rencana'),
    statConstruction: document.getElementById('stat-construction'),
    statFuneralReady: document.getElementById('stat-funeral-ready'),
    statFinish: document.getElementById('stat-finish'),

    // Zoom Controls
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    btnFitView: document.getElementById('btn-fit-view'),
    btnResetZoom: document.getElementById('btn-reset-zoom'),
    zoomLevelText: document.getElementById('zoom-level-text'),

    // Tooltip
    nodeTooltip: document.getElementById('node-tooltip'),
    tooltipCode: document.getElementById('tooltip-code'),
    tooltipStatus: document.getElementById('tooltip-status'),
    tooltipType: document.getElementById('tooltip-type'),
    tooltipCategory: document.getElementById('tooltip-category'),
    tooltipDimension: document.getElementById('tooltip-dimension'),
    tooltipArea: document.getElementById('tooltip-area'),
    tooltipCustomProps: document.getElementById('tooltip-custom-props'),

    // Drawer Editor
    nodeDrawer: document.getElementById('node-drawer'),
    drawerCloseBtn: document.getElementById('drawer-close-btn'),
    drawerStatusBtns: document.querySelectorAll('#drawer-status-grid button'),
    inputNodeCode: document.getElementById('input-node-code'),
    inputNodeCategory: document.getElementById('input-node-category'),
    inputNodeType: document.getElementById('input-node-type'),
    inputNodeDimension: document.getElementById('input-node-dimension'),
    inputNodeArea: document.getElementById('input-node-area'),
    customPropsContainer: document.getElementById('custom-properties-container'),
    btnAddProperty: document.getElementById('btn-add-property'),
    coordX: document.getElementById('coord-x'),
    coordY: document.getElementById('coord-y'),
    btnDeleteNode: document.getElementById('btn-delete-node'),

    // Code Input Modal UI
    codeInputModal: document.getElementById('code-input-modal'),
    modalInputCode: document.getElementById('modal-input-code'),
    modalBtnCancel: document.getElementById('modal-btn-cancel'),
    modalBtnSubmit: document.getElementById('modal-btn-submit'),

    // Export Image Modal UI
    exportImageModal: document.getElementById('export-image-modal'),
    exportInputTitle: document.getElementById('export-input-title'),
    exportModalBtnCancel: document.getElementById('export-modal-btn-cancel'),
    exportModalBtnConfirm: document.getElementById('export-modal-btn-confirm'),

    // Confirm Clear All Nodes Modal UI
    confirmClearModal: document.getElementById('confirm-clear-modal'),
    clearModalNodeCount: document.getElementById('clear-modal-node-count'),
    clearModalBtnCancel: document.getElementById('clear-modal-btn-cancel'),
    clearModalBtnConfirm: document.getElementById('clear-modal-btn-confirm'),

    // Toast Notification UI
    toastNotification: document.getElementById('toast-notification'),
    toastBox: document.getElementById('toast-box'),
    toastIconWrap: document.getElementById('toast-icon-wrap'),
    toastIcon: document.getElementById('toast-icon'),
    toastTitle: document.getElementById('toast-title'),
    toastMessage: document.getElementById('toast-message'),
    toastCloseBtn: document.getElementById('toast-close-btn')
  };

  // --- INITIALIZATION ---
  function init() {
    setupEventListeners();
    loadSessionData();

    if (!state.isPdfLoaded) {
      if (elements.emptyStateOverlay) elements.emptyStateOverlay.classList.remove('hidden');
      if (elements.canvasTransformWrapper) elements.canvasTransformWrapper.classList.add('hidden');
      elements.fileInfoLabel.textContent = 'Belum ada file PDF yang dibuka';
    }

    renderNodes();
    updateStats();
  }

  // --- UNDO / REDO HISTORY ENGINE ---
  function pushHistory() {
    if (state.historyIndex < state.history.length - 1) {
      state.history = state.history.slice(0, state.historyIndex + 1);
    }
    state.history.push(JSON.parse(JSON.stringify(state.nodes)));
    if (state.history.length > 50) {
      state.history.shift();
    } else {
      state.historyIndex++;
    }
    updateUndoRedoUI();
  }

  function undo() {
    if (state.historyIndex > 0) {
      state.historyIndex--;
      state.nodes = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
      saveSessionData(false);
      renderNodes();
      updateStats();
      updateUndoRedoUI();
      if (state.selectedNodeId) selectNode(state.selectedNodeId);
    }
  }

  function redo() {
    if (state.historyIndex < state.history.length - 1) {
      state.historyIndex++;
      state.nodes = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
      saveSessionData(false);
      renderNodes();
      updateStats();
      updateUndoRedoUI();
      if (state.selectedNodeId) selectNode(state.selectedNodeId);
    }
  }

  function updateUndoRedoUI() {
    if (elements.btnUndo) elements.btnUndo.disabled = state.historyIndex <= 0;
    if (elements.btnRedo) elements.btnRedo.disabled = state.historyIndex >= state.history.length - 1;
  }

  // --- LOCAL STORAGE DATA PERSISTENCE ---
  function saveSessionData(recordHistory = true) {
    try {
      localStorage.setItem('siteplan_nodes_v2', JSON.stringify(state.nodes));
      if (state.pdfFileName) {
        localStorage.setItem('siteplan_pdf_name_v2', state.pdfFileName);
      }
      if (recordHistory) {
        pushHistory();
      }
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  function loadSessionData() {
    try {
      const savedNodes = localStorage.getItem('siteplan_nodes_v2');
      if (savedNodes) {
        state.nodes = JSON.parse(savedNodes);
      } else {
        state.nodes = [];
      }
      const savedPdfName = localStorage.getItem('siteplan_pdf_name_v2');
      if (savedPdfName) {
        state.pdfFileName = savedPdfName;
        if (elements.fileInfoLabel) {
          elements.fileInfoLabel.textContent = `File: ${savedPdfName}`;
        }
      }
      state.history = [JSON.parse(JSON.stringify(state.nodes))];
      state.historyIndex = 0;
      updateUndoRedoUI();
    } catch (e) {
      console.error('Error loading session data:', e);
      state.nodes = [];
      state.history = [[]];
      state.historyIndex = 0;
      updateUndoRedoUI();
    }
  }

  // --- PDF ENGINE (PDF.js Rendering) ---
  function loadPdfFile(file) {
    state.pdfFileName = file.name;
    elements.fileInfoLabel.textContent = `File PDF: ${file.name}`;

    const reader = new FileReader();
    reader.onload = function (e) {
      const typedArray = new Uint8Array(e.target.result);
      state.pdfRawData = typedArray;

      window.pdfjsLib.getDocument({ data: typedArray }).promise.then(pdfDoc => {
        state.pdfDoc = pdfDoc;
        state.numPages = pdfDoc.numPages;
        state.currentPage = 1;
        state.isPdfLoaded = true;

        if (elements.emptyStateOverlay) elements.emptyStateOverlay.classList.add('hidden');
        if (elements.canvasTransformWrapper) {
          elements.canvasTransformWrapper.classList.remove('hidden');
          elements.canvasTransformWrapper.style.display = '';
        }

        if (state.numPages > 1) {
          elements.pdfPageNav.classList.remove('hidden');
          elements.currentPageNum.textContent = state.currentPage;
          elements.totalPageCount.textContent = state.numPages;
        } else {
          elements.pdfPageNav.classList.add('hidden');
        }

        renderPdfPage(state.currentPage);
      }).catch(err => {
        console.error('Error loading PDF file:', err);
        alert('Gagal membaca file PDF siteplan.');
      });
    };
    reader.readAsArrayBuffer(file);
  }

  function renderPdfPage(pageNum) {
    if (!state.pdfDoc) return;

    state.pdfDoc.getPage(pageNum).then(page => {
      state.pdfPageObj = page;

      const MAX_CANVAS_DIM = 16384;
      const dpr = window.devicePixelRatio || 1;

      // Target 3x CSS scale for crisp CAD text readability
      let cssScale = 3.0;

      // Safety: clamp so physical buffer (cssScale * dpr * pageDim) stays within GPU limit
      const rawViewport = page.getViewport({ scale: 1.0 });
      const maxPhysScale = Math.min(
        MAX_CANVAS_DIM / (rawViewport.width * dpr),
        MAX_CANVAS_DIM / (rawViewport.height * dpr)
      );
      if (cssScale > maxPhysScale) {
        cssScale = maxPhysScale;
      }

      const cssViewport = page.getViewport({ scale: cssScale });
      state.canvasWidth = Math.round(cssViewport.width);
      state.canvasHeight = Math.round(cssViewport.height);

      const renderViewport = page.getViewport({ scale: cssScale * dpr });

      const canvas = elements.siteplanCanvas;
      canvas.width = Math.round(renderViewport.width);
      canvas.height = Math.round(renderViewport.height);
      canvas.style.width = `${state.canvasWidth}px`;
      canvas.style.height = `${state.canvasHeight}px`;

      const ctx = canvas.getContext('2d');

      updateOverlayDimensions();

      if (state.renderTask) {
        state.renderTask.cancel();
      }

      state.renderTask = page.render({
        canvasContext: ctx,
        viewport: renderViewport
      });
      state.renderTask.promise.then(() => {
        state.renderTask = null;
        console.log(`PDF rendered: scale=${cssScale.toFixed(2)}, canvas=${canvas.width}x${canvas.height}, css=${state.canvasWidth}x${state.canvasHeight}`);
        fitToViewport();
        renderNodes();
        updateStats();
      }).catch(err => {
        if (err && err.name !== 'RenderingCancelledException') {
          console.error('PDF page render error:', err);
        }
      });
    });
  }

  function updateOverlayDimensions() {
    elements.canvasTransformWrapper.style.width = `${state.canvasWidth}px`;
    elements.canvasTransformWrapper.style.height = `${state.canvasHeight}px`;
    elements.nodesOverlay.style.width = `${state.canvasWidth}px`;
    elements.nodesOverlay.style.height = `${state.canvasHeight}px`;
  }

  // --- PAN & ZOOM ENGINE ---
  function applyTransform() {
    elements.canvasTransformWrapper.style.transform = 
      `translate(${state.transform.x}px, ${state.transform.y}px) scale(${state.transform.scale})`;
    elements.zoomLevelText.textContent = `${Math.round(state.transform.scale * 100)}%`;
  }

  function fitToViewport() {
    const viewportRect = elements.canvasViewport.getBoundingClientRect();
    const scaleX = (viewportRect.width - 60) / state.canvasWidth;
    const scaleY = (viewportRect.height - 60) / state.canvasHeight;
    const scale = Math.min(scaleX, scaleY, 1);
    
    state.transform.scale = scale;
    state.transform.x = Math.round((viewportRect.width - state.canvasWidth * scale) / 2);
    state.transform.y = Math.round((viewportRect.height - state.canvasHeight * scale) / 2);
    applyTransform();
  }

  function zoomAtPoint(zoomFactor, clientX, clientY) {
    const oldScale = state.transform.scale;
    const newScale = Math.min(Math.max(0.1, oldScale * zoomFactor), 15);
    if (newScale === oldScale) return;

    const rect = elements.canvasViewport.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    state.transform.x = mouseX - (mouseX - state.transform.x) * (newScale / oldScale);
    state.transform.y = mouseY - (mouseY - state.transform.y) * (newScale / oldScale);
    state.transform.scale = newScale;

    applyTransform();
  }

  // --- RENDER NODES OVERLAY ---
  function renderNodes() {
    elements.nodesOverlay.innerHTML = '';

    const filteredNodes = state.nodes.filter(node => {
      if (state.activeFilter !== 'ALL' && node.status !== state.activeFilter) {
        return false;
      }
      if (state.searchQuery.trim() !== '') {
        const q = state.searchQuery.toLowerCase();
        const matchCode = (node.code || '').toLowerCase().includes(q);
        const matchCategory = (node.category || '').toLowerCase().includes(q);
        const matchType = (node.type || '').toLowerCase().includes(q);
        const matchDim = (node.dimension || '').toLowerCase().includes(q);
        const matchArea = (node.area || '').toLowerCase().includes(q);
        const matchProps = (node.properties || []).some(p => 
          (p.key || '').toLowerCase().includes(q) || (p.value || '').toLowerCase().includes(q)
        );
        return matchCode || matchCategory || matchType || matchDim || matchArea || matchProps;
      }
      return true;
    });

    filteredNodes.forEach(node => {
      const marker = document.createElement('div');
      const statusClass = (node.status || 'RENCANA').toLowerCase();
      const isSingleSelected = state.selectedNodeId === node.id;

      marker.className = `site-node-marker status-${statusClass} ${isSingleSelected ? 'selected' : ''}`;
      marker.style.left = `${node.x}px`;
      marker.style.top = `${node.y}px`;
      marker.dataset.nodeId = node.id;

      marker.innerHTML = `
        <div class="marker-pin w-2.5 h-2.5 rounded-full border border-white/70 shadow-sm transition-all"></div>
        <div class="marker-label bg-slate-900/95 text-slate-100 border border-slate-700/80 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold whitespace-nowrap shadow-md text-center">
          ${node.code || 'Node'}
        </div>
      `;

      marker.addEventListener('mouseenter', (e) => showTooltip(node, e));
      marker.addEventListener('mouseleave', hideTooltip);
      
      marker.addEventListener('mousedown', (e) => {
        if (state.activeMode === 'SELECT') {
          e.stopPropagation();
          selectNode(node.id);
        } else if (state.activeMode === 'MOVE_NODE') {
          e.stopPropagation();
          state.draggedNodeId = node.id;
          state.dragOffset = {
            x: e.clientX,
            y: e.clientY
          };
          selectNode(node.id);
        }
      });

      elements.nodesOverlay.appendChild(marker);
    });
  }

  // --- TOOLTIP HANDLER ---
  function showTooltip(node, e) {
    elements.tooltipCode.textContent = node.code || node.id;
    if (elements.tooltipType) elements.tooltipType.textContent = node.type || 'Single';
    elements.tooltipCategory.textContent = node.category || 'SAAKUURAA';
    elements.tooltipDimension.textContent = node.dimension || '-';
    elements.tooltipArea.textContent = node.area || '-';
    
    // Status Badge
    elements.tooltipStatus.textContent = getStatusLabel(node.status);
    elements.tooltipStatus.className = `px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadgeClass(node.status)}`;

    // Custom Properties
    elements.tooltipCustomProps.innerHTML = '';
    if (node.properties && node.properties.length > 0) {
      node.properties.forEach(p => {
        if (p.key && p.value) {
          const row = document.createElement('div');
          row.className = 'flex justify-between gap-2';
          row.innerHTML = `<span class="text-slate-400">${p.key}:</span><strong class="text-slate-200">${p.value}</strong>`;
          elements.tooltipCustomProps.appendChild(row);
        }
      });
    }

    elements.nodeTooltip.classList.remove('opacity-0');
    positionTooltip(e);
  }

  function positionTooltip(e) {
    const tooltip = elements.nodeTooltip;
    const x = e.clientX + 15;
    const y = e.clientY + 15;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  function hideTooltip() {
    elements.nodeTooltip.classList.add('opacity-0');
  }

  function getStatusLabel(status) {
    switch (status) {
      case 'RENCANA': return 'Rencana';
      case 'CONSTRUCTION': return 'Construction';
      case 'FUNERAL_READY': return 'Funeral Ready';
      case 'FINISH': return 'Finish';
      default: return status || 'Rencana';
    }
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'RENCANA': return 'bg-slate-700/40 text-slate-300 border border-slate-600';
      case 'CONSTRUCTION': return 'bg-slate-800 text-slate-300 border border-slate-700';
      case 'FUNERAL_READY': return 'bg-orange-500/20 text-orange-300 border border-orange-500/30';
      case 'FINISH': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      default: return 'bg-slate-700 text-slate-300';
    }
  }

  // --- NODE SELECTION & DRAWER EDITOR ---
  function selectNode(nodeId) {
    state.selectedNodeId = nodeId;
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    elements.inputNodeCode.value = node.code || '';
    elements.inputNodeCategory.value = node.category || 'SAAKUURAA';
    if (elements.inputNodeType) elements.inputNodeType.value = node.type || 'Single';
    elements.inputNodeDimension.value = node.dimension || '';
    elements.inputNodeArea.value = node.area || '';
    elements.coordX.textContent = Math.round(node.x);
    elements.coordY.textContent = Math.round(node.y);

    updateDrawerStatusButtons(node.status || 'RENCANA');
    renderCustomPropertyInputs(node.properties || []);

    elements.nodeDrawer.classList.remove('translate-x-full');
    renderNodes();
  }

  function updateDrawerStatusButtons(currentStatus) {
    const statusMap = {
      'RENCANA': ['bg-slate-800', 'border-slate-500', 'text-slate-200'],
      'CONSTRUCTION': ['bg-slate-800', 'border-slate-600', 'text-slate-300'],
      'FUNERAL_READY': ['bg-orange-500/10', 'border-orange-500/40', 'text-orange-400'],
      'FINISH': ['bg-emerald-500/10', 'border-emerald-500/40', 'text-emerald-400']
    };

    elements.drawerStatusBtns.forEach(btn => {
      const status = btn.dataset.status;
      btn.className = 'status-option p-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ';
      if (status === currentStatus) {
        const classes = statusMap[status] || ['bg-slate-800', 'border-slate-500', 'text-slate-200'];
        btn.classList.add(...classes, 'border');
      } else {
        btn.classList.add('bg-slate-900', 'border', 'border-slate-800', 'text-slate-400');
      }
    });
  }

  function closeDrawer() {
    state.selectedNodeId = null;
    elements.nodeDrawer.classList.add('translate-x-full');
    renderNodes();
  }

  function renderCustomPropertyInputs(properties) {
    elements.customPropsContainer.innerHTML = '';
    properties.forEach((prop) => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2 property-row';
      row.innerHTML = `
        <input type="text" placeholder="Nama Properti (misal: Sertifikat)" value="${prop.key || ''}" 
               class="prop-key flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500 text-xs">
        <input type="text" placeholder="Nilai (misal: SHM)" value="${prop.value || ''}" 
               class="prop-value flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500 text-xs">
        <button type="button" class="btn-remove-prop text-slate-500 hover:text-rose-400 p-1.5 transition-colors">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;

      row.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => saveSelectedNode(false));
      });

      row.querySelector('.btn-remove-prop').addEventListener('click', () => {
        row.remove();
        saveSelectedNode(true);
      });

      elements.customPropsContainer.appendChild(row);
    });
  }

  function addCustomPropertyRow() {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 property-row';
    row.innerHTML = `
      <input type="text" placeholder="Nama Properti (misal: Owner)" 
             class="prop-key flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500 text-xs">
      <input type="text" placeholder="Nilai (misal: Bpk. Budi)" 
             class="prop-value flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500 text-xs">
      <button type="button" class="btn-remove-prop text-slate-500 hover:text-rose-400 p-1.5 transition-colors">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;

    row.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => saveSelectedNode(false));
    });

    row.querySelector('.btn-remove-prop').addEventListener('click', () => {
      row.remove();
      saveSelectedNode(true);
    });

    elements.customPropsContainer.appendChild(row);
  }

  // --- INSTANT AUTO-SAVE ON DRAWER EDIT ---
  function saveSelectedNode(recordHistory = true) {
    if (!state.selectedNodeId) return;

    const node = state.nodes.find(n => n.id === state.selectedNodeId);
    if (!node) return;

    node.code = elements.inputNodeCode.value.trim() || 'NODE';
    node.category = elements.inputNodeCategory.value;
    node.type = elements.inputNodeType ? elements.inputNodeType.value : (node.type || 'Single');
    node.dimension = elements.inputNodeDimension.value.trim();
    node.area = elements.inputNodeArea.value.trim();

    const activeStatusBtn = document.querySelector('#drawer-status-grid button:not(.bg-slate-900)');
    if (activeStatusBtn) {
      node.status = activeStatusBtn.dataset.status;
      state.lastUsedStatus = node.status;
    }

    const propRows = elements.customPropsContainer.querySelectorAll('.property-row');
    const properties = [];
    propRows.forEach(row => {
      const key = row.querySelector('.prop-key').value.trim();
      const value = row.querySelector('.prop-value').value.trim();
      if (key) {
        properties.push({ key, value });
      }
    });
    node.properties = properties;

    saveSessionData(recordHistory);
    renderNodes();
    updateStats();
  }

  // --- CODE INPUT MODAL UI DIALOG ---
  function openCodeModal(canvasX, canvasY) {
    state.pendingNewNodeCoords = { x: canvasX, y: canvasY };
    
    let suggestedCode = 'A-01';
    if (state.nodes.length > 0) {
      const lastNode = state.nodes[state.nodes.length - 1];
      const match = (lastNode.code || '').match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2], 10) + 1;
        const padLen = match[2].length;
        suggestedCode = `${prefix}${num.toString().padStart(padLen, '0')}`;
      } else {
        suggestedCode = `A-${(state.nodes.length + 1).toString().padStart(2, '0')}`;
      }
    }

    elements.modalInputCode.value = suggestedCode;
    elements.codeInputModal.classList.remove('hidden');
    setTimeout(() => {
      elements.modalInputCode.focus();
      elements.modalInputCode.select();
    }, 50);
  }

  function closeCodeModal() {
    elements.codeInputModal.classList.add('hidden');
    state.pendingNewNodeCoords = null;
  }

  function submitCodeModal() {
    if (!state.pendingNewNodeCoords) return;

    const inputVal = elements.modalInputCode.value.trim();
    const nodeCode = inputVal || 'A-01';
    const coords = state.pendingNewNodeCoords;

    closeCodeModal();

    const newNode = {
      id: `node-${Date.now()}`,
      code: nodeCode,
      category: 'SAAKUURAA',
      type: 'Single',
      status: state.lastUsedStatus || 'RENCANA',
      x: coords.x,
      y: coords.y,
      dimension: '',
      area: '',
      properties: []
    };

    state.nodes.push(newNode);
    saveSessionData();
    renderNodes();
    updateStats();
    selectNode(newNode.id);
  }

  function deleteSelectedNode() {
    if (!state.selectedNodeId) return;

    state.nodes = state.nodes.filter(n => n.id !== state.selectedNodeId);
    saveSessionData();
    closeDrawer();
    updateStats();
  }

  // --- STATS COUNTER ---
  function updateStats() {
    const total = state.nodes.length;
    const rencana = state.nodes.filter(n => n.status === 'RENCANA' || !n.status).length;
    const construction = state.nodes.filter(n => n.status === 'CONSTRUCTION').length;
    const funeralReady = state.nodes.filter(n => n.status === 'FUNERAL_READY').length;
    const finish = state.nodes.filter(n => n.status === 'FINISH').length;

    if (elements.statTotal) elements.statTotal.textContent = total;
    if (elements.statRencana) elements.statRencana.textContent = rencana;
    if (elements.statConstruction) elements.statConstruction.textContent = construction;
    if (elements.statFuneralReady) elements.statFuneralReady.textContent = funeralReady;
    if (elements.statFinish) elements.statFinish.textContent = finish;
  }

  // --- EXPORT & IMPORT SERIALIZER ---
  function exportJson() {
    const baseName = state.pdfFileName ? state.pdfFileName.replace(/\.[^/.]+$/, '') : 'siteplan_nodes';
    const exportData = {
      pdfFileName: state.pdfFileName || `${baseName}.pdf`,
      canvasDimensions: { width: state.canvasWidth, height: state.canvasHeight },
      exportedAt: new Date().toISOString(),
      nodes: state.nodes
    };

    const exportFileName = `${baseName}.json`;

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', exportFileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  // --- EXPORT EXCEL SPREADSHEET TABLE ---
  function exportExcel() {
    if (!state.nodes || state.nodes.length === 0) {
      showToast('warning', 'Tidak Ada Data', 'Belum ada node penanda untuk diekspor ke tabel Excel.');
      return;
    }

    // Determine which optional columns have at least one non-empty value across all nodes
    const hasCategory = state.nodes.some(n => n.category && String(n.category).trim() !== '');
    const hasDimension = state.nodes.some(n => n.dimension && String(n.dimension).trim() !== '');
    const hasArea = state.nodes.some(n => n.area && String(n.area).trim() !== '');

    // Collect all unique non-empty custom property keys
    const customPropKeys = new Set();
    state.nodes.forEach(n => {
      (n.properties || []).forEach(p => {
        if (p.key && String(p.key).trim() !== '' && p.value && String(p.value).trim() !== '') {
          customPropKeys.add(String(p.key).trim());
        }
      });
    });
    const customPropList = Array.from(customPropKeys);

    // Build structured table rows
    const rows = state.nodes.map((node, index) => {
      const row = {
        'No': index + 1,
        'Kode Node': node.code || '',
        'Status': getStatusLabel(node.status)
      };

      if (hasCategory) {
        row['Zona'] = node.category || '';
      }
      row['Tipe'] = node.type || 'Single';
      if (hasDimension) {
        row['Dimensi'] = node.dimension || '';
      }
      if (hasArea) {
        row['Luas (m²)'] = node.area || '';
      }

      row['Koordinat X'] = Math.round(node.x);
      row['Koordinat Y'] = Math.round(node.y);

      customPropList.forEach(propKey => {
        const prop = (node.properties || []).find(p => p.key && String(p.key).trim() === propKey);
        row[propKey] = prop && prop.value ? prop.value : '';
      });

      return row;
    });

    const baseName = state.pdfFileName ? state.pdfFileName.replace(/\.[^/.]+$/, '') : 'siteplan_nodes';
    const fileName = `${baseName}.xlsx`;

    if (window.XLSX) {
      try {
        const worksheet = XLSX.utils.json_to_sheet(rows);

        // Auto-calculate column widths
        const colWidths = Object.keys(rows[0] || {}).map(key => {
          const maxValLen = Math.max(
            key.length,
            ...rows.map(r => String(r[key] || '').length)
          );
          return { wch: Math.min(45, Math.max(12, maxValLen + 3)) };
        });
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Node');
        XLSX.writeFile(workbook, fileName);
        showToast('success', 'Export Excel Berhasil!', `Tabel ${state.nodes.length} node berhasil diekspor ke file "${fileName}".`);
      } catch (err) {
        console.error('SheetJS Excel export error, falling back to CSV:', err);
        exportCsvFallback(rows, `${baseName}.csv`);
      }
    } else {
      exportCsvFallback(rows, `${baseName}.csv`);
    }
  }

  function exportCsvFallback(rows, fileName) {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('success', 'Export CSV Berhasil!', `Tabel berhasil diekspor ke "${fileName}".`);
  }

  // --- TOAST NOTIFICATION ENGINE ---
  let toastTimeout = null;

  function showToast(type = 'success', title = 'Berhasil', message = '') {
    if (!elements.toastNotification) return;

    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    const isSuccess = type === 'success';
    const isError = type === 'error';
    const isWarning = type === 'warning';

    // Configure Icon & Theme Colors
    if (isSuccess) {
      elements.toastIconWrap.className = 'w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-sm shadow-lg';
      elements.toastIcon.className = 'fa-solid fa-circle-check';
      elements.toastBox.className = 'flex items-center gap-3.5 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs bg-slate-900/95 border-emerald-500/40 pointer-events-auto shadow-emerald-500/10';
    } else if (isError) {
      elements.toastIconWrap.className = 'w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center text-sm shadow-lg';
      elements.toastIcon.className = 'fa-solid fa-circle-xmark';
      elements.toastBox.className = 'flex items-center gap-3.5 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs bg-slate-900/95 border-rose-500/40 pointer-events-auto shadow-rose-500/10';
    } else if (isWarning) {
      elements.toastIconWrap.className = 'w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center text-sm shadow-lg';
      elements.toastIcon.className = 'fa-solid fa-triangle-exclamation';
      elements.toastBox.className = 'flex items-center gap-3.5 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs bg-slate-900/95 border-amber-500/40 pointer-events-auto shadow-amber-500/10';
    }

    elements.toastTitle.textContent = title;
    elements.toastMessage.textContent = message;

    // Animate In
    elements.toastNotification.classList.remove('opacity-0', '-translate-y-24', 'pointer-events-none');
    elements.toastNotification.classList.add('opacity-100', 'translate-y-0');

    toastTimeout = setTimeout(() => {
      hideToast();
    }, 4500);
  }

  function hideToast() {
    if (!elements.toastNotification) return;
    elements.toastNotification.classList.remove('opacity-100', 'translate-y-0');
    elements.toastNotification.classList.add('opacity-0', '-translate-y-24', 'pointer-events-none');
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData && Array.isArray(importedData.nodes)) {
          state.nodes = importedData.nodes;

          // Sync active document filename and context with imported JSON
          if (importedData.pdfFileName) {
            state.pdfFileName = importedData.pdfFileName;
          } else {
            state.pdfFileName = file.name.replace(/\.json$/i, '.pdf');
          }

          if (elements.fileInfoLabel) {
            elements.fileInfoLabel.textContent = `File: ${state.pdfFileName}`;
          }

          saveSessionData();
          renderNodes();
          updateStats();
          showToast('success', 'Import JSON Berhasil!', `Berhasil memuat ${importedData.nodes.length} node kavling dari file "${file.name}".`);
        } else {
          showToast('error', 'Format Tidak Valid', 'Struktur file JSON tidak sesuai format data masterplan.');
        }
      } catch (err) {
        console.error('Error parsing JSON import:', err);
        showToast('error', 'Gagal Membaca File', 'File JSON rusak atau tidak dapat diproses.');
      }
    };
    reader.readAsText(file);
  }

  // --- EXPORT IMAGE MODAL & DRAWING ENGINE ---
  function openExportImageModal() {
    if (!state.isPdfLoaded) {
      alert('Silakan unggah file PDF siteplan terlebih dahulu.');
      return;
    }
    
    let defaultTitle = 'DENAH MASTERPLAN KAVLING';
    if (state.pdfFileName) {
      const baseName = state.pdfFileName.replace(/\.[^/.]+$/, '').toUpperCase();
      defaultTitle = `SITEPLAN ${baseName}`;
    }
    
    elements.exportInputTitle.value = defaultTitle;
    elements.exportImageModal.classList.remove('hidden');
    setTimeout(() => {
      elements.exportInputTitle.focus();
      elements.exportInputTitle.select();
    }, 50);
  }

  function closeExportImageModal() {
    elements.exportImageModal.classList.add('hidden');
  }

  function processImageExport() {
    const title = elements.exportInputTitle.value.trim() || 'DENAH MASTERPLAN KAVLING';
    closeExportImageModal();

    const canvas = elements.siteplanCanvas;
    if (!canvas || canvas.width === 0) {
      alert('Canvas siteplan belum siap untuk diekspor.');
      return;
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');

    // 1. Draw the base high-res rendered PDF canvas
    ctx.drawImage(canvas, 0, 0);

    // Scaling factor from CSS coordinates to physical export canvas resolution
    const scaleFactor = canvas.width / state.canvasWidth;
    ctx.save();
    ctx.scale(scaleFactor, scaleFactor);

    // 2. Draw all node pins (dots only, without code text labels)
    state.nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
      let color = '#64748b'; // Rencana
      if (node.status === 'CONSTRUCTION') color = '#334155';
      else if (node.status === 'FUNERAL_READY') color = '#fb923c';
      else if (node.status === 'FINISH') color = '#4ade80';

      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    // 3. Top-Left Overlay: Judul & Tanggal Export
    const pad = 24;
    const dateStr = formatExportDate(new Date());
    
    ctx.font = 'bold 16px sans-serif';
    const titleMetrics = ctx.measureText(title);
    ctx.font = '11px sans-serif';
    const dateMetrics = ctx.measureText(`📅 Tanggal Export: ${dateStr}`);
    const maxTextW = Math.max(titleMetrics.width, dateMetrics.width);
    
    const cardLeftW = Math.max(260, maxTextW + 36);
    const cardLeftH = 66;
    const cardLeftX = pad;
    const cardLeftY = pad;

    // Card background
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    drawRoundedRect(ctx, cardLeftX, cardLeftY, cardLeftW, cardLeftH, 10);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Title Text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, cardLeftX + 16, cardLeftY + 13);

    // Date Text
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(`📅 ${dateStr}`, cardLeftX + 16, cardLeftY + 38);

    // 4. Top-Right Overlay: Keterangan Status (Legend)
    const rencanaCount = state.nodes.filter(n => n.status === 'RENCANA' || !n.status).length;
    const constrCount = state.nodes.filter(n => n.status === 'CONSTRUCTION').length;
    const funeralCount = state.nodes.filter(n => n.status === 'FUNERAL_READY').length;
    const finishCount = state.nodes.filter(n => n.status === 'FINISH').length;
    const totalCount = state.nodes.length;

    const legendW = 210;
    const legendH = 136;
    const legendX = state.canvasWidth - legendW - pad;
    const legendY = pad;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    drawRoundedRect(ctx, legendX, legendY, legendW, legendH, 10);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Legend Header
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('KETERANGAN STATUS', legendX + 14, legendY + 12);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText(`Total: ${totalCount} Unit`, legendX + legendW - 65, legendY + 13);

    // Separator line
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(legendX + 14, legendY + 28);
    ctx.lineTo(legendX + legendW - 14, legendY + 28);
    ctx.stroke();

    // 4 Status Items
    const statusItems = [
      { label: 'Rencana', color: '#64748b', count: rencanaCount },
      { label: 'Construction', color: '#334155', count: constrCount },
      { label: 'Funeral Ready', color: '#fb923c', count: funeralCount },
      { label: 'Finish', color: '#4ade80', count: finishCount }
    ];

    statusItems.forEach((item, idx) => {
      const itemY = legendY + 38 + (idx * 22);

      // Dot pin
      ctx.beginPath();
      ctx.arc(legendX + 22, itemY + 6, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label text
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, legendX + 34, itemY + 6);

      // Count badge
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${item.count}`, legendX + legendW - 16, itemY + 6);
    });

    ctx.restore();

    // Trigger download matching active PDF file name
    let exportFileName = 'siteplan.png';
    if (state.pdfFileName) {
      exportFileName = state.pdfFileName.replace(/\.[^/.]+$/, '') + '.png';
    } else if (title) {
      exportFileName = title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') + '.png';
    }

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = exportFileName;
    link.href = dataUrl;
    link.click();
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }
  }

  function formatExportDate(d) {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${mins} WIB`;
  }

  // --- CONFIRM CLEAR ALL NODES MODAL UI ---
  function openClearAllModal() {
    if (state.nodes.length === 0) {
      alert('Tidak ada node penanda untuk dihapus.');
      return;
    }
    if (elements.clearModalNodeCount) {
      elements.clearModalNodeCount.textContent = `${state.nodes.length} unit`;
    }
    if (elements.confirmClearModal) {
      elements.confirmClearModal.classList.remove('hidden');
    }
  }

  function closeClearAllModal() {
    if (elements.confirmClearModal) {
      elements.confirmClearModal.classList.add('hidden');
    }
  }

  function executeClearAllNodes() {
    closeClearAllModal();
    if (state.nodes.length === 0) return;
    state.nodes = [];
    saveSessionData();
    closeDrawer();
    updateStats();
  }

  // --- EVENT LISTENERS SETUP ---
  function setupEventListeners() {
    // PDF File Input
    elements.pdfFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        loadPdfFile(e.target.files[0]);
      }
    });

    // Undo & Redo Buttons
    if (elements.btnUndo) elements.btnUndo.addEventListener('click', undo);
    if (elements.btnRedo) elements.btnRedo.addEventListener('click', redo);

    // Mode Toggle (Pan & Select vs Pindahkan vs Add Node)
    const updateModeUI = (mode) => {
      state.activeMode = mode;
      const inactiveClass = 'mode-btn px-3 py-1.5 rounded-md flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-all';
      const activeClass = 'mode-btn active px-3 py-1.5 rounded-md flex items-center gap-1.5 text-emerald-400 bg-slate-800 font-semibold transition-all';

      elements.modeSelectBtn.className = mode === 'SELECT' ? activeClass : inactiveClass;
      if (elements.modeMoveNodeBtn) elements.modeMoveNodeBtn.className = mode === 'MOVE_NODE' ? activeClass : inactiveClass;
      elements.modeAddNodeBtn.className = mode === 'ADD_NODE' ? activeClass : inactiveClass;

      elements.canvasViewport.classList.remove('adding-node');
      if (mode === 'ADD_NODE') {
        elements.canvasViewport.classList.add('adding-node');
      }

      renderNodes();
    };

    elements.modeSelectBtn.addEventListener('click', () => updateModeUI('SELECT'));
    if (elements.modeMoveNodeBtn) {
      elements.modeMoveNodeBtn.addEventListener('click', () => updateModeUI('MOVE_NODE'));
    }
    elements.modeAddNodeBtn.addEventListener('click', () => updateModeUI('ADD_NODE'));

    // Filter Buttons
    elements.filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.filterBtns.forEach(b => {
          b.classList.remove('active', 'text-emerald-400', 'font-medium');
          b.classList.add('text-slate-400');
        });
        btn.classList.add('active', 'text-emerald-400', 'font-medium');
        btn.classList.remove('text-slate-400');

        state.activeFilter = btn.dataset.filter;
        renderNodes();
      });
    });

    // Search Input
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderNodes();
    });

    // PDF Page Navigation
    elements.btnPrevPage.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderPdfPage(state.currentPage);
      }
    });

    elements.btnNextPage.addEventListener('click', () => {
      if (state.currentPage < state.numPages) {
        state.currentPage++;
        renderPdfPage(state.currentPage);
      }
    });

    // Zoom Controls
    elements.btnZoomIn.addEventListener('click', () => {
      state.transform.scale = Math.min(15, state.transform.scale * 1.25);
      applyTransform();
    });

    elements.btnZoomOut.addEventListener('click', () => {
      state.transform.scale = Math.max(0.1, state.transform.scale / 1.25);
      applyTransform();
    });

    elements.btnFitView.addEventListener('click', fitToViewport);
    elements.btnResetZoom.addEventListener('click', () => {
      state.transform.scale = 1;
      state.transform.x = 0;
      state.transform.y = 0;
      applyTransform();
    });

    // Wheel Zoom
    elements.canvasViewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      zoomAtPoint(zoomFactor, e.clientX, e.clientY);
    }, { passive: false });

    // Canvas Pan, Node Dragging & Add Node Click
    elements.canvasViewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('#node-drawer') || e.target.closest('#code-input-modal') || e.target.closest('#export-image-modal') || e.target.closest('#confirm-clear-modal')) return;

      if (state.activeMode === 'ADD_NODE') {
        if (e.target.closest('.site-node-marker')) return;
        const rect = elements.canvasTransformWrapper.getBoundingClientRect();
        const canvasX = Math.round((e.clientX - rect.left) / state.transform.scale);
        const canvasY = Math.round((e.clientY - rect.top) / state.transform.scale);
        openCodeModal(canvasX, canvasY);
        return;
      }

      // Pan canvas map
      if (!e.target.closest('.site-node-marker')) {
        state.transform.isDragging = true;
        state.transform.startX = e.clientX - state.transform.x;
        state.transform.startY = e.clientY - state.transform.y;
        elements.canvasViewport.classList.add('dragging');
        closeDrawer();
      }
    });

    window.addEventListener('mousemove', (e) => {
      // Node marker dragging (Pindahkan mode)
      if (state.draggedNodeId && state.activeMode === 'MOVE_NODE') {
        const node = state.nodes.find(n => n.id === state.draggedNodeId);
        if (node) {
          const rect = elements.canvasTransformWrapper.getBoundingClientRect();
          node.x = Math.round((e.clientX - rect.left) / state.transform.scale);
          node.y = Math.round((e.clientY - rect.top) / state.transform.scale);
          
          elements.coordX.textContent = Math.round(node.x);
          elements.coordY.textContent = Math.round(node.y);
          renderNodes();
        }
        return;
      }

      // Map Panning
      if (state.transform.isDragging) {
        state.transform.x = e.clientX - state.transform.startX;
        state.transform.y = e.clientY - state.transform.startY;
        applyTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      if (state.draggedNodeId) {
        state.draggedNodeId = null;
        saveSessionData();
      }
      if (state.transform.isDragging) {
        state.transform.isDragging = false;
        elements.canvasViewport.classList.remove('dragging');
      }
    });

    // Drawer auto-save event listeners
    const autoSaveInp = () => saveSelectedNode(true);
    elements.inputNodeCode.addEventListener('input', autoSaveInp);
    elements.inputNodeCategory.addEventListener('change', autoSaveInp);
    if (elements.inputNodeType) elements.inputNodeType.addEventListener('change', autoSaveInp);
    elements.inputNodeDimension.addEventListener('input', autoSaveInp);
    elements.inputNodeArea.addEventListener('input', autoSaveInp);

    // Status Buttons Click Handler (Instant Auto-Save & Remembers Last Status)
    elements.drawerStatusBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.lastUsedStatus = btn.dataset.status;
        updateDrawerStatusButtons(btn.dataset.status);
        saveSelectedNode(true);
      });
    });

    elements.btnAddProperty.addEventListener('click', addCustomPropertyRow);
    elements.drawerCloseBtn.addEventListener('click', closeDrawer);
    elements.btnDeleteNode.addEventListener('click', deleteSelectedNode);

    // Code Input Modal UI Buttons & Enter key
    elements.modalBtnCancel.addEventListener('click', closeCodeModal);
    elements.modalBtnSubmit.addEventListener('click', submitCodeModal);
    elements.modalInputCode.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitCodeModal();
      } else if (e.key === 'Escape') {
        closeCodeModal();
      }
    });

    // Export Image Modal UI Buttons & Enter key
    elements.btnExportImage.addEventListener('click', openExportImageModal);
    elements.exportModalBtnCancel.addEventListener('click', closeExportImageModal);
    elements.exportModalBtnConfirm.addEventListener('click', processImageExport);
    elements.exportInputTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        processImageExport();
      } else if (e.key === 'Escape') {
        closeExportImageModal();
      }
    });

    // Export & Import JSON & Excel Table
    elements.btnExportJson.addEventListener('click', exportJson);
    if (elements.btnExportExcel) elements.btnExportExcel.addEventListener('click', exportExcel);
    elements.jsonImportInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        importJson(e.target.files[0]);
      }
    });
    
    // Clear All Nodes Modal UI
    if (elements.btnClearNodes) elements.btnClearNodes.addEventListener('click', openClearAllModal);
    if (elements.clearModalBtnCancel) elements.clearModalBtnCancel.addEventListener('click', closeClearAllModal);
    if (elements.clearModalBtnConfirm) elements.clearModalBtnConfirm.addEventListener('click', executeClearAllNodes);

    // Toast Notification Close Button
    if (elements.toastCloseBtn) elements.toastCloseBtn.addEventListener('click', hideToast);

    // Keyboard Shortcuts (Undo, Redo, Delete)
    window.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      const isEditingInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditingInput) {
        if (state.selectedNodeId) {
          e.preventDefault();
          deleteSelectedNode();
        }
      }
    });
  }

  // --- RUN APPLICATION ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
