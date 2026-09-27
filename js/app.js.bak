/**
 * CNC Milling EduSim Main Application Controller
 * Author: Antigravity AI / Muhammad Harist Mishbahuddin
 * Standard: ISO / Fanuc 3-Axis Milling Format (XYZ Plane)
 */

document.addEventListener('DOMContentLoaded', () => {
    const parser = new MillingGCodeParser();
    const validator = new CNCMillingValidator();
    const canvasElement = document.getElementById('millingCanvas');
    const visualizer = new MillingVisualizer(canvasElement, {
        viewMode: '2d',
        showGrid: true,
        showStock: true,
        showTool: true,
        showKerf: true,
        showArrows: true,
        showInspector: true,
        showVice: true,
        stockX: 100,
        stockY: 80,
        stockZ: 25,
        toolDiameter: 10
    });

    const threeContainer = document.getElementById('threeCanvasContainer');
    let cadViewer = null;
    if (typeof MillingCAD3DViewer !== 'undefined' && threeContainer) {
        cadViewer = new MillingCAD3DViewer(threeContainer, visualizer.options);
    }

    // DOM Elements
    const codeTextarea = document.getElementById('codeTextarea');
    const lineNumbers = document.getElementById('lineNumbers');
    const btnPlay = document.getElementById('btnPlay');
    const btnPause = document.getElementById('btnPause');
    const btnStep = document.getElementById('btnStep');
    const btnReset = document.getElementById('btnReset');
    const btnFitView = document.getElementById('btnFitView');
    const speedSlider = document.getElementById('speedSlider');
    const speedLabel = document.getElementById('speedLabel');
    
    // View Mode Buttons (2D vs 3D Iso)
    const btnView2D = document.getElementById('btnView2D');
    const btnViewIso = document.getElementById('btnViewIso');

    // View Layer Toggles
    const toggleGrid = document.getElementById('toggleGrid');
    const toggleStock = document.getElementById('toggleStock');
    const toggleVice = document.getElementById('toggleVice');
    const toggleKerf = document.getElementById('toggleKerf');
    const toggleSolidPart = document.getElementById('toggleSolidPart');
    const btnToggleSolidQuick = document.getElementById('btnToggleSolidQuick');
    const btnQuickWCS = document.getElementById('btnQuickWCS');
    const quickWCSLabel = document.getElementById('quickWCSLabel');
    const btnFinishedInspect = document.getElementById('btnFinishedInspect');
    const btnReset3DView = document.getElementById('btnReset3DView');
    const hint3DRotate = document.getElementById('hint3DRotate');

    // Manual Input Action Buttons
    const btnNewProgram = document.getElementById('btnNewProgram');
    const btnClearCode = document.getElementById('btnClearCode');
    const btnUploadNC = document.getElementById('btnUploadNC');
    const fileInputNC = document.getElementById('fileInputNC');
    const btnUppercase = document.getElementById('btnUppercase');
    const btnCopyCode = document.getElementById('btnCopyCode');

    // View Switcher Elements (Editor vs Table vs Explain)
    const viewBtnEditor = document.getElementById('viewBtnEditor');
    const viewBtnTable = document.getElementById('viewBtnTable');
    const viewBtnExplain = document.getElementById('viewBtnExplain');
    const viewPaneEditor = document.getElementById('viewPaneEditor');
    const viewPaneTable = document.getElementById('viewPaneTable');
    const viewPaneExplain = document.getElementById('viewPaneExplain');
    const coordinateTableBody = document.getElementById('coordinateTableBody');
    const explainTableBody = document.getElementById('explainTableBody');
    const explainRowCountBadge = document.getElementById('explainRowCountBadge');
    const btnAddTableRow = document.getElementById('btnAddTableRow');
    const btnClearTableRows = document.getElementById('btnClearTableRows');
    const btnAppendRowBottom = document.getElementById('btnAppendRowBottom');

    // Live Telemetry Banner Elements
    const liveTraceBlock = document.getElementById('liveTraceBlock');
    const liveTraceDesc = document.getElementById('liveTraceDesc');
    const liveTraceModeBadge = document.getElementById('liveTraceModeBadge');
    const liveTraceProgressBar = document.getElementById('liveTraceProgressBar');
    const liveTracePct = document.getElementById('liveTracePct');

    // DRO & Diagnostics Elements
    const hudX = document.getElementById('hudX');
    const hudY = document.getElementById('hudY');
    const hudZ = document.getElementById('hudZ');
    const hudMotion = document.getElementById('hudMotion');
    const hudFeed = document.getElementById('hudFeed');
    const hudLine = document.getElementById('hudLine');
    const hudTime = document.getElementById('hudTime');
    const hudTool = document.getElementById('hudTool');
    const diagnosticsList = document.getElementById('diagnosticsList');
    const errorCountBadge = document.getElementById('errorCountBadge');
    const warningCountBadge = document.getElementById('warningCountBadge');

    // Modals
    const stockModal = document.getElementById('stockModal');
    const cheatsheetModal = document.getElementById('cheatsheetModal');
    const stockXInput = document.getElementById('stockXInput');
    const stockYInput = document.getElementById('stockYInput');
    const stockZInput = document.getElementById('stockZInput');
    const toolDiameterInput = document.getElementById('toolDiameterInput');
    const wcsActiveBadge = document.getElementById('wcsActiveBadge');
    const wcsDescriptionText = document.getElementById('wcsDescriptionText');
    const wcsPointButtons = document.querySelectorAll('.wcs-point-btn');
    const btnSaveStock = document.getElementById('btnSaveStock');
    const btnStockSettings = document.getElementById('btnStockSettings');
    const btnCheatsheetModal = document.getElementById('btnCheatsheetModal');
    const btnExportCode = document.getElementById('btnExportCode');
    const btnExportImage = document.getElementById('btnExportImage');

    // Debug Inspector Overlay Elements
    const btnDebugMode = document.getElementById('btnDebugMode');
    const btnCloseDebugPanel = document.getElementById('btnCloseDebugPanel');
    const debugInspectorPanel = document.getElementById('debugInspectorPanel');
    const debugSyncStatusText = document.getElementById('debugSyncStatusText');
    const debugWCSOrigin = document.getElementById('debugWCSOrigin');
    const debugToolD = document.getElementById('debugToolD');
    const debugCutterX = document.getElementById('debugCutterX');
    const debugCutterY = document.getElementById('debugCutterY');
    const debugCutterZ = document.getElementById('debugCutterZ');
    const debugSegType = document.getElementById('debugSegType');
    const debugSegStart = document.getElementById('debugSegStart');
    const debugSegEnd = document.getElementById('debugSegEnd');
    const debugArcInfoRow = document.getElementById('debugArcInfoRow');
    const debugSegCenter = document.getElementById('debugSegCenter');
    const debugSegRadius = document.getElementById('debugSegRadius');
    const debugSegFeed = document.getElementById('debugSegFeed');
    const debugSegDepth = document.getElementById('debugSegDepth');
    const debugToolpathBBox = document.getElementById('debugToolpathBBox');
    const debugMachiningBBox = document.getElementById('debugMachiningBBox');
    const debugOffsetCheck = document.getElementById('debugOffsetCheck');
    const debugWarningBanner = document.getElementById('debugWarningBanner');
    const debugWarningText = document.getElementById('debugWarningText');

    let currentParsedData = null;
    let currentDiagnostics = [];
    let isPlaying = false;
    let lastAnimTime = 0;

    let currentHighlightedLine = -1;

    // 2. View Mode Controller (2D Top XY vs 3D Isometrik Simulasi vs Wujud Jadi Solid CAD)
    let currentViewMode = '2d'; // '2d', 'iso', or 'solid'

    function switchToView(mode) {
        currentViewMode = mode;
        const isSolid = (mode === 'solid');
        const isIso = (mode === 'iso');
        const is2D = (mode === '2d');

        // 1. Update button visual states
        if (btnView2D) {
            btnView2D.classList.toggle('active-mode', is2D);
        }
        if (btnViewIso) {
            btnViewIso.classList.toggle('active-mode', isIso);
        }
        if (btnToggleSolidQuick) {
            btnToggleSolidQuick.classList.toggle('active-mode', isSolid);
            btnToggleSolidQuick.classList.toggle('text-yellow-300', isSolid);
        }
        if (toggleSolidPart) {
            toggleSolidPart.checked = isSolid;
        }

        // 2. Viewport switching
        if (isSolid) {
            // Mode Wujud Jadi: Three.js WebGL CAD Solid Model (SolidWorks Style)
            canvasElement.style.display = 'none';
            if (threeContainer) {
                threeContainer.classList.remove('hidden');
                if (cadViewer) {
                    // Cancel debounce timer yang pending, lalu langsung rebuild sekarang
                    if (_cadRebuildTimer) { clearTimeout(_cadRebuildTimer); _cadRebuildTimer = null; }
                    cadViewer.updateFromData(currentParsedData, Object.assign({}, visualizer.options, { showFinishedOnly: true }));
                    cadViewer.setFinishedOnly(true);
                    cadViewer.resize();
                }
            }

            if (btnReset3DView) btnReset3DView.classList.remove('hidden');
            if (hint3DRotate) {
                hint3DRotate.classList.remove('hidden');
                hint3DRotate.classList.add('flex');
                hint3DRotate.innerHTML = `<i data-lucide="orbit" class="w-3.5 h-3.5 text-sky-400"></i><span>Tahan & Geser Mouse untuk <strong>Memutar 3D Bebas (Orbit CAD)</strong></span>`;
                if (window.lucide) lucide.createIcons();
            }
            if (liveTraceDesc) {
                liveTraceDesc.textContent = '✨ Wujud Benda Jadi: Desain solid 3D pasca-pemesinan frais (SolidWorks CAD Style).';
            }
        } else if (isIso) {
            // Mode 3D Isometrik: Ruang Simulasi Pemotongan Frais Dinamis
            canvasElement.style.display = 'block';
            if (threeContainer) threeContainer.classList.add('hidden');
            visualizer.setOptions({ showFinishedOnly: false });
            visualizer.setViewMode('iso');
            visualizer.resize();
            visualizer.render();

            if (btnReset3DView) btnReset3DView.classList.remove('hidden');
            if (hint3DRotate) {
                hint3DRotate.classList.remove('hidden');
                hint3DRotate.classList.add('flex');
                hint3DRotate.innerHTML = `<i data-lucide="orbit" class="w-3.5 h-3.5 text-sky-400"></i><span>Tahan & Geser Mouse untuk <strong>Memutar Sudut Isometrik 3D</strong></span>`;
                if (window.lucide) lucide.createIcons();
            }
            if (liveTraceDesc && !isPlaying) {
                liveTraceDesc.textContent = '🧊 Tampilan 3D Isometrik: Ruang simulasi pemotongan dinamis sumbu X, Y, dan Z.';
            }
        } else {
            // Mode 2D Tampak Atas: Bidang Kerja XY
            canvasElement.style.display = 'block';
            if (threeContainer) threeContainer.classList.add('hidden');
            visualizer.setOptions({ showFinishedOnly: false });
            visualizer.setViewMode('2d');
            visualizer.resize();
            visualizer.render();

            if (btnReset3DView) btnReset3DView.classList.add('hidden');
            if (hint3DRotate) {
                hint3DRotate.classList.add('hidden');
                hint3DRotate.classList.remove('flex');
            }
            if (liveTraceDesc && !isPlaying) {
                liveTraceDesc.textContent = 'ðŸŸ© Tampilan 2D Tampak Atas: Pemantauan lintasan koordinat bidang XY.';
            }
        }
    }

    if (btnView2D) {
        btnView2D.addEventListener('click', () => switchToView('2d'));
    }

    if (btnViewIso) {
        btnViewIso.addEventListener('click', () => switchToView('iso'));
    }

    if (btnToggleSolidQuick) {
        btnToggleSolidQuick.addEventListener('click', () => {
            if (currentViewMode === 'solid') {
                switchToView('iso');
            } else {
                switchToView('solid');
            }
        });
    }

    if (btnFinishedInspect) {
        btnFinishedInspect.addEventListener('click', () => {
            switchToView('solid');
        });
    }

    if (btnReset3DView) {
        btnReset3DView.addEventListener('click', () => {
            if (currentViewMode === 'solid') {
                if (cadViewer) cadViewer.resetView();
            } else {
                visualizer.reset3DView();
            }
        });
    }

    function setSolidPartMode(enabled) {
        switchToView(enabled ? 'solid' : 'iso');
    }

    // 3. Manual Program Initialization
    const DEFAULT_MANUAL_GCODE = `%
O0001 (PROGRAM MANUAL FRAIS)
G21 G90 G17 G40 G80
G28 G91 Z0
G90 G54
T01 M06 (ENDMILL D10)
S1500 M03

(TITIK AWAL AMAN)
G00 X10 Y10 Z5

(KONTUR PERSEGI FRAIS)
G01 Z-2.0 F150
G01 X90 Y10 F250
G01 X90 Y70
G01 X10 Y70
G01 X10 Y10

(ANGKAT PAHAT KELUAR)
G00 Z10
G28 G91 Z0
M05
M30
%`;

    function loadManualProgram() {
        try {
            codeTextarea.value = DEFAULT_MANUAL_GCODE.trim();
            visualizer.setStock(100, 80, 25, 10, 'bottom-left');
            if (cadViewer) cadViewer.setStock(100, 80, 25, 10, 'bottom-left');
            if (stockXInput) stockXInput.value = 100;
            if (stockYInput) stockYInput.value = 80;
            if (stockZInput) stockZInput.value = 25;
            if (toolDiameterInput) toolDiameterInput.value = 10;
            if (typeof updateWCSUI === 'function') updateWCSUI('bottom-left');
            updateLineNumbers();
            processGCode();
            setTimeout(() => visualizer.fitView(), 100);
        } catch (e) {
            console.error('loadManualProgram error:', e);
            window.__INIT_ERROR__ = e.message + '\n' + e.stack;
        }
    }

    function updateLineNumbers() {
        const lines = codeTextarea.value.split('\n');
        lineNumbers.innerHTML = lines.map((_, i) => `<div id="line-num-${i + 1}">${i + 1}</div>`).join('');
        lineNumbers.scrollTop = codeTextarea.scrollTop;
    }

    function syncScroll() {
        lineNumbers.scrollTop = codeTextarea.scrollTop;
    }

    let _inputDebounceTimer = null;

    codeTextarea.addEventListener('input', () => {
        updateLineNumbers();
        if (isPlaying) stopSimulation();
        if (_inputDebounceTimer) clearTimeout(_inputDebounceTimer);
        _inputDebounceTimer = setTimeout(() => {
            processGCode();
        }, 180);
    });

    codeTextarea.addEventListener('scroll', syncScroll);

    codeTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = codeTextarea.selectionStart;
            const end = codeTextarea.selectionEnd;
            codeTextarea.value = codeTextarea.value.substring(0, start) + '    ' + codeTextarea.value.substring(end);
            codeTextarea.selectionStart = codeTextarea.selectionEnd = start + 4;
            updateLineNumbers();
            if (isPlaying) stopSimulation();
            if (_inputDebounceTimer) clearTimeout(_inputDebounceTimer);
            _inputDebounceTimer = setTimeout(() => {
                processGCode();
            }, 180);
        } else if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            if (isPlaying) pauseSimulation();
            else startSimulation();
        }
    });

    // 4. Manual Input Controls & Header Utilities
    if (btnNewProgram) {
        btnNewProgram.addEventListener('click', () => {
            loadManualProgram();
            codeTextarea.focus();
        });
    }

    if (btnUploadNC && fileInputNC) {
        btnUploadNC.addEventListener('click', () => fileInputNC.click());
        fileInputNC.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                codeTextarea.value = event.target.result;
                updateLineNumbers();
                processGCode();
                visualizer.fitView();
            };
            reader.readAsText(file);
            fileInputNC.value = '';
        });
    }

    if (btnUppercase) {
        btnUppercase.addEventListener('click', () => {
            const start = codeTextarea.selectionStart;
            const end = codeTextarea.selectionEnd;
            codeTextarea.value = codeTextarea.value.toUpperCase();
            codeTextarea.setSelectionRange(start, end);
            processGCode();
            codeTextarea.focus();
        });
    }

    if (btnCopyCode) {
        btnCopyCode.addEventListener('click', () => {
            navigator.clipboard.writeText(codeTextarea.value).then(() => {
                const origText = btnCopyCode.textContent;
                btnCopyCode.textContent = 'Tersalin!';
                setTimeout(() => { btnCopyCode.textContent = origText; }, 1500);
            }).catch(() => {
                codeTextarea.select();
                document.execCommand('copy');
            });
        });
    }

    // 4.1 Focus and click interaction on editor container & line numbers
    const editorContainer = document.querySelector('.editor-container');
    if (editorContainer) {
        editorContainer.addEventListener('click', (e) => {
            if (e.target === lineNumbers || (lineNumbers && lineNumbers.contains(e.target))) {
                const targetDiv = e.target.closest('div');
                if (targetDiv && targetDiv.id && targetDiv.id.startsWith('line-num-')) {
                    const lineIdx = parseInt(targetDiv.id.replace('line-num-', ''), 10);
                    if (!isNaN(lineIdx)) {
                        highlightLineInEditor(lineIdx, true);
                        return;
                    }
                }
            }
            if (e.target !== codeTextarea) {
                codeTextarea.focus();
            }
        });
    }

    // 4.2 Switch between View 1 (Teks G-Code), View 2 (Input Tabel), and View 3 (Penjelas Baris)
    let currentLeftPaneView = 'editor';

    function switchLeftPaneView(mode) {
        currentLeftPaneView = mode;
        if (viewPaneEditor) {
            viewPaneEditor.classList.toggle('hidden', mode !== 'editor');
            if (mode === 'editor') viewPaneEditor.classList.add('flex');
            else viewPaneEditor.classList.remove('flex');
        }
        if (viewPaneTable) {
            viewPaneTable.classList.toggle('hidden', mode !== 'table');
            if (mode === 'table') viewPaneTable.classList.add('flex');
            else viewPaneTable.classList.remove('flex');
        }
        if (viewPaneExplain) {
            viewPaneExplain.classList.toggle('hidden', mode !== 'explain');
            if (mode === 'explain') viewPaneExplain.classList.add('flex');
            else viewPaneExplain.classList.remove('flex');
        }

        const tabs = [
            { btn: viewBtnEditor, isCurrent: mode === 'editor' },
            { btn: viewBtnTable, isCurrent: mode === 'table' },
            { btn: viewBtnExplain, isCurrent: mode === 'explain' }
        ];

        tabs.forEach(({ btn, isCurrent }) => {
            if (!btn) return;
            if (isCurrent) {
                btn.classList.add('active-view-tab', 'text-white', 'bg-[#0D5BC6]');
                btn.classList.remove('text-[#1E40AF]', 'hover:bg-blue-50');
            } else {
                btn.classList.remove('active-view-tab', 'text-white', 'bg-[#0D5BC6]');
                btn.classList.add('text-[#1E40AF]', 'hover:text-[#0F172A]', 'hover:bg-blue-50');
            }
        });

        if (mode === 'editor') {
            updateLineNumbers();
            syncScroll();
            if (currentHighlightedLine > 0) {
                const lineEl = document.getElementById('line-num-' + currentHighlightedLine);
                if (lineEl) lineEl.classList.add('active-line-num');
            }
        } else if (mode === 'table') {
            updateCoordinateTable();
            if (currentHighlightedLine > 0) {
                const activeRow = document.getElementById('coord-row-' + currentHighlightedLine);
                if (activeRow) activeRow.classList.add('active-table-row');
            }
        } else if (mode === 'explain') {
            updateExplainTable();
            if (currentHighlightedLine > 0) {
                const activeRow = document.getElementById('explain-row-' + currentHighlightedLine);
                if (activeRow) activeRow.classList.add('active-table-row');
            }
        }
    }

    if (viewBtnEditor) {
        viewBtnEditor.addEventListener('click', () => switchLeftPaneView('editor'));
    }
    if (viewBtnTable) {
        viewBtnTable.addEventListener('click', () => switchLeftPaneView('table'));
    }
    if (viewBtnExplain) {
        viewBtnExplain.addEventListener('click', () => switchLeftPaneView('explain'));
    }

    let isSyncingFromTable = false;

    // Debounce timer untuk CSG rebuild (operasi berat) — HANYA dijalankan saat mode "solid" (Wujud Jadi) aktif
    let _cadRebuildTimer = null;
    const CAD_REBUILD_DELAY = 600; // ms

    function scheduleCADRebuild(parsedData) {
        if (!cadViewer) return;
        if (_cadRebuildTimer) clearTimeout(_cadRebuildTimer);
        _cadRebuildTimer = setTimeout(() => {
            // HANYA jalankan CSG/buildWorkpiece jika mode solid (Wujud Jadi) aktif
            // Mode 2D dan 3D Isometrik menggunakan canvas visualizer ringan tanpa CSG
            if (currentViewMode === 'solid') {
                cadViewer.updateFromData(parsedData, visualizer.options);
                cadViewer.render3DToolpath(parsedData.segments || parsedData.parsedToolpath);
                cadViewer.simulateMaterialRemoval(parsedData.segments || parsedData.parsedToolpath);
            } else {
                // Mode 2D & ISO: hanya perbarui data internal tanpa memicu CSG
                cadViewer.parsedData = parsedData;
                cadViewer.options = Object.assign(cadViewer.options, visualizer.options);
            }
        }, CAD_REBUILD_DELAY);
    }

    function processGCode(options = {}) {
        const code = codeTextarea.value;
        currentParsedData = parser.parse(code);
        
        // Auto-adapt tool diameter if declared in G-Code (e.g. T01 M06 (ENDMILL D10))
        if (currentParsedData.detectedToolDiameter && currentParsedData.detectedToolDiameter !== visualizer.options.toolDiameter) {
            visualizer.options.toolDiameter = currentParsedData.detectedToolDiameter;
            if (toolDiameterInput) toolDiameterInput.value = currentParsedData.detectedToolDiameter;
        }

        const diagResult = validator.validate(currentParsedData, {
            lengthX: visualizer.options.stockX,
            widthY: visualizer.options.stockY,
            heightZ: visualizer.options.stockZ,
            toolDiameter: visualizer.options.toolDiameter,
            wcsMode: visualizer.options.wcsMode || 'bottom-left'
        });

        currentDiagnostics = diagResult.all || diagResult || [];

        // Update 2D canvas & data (ringan, langsung)
        visualizer.setData(currentParsedData);
        visualizer.render2DToolpath(currentParsedData.segments || currentParsedData.parsedToolpath);

        // Update 3D CAD viewer dengan debounce aman (hanya jika mode solid aktif)
        scheduleCADRebuild(currentParsedData);

        updateDiagnosticsUI();

        // Hanya perbarui tabel jika tab tersebut sedang aktif agar tidak membebani DOM
        if (!options.skipTableRebuild && currentLeftPaneView === 'table') {
            updateCoordinateTable();
        }
        if (currentLeftPaneView === 'explain') {
            updateExplainTable();
        }

        updateHUD();
        updateDebugInspector();
    }

    // 4. Interactive Editable Coordinate Table System (Dua Arah / Two-Way Sync)
    function renumberTableRows() {
        if (!coordinateTableBody) return;
        let rows = coordinateTableBody.querySelectorAll('tr[id^="coord-row-"]');
        if (rows.length === 0) {
            const emptyBlock = {
                motionMode: 'G00',
                lineNum: 1,
                hasMotion: false,
                tokens: {},
                endPoint: null
            };
            const tr = createTableRowElement(emptyBlock, 0);
            coordinateTableBody.appendChild(tr);
            rows = coordinateTableBody.querySelectorAll('tr[id^="coord-row-"]');
        }
        rows.forEach((tr, idx) => {
            const tdNum = tr.querySelector('td:first-child');
            if (tdNum) tdNum.textContent = 'N' + (idx + 1);
            tr.id = 'coord-row-' + (idx + 1);
            tr.dataset.linenum = (idx + 1);
        });
    }

    function createTableRowElement(b, rowIdx) {
        const tr = document.createElement('tr');
        const lineNum = b.lineNum || (rowIdx + 1);
        tr.id = 'coord-row-' + lineNum;
        tr.dataset.linenum = lineNum;
        tr.className = 'hover:bg-blue-50/70 transition group';

        const motionMode = b.motionMode || 'G01';
        const xVal = (b.tokens && b.tokens['X'] !== undefined) ? b.tokens['X'][0] : (b.hasMotion && b.endPoint ? parseFloat(b.endPoint.x.toFixed(2)) : '');
        const yVal = (b.tokens && b.tokens['Y'] !== undefined) ? b.tokens['Y'][0] : (b.hasMotion && b.endPoint ? parseFloat(b.endPoint.y.toFixed(2)) : '');
        const zVal = (b.tokens && b.tokens['Z'] !== undefined) ? b.tokens['Z'][0] : (b.hasMotion && b.endPoint ? parseFloat(b.endPoint.z.toFixed(2)) : '');
        const rVal = (b.tokens && b.tokens['R'] !== undefined) ? b.tokens['R'][0] : '';
        const fVal = (b.tokens && b.tokens['F'] !== undefined) ? b.tokens['F'][0] : '';

        const needsR = (motionMode === 'G02' || motionMode === 'G03' || motionMode === 'G81' || motionMode === 'G83');
        const isRapid = (motionMode === 'G00');

        tr.innerHTML = `
            <td class="p-1 text-center text-[#64748B] font-mono font-bold text-xs select-none">
                N${rowIdx + 1}
            </td>
            <td class="p-1">
                <select class="table-g-select w-full bg-white border border-[#CFE0F5] focus:border-[#0D5BC6] rounded-lg px-1.5 py-1 text-xs font-bold font-mono cursor-pointer shadow-xs">
                    <option value="G00" ${motionMode === 'G00' ? 'selected' : ''} class="text-rose-700 font-bold">G00 (Rapid)</option>
                    <option value="G01" ${motionMode === 'G01' ? 'selected' : ''} class="text-emerald-700 font-bold">G01 (Potong)</option>
                    <option value="G02" ${motionMode === 'G02' ? 'selected' : ''} class="text-sky-700 font-bold">G02 (Busur CW)</option>
                    <option value="G03" ${motionMode === 'G03' ? 'selected' : ''} class="text-amber-700 font-bold">G03 (Busur CCW)</option>
                    <option value="G81" ${motionMode === 'G81' ? 'selected' : ''} class="text-purple-700 font-bold">G81 (Bor)</option>
                    <option value="G83" ${motionMode === 'G83' ? 'selected' : ''} class="text-indigo-700 font-bold">G83 (Peck)</option>
                </select>
            </td>
            <td class="p-1">
                <div class="relative flex items-center">
                    <span class="absolute left-1.5 text-[10px] font-bold text-rose-500 select-none pointer-events-none">X</span>
                    <input type="number" step="any" class="table-coord-input table-x-input w-full pl-5 pr-1 py-1 bg-white border border-rose-200 focus:border-rose-600 focus:ring-1 focus:ring-rose-400 rounded text-xs font-mono font-bold text-rose-700 text-right shadow-inner" value="${xVal}" placeholder="-">
                </div>
            </td>
            <td class="p-1">
                <div class="relative flex items-center">
                    <span class="absolute left-1.5 text-[10px] font-bold text-emerald-500 select-none pointer-events-none">Y</span>
                    <input type="number" step="any" class="table-coord-input table-y-input w-full pl-5 pr-1 py-1 bg-white border border-emerald-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-400 rounded text-xs font-mono font-bold text-emerald-700 text-right shadow-inner" value="${yVal}" placeholder="-">
                </div>
            </td>
            <td class="p-1">
                <div class="relative flex items-center">
                    <span class="absolute left-1.5 text-[10px] font-bold text-sky-500 select-none pointer-events-none">Z</span>
                    <input type="number" step="any" class="table-coord-input table-z-input w-full pl-5 pr-1 py-1 bg-white border border-sky-200 focus:border-sky-600 focus:ring-1 focus:ring-sky-400 rounded text-xs font-mono font-bold text-sky-700 text-right shadow-inner" value="${zVal}" placeholder="-">
                </div>
            </td>
            <td class="p-1">
                <div class="relative flex items-center">
                    <span class="absolute left-1.5 text-[10px] font-bold text-amber-500 select-none pointer-events-none">R</span>
                    <input type="number" step="any" class="table-coord-input table-r-input w-full pl-5 pr-1 py-1 bg-white border border-amber-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-400 rounded text-xs font-mono font-bold text-amber-700 text-right shadow-inner" value="${rVal}" placeholder="-" ${needsR ? '' : 'disabled style="opacity:0.35;"'}>
                </div>
            </td>
            <td class="p-1">
                <div class="relative flex items-center">
                    <span class="absolute left-1.5 text-[10px] font-bold text-slate-400 select-none pointer-events-none">F</span>
                    <input type="number" step="any" class="table-coord-input table-f-input w-full pl-5 pr-1 py-1 bg-white border border-slate-200 focus:border-slate-600 focus:ring-1 focus:ring-slate-400 rounded text-xs font-mono font-bold text-slate-700 text-right shadow-inner" value="${fVal}" placeholder="-" ${isRapid ? 'disabled style="opacity:0.35;"' : ''}>
                </div>
            </td>
            <td class="p-1 text-center">
                <button class="btn-delete-row text-rose-400 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded transition cursor-pointer" title="Hapus baris koordinat ini">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
            </td>
        `;

        const gSelect = tr.querySelector('.table-g-select');
        const rInput = tr.querySelector('.table-r-input');
        const fInput = tr.querySelector('.table-f-input');

        gSelect.addEventListener('change', () => {
            const g = gSelect.value;
            const rNeeded = (g === 'G02' || g === 'G03' || g === 'G81' || g === 'G83');
            rInput.disabled = !rNeeded;
            rInput.style.opacity = rNeeded ? '1' : '0.35';
            if (rNeeded && !rInput.value) {
                rInput.value = (g === 'G02' || g === 'G03') ? '15' : '2';
            }

            const rapid = (g === 'G00');
            fInput.disabled = rapid;
            fInput.style.opacity = rapid ? '0.35' : '1';
            if (!rapid && !fInput.value) {
                fInput.value = '200';
            }

            syncTableToGCode();
        });

        const inputs = tr.querySelectorAll('.table-coord-input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                syncTableToGCode();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (input.classList.contains('table-f-input') || (input.classList.contains('table-z-input') && fInput.disabled)) {
                        addTableRow();
                    } else {
                        const allInputs = Array.from(tr.querySelectorAll('input:not([disabled])'));
                        const currIdx = allInputs.indexOf(input);
                        if (currIdx >= 0 && currIdx < allInputs.length - 1) {
                            allInputs[currIdx + 1].focus();
                            allInputs[currIdx + 1].select();
                        } else {
                            addTableRow();
                        }
                    }
                }
            });
        });

        const btnDel = tr.querySelector('.btn-delete-row');
        if (btnDel) {
            btnDel.addEventListener('click', (e) => {
                e.stopPropagation();
                const allRows = coordinateTableBody.querySelectorAll('tr[id^="coord-row-"]');
                if (allRows.length <= 1) {
                    const inpList = tr.querySelectorAll('.table-coord-input');
                    inpList.forEach(inp => inp.value = '');
                    const gSel = tr.querySelector('.table-g-select');
                    if (gSel) gSel.value = 'G00';
                    const rIn = tr.querySelector('.table-r-input');
                    if (rIn) { rIn.disabled = true; rIn.style.opacity = '0.35'; rIn.value = ''; }
                    const fIn = tr.querySelector('.table-f-input');
                    if (fIn) { fIn.disabled = true; fIn.style.opacity = '0.35'; fIn.value = ''; }
                    renumberTableRows();
                    syncTableToGCode();
                    const xIn = tr.querySelector('.table-x-input');
                    if (xIn) xIn.focus();
                } else {
                    tr.remove();
                    renumberTableRows();
                    syncTableToGCode();
                }
            });
        }

        tr.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.closest('button')) return;
            if (b.lineNum) highlightEditorLine(b.lineNum, true);
        });

        return tr;
    }

    function updateCoordinateTable() {
        if (!coordinateTableBody || !currentParsedData) return;
        if (isSyncingFromTable) return;
        if (coordinateTableBody.contains(document.activeElement)) return;

        coordinateTableBody.innerHTML = '';

        const motionBlocks = currentParsedData.blocks.filter(b => !b.isEmpty && (b.hasMotion || b.tokens['G']));

        if (motionBlocks.length === 0) {
            // Sisakan 1 baris kosong untuk memasukkan program (tanpa tombol "Tambah Baris Pertama")
            const emptyBlock = {
                motionMode: 'G00',
                lineNum: 1,
                hasMotion: false,
                tokens: {},
                endPoint: null
            };
            const tr = createTableRowElement(emptyBlock, 0);
            coordinateTableBody.appendChild(tr);
            return;
        }

        motionBlocks.forEach((b, rowIdx) => {
            const tr = createTableRowElement(b, rowIdx);
            coordinateTableBody.appendChild(tr);
        });
    }

    function syncTableToGCode() {
        isSyncingFromTable = true;
        try {
            const rows = coordinateTableBody.querySelectorAll('tr[id^="coord-row-"]');
            const motionCommands = [];

            rows.forEach(tr => {
                const gSelect = tr.querySelector('.table-g-select');
                const xInput = tr.querySelector('.table-x-input');
                const yInput = tr.querySelector('.table-y-input');
                const zInput = tr.querySelector('.table-z-input');
                const rInput = tr.querySelector('.table-r-input');
                const fInput = tr.querySelector('.table-f-input');

                if (!gSelect) return;
                const g = gSelect.value || 'G01';
                const parts = [g];

                const xStr = xInput ? xInput.value.trim() : '';
                const yStr = yInput ? yInput.value.trim() : '';
                const zStr = zInput ? zInput.value.trim() : '';
                const rStr = rInput ? rInput.value.trim() : '';
                const fStr = fInput ? fInput.value.trim() : '';

                if (xStr !== '' && !isNaN(parseFloat(xStr))) parts.push('X' + parseFloat(xStr));
                if (yStr !== '' && !isNaN(parseFloat(yStr))) parts.push('Y' + parseFloat(yStr));
                if (zStr !== '' && !isNaN(parseFloat(zStr))) parts.push('Z' + parseFloat(zStr));
                if (rStr !== '' && !isNaN(parseFloat(rStr))) parts.push('R' + parseFloat(rStr));
                if (fStr !== '' && !isNaN(parseFloat(fStr))) parts.push('F' + parseFloat(fStr));

                if (parts.length > 1) {
                    motionCommands.push(parts.join(' '));
                }
            });

            // Reconstruct clean G-code preserving setup header and safe exit footer
            const currentCode = codeTextarea.value;
            const lines = currentCode.split(/\r?\n/);

            let headerLines = [];
            let footerLines = [];
            let foundFirstMotion = false;
            let foundFooter = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const clean = line.replace(/\([^\)]*\)/g, '').trim().toUpperCase();
                
                if (clean.includes('M30') || clean.includes('M02') || clean.includes('M05') || (clean.includes('G28') && foundFirstMotion)) {
                    foundFooter = true;
                }

                if (foundFooter) {
                    footerLines.push(line);
                } else if (!foundFirstMotion) {
                    if (/(?:^|\s)(?:G0?0|G0?1|G0?2|G0?3|G81|G83)\b/.test(clean) && /(?:X|Y|Z)/.test(clean)) {
                        foundFirstMotion = true;
                    } else {
                        headerLines.push(line);
                    }
                }
            }

            if (headerLines.length === 0) {
                headerLines = [
                    '%',
                    'O0001 (PROGRAM SISWA CNC FRAIS)',
                    'G21 G90 G17 G40 G80',
                    'G28 G91 Z0',
                    'G90 G54',
                    'T01 M06 (ENDMILL D10)',
                    'S1500 M03'
                ];
            }
            if (footerLines.length === 0) {
                footerLines = [
                    '(ANGKAT PAHAT & SELESAI)',
                    'G00 Z10',
                    'G28 G91 Z0',
                    'M05',
                    'M30',
                    '%'
                ];
            }

            let newCode;
            if (motionCommands.length > 0) {
                newCode = headerLines.join('\n').trim() + 
                          '\n\n(LINTASAN KOORDINAT TABEL)\n' + 
                          motionCommands.join('\n') + 
                          '\n\n' + 
                          footerLines.join('\n').trim();
            } else {
                newCode = headerLines.join('\n').trim() + 
                          '\n\n(LINTASAN KOORDINAT TABEL)\n' + 
                          '; Masukkan titik koordinat di Tabel Koordinat atau ketik di sini\n\n' + 
                          footerLines.join('\n').trim();
            }

            codeTextarea.value = newCode;
            updateLineNumbers();
            processGCode({ skipTableRebuild: true });
        } finally {
            isSyncingFromTable = false;
        }
    }

    function addTableRow(defaultValues = {}) {
        const rows = coordinateTableBody.querySelectorAll('tr[id^="coord-row-"]');

        // Jika hanya ada 1 baris dan masih kosong (belum diisi angka), fokuskan ke baris tersebut
        if (rows.length === 1 && !defaultValues.forceAppend) {
            const firstRow = rows[0];
            const xIn0 = firstRow.querySelector('.table-x-input');
            const yIn0 = firstRow.querySelector('.table-y-input');
            const zIn0 = firstRow.querySelector('.table-z-input');
            const isFirstEmpty = (!xIn0 || xIn0.value.trim() === '') &&
                                 (!yIn0 || yIn0.value.trim() === '') &&
                                 (!zIn0 || zIn0.value.trim() === '');
            if (isFirstEmpty) {
                if (defaultValues.x !== undefined && xIn0) xIn0.value = defaultValues.x;
                if (defaultValues.y !== undefined && yIn0) yIn0.value = defaultValues.y;
                if (defaultValues.z !== undefined && zIn0) zIn0.value = defaultValues.z;
                if (defaultValues.motionMode) {
                    const gSel = firstRow.querySelector('.table-g-select');
                    if (gSel) gSel.value = defaultValues.motionMode;
                }
                if (xIn0) {
                    xIn0.focus();
                    xIn0.select();
                }
                syncTableToGCode();
                return;
            }
        }

        let prevX = '10';
        let prevY = '10';
        let prevZ = '-2.0';
        let prevF = '250';

        if (rows.length > 0) {
            const lastRow = rows[rows.length - 1];
            const xIn = lastRow.querySelector('.table-x-input');
            const yIn = lastRow.querySelector('.table-y-input');
            const zIn = lastRow.querySelector('.table-z-input');
            const fIn = lastRow.querySelector('.table-f-input');
            if (xIn && xIn.value !== '') prevX = (parseFloat(xIn.value) + 20).toString();
            if (yIn && yIn.value !== '') prevY = yIn.value;
            if (zIn && zIn.value !== '') prevZ = zIn.value;
            if (fIn && fIn.value !== '') prevF = fIn.value;
        }

        const newBlock = {
            motionMode: defaultValues.motionMode || 'G01',
            lineNum: rows.length + 1,
            hasMotion: true,
            endPoint: {
                x: parseFloat(defaultValues.x !== undefined ? defaultValues.x : prevX),
                y: parseFloat(defaultValues.y !== undefined ? defaultValues.y : prevY),
                z: parseFloat(defaultValues.z !== undefined ? defaultValues.z : prevZ)
            },
            tokens: {
                'G': [defaultValues.motionMode === 'G00' ? 0 : 1],
                'X': [parseFloat(defaultValues.x !== undefined ? defaultValues.x : prevX)],
                'Y': [parseFloat(defaultValues.y !== undefined ? defaultValues.y : prevY)],
                'Z': [parseFloat(defaultValues.z !== undefined ? defaultValues.z : prevZ)],
                'F': [parseFloat(defaultValues.f !== undefined ? defaultValues.f : prevF)]
            }
        };

        const tr = createTableRowElement(newBlock, rows.length);
        coordinateTableBody.appendChild(tr);
        if (window.lucide) lucide.createIcons();

        renumberTableRows();
        syncTableToGCode();

        const xInput = tr.querySelector('.table-x-input');
        if (xInput) {
            xInput.focus();
            xInput.select();
        }
    }

    function resetTableRows() {
        coordinateTableBody.innerHTML = '';
        const emptyBlock = {
            motionMode: 'G00',
            lineNum: 1,
            hasMotion: false,
            tokens: {},
            endPoint: null
        };
        coordinateTableBody.appendChild(createTableRowElement(emptyBlock, 0));
        if (window.lucide) lucide.createIcons();
        renumberTableRows();
        syncTableToGCode();

        const xInput = coordinateTableBody.querySelector('.table-x-input');
        if (xInput) {
            xInput.focus();
            xInput.select();
        }
    }

    // Attach table action button listeners
    if (btnAddTableRow) {
        btnAddTableRow.addEventListener('click', () => addTableRow());
    }
    if (btnAppendRowBottom) {
        btnAppendRowBottom.addEventListener('click', () => addTableRow());
    }
    if (btnClearTableRows) {
        btnClearTableRows.addEventListener('click', () => resetTableRows());
    }

    // 4.3 Explanatory Table System (Tabel Penjelas Baris Program CNC seperti sebelumnya)
    function getLineExplanation(b) {
        const tokens = b.tokens || {};
        const gCodes = tokens['G'] || [];
        const mCodes = tokens['M'] || [];
        const rawTrim = (b.raw || '').trim();
        const commentMatch = (b.raw || '').match(/\(([^)]+)\)/);
        const comment = commentMatch ? commentMatch[1].trim() : '';

        // Karakter Pembuka/Penutup %
        if (rawTrim.startsWith('%')) {
            return {
                text: 'Karakter Pembuka / Penutup Data CNC (%)',
                color: 'text-slate-400 italic font-mono'
            };
        }

        // Program Header O-word
        if (/^[O:]\d+/i.test(rawTrim)) {
            return {
                text: `Nomor Identitas Program Mesin (${rawTrim})`,
                color: 'text-slate-900 font-bold'
            };
        }

        // Motion Codes
        if (b.hasMotion) {
            if (b.motionMode === 'G00') {
                let desc = 'Gerak Cepat di Udara (Rapid - tanpa sayatan)';
                if (tokens['Z'] !== undefined && tokens['Z'][0] > 0 && tokens['X'] === undefined && tokens['Y'] === undefined) {
                    desc = `Angkat Pahat Cepat ke Posisi Aman Z ${tokens['Z'][0]} mm`;
                } else if (tokens['X'] !== undefined || tokens['Y'] !== undefined) {
                    const tx = tokens['X'] !== undefined ? tokens['X'][0] : (b.endPoint ? b.endPoint.x : '');
                    const ty = tokens['Y'] !== undefined ? tokens['Y'][0] : (b.endPoint ? b.endPoint.y : '');
                    desc = `Gerak Cepat Meluncur ke X ${tx}, Y ${ty}`;
                }
                return {
                    text: comment ? `${desc} — (${comment})` : desc,
                    color: 'text-rose-700 font-medium'
                };
            } else if (b.motionMode === 'G01') {
                let desc = 'Pemotongan Lurus Menyayat Benda (Linear Feed)';
                if (tokens['Z'] !== undefined && tokens['Z'][0] < 0 && tokens['X'] === undefined && tokens['Y'] === undefined) {
                    desc = `Penetrasi Pahat Turun ke Kedalaman Z ${tokens['Z'][0]} mm`;
                } else if (tokens['X'] !== undefined && tokens['Y'] !== undefined) {
                    desc = `Pemotongan Lurus Interpolasi Diagonal ke X ${tokens['X'][0]}, Y ${tokens['Y'][0]}`;
                } else if (tokens['X'] !== undefined) {
                    desc = `Pemotongan Lurus Mendatar Sumbu X ke ${tokens['X'][0]} mm`;
                } else if (tokens['Y'] !== undefined) {
                    desc = `Pemotongan Lurus Tegak Sumbu Y ke ${tokens['Y'][0]} mm`;
                }
                return {
                    text: comment ? `${desc} — (${comment})` : desc,
                    color: 'text-emerald-800 font-medium'
                };
            } else if (b.motionMode === 'G02') {
                const rVal = tokens['R'] !== undefined ? ` R=${tokens['R'][0]}` : '';
                const desc = `Interpolasi Busur CW Searah Jarum Jam${rVal}`;
                return {
                    text: comment ? `${desc} — (${comment})` : desc,
                    color: 'text-sky-800 font-medium'
                };
            } else if (b.motionMode === 'G03') {
                const rVal = tokens['R'] !== undefined ? ` R=${tokens['R'][0]}` : '';
                const desc = `Interpolasi Busur CCW Berlawanan Jarum Jam${rVal}`;
                return {
                    text: comment ? `${desc} — (${comment})` : desc,
                    color: 'text-amber-800 font-medium'
                };
            } else if (b.motionMode === 'G81') {
                const zTarget = tokens['Z'] !== undefined ? tokens['Z'][0] : (b.endPoint ? b.endPoint.z : '');
                const desc = `Siklus Bor Langsung Tembus ke Z ${zTarget} mm`;
                return {
                    text: comment ? `${desc} — (${comment})` : desc,
                    color: 'text-purple-800 font-medium'
                };
            } else if (b.motionMode === 'G83') {
                const zTarget = tokens['Z'] !== undefined ? tokens['Z'][0] : (b.endPoint ? b.endPoint.z : '');
                const desc = `Siklus Bor Bertahap Buang Tatal (Peck) ke Z ${zTarget} mm`;
                return {
                    text: comment ? `${desc} — (${comment})` : desc,
                    color: 'text-purple-800 font-medium'
                };
            }
        }

        // M-Codes
        if (mCodes.includes(30)) {
            return {
                text: 'Program Selesai, Spindel Mati & Reset Kursor (M30)',
                color: 'text-slate-800 font-bold'
            };
        }
        if (mCodes.includes(2)) {
            return {
                text: 'Akhir Program Pemesinan Frais (M02)',
                color: 'text-slate-800 font-bold'
            };
        }
        if (mCodes.includes(6) || tokens['T'] !== undefined) {
            const toolNum = tokens['T'] ? `T${tokens['T'][0]}` : 'Pahat';
            return {
                text: `Pergantian Alat Potong Pahat Frais (${toolNum})`,
                color: 'text-indigo-900 font-semibold'
            };
        }
        if (mCodes.includes(3)) {
            const speed = tokens['S'] ? ` ${tokens['S'][0]} RPM` : '';
            return {
                text: `Spindel Berputar Searah Jarum Jam (Spindle CW${speed})`,
                color: 'text-indigo-800 font-medium'
            };
        }
        if (mCodes.includes(5)) {
            return {
                text: 'Menghentikan Putaran Spindel Pahat (Spindle Stop)',
                color: 'text-slate-700 font-medium'
            };
        }
        if (gCodes.includes(28)) {
            return {
                text: 'Kembali ke Titik Nol Referensi Mesin (Machine Home Return)',
                color: 'text-slate-700 font-medium'
            };
        }

        // G-Codes Inisialisasi
        const prepList = [];
        if (gCodes.includes(21)) prepList.push('Satuan mm (G21)');
        if (gCodes.includes(90)) prepList.push('Absolut (G90)');
        if (gCodes.includes(91)) prepList.push('Inkremental (G91)');
        if (gCodes.includes(17)) prepList.push('Bidang XY (G17)');
        if (gCodes.includes(40)) prepList.push('Batal Kompensasi (G40)');
        if (gCodes.includes(80)) prepList.push('Batal Siklus Bor (G80)');
        if (gCodes.includes(54)) prepList.push('WCS Benda Kerja (G54)');

        if (prepList.length > 0) {
            return {
                text: 'Inisialisasi Standar Mesin: ' + prepList.join(', '),
                color: 'text-slate-700 font-medium'
            };
        }

        if (comment && !b.clean) {
            return {
                text: `Catatan Petunjuk: ${comment}`,
                color: 'text-amber-800 italic'
            };
        }

        return {
            text: comment ? `${b.clean} — (${comment})` : (b.clean || 'Instruksi Mesin'),
            color: 'text-slate-700'
        };
    }

    function updateExplainTable() {
        if (!explainTableBody || !currentParsedData) return;
        explainTableBody.innerHTML = '';

        const blocks = currentParsedData.blocks.filter(b => !b.isEmpty);
        if (explainRowCountBadge) {
            explainRowCountBadge.textContent = `${blocks.length} Baris`;
        }

        if (blocks.length === 0) {
            const emptyTr = document.createElement('tr');
            emptyTr.innerHTML = `
                <td colspan="7" class="p-6 text-center text-slate-500 font-sans">
                    <p class="font-bold text-sm mb-1 text-slate-700">Belum ada baris program G-Code.</p>
                    <p class="text-xs text-slate-500">Ketik program di Tab 1 atau masukkan koordinat di Tab 2.</p>
                </td>
            `;
            explainTableBody.appendChild(emptyTr);
            return;
        }

        blocks.forEach((b) => {
            const tr = document.createElement('tr');
            tr.id = 'explain-row-' + b.lineNum;
            tr.className = 'hover:bg-blue-50/70 transition cursor-pointer group';

            let modeBadge = '';
            if (b.motionMode === 'G00' && b.hasMotion) {
                modeBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">G00</span>';
            } else if (b.motionMode === 'G01' && b.hasMotion) {
                modeBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">G01</span>';
            } else if (b.motionMode === 'G02' && b.hasMotion) {
                modeBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">G02</span>';
            } else if (b.motionMode === 'G03' && b.hasMotion) {
                modeBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">G03</span>';
            } else if (b.motionMode === 'G81' || b.motionMode === 'G83') {
                modeBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">${b.motionMode}</span>`;
            } else if (b.tokens['M'] && b.tokens['M'].length > 0) {
                const mCode = 'M' + String(b.tokens['M'][0]).padStart(2, '0');
                modeBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">${mCode}</span>`;
            } else if (b.tokens['G'] && b.tokens['G'].length > 0) {
                const gCode = 'G' + b.tokens['G'][0];
                modeBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">${gCode}</span>`;
            } else if (b.isCommentOnly) {
                modeBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">REM</span>';
            } else {
                modeBadge = '<span class="text-slate-400 font-mono text-[10px]">-</span>';
            }

            const xVal = b.hasMotion && b.endPoint ? b.endPoint.x.toFixed(2) : (b.tokens['X'] !== undefined ? parseFloat(b.tokens['X'][0]).toFixed(2) : '-');
            const yVal = b.hasMotion && b.endPoint ? b.endPoint.y.toFixed(2) : (b.tokens['Y'] !== undefined ? parseFloat(b.tokens['Y'][0]).toFixed(2) : '-');
            const zVal = b.hasMotion && b.endPoint ? b.endPoint.z.toFixed(2) : (b.tokens['Z'] !== undefined ? parseFloat(b.tokens['Z'][0]).toFixed(2) : '-');

            let rVal = '-';
            if (b.tokens['R'] !== undefined) rVal = 'R ' + b.tokens['R'][0];
            else if (b.tokens['I'] !== undefined || b.tokens['J'] !== undefined) {
                rVal = `I${b.tokens['I'] ? b.tokens['I'][0] : 0} J${b.tokens['J'] ? b.tokens['J'][0] : 0}`;
            }

            const explanation = getLineExplanation(b);

            tr.innerHTML = `
                <td class="p-2 text-center text-[#666666] font-mono font-bold text-xs select-none">
                    N${b.lineNum}
                </td>
                <td class="p-2 text-center">
                    ${modeBadge}
                </td>
                <td class="p-2 font-mono text-rose-700 font-bold">
                    ${xVal !== '-' ? 'X ' + xVal : '<span class="text-slate-300 font-normal">-</span>'}
                </td>
                <td class="p-2 font-mono text-emerald-700 font-bold">
                    ${yVal !== '-' ? 'Y ' + yVal : '<span class="text-slate-300 font-normal">-</span>'}
                </td>
                <td class="p-2 font-mono text-sky-700 font-bold">
                    ${zVal !== '-' ? 'Z ' + zVal : '<span class="text-slate-300 font-normal">-</span>'}
                </td>
                <td class="p-2 font-mono text-amber-700 font-bold">
                    ${rVal !== '-' ? rVal : '<span class="text-slate-300 font-normal">-</span>'}
                </td>
                <td class="p-2 text-xs font-sans ${explanation.color} truncate max-w-[240px]" title="${explanation.text}">
                    ${explanation.text}
                </td>
            `;

            tr.addEventListener('click', () => {
                highlightEditorLine(b.lineNum, true);
            });

            explainTableBody.appendChild(tr);
        });
    }

    // 5. Diagnostics UI
    function updateDiagnosticsUI() {
        let errors = 0;
        let warnings = 0;
        diagnosticsList.innerHTML = '';

        if (!currentDiagnostics || currentDiagnostics.length === 0) {
            diagnosticsList.innerHTML = `
                <div class="flex items-center gap-2.5 p-2.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#065F46] text-xs font-semibold">
                    <div class="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                        <i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>
                    </div>
                    <span>Program Valid & Bebas Error! Koordinat siap disimulasikan di mesin frais.</span>
                </div>
            `;
            if (errorCountBadge) errorCountBadge.textContent = '0';
            if (warningCountBadge) warningCountBadge.textContent = '0';
            if (window.lucide) lucide.createIcons();
            return;
        }

        currentDiagnostics.forEach((diag) => {
            if (diag.type === 'ERROR') errors++;
            if (diag.type === 'WARNING') warnings++;

            const isErr = (diag.type === 'ERROR');
            const bgClass = isErr ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]' : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]';
            const iconName = isErr ? 'alert-octagon' : 'alert-triangle';
            const iconColor = isErr ? 'text-rose-600' : 'text-amber-600';

            const item = document.createElement('div');
            item.className = `p-2 px-3 rounded-xl border text-xs flex items-center justify-between gap-2 transition cursor-pointer hover:shadow-xs ${bgClass}`;
            
            item.innerHTML = `
                <div class="flex items-center gap-2 truncate">
                    <i data-lucide="${iconName}" class="w-3.5 h-3.5 ${iconColor} flex-shrink-0"></i>
                    <span class="font-extrabold">Baris ${diag.lineNum || '-'}:</span>
                    <span class="truncate font-medium">${diag.message}</span>
                </div>
                <span class="text-[9.5px] px-2 py-0.5 rounded-full bg-white font-mono font-bold border border-current flex-shrink-0 shadow-xs">${diag.category || diag.type}</span>
            `;

            item.addEventListener('click', () => {
                if (diag.lineNum) {
                    highlightEditorLine(diag.lineNum, true);
                }
            });

            diagnosticsList.appendChild(item);
        });

        if (errorCountBadge) errorCountBadge.textContent = errors;
        if (warningCountBadge) warningCountBadge.textContent = warnings;

        if (window.lucide) lucide.createIcons();
    }

    function highlightEditorLine(lineNum, shouldFocus = false) {
        if (!shouldFocus && currentHighlightedLine === lineNum) return;
        currentHighlightedLine = lineNum;

        // 1. Highlight line number in line numbers column
        document.querySelectorAll('.active-line-num').forEach(el => el.classList.remove('active-line-num'));
        const lineEl = document.getElementById('line-num-' + lineNum);
        if (lineEl) {
            lineEl.classList.add('active-line-num');
        }

        // 2. Synchronize and scroll the editor so active line is always centered and in view
        const lineHeight = 22; // exact height matching CSS (22px)
        const lineTop = (lineNum - 1) * lineHeight;
        const viewHeight = codeTextarea.clientHeight;
        const currentScroll = codeTextarea.scrollTop;

        // If active line is near or outside viewport boundaries, smoothly scroll it into center
        if (lineTop < currentScroll + 35 || lineTop > currentScroll + viewHeight - 55) {
            const targetScroll = Math.max(0, lineTop - (viewHeight / 2) + (lineHeight / 2));
            codeTextarea.scrollTop = targetScroll;
            lineNumbers.scrollTop = targetScroll;
        } else {
            lineNumbers.scrollTop = codeTextarea.scrollTop;
        }

        // 3. Highlight coordinate table row if visible
        document.querySelectorAll('.active-table-row').forEach(el => el.classList.remove('active-table-row'));
        const tableRow = document.getElementById('coord-row-' + lineNum);
        if (tableRow) {
            tableRow.classList.add('active-table-row');
            tableRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        const explainRow = document.getElementById('explain-row-' + lineNum);
        if (explainRow) {
            explainRow.classList.add('active-table-row');
            explainRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // 4. Select text of the line in codeTextarea
        const lines = codeTextarea.value.split('\n');
        let charCount = 0;
        for (let i = 0; i < lineNum - 1 && i < lines.length; i++) {
            charCount += lines[i].length + 1;
        }
        if (lines[lineNum - 1] !== undefined) {
            if (shouldFocus) codeTextarea.focus();
            codeTextarea.setSelectionRange(charCount, charCount + lines[lineNum - 1].length);
        }
    }

    function clearEditorHighlight() {
        currentHighlightedLine = -1;
        document.querySelectorAll('.active-line-num').forEach(el => el.classList.remove('active-line-num'));
        document.querySelectorAll('.active-table-row').forEach(el => el.classList.remove('active-table-row'));
    }

    function getHumanMotionDescription(seg) {
        if (!seg) return 'Pisau frais siap di posisi awal aman.';
        const targetX = seg.end.x.toFixed(1);
        const targetY = seg.end.y.toFixed(1);
        const targetZ = seg.end.z.toFixed(1);

        if (seg.type === 'G00') {
            return `Gerak cepat tanpa pemakanan ke X ${targetX}, Y ${targetY}, Z ${targetZ} mm.`;
        } else if (seg.type === 'G01') {
            return `Pemotongan frais lurus ke X ${targetX}, Y ${targetY}, kedalaman Z ${targetZ} mm.`;
        } else if (seg.type === 'G02') {
            const r = seg.radius ? seg.radius.toFixed(1) : '-';
            return `Interpolasi melingkar CW searah jarum jam (R ${r}) ke X ${targetX}, Y ${targetY}, Z ${targetZ} mm.`;
        } else if (seg.type === 'G03') {
            const r = seg.radius ? seg.radius.toFixed(1) : '-';
            return `Interpolasi melingkar CCW lawan jarum jam (R ${r}) ke X ${targetX}, Y ${targetY}, Z ${targetZ} mm.`;
        } else if (seg.type === 'G81') {
            return `Siklus pengeboran langsung ke X ${targetX}, Y ${targetY}, kedalaman lubang Z ${targetZ} mm.`;
        } else if (seg.type === 'G83') {
            return `Siklus pengeboran bertahap (Peck Drill) pembuangan tatal ke kedalaman Z ${targetZ} mm.`;
        }
        return 'Pisau frais bergerak mengeksekusi baris perintah.';
    }

    function updateHUD(seg, lineNum, progress) {
        const xVal = visualizer.toolPos.x.toFixed(2);
        const yVal = visualizer.toolPos.y.toFixed(2);
        const zVal = visualizer.toolPos.z.toFixed(2);

        if (hudX) hudX.textContent = 'X ' + xVal;
        if (hudY) hudY.textContent = 'Y ' + yVal;
        if (hudZ) hudZ.textContent = 'Z ' + zVal;
        if (hudMotion) hudMotion.textContent = seg ? seg.type : (currentParsedData && currentParsedData.blocks[0] ? currentParsedData.blocks[0].motionMode : 'G00');
        if (hudFeed) hudFeed.textContent = 'F ' + (seg && seg.feed ? seg.feed.toFixed(0) : '150');
        if (hudTool) hudTool.textContent = 'Ø ' + visualizer.options.toolDiameter;
        if (hudLine) hudLine.textContent = 'N' + (lineNum || (seg ? seg.lineNum : 1));
        if (hudTime && currentParsedData) hudTime.textContent = ((currentParsedData.stats && currentParsedData.stats.estimatedTimeSec) ? currentParsedData.stats.estimatedTimeSec : 0) + 's';

        // Live Trace Monitor Update
        if (liveTraceBlock && seg) {
            const blockRaw = currentParsedData && currentParsedData.blocks[seg.lineNum - 1] 
                ? currentParsedData.blocks[seg.lineNum - 1].raw.trim() 
                : `${seg.type} X${xVal} Y${yVal} Z${zVal}`;
            liveTraceBlock.textContent = `Baris ${seg.lineNum}: ${blockRaw}`;
        }

        if (liveTraceModeBadge && seg) {
            let bgStyle = 'bg-[#10B981]';
            if (seg.type === 'G00') bgStyle = 'bg-rose-500';
            else if (seg.type === 'G01') bgStyle = 'bg-emerald-500';
            else if (seg.type === 'G02') bgStyle = 'bg-blue-500';
            else if (seg.type === 'G03') bgStyle = 'bg-amber-500';
            else if (seg.type === 'G81' || seg.type === 'G83') bgStyle = 'bg-purple-500';
            
            liveTraceModeBadge.className = `${bgStyle} text-white font-bold text-[10.5px] px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs`;
            liveTraceModeBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-white flex-shrink-0"></span><span>${seg.type}</span>`;
        }

        if (liveTraceDesc && seg) {
            liveTraceDesc.textContent = getHumanMotionDescription(seg);
        }

        const totalSegs = visualizer.segments ? visualizer.segments.length : 1;
        const curIdx = visualizer.currentSegmentIndex >= 0 ? visualizer.currentSegmentIndex : 0;
        const overallPct = visualizer.currentSegmentIndex < 0 ? 0 : Math.round(((curIdx + (progress || 0)) / Math.max(1, totalSegs)) * 100);

        if (liveTraceProgressBar) liveTraceProgressBar.style.width = overallPct + '%';
        if (liveTracePct) liveTracePct.textContent = overallPct + '%';
        updateDebugInspector(seg, visualizer.toolPos);
    }

    function updateDebugInspector(seg, toolPos) {
        if (!debugInspectorPanel || debugInspectorPanel.classList.contains('hidden')) return;

        // 1. Origin G54
        const wcsMode = visualizer.options.wcsMode || 'bottom-left';
        let wcsLabel = 'BL (0.0, 0.0, 0.0)';
        if (wcsMode === 'center') wcsLabel = 'Center (0.0, 0.0, 0.0)';
        else if (wcsMode === 'top-left') wcsLabel = 'TL (0.0, 0.0, 0.0)';
        else if (wcsMode === 'top-right') wcsLabel = 'TR (0.0, 0.0, 0.0)';
        else if (wcsMode === 'bottom-right') wcsLabel = 'BR (0.0, 0.0, 0.0)';
        if (debugWCSOrigin) debugWCSOrigin.textContent = wcsLabel;

        // Tool Diameter & Radius
        const toolD = visualizer.options.toolDiameter || 10;
        const toolR = (toolD / 2).toFixed(1);
        if (debugToolD) debugToolD.textContent = `Ø${toolD} mm (R ${toolR} mm)`;

        // 2. Realtime Cutter Pos
        const pos = toolPos || visualizer.toolPos || { x: 0, y: 0, z: 20 };
        if (debugCutterX) debugCutterX.textContent = pos.x.toFixed(2);
        if (debugCutterY) debugCutterY.textContent = pos.y.toFixed(2);
        if (debugCutterZ) debugCutterZ.textContent = pos.z.toFixed(2);

        // 3. Active Segment
        const activeSeg = seg || (visualizer.segments && visualizer.currentSegmentIndex >= 0 ? visualizer.segments[visualizer.currentSegmentIndex] : (visualizer.segments ? visualizer.segments[0] : null));
        if (activeSeg) {
            if (debugSegType) {
                debugSegType.textContent = `${activeSeg.type} (N${activeSeg.lineNum || 1})`;
                let bgStyle = 'bg-rose-900/80 text-rose-200 border-rose-600/40';
                if (activeSeg.type === 'G01') bgStyle = 'bg-emerald-900/80 text-emerald-200 border-emerald-600/40';
                else if (activeSeg.type === 'G02' || activeSeg.type === 'G03') bgStyle = 'bg-sky-900/80 text-sky-200 border-sky-600/40';
                else if (activeSeg.type === 'G81' || activeSeg.type === 'G83') bgStyle = 'bg-purple-900/80 text-purple-200 border-purple-600/40';
                debugSegType.className = `px-1.5 py-0.2 rounded font-bold border ${bgStyle}`;
            }
            if (debugSegStart && activeSeg.start) {
                debugSegStart.textContent = `(${activeSeg.start.x.toFixed(1)}, ${activeSeg.start.y.toFixed(1)}, ${activeSeg.start.z.toFixed(1)})`;
            }
            if (debugSegEnd && activeSeg.end) {
                debugSegEnd.textContent = `(${activeSeg.end.x.toFixed(1)}, ${activeSeg.end.y.toFixed(1)}, ${activeSeg.end.z.toFixed(1)})`;
            }
            if (activeSeg.center && (activeSeg.type === 'G02' || activeSeg.type === 'G03')) {
                if (debugArcInfoRow) debugArcInfoRow.classList.remove('hidden');
                if (debugSegCenter) debugSegCenter.textContent = `I:${(activeSeg.center.x - activeSeg.start.x).toFixed(1)}, J:${(activeSeg.center.y - activeSeg.start.y).toFixed(1)}`;
                if (debugSegRadius) debugSegRadius.textContent = `R:${(activeSeg.radius || 0).toFixed(1)}mm`;
            } else {
                if (debugArcInfoRow) debugArcInfoRow.classList.add('hidden');
            }
            if (debugSegFeed) debugSegFeed.textContent = (activeSeg.feed ? activeSeg.feed.toFixed(0) : '0') + ' mm/min';
            if (debugSegDepth && activeSeg.end) debugSegDepth.textContent = `Z ${activeSeg.end.z.toFixed(1)} mm`;
        }

        // 4. Bounding Box & Offset Validation
        if (currentParsedData) {
            const tBox = currentParsedData.toolpathBoundingBox || currentParsedData.boundingBox;
            const mBox = currentParsedData.machiningBoundingBox;
            if (tBox && tBox.hasCut) {
                if (debugToolpathBBox) {
                    debugToolpathBBox.textContent = `X[${tBox.minX}, ${tBox.maxX}] Y[${tBox.minY}, ${tBox.maxY}]`;
                }
                if (debugMachiningBBox && mBox) {
                    debugMachiningBBox.textContent = `X[${mBox.minX}, ${mBox.maxX}] Y[${mBox.minY}, ${mBox.maxY}]`;
                }

                // Run validation
                const val = cadViewer ? cadViewer.validateBoundingBoxes(currentParsedData) : null;
                if (val) {
                    if (val.isValid) {
                        if (debugOffsetCheck) {
                            debugOffsetCheck.textContent = `Lolos (Δ = ${val.toolRadius.toFixed(1)}mm = R_tool)`;
                            debugOffsetCheck.className = 'text-emerald-300 font-bold';
                        }
                        if (debugWarningBanner) debugWarningBanner.classList.add('hidden');
                        if (debugSyncStatusText) debugSyncStatusText.textContent = '100% SYNCHRONIZED (ONE TOOLPATH)';
                    } else {
                        if (debugOffsetCheck) {
                            debugOffsetCheck.textContent = `Gagal! Selisih != R_tool`;
                            debugOffsetCheck.className = 'text-rose-400 font-bold';
                        }
                        if (debugWarningBanner) {
                            debugWarningBanner.classList.remove('hidden');
                            if (debugWarningText) debugWarningText.textContent = val.warning;
                        }
                        if (debugSyncStatusText) debugSyncStatusText.textContent = 'WARNING: BBOX MISMATCH DETECTED';
                    }
                }
            } else {
                if (debugToolpathBBox) debugToolpathBBox.textContent = 'Belum ada gerakan potong';
                if (debugMachiningBBox) debugMachiningBBox.textContent = 'Raw Stock';
                if (debugOffsetCheck) debugOffsetCheck.textContent = 'Menunggu eksekusi';
                if (debugWarningBanner) debugWarningBanner.classList.add('hidden');
            }
        }
    }

    // Animation Loop & Playback Controls
    function animLoop(timestamp) {
        if (!isPlaying) return;

        if (!lastAnimTime) lastAnimTime = timestamp;
        const deltaTime = timestamp - lastAnimTime;
        lastAnimTime = timestamp;

        const continues = visualizer.stepSimulation(deltaTime, (segIndex, seg, progress, isFinished) => {
            if (seg) {
                updateHUD(seg, seg.lineNum, progress);
                highlightEditorLine(seg.lineNum, false);
                visualizer.simulateCutter(visualizer.toolPos);
                if (cadViewer) {
                    cadViewer.simulateCutter(visualizer.toolPos);
                }
                updateDebugInspector(seg, visualizer.toolPos);
            }
            if (isFinished) {
                stopSimulation();
                clearEditorHighlight();
                if (liveTraceDesc) liveTraceDesc.textContent = 'âœ… Pemesinan Frais Selesai Dieksekusi.';
                if (liveTraceProgressBar) liveTraceProgressBar.style.width = '100%';
                if (liveTracePct) liveTracePct.textContent = '100%';
                if (btnFinishedInspect) {
                    btnFinishedInspect.classList.remove('hidden');
                }
            }
        });

        if (continues) {
            requestAnimationFrame(animLoop);
        }
    }

    function startSimulation() {
        if (currentViewMode === 'solid') {
            switchToView('iso');
        }

        if (!currentParsedData || currentParsedData.segments.length === 0) {
            processGCode();
        }
        if (!currentParsedData || currentParsedData.segments.length === 0) return;

        if (visualizer.currentSegmentIndex >= visualizer.segments.length - 1) {
            resetSimulation();
        }

        if (visualizer.currentSegmentIndex < 0) {
            visualizer.currentSegmentIndex = 0;
            visualizer.currentProgress = 0;
        }

        isPlaying = true;
        visualizer.isSimulating = true;
        lastAnimTime = 0;

        if (btnFinishedInspect) btnFinishedInspect.classList.add('hidden');
        btnPlay.classList.add('hidden');
        btnPause.classList.remove('hidden');
        canvasElement.parentElement.classList.add('sim-running');

        requestAnimationFrame(animLoop);
    }

    function pauseSimulation() {
        isPlaying = false;
        visualizer.isSimulating = false;
        btnPlay.classList.remove('hidden');
        btnPause.classList.add('hidden');
        canvasElement.parentElement.classList.remove('sim-running');
    }

    function stopSimulation() {
        pauseSimulation();
    }

    function resetSimulation() {
        stopSimulation();
        clearEditorHighlight();
        if (btnFinishedInspect) btnFinishedInspect.classList.add('hidden');
        if (currentViewMode === 'solid') {
            switchToView('iso');
        } else {
            visualizer.setOptions({ showFinishedOnly: false });
        }
        visualizer.currentSegmentIndex = -1;
        visualizer.currentProgress = 0;
        visualizer.particles = [];
        if (visualizer.segments && visualizer.segments.length > 0) {
            visualizer.toolPos = {
                x: visualizer.segments[0].start.x,
                y: visualizer.segments[0].start.y,
                z: visualizer.segments[0].start.z
            };
            if (liveTraceDesc) liveTraceDesc.textContent = 'Pisau frais siap di posisi awal aman.';
            if (liveTraceProgressBar) liveTraceProgressBar.style.width = '0%';
            if (liveTracePct) liveTracePct.textContent = '0%';
            updateHUD(visualizer.segments[0], visualizer.segments[0].lineNum, 0);
            highlightEditorLine(visualizer.segments[0].lineNum, false);
        } else {
            visualizer.toolPos = { x: 0, y: 0, z: 20 };
            if (liveTraceDesc) liveTraceDesc.textContent = 'Pisau frais siap di posisi awal aman.';
            if (liveTraceProgressBar) liveTraceProgressBar.style.width = '0%';
            if (liveTracePct) liveTracePct.textContent = '0%';
            updateHUD(null, 1, 0);
        }
        if (cadViewer) {
            cadViewer.setToolPos(visualizer.toolPos.x, visualizer.toolPos.y, visualizer.toolPos.z);
        }
        visualizer.render();
    }

    function stepSimulationForward() {
        stopSimulation();
        if (currentViewMode === 'solid') {
            switchToView('iso');
        }
        if (!visualizer.segments || visualizer.segments.length === 0) return;

        if (visualizer.currentSegmentIndex < 0) {
            visualizer.currentSegmentIndex = 0;
            const seg = visualizer.segments[0];
            visualizer.toolPos = { x: seg.end.x, y: seg.end.y, z: seg.end.z };
            visualizer.currentProgress = 1.0;
            updateHUD(seg, seg.lineNum, 1.0);
            highlightEditorLine(seg.lineNum, false);
            visualizer.simulateCutter(visualizer.toolPos);
            if (cadViewer) {
                cadViewer.simulateCutter(visualizer.toolPos);
            }
            updateDebugInspector(seg, visualizer.toolPos);
            visualizer.render();
            return;
        }

        if (visualizer.currentSegmentIndex < visualizer.segments.length - 1) {
            visualizer.currentSegmentIndex++;
            const seg = visualizer.segments[visualizer.currentSegmentIndex];
            visualizer.toolPos = { x: seg.end.x, y: seg.end.y, z: seg.end.z };
            visualizer.currentProgress = 1.0;
            updateHUD(seg, seg.lineNum, 1.0);
            highlightEditorLine(seg.lineNum, false);
            visualizer.simulateCutter(visualizer.toolPos);
            if (cadViewer) {
                cadViewer.simulateCutter(visualizer.toolPos);
            }
            updateDebugInspector(seg, visualizer.toolPos);
            visualizer.render();
        }
    }

    btnPlay.addEventListener('click', startSimulation);
    btnPause.addEventListener('click', pauseSimulation);
    btnReset.addEventListener('click', resetSimulation);
    btnStep.addEventListener('click', stepSimulationForward);

    if (btnDebugMode && debugInspectorPanel) {
        btnDebugMode.addEventListener('click', () => {
            const isHidden = debugInspectorPanel.classList.toggle('hidden');
            btnDebugMode.classList.toggle('active-mode', !isHidden);
            if (cadViewer && currentViewMode === 'solid') {
                cadViewer.setFinishedOnly(isHidden);
                if (toggleSolidPart) toggleSolidPart.checked = isHidden;
            }
            if (!isHidden) {
                updateDebugInspector();
            }
        });
    }

    if (btnCloseDebugPanel && debugInspectorPanel) {
        btnCloseDebugPanel.addEventListener('click', () => {
            debugInspectorPanel.classList.add('hidden');
            if (btnDebugMode) btnDebugMode.classList.remove('active-mode');
            if (cadViewer && currentViewMode === 'solid') {
                cadViewer.setFinishedOnly(true);
                if (toggleSolidPart) toggleSolidPart.checked = true;
            }
        });
    }
    btnFitView.addEventListener('click', () => {
        if (currentViewMode === 'solid') {
            if (cadViewer) cadViewer.fitView();
        } else {
            visualizer.fitView();
        }
    });

    speedSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        visualizer.playbackSpeed = val;
        speedLabel.textContent = val.toFixed(1) + 'x';
    });

    if (toggleGrid) toggleGrid.addEventListener('change', (e) => {
        visualizer.setOptions({ showGrid: e.target.checked });
        if (cadViewer) cadViewer.setGridVisible(e.target.checked);
    });
    if (toggleStock) toggleStock.addEventListener('change', (e) => visualizer.setOptions({ showStock: e.target.checked }));
    if (toggleVice) toggleVice.addEventListener('change', (e) => visualizer.setOptions({ showVice: e.target.checked }));
    if (toggleKerf) toggleKerf.addEventListener('change', (e) => visualizer.setOptions({ showKerf: e.target.checked }));
    if (toggleSolidPart) toggleSolidPart.addEventListener('change', (e) => {
        if (currentViewMode === 'solid') {
            if (cadViewer) cadViewer.setFinishedOnly(e.target.checked);
        } else {
            setSolidPartMode(e.target.checked);
        }
    });

    // WCS (Work Coordinate System) Configurations & Management
    const WCS_DESCRIPTIONS = {
        'bottom-left': '<strong class="text-[#111111]">Kiri-Bawah (Standar Sekolah):</strong> Titik (0, 0) berada di sudut kiri-depan. Semua pergerakan pemesinan pada sumbu X dan Y bernilai positif (+X, +Y).',
        'top-left': '<strong class="text-[#111111]">Kiri-Atas:</strong> Titik (0, 0) berada di sudut kiri-belakang. Sumbu X bernilai positif (+X) dan sumbu Y bergerak ke arah negatif (-Y).',
        'bottom-right': '<strong class="text-[#111111]">Kanan-Bawah:</strong> Titik (0, 0) berada di sudut kanan-depan. Sumbu X bergerak ke arah negatif (-X) dan sumbu Y bernilai positif (+Y).',
        'top-right': '<strong class="text-[#111111]">Kanan-Atas:</strong> Titik (0, 0) berada di sudut kanan-belakang. Semua pergerakan pemesinan berada di kuadran negatif (-X, -Y).',
        'center': '<strong class="text-[#111111]">Tengah Benda (Center Datum):</strong> Titik (0, 0) tepat di pusat simetri benda. Pergerakan pemesinan terbagi seimbang (-X/2 s.d. +X/2 dan -Y/2 s.d. +Y/2).'
    };

    const WCS_BADGE_LABELS = {
        'bottom-left': 'Kiri-Bawah (X0, Y0)',
        'top-left': 'Kiri-Atas (X0, Y0)',
        'bottom-right': 'Kanan-Bawah (X0, Y0)',
        'top-right': 'Kanan-Atas (X0, Y0)',
        'center': 'Tengah (X0, Y0)'
    };

    const WCS_QUICK_LABELS = {
        'bottom-left': 'G54: Kiri-Bawah',
        'top-left': 'G54: Kiri-Atas',
        'bottom-right': 'G54: Kanan-Bawah',
        'top-right': 'G54: Kanan-Atas',
        'center': 'G54: Tengah'
    };

    const WCS_MODES_ORDER = ['bottom-left', 'center', 'top-left', 'top-right', 'bottom-right'];
    let selectedWCSMode = visualizer.options.wcsMode || 'bottom-left';

    function updateWCSUI(mode) {
        selectedWCSMode = mode || 'bottom-left';

        // 1. Update modal buttons visual state
        if (wcsPointButtons && wcsPointButtons.length > 0) {
            wcsPointButtons.forEach(btn => {
                const isTarget = (btn.dataset.wcs === selectedWCSMode);
                const dot = btn.querySelector('.dot-indicator');
                if (isTarget) {
                    btn.classList.add('active-wcs', 'border-emerald-600', 'bg-emerald-50', 'text-emerald-900', 'shadow-sm');
                    btn.classList.remove('border-[#DCD5CA]', 'bg-white', 'text-[#333333]');
                    if (dot) {
                        dot.classList.add('bg-emerald-600', 'border-white', 'shadow-sm');
                        dot.classList.remove('border-[#444444]', 'bg-transparent');
                    }
                } else {
                    btn.classList.remove('active-wcs', 'border-emerald-600', 'bg-emerald-50', 'text-emerald-900', 'shadow-sm');
                    btn.classList.add('border-[#DCD5CA]', 'bg-white', 'text-[#333333]');
                    if (dot) {
                        dot.classList.remove('bg-emerald-600', 'border-white', 'shadow-sm');
                        dot.classList.add('border-[#444444]', 'bg-transparent');
                    }
                }
            });
        }

        // 2. Update badge & description in modal
        if (wcsActiveBadge) {
            wcsActiveBadge.textContent = WCS_BADGE_LABELS[selectedWCSMode] || selectedWCSMode;
        }
        if (wcsDescriptionText) {
            wcsDescriptionText.innerHTML = WCS_DESCRIPTIONS[selectedWCSMode] || '';
        }

        // 3. Update floating canvas quick button
        if (quickWCSLabel) {
            quickWCSLabel.textContent = WCS_QUICK_LABELS[selectedWCSMode] || ('G54: ' + selectedWCSMode);
        }
    }

    function applyWCSMode(mode) {
        updateWCSUI(mode);
        visualizer.setWCSMode(mode);
        if (cadViewer) {
            cadViewer.setWCSMode(mode);
        }
        processGCode();
        visualizer.fitView();
        if (cadViewer) {
            cadViewer.fitView();
        }
    }

    // Modal 5-point WCS button clicks
    if (wcsPointButtons && wcsPointButtons.length > 0) {
        wcsPointButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.wcs;
                if (mode) updateWCSUI(mode);
            });
        });
    }

    // Quick WCS toggle button on floating canvas controls
    if (btnQuickWCS) {
        btnQuickWCS.addEventListener('click', () => {
            const currentMode = visualizer.options.wcsMode || 'bottom-left';
            const currentIdx = WCS_MODES_ORDER.indexOf(currentMode);
            const nextIdx = (currentIdx + 1) % WCS_MODES_ORDER.length;
            const nextMode = WCS_MODES_ORDER[nextIdx];
            applyWCSMode(nextMode);
        });
    }

    // Initialize WCS UI state
    updateWCSUI(selectedWCSMode);

    // Modals
    if (btnStockSettings) {
        btnStockSettings.addEventListener('click', () => {
            if (stockXInput) stockXInput.value = visualizer.options.stockX;
            if (stockYInput) stockYInput.value = visualizer.options.stockY;
            if (stockZInput) stockZInput.value = visualizer.options.stockZ;
            if (toolDiameterInput) toolDiameterInput.value = visualizer.options.toolDiameter;
            updateWCSUI(visualizer.options.wcsMode || 'bottom-left');
            stockModal.classList.remove('hidden');
        });
    }

    if (btnSaveStock) {
        btnSaveStock.addEventListener('click', () => {
            const x = parseFloat(stockXInput.value) || 100;
            const y = parseFloat(stockYInput.value) || 80;
            const z = parseFloat(stockZInput.value) || 25;
            const toolD = parseFloat(toolDiameterInput.value) || 10;
            visualizer.setStock(x, y, z, toolD, selectedWCSMode);

            // Sync G-Code comment if present
            if (codeTextarea.value.match(/\((?:ENDMILL|CUTTER|TOOL|PISAU)?\s*[DØ]\d+(?:\.\d+)?\s*(?:MM)?\)/i)) {
                codeTextarea.value = codeTextarea.value.replace(/\((?:ENDMILL|CUTTER|TOOL|PISAU)?\s*[DØ]\d+(?:\.\d+)?\s*(?:MM)?\)/i, `(ENDMILL D${toolD})`);
                updateLineNumbers();
            }

            stockModal.classList.add('hidden');

            // Set stock dimensions on cadViewer FIRST, then reprocess (rebuild CSG pakai dimensi baru)
            if (cadViewer) {
                cadViewer.setStock(x, y, z, toolD, selectedWCSMode);
            }

            processGCode();
            visualizer.fitView();

            // Jika mode solid/iso aktif, cancel debounce & langsung rebuild segera
            if (cadViewer && (currentViewMode === 'solid' || currentViewMode === 'iso')) {
                if (_cadRebuildTimer) { clearTimeout(_cadRebuildTimer); _cadRebuildTimer = null; }
                cadViewer.updateFromData(currentParsedData, visualizer.options);
                cadViewer.fitView();
            }
            updateWCSUI(selectedWCSMode);
        });
    }

    if (btnCheatsheetModal) {
        btnCheatsheetModal.addEventListener('click', () => {
            cheatsheetModal.classList.remove('hidden');
        });
    }

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            stockModal.classList.add('hidden');
            cheatsheetModal.classList.add('hidden');
        });
    });

    btnExportCode.addEventListener('click', () => {
        const blob = new Blob([codeTextarea.value], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'program_cnc_milling.nc';
        a.click();
    });

    btnExportImage.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'simulasi_cnc_milling.png';
        const is3D = (currentViewMode === 'solid');
        if (is3D && cadViewer && cadViewer.renderer) {
            cadViewer.renderer.render(cadViewer.scene, cadViewer.camera);
            link.href = cadViewer.renderer.domElement.toDataURL('image/png');
        } else {
            link.href = canvasElement.toDataURL('image/png');
        }
        link.click();
    });

    window.millingApp = {
        visualizer,
        cadViewer,
        parser,
        validator,
        switchToView,
        setSolidPartMode,
        startSimulation,
        pauseSimulation,
        resetSimulation
    };

    loadManualProgram();
    updateLineNumbers();
    if (window.lucide) lucide.createIcons();

    // Populate Preset Programs Dropdown
    const presetProgramSelect = document.getElementById('presetProgramSelect');
    if (presetProgramSelect && window.CNC_PRESETS) {
        window.CNC_PRESETS.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.title;
            presetProgramSelect.appendChild(opt);
        });

        presetProgramSelect.addEventListener('change', (e) => {
            const pId = e.target.value;
            if (!pId) return;
            const found = window.CNC_PRESETS.find(p => p.id === pId);
            if (found) {
                if (isPlaying) stopSimulation();
                resetSimulation();
                codeTextarea.value = found.code.trim();
                if (found.stock) {
                    visualizer.setStock(found.stock.lengthX, found.stock.widthY, found.stock.heightZ, found.stock.toolDiameter);
                    if (cadViewer) cadViewer.setStock(found.stock.lengthX, found.stock.widthY, found.stock.heightZ, found.stock.toolDiameter);
                    if (stockXInput) stockXInput.value = found.stock.lengthX;
                    if (stockYInput) stockYInput.value = found.stock.widthY;
                    if (stockZInput) stockZInput.value = found.stock.heightZ;
                    if (toolDiameterInput) toolDiameterInput.value = found.stock.toolDiameter;
                    if (found.stock.wcsMode) {
                        applyWCSMode(found.stock.wcsMode);
                    }
                }
                updateLineNumbers();
                processGCode();
                visualizer.fitView();
                if (cadViewer) cadViewer.fitView();
            }
        });
    }

    // Support URL parameters for direct deep-linking or automated verification (?mode=3d&solid=true&preset=preset-10&debug=true)
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const presetId = urlParams.get('preset');
        if (presetId && window.CNC_PRESETS) {
            const found = window.CNC_PRESETS.find(p => p.id === presetId);
            if (found) {
                if (presetProgramSelect) presetProgramSelect.value = presetId;
                codeTextarea.value = found.code.trim();
                if (found.stock) {
                    visualizer.setStock(found.stock.lengthX, found.stock.widthY, found.stock.heightZ, found.stock.toolDiameter);
                    if (cadViewer) cadViewer.setStock(found.stock.lengthX, found.stock.widthY, found.stock.heightZ, found.stock.toolDiameter);
                    if (stockXInput) stockXInput.value = found.stock.lengthX;
                    if (stockYInput) stockYInput.value = found.stock.widthY;
                    if (stockZInput) stockZInput.value = found.stock.heightZ;
                    if (toolDiameterInput) toolDiameterInput.value = found.stock.toolDiameter;
                    if (found.stock.wcsMode) {
                        applyWCSMode(found.stock.wcsMode);
                    }
                }
                updateLineNumbers();
                processGCode();
            }
        }
        const paramToolD = urlParams.get('toolD');
        if (paramToolD) {
            const parsedD = parseFloat(paramToolD);
            if (!isNaN(parsedD) && parsedD > 0) {
                codeTextarea.value = codeTextarea.value.replace(/\((?:ENDMILL|CUTTER|TOOL|PISAU)?\s*[DØ]\d+(?:\.\d+)?\s*(?:MM)?\)/i, `(ENDMILL D${parsedD})`);
                visualizer.options.toolDiameter = parsedD;
                if (cadViewer) cadViewer.options.toolDiameter = parsedD;
                if (toolDiameterInput) toolDiameterInput.value = parsedD;
                processGCode();
            }
        }
        if (urlParams.get('mode') === '3d' || urlParams.get('mode') === 'iso') {
            switchToView('iso');
        }
        if (urlParams.get('solid') === 'true' || urlParams.get('mode') === 'solid') {
            switchToView('solid');
            if (urlParams.get('wireframe') === 'true') {
                if (cadViewer) cadViewer.setFinishedOnly(false);
                if (toggleSolidPart) toggleSolidPart.checked = false;
            }
        }
        if (urlParams.get('debug') === 'true') {
            if (btnDebugMode && debugInspectorPanel) {
                const isHidden = debugInspectorPanel.classList.toggle('hidden');
                btnDebugMode.classList.toggle('active-mode', !isHidden);
                if (cadViewer && currentViewMode === 'solid') {
                    cadViewer.setFinishedOnly(isHidden);
                    if (toggleSolidPart) toggleSolidPart.checked = isHidden;
                }
                if (!isHidden) updateDebugInspector();
            }
        }
        if (urlParams.get('play') === 'true') {
            setTimeout(() => startSimulation(), 200);
        }
    } catch (e) {
        console.warn('URL params skipped:', e);
    }
});
