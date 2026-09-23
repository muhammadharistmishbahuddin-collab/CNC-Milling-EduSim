/**
 * CNC Milling 2D & 3D Isometric Canvas Visualizer & Simulator
 * Author: Antigravity AI / Muhammad Harist Mishbahuddin
 * Standard: ISO / Fanuc 3-Axis Milling Format (XYZ Plane)
 */

class MillingVisualizer {
    constructor(canvasElement, options) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        
        this.options = Object.assign({
            viewMode: '2d', // '2d' (Tampak Atas XY) or 'iso' (Isometrik 3D)
            showGrid: true,
            showStock: true,
            showTool: true,
            showKerf: true,
            showArrows: true,
            showInspector: true,
            showVice: true,
            showFinishedOnly: false, // Mode Wujud Benda Jadi (sembunyikan garis lintasan pemandu)
            stockX: 100,
            stockY: 80,
            stockZ: 25,
            toolDiameter: 10,
            wcsMode: 'bottom-left' // 'bottom-left', 'top-left', 'bottom-right', 'top-right', 'center'
        }, options || {});

        this.scale = 4.5;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

        // 3D Orbital Camera Parameters
        this.defaultRotZ = Math.PI / 4; // 45°
        this.defaultRotX = 35.264 * (Math.PI / 180); // ~0.61548 rad (~35.26° true isometric)
        this.rotZ = this.defaultRotZ;
        this.rotX = this.defaultRotX;
        this.isRightDragging = false;
        this.lastClientX = 0;
        this.lastClientY = 0;

        this.parsedData = null;
        this.segments = [];
        this.currentSegmentIndex = -1;
        this.currentProgress = 0;
        this.toolPos = { x: 0, y: 0, z: 20 };
        this.isSimulating = false;
        this.playbackSpeed = 1.0;
        this.spindleAngle = 0;

        this.mousePos = { canvasX: 0, canvasY: 0, worldX: 0, worldY: 0 };
        this.isMouseInside = false;
        this.particles = [];

        this.width = (this.canvas && this.canvas.parentElement ? this.canvas.parentElement.clientWidth : 0) || (this.canvas ? this.canvas.width : 0) || 600;
        this.height = (this.canvas && this.canvas.parentElement ? this.canvas.parentElement.clientHeight : 0) || (this.canvas ? this.canvas.height : 0) || 400;

        this.initEvents();
        this.resize();
        setTimeout(() => this.resize(), 50);
    }

    initEvents() {
        window.addEventListener('resize', () => this.resize());

        this.canvas.addEventListener('contextmenu', (e) => {
            if (this.options.viewMode === 'iso') {
                e.preventDefault(); // Prevent context menu to allow right-click pan in 3D
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.isRightDragging = (e.button === 2) || e.shiftKey;
            this.lastClientX = e.clientX;
            this.lastClientY = e.clientY;
            this.dragStartX = e.clientX - this.offsetX;
            this.dragStartY = e.clientY - this.offsetY;

            if (this.options.viewMode === 'iso') {
                this.canvas.style.cursor = this.isRightDragging ? 'move' : 'grabbing';
            } else {
                this.canvas.style.cursor = 'move';
            }
        });

        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.canvasX = e.clientX - rect.left;
            this.mousePos.canvasY = e.clientY - rect.top;
            
            if (this.options.viewMode === '2d') {
                const world = this.screenToWorld2D(this.mousePos.canvasX, this.mousePos.canvasY);
                this.mousePos.worldX = world.x;
                this.mousePos.worldY = world.y;
            }

            if (this.isDragging) {
                const deltaX = e.clientX - this.lastClientX;
                const deltaY = e.clientY - this.lastClientY;
                this.lastClientX = e.clientX;
                this.lastClientY = e.clientY;

                if (this.options.viewMode === 'iso' && !this.isRightDragging) {
                    // ROTASI 3D (Turntable Orbit)
                    this.rotZ += deltaX * 0.009;
                    if (this.rotZ > Math.PI * 2) this.rotZ -= Math.PI * 2;
                    if (this.rotZ < 0) this.rotZ += Math.PI * 2;

                    // Kemiringan elevasi (clamped antara ~5° dan ~86°)
                    this.rotX = Math.max(0.08, Math.min(1.50, this.rotX + deltaY * 0.008));
                    this.render();
                } else {
                    // PAN (Geser Canvas)
                    this.offsetX += deltaX;
                    this.offsetY += deltaY;
                    this.render();
                }
            } else if (this.isMouseInside) {
                this.render();
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.isRightDragging = false;
            this.updateCursorStyle();
        });

        this.canvas.addEventListener('mouseenter', () => {
            this.isMouseInside = true;
            this.updateCursorStyle();
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isMouseInside = false;
            this.render();
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
            const newScale = Math.max(1.2, Math.min(35.0, this.scale * zoomFactor));

            this.offsetX = mouseX - (mouseX - this.offsetX) * (newScale / this.scale);
            this.offsetY = mouseY - (mouseY - this.offsetY) * (newScale / this.scale);
            this.scale = newScale;

            this.render();
        }, { passive: false });

        // Touch support
        let lastTouchX = 0;
        let lastTouchY = 0;
        let lastTouchDist = 0;

        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
                this.dragStartX = e.touches[0].clientX - this.offsetX;
                this.dragStartY = e.touches[0].clientY - this.offsetY;
            } else if (e.touches.length === 2) {
                this.isDragging = false;
                lastTouchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && this.isDragging) {
                const deltaX = e.touches[0].clientX - lastTouchX;
                const deltaY = e.touches[0].clientY - lastTouchY;
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;

                if (this.options.viewMode === 'iso') {
                    this.rotZ += deltaX * 0.009;
                    if (this.rotZ > Math.PI * 2) this.rotZ -= Math.PI * 2;
                    if (this.rotZ < 0) this.rotZ += Math.PI * 2;
                    this.rotX = Math.max(0.08, Math.min(1.50, this.rotX + deltaY * 0.008));
                    this.render();
                } else {
                    this.offsetX += deltaX;
                    this.offsetY += deltaY;
                    this.render();
                }
            } else if (e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                if (lastTouchDist > 0) {
                    const factor = dist / lastTouchDist;
                    this.scale = Math.max(1.2, Math.min(35.0, this.scale * factor));
                    this.render();
                }
                lastTouchDist = dist;
            }
        }, { passive: true });

        this.canvas.addEventListener('touchend', () => {
            this.isDragging = false;
            lastTouchDist = 0;
            this.updateCursorStyle();
        });
    }

    updateCursorStyle() {
        if (this.options.viewMode === 'iso') {
            this.canvas.style.cursor = 'grab';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    resize() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        const rect = parent ? parent.getBoundingClientRect() : null;
        const dpr = window.devicePixelRatio || 1;
        this.width = (rect && rect.width > 0) ? rect.width : (this.width || 600);
        this.height = (rect && rect.height > 0) ? rect.height : (this.height || 400);

        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';

        this.ctx.resetTransform();
        this.ctx.scale(dpr, dpr);

        if (!this.hasInitializedView) {
            this.fitView();
            this.hasInitializedView = true;
        } else {
            this.render();
        }
    }

    // 2D Coordinates Projection (Top-down view: X right, Y up)
    worldToScreen2D(x, y) {
        return {
            x: this.offsetX + x * this.scale,
            y: this.offsetY - y * this.scale
        };
    }

    screenToWorld2D(sX, sY) {
        return {
            x: (sX - this.offsetX) / this.scale,
            y: (this.offsetY - sY) / this.scale
        };
    }

    // Orbitable 3D Projection (Azimuth rotZ, Tilt rotX, Centered at Stock Top-Center)
    worldToScreenIso(x, y, z = 0) {
        const bounds = this.getStockBounds();
        
        // Offset relative to workpiece top-center (bounds.centerX, bounds.centerY, 0)
        const dx = x - bounds.centerX;
        const dy = y - bounds.centerY;
        const dz = z;

        // 1. Azimuth yaw rotation around vertical Z axis
        const cosZ = Math.cos(this.rotZ);
        const sinZ = Math.sin(this.rotZ);
        const x1 = dx * cosZ - dy * sinZ;
        const y1 = dx * sinZ + dy * cosZ;
        const z1 = dz;

        // 2. Pitch / elevation tilt rotation
        const cosX = Math.cos(this.rotX);
        const sinX = Math.sin(this.rotX);
        
        // 3. Screen coordinates (1.22474 ≈ sqrt(3/2) normalizes isometric scale)
        const isoX = x1 * 1.22474;
        const isoY = (y1 * sinX - z1 * cosX) * 1.22474;

        return {
            x: this.offsetX + isoX * this.scale,
            y: this.offsetY + isoY * this.scale
        };
    }

    worldToScreen(x, y, z = 0) {
        if (this.options.viewMode === 'iso') {
            return this.worldToScreenIso(x, y, z);
        }
        return this.worldToScreen2D(x, y);
    }

    getStockBounds() {
        const sX = this.options.stockX;
        const sY = this.options.stockY;
        const mode = this.options.wcsMode || 'bottom-left';
        let minX = 0, minY = 0;
        if (mode === 'top-left') {
            minX = 0;
            minY = -sY;
        } else if (mode === 'bottom-right') {
            minX = -sX;
            minY = 0;
        } else if (mode === 'top-right') {
            minX = -sX;
            minY = -sY;
        } else if (mode === 'center') {
            minX = -sX / 2;
            minY = -sY / 2;
        } else { // 'bottom-left'
            minX = 0;
            minY = 0;
        }
        return {
            minX: minX,
            maxX: minX + sX,
            minY: minY,
            maxY: minY + sY,
            centerX: minX + sX / 2,
            centerY: minY + sY / 2
        };
    }

    getWCSLabel() {
        const mode = this.options.wcsMode || 'bottom-left';
        switch (mode) {
            case 'top-left': return 'Kiri-Atas (TL)';
            case 'bottom-right': return 'Kanan-Bawah (BR)';
            case 'top-right': return 'Kanan-Atas (TR)';
            case 'center': return 'Tengah (Center)';
            default: return 'Kiri-Bawah (BL)';
        }
    }

    fitView() {
        const sX = this.options.stockX || 100;
        const sY = this.options.stockY || 80;
        const sZ = this.options.stockZ || 25;
        const bounds = this.getStockBounds();

        const w = (this.width && isFinite(this.width) && this.width > 0) ? this.width : 600;
        const h = (this.height && isFinite(this.height) && this.height > 0) ? this.height : 400;
        this.width = w;
        this.height = h;

        if (this.options.viewMode === 'iso') {
            const margin = 40;
            const maxR = Math.hypot(sX, sY, sZ) || 100;
            const totalWidth = maxR * 1.1 + margin * 2;
            const totalHeight = maxR * 0.9 + margin * 2;

            const scaleW = (this.width * 0.75) / (totalWidth || 1);
            const scaleH = (this.height * 0.70) / (totalHeight || 1);
            this.scale = Math.max(1.8, Math.min(scaleW, scaleH));
            if (!isFinite(this.scale) || this.scale <= 0) this.scale = 4.5;

            this.offsetX = this.width * 0.50;
            this.offsetY = this.height * 0.52;

            // Offset to center the stock in 3D projection
            const pCenter = this.worldToScreenIso(bounds.centerX, bounds.centerY, -sZ / 2);
            if (isFinite(pCenter.x) && isFinite(pCenter.y)) {
                this.offsetX += (this.width * 0.50) - pCenter.x;
                this.offsetY += (this.height * 0.52) - pCenter.y;
            }
        } else {
            // 2D Top View
            const margin = 35;
            const minWorldX = Math.min(0, bounds.minX);
            const maxWorldX = Math.max(0, bounds.maxX);
            const minWorldY = Math.min(0, bounds.minY);
            const maxWorldY = Math.max(0, bounds.maxY);

            const totalX = (maxWorldX - minWorldX) + margin * 2;
            const totalY = (maxWorldY - minWorldY) + margin * 2;

            const scaleX = (this.width * 0.72) / (totalX || 1);
            const scaleY = (this.height * 0.70) / (totalY || 1);
            this.scale = Math.max(2.0, Math.min(scaleX, scaleY));
            if (!isFinite(this.scale) || this.scale <= 0) this.scale = 4.5;

            const centerWorldX = (minWorldX + maxWorldX) / 2;
            const centerWorldY = (minWorldY + maxWorldY) / 2;

            this.offsetX = (this.width * 0.50) - (centerWorldX * this.scale);
            this.offsetY = (this.height * 0.52) + (centerWorldY * this.scale);
        }

        if (!isFinite(this.offsetX)) this.offsetX = this.width / 2;
        if (!isFinite(this.offsetY)) this.offsetY = this.height / 2;

        this.render();
    }

    reset3DView() {
        this.rotZ = this.defaultRotZ;
        this.rotX = this.defaultRotX;
        this.fitView();
    }

    setViewMode(mode) {
        this.options.viewMode = mode;
        this.updateCursorStyle();
        this.fitView();
    }

    setData(parsedData) {
        this.parsedData = parsedData;
        this.segments = parsedData.segments || [];
        this.currentSegmentIndex = -1;
        this.currentProgress = 0;
        this.particles = [];

        if (this.segments.length > 0) {
            this.toolPos = {
                x: this.segments[0].start.x,
                y: this.segments[0].start.y,
                z: this.segments[0].start.z
            };
        } else {
            this.toolPos = { x: 0, y: 0, z: 20 };
        }

        this.render();
    }

    render2DToolpath(parsedToolpath) {
        if (parsedToolpath) {
            this.segments = Array.isArray(parsedToolpath) ? parsedToolpath : (parsedToolpath.parsedToolpath || parsedToolpath.segments || []);
        }
        this.render();
    }

    simulateCutter(toolPos) {
        if (toolPos) {
            this.toolPos = { x: toolPos.x, y: toolPos.y, z: toolPos.z };
            this.render();
        }
    }

    setStock(x, y, z, toolD, wcsMode) {
        this.options.stockX = x;
        this.options.stockY = y;
        this.options.stockZ = z;
        if (toolD) this.options.toolDiameter = toolD;
        if (wcsMode) this.options.wcsMode = wcsMode;
        this.fitView();
        this.render();
    }

    setWCSMode(mode) {
        this.options.wcsMode = mode;
        this.fitView();
        this.render();
    }

    setOptions(newOpts) {
        Object.assign(this.options, newOpts);
        this.render();
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        if (this.options.viewMode === 'iso') {
            this.renderIsometricView(ctx);
        } else {
            this.render2DTopView(ctx);
        }

        this.drawParticles(ctx);

        if (this.options.showTool && !this.options.showFinishedOnly) {
            this.drawTool(ctx);
        }

        if (this.options.showInspector && this.isMouseInside && this.options.viewMode === '2d') {
            this.drawCoordinateInspector2D(ctx);
        }

        this.drawAxesIndicator(ctx);
    }

    // ==========================================
    // 2D TOP VIEW RENDERING (BIDANG XY)
    // ==========================================
    render2DTopView(ctx) {
        this.drawGrid2D(ctx);
        if (this.options.showVice) {
            this.drawVice2D(ctx);
        }
        if (this.options.showStock) {
            this.drawStock2D(ctx);
        }
        if (this.options.showKerf) {
            this.drawToolKerf2D(ctx);
        }
        if (!this.options.showFinishedOnly) {
            this.drawPlannedToolpaths2D(ctx);
            this.drawExecutedToolpaths2D(ctx);
        }
        this.drawOriginMarker2D(ctx);
    }

    drawGrid2D(ctx) {
        if (!this.options.showGrid) return;

        ctx.save();
        ctx.lineWidth = 1;

        let step = 20; // 20mm standard grid tick matching reference design
        if (this.scale > 10) step = 10;
        else if (this.scale < 2.0) step = 40;

        const leftWorld = this.screenToWorld2D(0, this.height);
        const rightWorld = this.screenToWorld2D(this.width, 0);

        const startX = Math.floor(leftWorld.x / step) * step - step;
        const endX = Math.ceil(rightWorld.x / step) * step + step;
        const startY = Math.floor(leftWorld.y / step) * step - step;
        const endY = Math.ceil(rightWorld.y / step) * step + step;

        ctx.font = 'bold 9.5px Fira Code, monospace';
        ctx.fillStyle = '#64748B';

        // Vertical lines (constant X)
        for (let x = startX; x <= endX; x += step) {
            const p = this.worldToScreen2D(x, 0);
            ctx.beginPath();
            ctx.strokeStyle = (x === 0) ? 'rgba(239, 68, 68, 0.45)' : 'rgba(30, 58, 95, 0.4)';
            ctx.lineWidth = (x === 0) ? 1.5 : 0.8;
            ctx.moveTo(p.x, 0);
            ctx.lineTo(p.x, this.height);
            ctx.stroke();

            if (p.x > 35 && p.x < this.width - 45) {
                ctx.fillText('X' + x, p.x - 12, this.height - 8);
            }
        }

        // Horizontal lines (constant Y)
        for (let y = startY; y <= endY; y += step) {
            const p = this.worldToScreen2D(0, y);
            ctx.beginPath();
            ctx.strokeStyle = (y === 0) ? 'rgba(16, 185, 129, 0.45)' : 'rgba(30, 58, 95, 0.4)';
            ctx.lineWidth = (y === 0) ? 1.5 : 0.8;
            ctx.moveTo(0, p.y);
            ctx.lineTo(this.width, p.y);
            ctx.stroke();

            if (p.y > 18 && p.y < this.height - 25) {
                ctx.fillText('Y' + y, 8, p.y + 3.5);
            }
        }

        ctx.restore();
    }

    drawVice2D(ctx) {
        ctx.save();
        const bounds = this.getStockBounds();

        // Draw machine vice jaws clamping the Y sides of the stock
        const jawThickness = 12;
        const jawOverhang = 18;

        const pJawTop = this.worldToScreen2D(bounds.minX - jawOverhang, bounds.maxY + jawThickness);
        const pJawTopEnd = this.worldToScreen2D(bounds.maxX + jawOverhang, bounds.maxY);

        const pJawBot = this.worldToScreen2D(bounds.minX - jawOverhang, bounds.minY);
        const pJawBotEnd = this.worldToScreen2D(bounds.maxX + jawOverhang, bounds.minY - jawThickness);

        // Fixed Jaw (Top)
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.fillRect(pJawTop.x, pJawTop.y, Math.abs(pJawTopEnd.x - pJawTop.x), Math.abs(pJawTopEnd.y - pJawTop.y));
        ctx.strokeRect(pJawTop.x, pJawTop.y, Math.abs(pJawTopEnd.x - pJawTop.x), Math.abs(pJawTopEnd.y - pJawTop.y));

        // Movable Jaw (Bottom)
        ctx.fillRect(pJawBot.x, pJawBot.y, Math.abs(pJawBotEnd.x - pJawBot.x), Math.abs(pJawBotEnd.y - pJawBot.y));
        ctx.strokeRect(pJawBot.x, pJawBot.y, Math.abs(pJawBotEnd.x - pJawBot.x), Math.abs(pJawBotEnd.y - pJawBot.y));

        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('RAHANG RAGUM (VISE JAW)', pJawTop.x + 8, pJawTop.y + 12);

        ctx.restore();
    }

    drawStock2D(ctx) {
        ctx.save();
        const sX = this.options.stockX;
        const sY = this.options.stockY;
        const bounds = this.getStockBounds();
        const p0 = this.worldToScreen2D(bounds.minX, bounds.maxY);
        const w = sX * this.scale;
        const h = sY * this.scale;

        if (!isFinite(p0.x) || !isFinite(p0.y) || !isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) {
            ctx.restore();
            return;
        }

        // Metallic Stock Body (Solid Steel/Alloy Billet)
        const grad = ctx.createLinearGradient(p0.x, p0.y, p0.x + w, p0.y + h);
        grad.addColorStop(0, '#2d3b4e');
        grad.addColorStop(0.35, '#243244');
        grad.addColorStop(0.7, '#1b2636');
        grad.addColorStop(1, '#151f2d');

        ctx.fillStyle = grad;
        ctx.fillRect(p0.x, p0.y, w, h);

        // Billet raw border
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(p0.x, p0.y, w, h);

        // Subtle brushed metal grain on unmachined stock
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.lineWidth = 1;
        const grainStep = 18;
        for (let gx = -h; gx < w + h; gx += grainStep) {
            ctx.beginPath();
            ctx.moveTo(p0.x + gx, p0.y);
            ctx.lineTo(p0.x + gx + h, p0.y + h);
            ctx.stroke();
        }

        // Dimensions label with WCS indicator
        ctx.font = 'bold 9.5px Fira Code, monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
        ctx.fillText(`RAW STOCK: ${sX} x ${sY} x ${this.options.stockZ} mm | WCS: ${this.getWCSLabel()}`, p0.x + 8, p0.y + 15);

        ctx.restore();
    }

    drawToolKerf2D(ctx) {
        if (!this.segments || this.segments.length === 0) return;
        if (this.currentSegmentIndex < 0 && !this.options.showFinishedOnly) return;

        ctx.save();
        const toolRadius = (this.options.toolDiameter / 2) * this.scale;
        const maxIdx = this.options.showFinishedOnly ? (this.segments.length - 1) : Math.min(this.currentSegmentIndex, this.segments.length - 1);

        const traceSegment = (seg, isCurrent) => {
            ctx.beginPath();
            if (isCurrent) {
                if (seg.points && seg.points.length > 2) {
                    const ptCount = Math.floor(this.currentProgress * (seg.points.length - 1));
                    const pStart = this.worldToScreen2D(seg.points[0].x, seg.points[0].y);
                    ctx.moveTo(pStart.x, pStart.y);
                    for (let i = 1; i <= ptCount; i++) {
                        const pt = this.worldToScreen2D(seg.points[i].x, seg.points[i].y);
                        ctx.lineTo(pt.x, pt.y);
                    }
                    const curP = this.worldToScreen2D(this.toolPos.x, this.toolPos.y);
                    ctx.lineTo(curP.x, curP.y);
                } else {
                    const startX = seg.start ? seg.start.x : (seg.points ? seg.points[0].x : this.toolPos.x);
                    const startY = seg.start ? seg.start.y : (seg.points ? seg.points[0].y : this.toolPos.y);
                    const p1 = this.worldToScreen2D(startX, startY);
                    const curP = this.worldToScreen2D(this.toolPos.x, this.toolPos.y);
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(curP.x, curP.y);
                }
            } else {
                if (seg.points && seg.points.length > 0) {
                    const pStart = this.worldToScreen2D(seg.points[0].x, seg.points[0].y);
                    ctx.moveTo(pStart.x, pStart.y);
                    for (let i = 1; i < seg.points.length; i++) {
                        const pt = this.worldToScreen2D(seg.points[i].x, seg.points[i].y);
                        ctx.lineTo(pt.x, pt.y);
                    }
                } else {
                    const p1 = this.worldToScreen2D(seg.start.x, seg.start.y);
                    const p2 = this.worldToScreen2D(seg.end.x, seg.end.y);
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                }
            }
        };

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // PASS 1: KEDALAMAN DINDING PARIT / TRENCH CAVITY SHADOW (Layer Paling Bawah)
        ctx.lineWidth = toolRadius * 2 + 2;
        ctx.strokeStyle = '#050913'; // Warna parit paling dalam / bayangan drop dinding sayatan
        for (let idx = 0; idx <= maxIdx; idx++) {
            const seg = this.segments[idx];
            if (seg.type === 'G00' || seg.isHole) continue;
            traceSegment(seg, idx === this.currentSegmentIndex && this.currentSegmentIndex < this.segments.length);
            ctx.stroke();
        }

        // PASS 2: DASAR SAYATAN LOGAM / CARVED POCKET BOTTOM (Warna dasar logam yang terpotong)
        ctx.lineWidth = toolRadius * 2;
        ctx.strokeStyle = '#0f172a'; // Dasar pemakanan gelap solid
        for (let idx = 0; idx <= maxIdx; idx++) {
            const seg = this.segments[idx];
            if (seg.type === 'G00' || seg.isHole) continue;
            traceSegment(seg, idx === this.currentSegmentIndex && this.currentSegmentIndex < this.segments.length);
            ctx.stroke();
        }

        // PASS 3: KILAU SAYATAN PISAU FRAIS / MILLED SURFACE FINISH
        ctx.lineWidth = Math.max(1, toolRadius * 2 - 3);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.26)'; // Pola kilap pemesinan CNC
        for (let idx = 0; idx <= maxIdx; idx++) {
            const seg = this.segments[idx];
            if (seg.type === 'G00' || seg.isHole) continue;
            traceSegment(seg, idx === this.currentSegmentIndex && this.currentSegmentIndex < this.segments.length);
            ctx.stroke();
        }

        // PASS 4: GARIS TEPI KONTUR TAJAM / MILLED BEVEL EDGE
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)'; // Garis presisi tepi pemakanan
        for (let idx = 0; idx <= maxIdx; idx++) {
            const seg = this.segments[idx];
            if (seg.type === 'G00' || seg.isHole) continue;
            traceSegment(seg, idx === this.currentSegmentIndex && this.currentSegmentIndex < this.segments.length);
            ctx.stroke();
        }

        // PASS 5: LUBANG HASIL SIKLUS PENGEBORAN (G81 / G83)
        for (let idx = 0; idx <= maxIdx; idx++) {
            const seg = this.segments[idx];
            if (!seg.isHole) continue;
            const isCurrent = (idx === this.currentSegmentIndex && this.currentSegmentIndex < this.segments.length);
            if (!isCurrent || this.currentProgress > 0.2) {
                const p = this.worldToScreen2D(seg.end.x, seg.end.y);

                // Ring Chamfer / Bibir lubang
                ctx.beginPath();
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.8;
                ctx.arc(p.x, p.y, toolRadius + 1.2, 0, Math.PI * 2);
                ctx.stroke();

                // Dinding dalam silinder bor (hitam pekat)
                ctx.beginPath();
                ctx.fillStyle = '#050812';
                ctx.arc(p.x, p.y, toolRadius, 0, Math.PI * 2);
                ctx.fill();

                // Lingkaran tirus kerucut mata bor
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
                ctx.lineWidth = 1.2;
                ctx.arc(p.x, p.y, toolRadius * 0.55, 0, Math.PI * 2);
                ctx.stroke();

                // Senter penitik (Center punch mark)
                ctx.beginPath();
                ctx.fillStyle = '#ffd700';
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();

                if (this.options.showFinishedOnly) {
                    ctx.font = 'bold 8.5px Fira Code, monospace';
                    ctx.fillStyle = '#c084fc';
                    ctx.textAlign = 'center';
                    ctx.fillText(`Ø${this.options.toolDiameter}`, p.x, p.y + toolRadius + 10);
                }
            }
        }

        // PASS 6: ANOTASI HASIL JADI (Bila mode "Hanya Benda Jadi" aktif)
        if (this.options.showFinishedOnly && this.segments.length > 0) {
            const bounds = this.getStockBounds();
            const pLabel = this.worldToScreen2D(bounds.centerX, bounds.maxY);

            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#34d399';
            ctx.fillText('✨ WUJUD BENDA KERJA JADI HASIL PEMESINAN FRAIS', pLabel.x, pLabel.y - 12);
        }

        ctx.restore();
    }

    drawPlannedToolpaths2D(ctx) {
        if (!this.segments || this.segments.length === 0) return;

        ctx.save();
        this.segments.forEach((seg) => {
            ctx.lineWidth = 1.8;

            if (seg.type === 'G00') {
                ctx.strokeStyle = '#ef4444'; // Red
                ctx.setLineDash([5, 4]);
            } else if (seg.type === 'G01') {
                ctx.strokeStyle = '#10b981'; // Green
                ctx.setLineDash([]);
            } else if (seg.type === 'G02') {
                ctx.strokeStyle = '#0ea5e9'; // Cyan CW
                ctx.setLineDash([]);
            } else if (seg.type === 'G03') {
                ctx.strokeStyle = '#f97316'; // Orange CCW
                ctx.setLineDash([]);
            } else if (seg.isHole) {
                ctx.strokeStyle = '#a855f7'; // Purple
                ctx.setLineDash([3, 2]);
            }

            if (seg.points && seg.points.length > 0) {
                ctx.beginPath();
                const pStart = this.worldToScreen2D(seg.points[0].x, seg.points[0].y);
                ctx.moveTo(pStart.x, pStart.y);
                for (let i = 1; i < seg.points.length; i++) {
                    const pt = this.worldToScreen2D(seg.points[i].x, seg.points[i].y);
                    ctx.lineTo(pt.x, pt.y);
                }
                ctx.stroke();
            } else {
                const p1 = this.worldToScreen2D(seg.start.x, seg.start.y);
                const p2 = this.worldToScreen2D(seg.end.x, seg.end.y);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }

            // Direction arrow
            if (this.options.showArrows && seg.distance > 8 && !seg.isHole) {
                const midX = (seg.start.x + seg.end.x) / 2;
                const midY = (seg.start.y + seg.end.y) / 2;
                const angle = Math.atan2(-(seg.end.y - seg.start.y), (seg.end.x - seg.start.x));
                this.drawArrowHead(ctx, midX, midY, angle, seg.type === 'G00' ? '#ef4444' : '#10b981');
            }
        });

        ctx.setLineDash([]);
        ctx.restore();
    }

    drawExecutedToolpaths2D(ctx) {
        if (!this.segments || this.currentSegmentIndex < 0) return;

        ctx.save();
        ctx.lineWidth = 2.8;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 6;

        const maxIdx = Math.min(this.currentSegmentIndex, this.segments.length - 1);
        for (let i = 0; i <= maxIdx; i++) {
            const seg = this.segments[i];
            if (seg.type === 'G00') continue; // Don't highlight rapid executed

            ctx.strokeStyle = '#34d399';
            const isCurrent = (i === this.currentSegmentIndex && this.currentSegmentIndex < this.segments.length);

            if (!isCurrent) {
                // Completed segment
                if (seg.points && seg.points.length > 0) {
                    ctx.beginPath();
                    const pStart = this.worldToScreen2D(seg.points[0].x, seg.points[0].y);
                    ctx.moveTo(pStart.x, pStart.y);
                    for (let j = 1; j < seg.points.length; j++) {
                        const pt = this.worldToScreen2D(seg.points[j].x, seg.points[j].y);
                        ctx.lineTo(pt.x, pt.y);
                    }
                    ctx.stroke();
                } else {
                    const p1 = this.worldToScreen2D(seg.start.x, seg.start.y);
                    const p2 = this.worldToScreen2D(seg.end.x, seg.end.y);
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            } else {
                // Current segment in progress
                const curPos = this.toolPos;
                ctx.beginPath();
                if (seg.points && seg.points.length > 2) {
                    const pStart = this.worldToScreen2D(seg.points[0].x, seg.points[0].y);
                    ctx.moveTo(pStart.x, pStart.y);
                    const totalSegments = seg.points.length - 1;
                    const ptCount = Math.floor(this.currentProgress * totalSegments);
                    for (let j = 1; j <= ptCount; j++) {
                        const pt = this.worldToScreen2D(seg.points[j].x, seg.points[j].y);
                        ctx.lineTo(pt.x, pt.y);
                    }
                    const pCur = this.worldToScreen2D(curPos.x, curPos.y);
                    ctx.lineTo(pCur.x, pCur.y);
                } else {
                    const startX = seg.start ? seg.start.x : (seg.points ? seg.points[0].x : curPos.x);
                    const startY = seg.start ? seg.start.y : (seg.points ? seg.points[0].y : curPos.y);
                    const p1 = this.worldToScreen2D(startX, startY);
                    const p2 = this.worldToScreen2D(curPos.x, curPos.y);
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                }
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    drawOriginMarker2D(ctx) {
        ctx.save();
        const p0 = this.worldToScreen2D(0, 0);

        // Origin Crosshair
        ctx.lineWidth = 2;
        
        // X-Axis Red Arrow
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p0.x + 28, p0.y);
        ctx.stroke();

        // Y-Axis Green Arrow
        ctx.strokeStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p0.x, p0.y - 28);
        ctx.stroke();

        // Origin Dot
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(p0.x, p0.y, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 9px Fira Code, monospace';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`WCS G54 (0,0) [${this.getWCSLabel()}]`, p0.x + 8, p0.y + 14);

        ctx.restore();
    }

    drawArrowHead(ctx, worldX, worldY, angleRad, color) {
        const p = this.worldToScreen2D(worldX, worldY);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angleRad);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-7, -4);
        ctx.lineTo(-7, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // ==========================================
    // 3D ISOMETRIC VIEW RENDERING & SOLID CAD ENGINE
    // ==========================================
    renderIsometricView(ctx) {
        if (this.options.showFinishedOnly) {
            this.drawSolidCADModel3D(ctx);
            this.drawOriginMarker3DIso(ctx);
            return;
        }

        this.drawStock3DIso(ctx);
        if (this.options.showKerf) {
            this.drawToolKerf3DIso(ctx);
        }
        this.drawPlannedToolpaths3DIso(ctx);
        this.drawExecutedToolpaths3DIso(ctx);
        this.drawOriginMarker3DIso(ctx);
    }

    // ==========================================
    // 3D SOLID CAD WORKPIECE ENGINE (SHADED WITH EDGES)
    // ==========================================
    drawSolidCADModel3D(ctx) {
        ctx.save();
        const sX = this.options.stockX;
        const sY = this.options.stockY;
        const sZ = this.options.stockZ;
        const toolRadius = (this.options.toolDiameter / 2);

        // Directional Light Vector in World Space (Upper-Front-Left CAD Studio Light)
        const lx = -0.38, ly = -0.48, lz = 0.79;

        // Helper to calculate CAD metallic shade color from 3D surface normal
        const getCADShade = (nx, ny, nz, baseR = 195, baseG = 200, baseB = 208) => {
            const dot = nx * lx + ny * ly + nz * lz;
            const factor = 0.40 + 0.60 * Math.max(0, dot);
            const r = Math.round(baseR * factor);
            const g = Math.round(baseG * factor);
            const b = Math.round(baseB * factor);
            return `rgb(${r}, ${g}, ${b})`;
        };

        // View vector from target towards camera in world coordinates
        const vx = Math.sin(this.rotZ) * Math.cos(this.rotX);
        const vy = -Math.cos(this.rotZ) * Math.cos(this.rotX);
        const vz = Math.sin(this.rotX);

        // 1. RENDER SOLID STOCK BILLET FACES (SolidWorks "Shaded with Edges" style)
        const bounds = this.getStockBounds();
        const minX = bounds.minX;
        const maxX = bounds.maxX;
        const minY = bounds.minY;
        const maxY = bounds.maxY;

        const stockFaces = [
            {
                name: 'front',
                normal: [0, -1, 0],
                pts: [[minX, minY, 0], [maxX, minY, 0], [maxX, minY, -sZ], [minX, minY, -sZ]],
                isTop: false
            },
            {
                name: 'right',
                normal: [1, 0, 0],
                pts: [[maxX, minY, 0], [maxX, maxY, 0], [maxX, maxY, -sZ], [maxX, minY, -sZ]],
                isTop: false
            },
            {
                name: 'back',
                normal: [0, 1, 0],
                pts: [[maxX, maxY, 0], [minX, maxY, 0], [minX, maxY, -sZ], [maxX, maxY, -sZ]],
                isTop: false
            },
            {
                name: 'left',
                normal: [-1, 0, 0],
                pts: [[minX, maxY, 0], [minX, minY, 0], [minX, minY, -sZ], [minX, maxY, -sZ]],
                isTop: false
            },
            {
                name: 'bottom',
                normal: [0, 0, -1],
                pts: [[minX, minY, -sZ], [maxX, minY, -sZ], [maxX, maxY, -sZ], [minX, maxY, -sZ]],
                isTop: false
            },
            {
                name: 'top',
                normal: [0, 0, 1],
                pts: [[minX, minY, 0], [maxX, minY, 0], [maxX, maxY, 0], [minX, maxY, 0]],
                isTop: true
            }
        ];

        // Draw visible stock faces (Back-face culling)
        const visibleStock = stockFaces.filter(f => {
            const dot = f.normal[0] * vx + f.normal[1] * vy + f.normal[2] * vz;
            return dot > 0.001;
        });
        visibleStock.sort((a, b) => (a.isTop ? 1 : 0) - (b.isTop ? 1 : 0));

        visibleStock.forEach(f => {
            const screenPts = f.pts.map(p => this.worldToScreenIso(p[0], p[1], p[2]));
            ctx.beginPath();
            ctx.moveTo(screenPts[0].x, screenPts[0].y);
            for (let i = 1; i < screenPts.length; i++) {
                ctx.lineTo(screenPts[i].x, screenPts[i].y);
            }
            ctx.closePath();

            // CAD Metallic Face Fill
            ctx.fillStyle = getCADShade(f.normal[0], f.normal[1], f.normal[2]);
            ctx.fill();

            // Crisp CAD Edges (Black/Dark charcoal contour)
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.6;
            ctx.stroke();

            // Top surface subtle brushed grain
            if (f.isTop) {
                ctx.save();
                ctx.clip();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 1;
                const step = 15;
                for (let gx = minX - sY; gx < maxX + sY; gx += step) {
                    const pG1 = this.worldToScreenIso(gx, minY, 0);
                    const pG2 = this.worldToScreenIso(gx + sY, maxY, 0);
                    ctx.beginPath();
                    ctx.moveTo(pG1.x, pG1.y);
                    ctx.lineTo(pG2.x, pG2.y);
                    ctx.stroke();
                }
                ctx.restore();
            }
        });

        // 2. RENDER SOLID MACHINED POCKETS, FLOORS & VERTICAL WALLS
        if (this.segments && this.segments.length > 0) {
            const cutSegs = this.segments.filter(s => s.type !== 'G00' && !s.isHole && s.end.z <= 0);

            // Pass 2A: POCKET FLOORS (Dasar Sayatan Solid pada Z = zFloor)
            cutSegs.forEach(seg => {
                const zFloor = seg.end.z;
                const pts = (seg.points && seg.points.length > 0) ? seg.points : [seg.start, seg.end];

                for (let k = 0; k < pts.length - 1; k++) {
                    const pA = pts[k];
                    const pB = pts[k + 1];
                    const dx = pB.x - pA.x;
                    const dy = pB.y - pA.y;
                    const segLen = Math.hypot(dx, dy);
                    if (segLen < 0.001) continue;

                    const ux = dx / segLen;
                    const uy = dy / segLen;
                    const nx = -uy;
                    const ny = ux;

                    const pA_L = { x: pA.x + nx * toolRadius, y: pA.y + ny * toolRadius, z: zFloor };
                    const pA_R = { x: pA.x - nx * toolRadius, y: pA.y - ny * toolRadius, z: zFloor };
                    const pB_R = { x: pB.x - nx * toolRadius, y: pB.y - ny * toolRadius, z: zFloor };
                    const pB_L = { x: pB.x + nx * toolRadius, y: pB.y + ny * toolRadius, z: zFloor };

                    const sFloor = [pA_L, pB_L, pB_R, pA_R].map(p => this.worldToScreenIso(p.x, p.y, p.z));
                    ctx.beginPath();
                    ctx.moveTo(sFloor[0].x, sFloor[0].y);
                    for (let i = 1; i < sFloor.length; i++) ctx.lineTo(sFloor[i].x, sFloor[i].y);
                    ctx.closePath();

                    // Floor Shading: Cooler steel grey at cut depth
                    ctx.fillStyle = getCADShade(0, 0, 1, 168, 174, 184);
                    ctx.fill();

                    // Crisp CAD edge on floor boundary
                    ctx.strokeStyle = '#1e293b';
                    ctx.lineWidth = 1.0;
                    ctx.stroke();
                }

                // Corner disk endcaps at vertices to ensure watertight solid pocket floors
                pts.forEach(p => {
                    const numCornerPts = 14;
                    const cornerScreen = [];
                    for (let c = 0; c < numCornerPts; c++) {
                        const ang = (c / numCornerPts) * Math.PI * 2;
                        const cX = Math.max(minX, Math.min(maxX, p.x + toolRadius * Math.cos(ang)));
                        const cY = Math.max(minY, Math.min(maxY, p.y + toolRadius * Math.sin(ang)));
                        cornerScreen.push(this.worldToScreenIso(cX, cY, zFloor));
                    }
                    ctx.beginPath();
                    ctx.moveTo(cornerScreen[0].x, cornerScreen[0].y);
                    for (let c = 1; c < cornerScreen.length; c++) ctx.lineTo(cornerScreen[c].x, cornerScreen[c].y);
                    ctx.closePath();
                    ctx.fillStyle = getCADShade(0, 0, 1, 168, 174, 184);
                    ctx.fill();
                });
            });

            // Pass 2B: VERTICAL WALLS (Dinding Tegak Sayatan Solid dari zFloor ke Z=0)
            cutSegs.forEach(seg => {
                const zFloor = seg.end.z;
                const zTop = 0;
                const pts = (seg.points && seg.points.length > 0) ? seg.points : [seg.start, seg.end];

                for (let k = 0; k < pts.length - 1; k++) {
                    const pA = pts[k];
                    const pB = pts[k + 1];
                    const dx = pB.x - pA.x;
                    const dy = pB.y - pA.y;
                    const segLen = Math.hypot(dx, dy);
                    if (segLen < 0.001) continue;

                    const ux = dx / segLen;
                    const uy = dy / segLen;
                    const nx = -uy;
                    const ny = ux;

                    const pA_L = clampIsoPt(pA.x + nx * toolRadius, pA.y + ny * toolRadius, zFloor);
                    const pB_L = clampIsoPt(pB.x + nx * toolRadius, pB.y + ny * toolRadius, zFloor);
                    const pA_R = clampIsoPt(pA.x - nx * toolRadius, pA.y - ny * toolRadius, zFloor);
                    const pB_R = clampIsoPt(pB.x - nx * toolRadius, pB.y - ny * toolRadius, zFloor);

                    // Left Wall (Facing into pocket)
                    const pA_L_floor = this.worldToScreenIso(pA_L.x, pA_L.y, zFloor);
                    const pB_L_floor = this.worldToScreenIso(pB_L.x, pB_L.y, zFloor);
                    const pB_L_top = this.worldToScreenIso(pB_L.x, pB_L.y, zTop);
                    const pA_L_top = this.worldToScreenIso(pA_L.x, pA_L.y, zTop);

                    // Normal pointing inward towards cut path
                    const normL = [-nx, -ny, 0];
                    const dotL = normL[0] * vx + normL[1] * vy;
                    if (dotL > -0.05) {
                        ctx.beginPath();
                        ctx.moveTo(pA_L_floor.x, pA_L_floor.y);
                        ctx.lineTo(pB_L_floor.x, pB_L_floor.y);
                        ctx.lineTo(pB_L_top.x, pB_L_top.y);
                        ctx.lineTo(pA_L_top.x, pA_L_top.y);
                        ctx.closePath();
                        ctx.fillStyle = getCADShade(normL[0], normL[1], 0, 155, 162, 172);
                        ctx.fill();
                        ctx.strokeStyle = '#0f172a';
                        ctx.lineWidth = 1.3;
                        ctx.stroke();
                    }

                    // Right Wall (Facing into pocket)
                    const pA_R_floor = this.worldToScreenIso(pA_R.x, pA_R.y, zFloor);
                    const pB_R_floor = this.worldToScreenIso(pB_R.x, pB_R.y, zFloor);
                    const pB_R_top = this.worldToScreenIso(pB_R.x, pB_R.y, zTop);
                    const pA_R_top = this.worldToScreenIso(pA_R.x, pA_R.y, zTop);

                    const normR = [nx, ny, 0];
                    const dotR = normR[0] * vx + normR[1] * vy;
                    if (dotR > -0.05) {
                        ctx.beginPath();
                        ctx.moveTo(pA_R_floor.x, pA_R_floor.y);
                        ctx.lineTo(pB_R_floor.x, pB_R_floor.y);
                        ctx.lineTo(pB_R_top.x, pB_R_top.y);
                        ctx.lineTo(pA_R_top.x, pA_R_top.y);
                        ctx.closePath();
                        ctx.fillStyle = getCADShade(normR[0], normR[1], 0, 155, 162, 172);
                        ctx.fill();
                        ctx.strokeStyle = '#0f172a';
                        ctx.lineWidth = 1.3;
                        ctx.stroke();
                    }
                }
            });

            // 3. RENDER 3D SOLID BORE CYLINDERS (G81, G83, or plunged holes)
            const holeSegs = this.segments.filter(s => s.isHole);
            holeSegs.forEach(hole => {
                const cx = hole.end.x;
                const cy = hole.end.y;
                const zTop = 0;
                const zBot = hole.end.z;
                const numFacets = 20;

                // Inner cylinder wall facets with curvature Lambert shading
                for (let i = 0; i < numFacets; i++) {
                    const a0 = (i / numFacets) * Math.PI * 2;
                    const a1 = ((i + 1) / numFacets) * Math.PI * 2;
                    const midA = (a0 + a1) / 2;

                    const inNx = -Math.cos(midA);
                    const inNy = -Math.sin(midA);
                    const dot = inNx * vx + inNy * vy;

                    if (dot > -0.1) {
                        const p0_top = this.worldToScreenIso(cx + toolRadius * Math.cos(a0), cy + toolRadius * Math.sin(a0), zTop);
                        const p1_top = this.worldToScreenIso(cx + toolRadius * Math.cos(a1), cy + toolRadius * Math.sin(a1), zTop);
                        const p1_bot = this.worldToScreenIso(cx + toolRadius * Math.cos(a1), cy + toolRadius * Math.sin(a1), zBot);
                        const p0_bot = this.worldToScreenIso(cx + toolRadius * Math.cos(a0), cy + toolRadius * Math.sin(a0), zBot);

                        ctx.beginPath();
                        ctx.moveTo(p0_top.x, p0_top.y);
                        ctx.lineTo(p1_top.x, p1_top.y);
                        ctx.lineTo(p1_bot.x, p1_bot.y);
                        ctx.lineTo(p0_bot.x, p0_bot.y);
                        ctx.closePath();

                        ctx.fillStyle = getCADShade(inNx, inNy, 0, 125, 133, 145);
                        ctx.fill();
                    }
                }

                // Drill tip cone at bottom
                const pCenterBot = this.worldToScreenIso(cx, cy, zBot - toolRadius * 0.35);
                for (let i = 0; i < numFacets; i++) {
                    const a0 = (i / numFacets) * Math.PI * 2;
                    const a1 = ((i + 1) / numFacets) * Math.PI * 2;
                    const p0_bot = this.worldToScreenIso(cx + toolRadius * Math.cos(a0), cy + toolRadius * Math.sin(a0), zBot);
                    const p1_bot = this.worldToScreenIso(cx + toolRadius * Math.cos(a1), cy + toolRadius * Math.sin(a1), zBot);

                    ctx.beginPath();
                    ctx.moveTo(p0_bot.x, p0_bot.y);
                    ctx.lineTo(p1_bot.x, p1_bot.y);
                    ctx.lineTo(pCenterBot.x, pCenterBot.y);
                    ctx.closePath();
                    ctx.fillStyle = '#334155';
                    ctx.fill();
                }

                // Crisp circular lip at surface
                const pCenterTop = this.worldToScreenIso(cx, cy, zTop);
                ctx.beginPath();
                if (ctx.ellipse) {
                    ctx.ellipse(pCenterTop.x, pCenterTop.y, toolRadius * this.scale * 1.22, Math.max(1, toolRadius * this.scale * 1.22 * Math.sin(this.rotX)), 0, 0, Math.PI * 2);
                } else {
                    ctx.arc(pCenterTop.x, pCenterTop.y, toolRadius * this.scale, 0, Math.PI * 2);
                }
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 1.6;
                ctx.stroke();
            });
        }

        // 4. CAD HUD ANNOTATION BANNER
        const pLabel = this.worldToScreenIso(sX / 2, sY / 2, 0);
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('✨ WUJUD BENDA JADI 3D SOLID CAD (SHADED WITH EDGES)', pLabel.x, pLabel.y - 30);

        ctx.restore();
    }

    drawStock3DIso(ctx) {
        ctx.save();
        const sX = this.options.stockX;
        const sY = this.options.stockY;
        const sZ = this.options.stockZ;

        // View vector from workpiece center towards camera
        const vx = Math.sin(this.rotZ) * Math.cos(this.rotX);
        const vy = -Math.cos(this.rotZ) * Math.cos(this.rotX);
        const vz = Math.sin(this.rotX);

        // 6 Faces of the raw stock workpiece box
        const bounds = this.getStockBounds();
        const minX = bounds.minX;
        const maxX = bounds.maxX;
        const minY = bounds.minY;
        const maxY = bounds.maxY;

        const faces = [
            {
                name: 'front',
                normal: [0, -1, 0],
                pts: [[minX, minY, 0], [maxX, minY, 0], [maxX, minY, -sZ], [minX, minY, -sZ]],
                fill: '#0f172a',
                stroke: '#334155',
                isTop: false
            },
            {
                name: 'right',
                normal: [1, 0, 0],
                pts: [[maxX, minY, 0], [maxX, maxY, 0], [maxX, maxY, -sZ], [maxX, minY, -sZ]],
                fill: '#1e293b',
                stroke: '#334155',
                isTop: false
            },
            {
                name: 'back',
                normal: [0, 1, 0],
                pts: [[maxX, maxY, 0], [minX, maxY, 0], [minX, maxY, -sZ], [maxX, maxY, -sZ]],
                fill: '#182234',
                stroke: '#334155',
                isTop: false
            },
            {
                name: 'left',
                normal: [-1, 0, 0],
                pts: [[minX, maxY, 0], [minX, minY, 0], [minX, minY, -sZ], [minX, maxY, -sZ]],
                fill: '#131c2a',
                stroke: '#334155',
                isTop: false
            },
            {
                name: 'bottom',
                normal: [0, 0, -1],
                pts: [[minX, minY, -sZ], [maxX, minY, -sZ], [maxX, maxY, -sZ], [minX, maxY, -sZ]],
                fill: '#090d16',
                stroke: '#1e293b',
                isTop: false
            },
            {
                name: 'top',
                normal: [0, 0, 1],
                pts: [[minX, minY, 0], [maxX, minY, 0], [maxX, maxY, 0], [minX, maxY, 0]],
                fill: '#243244',
                stroke: '#38bdf8',
                isTop: true
            }
        ];

        // Filter visible faces facing camera (dot > 0)
        const visibleFaces = faces.filter(f => {
            const dot = f.normal[0] * vx + f.normal[1] * vy + f.normal[2] * vz;
            return dot > 0.001;
        });

        // Sort so non-top faces are rendered before the top face
        visibleFaces.sort((a, b) => (a.isTop ? 1 : 0) - (b.isTop ? 1 : 0));

        visibleFaces.forEach(f => {
            const screenPts = f.pts.map(p => this.worldToScreenIso(p[0], p[1], p[2]));

            ctx.beginPath();
            ctx.moveTo(screenPts[0].x, screenPts[0].y);
            for (let i = 1; i < screenPts.length; i++) {
                ctx.lineTo(screenPts[i].x, screenPts[i].y);
            }
            ctx.closePath();

            if (f.isTop) {
                // Top Face (Z=0) with metallic brushed steel gradient
                if (isFinite(screenPts[0].x) && isFinite(screenPts[0].y) && isFinite(screenPts[2].x) && isFinite(screenPts[2].y)) {
                    const grad = ctx.createLinearGradient(screenPts[0].x, screenPts[0].y, screenPts[2].x, screenPts[2].y);
                    grad.addColorStop(0, '#2d3b4e');
                    grad.addColorStop(0.5, '#243244');
                    grad.addColorStop(1, '#1b2636');
                    ctx.fillStyle = grad;
                } else {
                    ctx.fillStyle = '#243244';
                }
                ctx.fill();

                ctx.strokeStyle = f.stroke;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Brushed metal grain texture lines on unmachined top stock
                ctx.save();
                ctx.clip();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
                ctx.lineWidth = 1;
                const step = 16;
                for (let gx = minX - sY; gx < maxX + sY; gx += step) {
                    const pG1 = this.worldToScreenIso(gx, minY, 0);
                    const pG2 = this.worldToScreenIso(gx + sY, maxY, 0);
                    ctx.beginPath();
                    ctx.moveTo(pG1.x, pG1.y);
                    ctx.lineTo(pG2.x, pG2.y);
                    ctx.stroke();
                }
                ctx.restore();

                // Dimensions label in 3D
                const pCenter = this.worldToScreenIso(bounds.centerX, bounds.centerY, 0);
                ctx.font = 'bold 9.5px Fira Code, monospace';
                ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
                ctx.textAlign = 'center';
                ctx.fillText(`BALOK 3D: ${sX} x ${sY} x ${sZ} mm`, pCenter.x, pCenter.y - 10);
            } else {
                // Side / Bottom Face
                ctx.fillStyle = f.fill;
                ctx.fill();
                ctx.strokeStyle = f.stroke;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        });

        ctx.restore();
    }

    drawToolKerf3DIso(ctx) {
        if (!this.segments || this.segments.length === 0) return;
        if (this.currentSegmentIndex < 0 && !this.options.showFinishedOnly) return;

        ctx.save();
        const maxIdx = this.options.showFinishedOnly ? (this.segments.length - 1) : Math.min(this.currentSegmentIndex, this.segments.length - 1);
        const toolRadius = (this.options.toolDiameter / 2) * this.scale * 1.22474;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 3D Recessed cut paths on top face & floor
        for (let i = 0; i <= maxIdx; i++) {
            const seg = this.segments[i];
            if (seg.type === 'G00') continue;

            const isCurrent = (i === this.currentSegmentIndex && this.currentSegmentIndex < this.segments.length);

            if (!seg.isHole) {
                // Pass A: Dasar sayatan pada kedalaman Z (Floor)
                ctx.lineWidth = Math.max(2, toolRadius * 2);
                ctx.strokeStyle = '#080d1a'; // Deep recessed 3D cavity
                ctx.beginPath();
                if (!isCurrent) {
                    if (seg.points && seg.points.length > 0) {
                        const p0 = this.worldToScreenIso(seg.points[0].x, seg.points[0].y, seg.points[0].z);
                        ctx.moveTo(p0.x, p0.y);
                        for (let j = 1; j < seg.points.length; j++) {
                            const pt = this.worldToScreenIso(seg.points[j].x, seg.points[j].y, seg.points[j].z);
                            ctx.lineTo(pt.x, pt.y);
                        }
                    } else {
                        const p1 = this.worldToScreenIso(seg.start.x, seg.start.y, seg.start.z);
                        const p2 = this.worldToScreenIso(seg.end.x, seg.end.y, seg.end.z);
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                    }
                } else {
                    if (seg.points && seg.points.length > 2) {
                        const p0 = this.worldToScreenIso(seg.points[0].x, seg.points[0].y, seg.points[0].z);
                        ctx.moveTo(p0.x, p0.y);
                        const totalSegments = seg.points.length - 1;
                        const ptCount = Math.floor(this.currentProgress * totalSegments);
                        for (let j = 1; j <= ptCount; j++) {
                            const pt = this.worldToScreenIso(seg.points[j].x, seg.points[j].y, seg.points[j].z);
                            ctx.lineTo(pt.x, pt.y);
                        }
                        const p2 = this.worldToScreenIso(this.toolPos.x, this.toolPos.y, this.toolPos.z);
                        ctx.lineTo(p2.x, p2.y);
                    } else {
                        const startX = seg.start ? seg.start.x : (seg.points ? seg.points[0].x : this.toolPos.x);
                        const startY = seg.start ? seg.start.y : (seg.points ? seg.points[0].y : this.toolPos.y);
                        const startZ = seg.start ? seg.start.z : (seg.points ? seg.points[0].z : this.toolPos.z);
                        const p1 = this.worldToScreenIso(startX, startY, startZ);
                        const p2 = this.worldToScreenIso(this.toolPos.x, this.toolPos.y, this.toolPos.z);
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                    }
                }
                ctx.stroke();

                // Pass B: Kilap dasar sayatan 3D
                ctx.lineWidth = Math.max(1, toolRadius * 1.5);
                ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
                ctx.stroke();

                // Pass C: Garis bibir sayatan pada permukaan atas Z=0
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
                ctx.beginPath();
                if (!isCurrent) {
                    if (seg.points && seg.points.length > 0) {
                        const p0 = this.worldToScreenIso(seg.points[0].x, seg.points[0].y, 0);
                        ctx.moveTo(p0.x, p0.y);
                        for (let j = 1; j < seg.points.length; j++) {
                            const pt = this.worldToScreenIso(seg.points[j].x, seg.points[j].y, 0);
                            ctx.lineTo(pt.x, pt.y);
                        }
                    } else {
                        const p1 = this.worldToScreenIso(seg.start.x, seg.start.y, 0);
                        const p2 = this.worldToScreenIso(seg.end.x, seg.end.y, 0);
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                    }
                } else {
                    if (seg.points && seg.points.length > 2) {
                        const p0 = this.worldToScreenIso(seg.points[0].x, seg.points[0].y, 0);
                        ctx.moveTo(p0.x, p0.y);
                        const totalSegments = seg.points.length - 1;
                        const ptCount = Math.floor(this.currentProgress * totalSegments);
                        for (let j = 1; j <= ptCount; j++) {
                            const pt = this.worldToScreenIso(seg.points[j].x, seg.points[j].y, 0);
                            ctx.lineTo(pt.x, pt.y);
                        }
                        const p2 = this.worldToScreenIso(this.toolPos.x, this.toolPos.y, 0);
                        ctx.lineTo(p2.x, p2.y);
                    } else {
                        const startX = seg.start ? seg.start.x : (seg.points ? seg.points[0].x : this.toolPos.x);
                        const startY = seg.start ? seg.start.y : (seg.points ? seg.points[0].y : this.toolPos.y);
                        const p1 = this.worldToScreenIso(startX, startY, 0);
                        const p2 = this.worldToScreenIso(this.toolPos.x, this.toolPos.y, 0);
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                    }
                }
                ctx.stroke();
            } else {
                // 3D Drilled hole cylinder
                const pHoleTop = this.worldToScreenIso(seg.end.x, seg.end.y, 0);
                const pHoleBot = this.worldToScreenIso(seg.end.x, seg.end.y, seg.end.z);

                // Top ellipse
                ctx.beginPath();
                ctx.fillStyle = '#050912';
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.5;
                if (ctx.ellipse) {
                    ctx.ellipse(pHoleTop.x, pHoleTop.y, toolRadius * 1.1, toolRadius * 0.6, 0, 0, Math.PI * 2);
                } else {
                    ctx.arc(pHoleTop.x, pHoleTop.y, toolRadius * 0.8, 0, Math.PI * 2);
                }
                ctx.fill();
                ctx.stroke();

                // Bottom center point
                ctx.beginPath();
                ctx.fillStyle = '#ffd700';
                ctx.arc(pHoleBot.x, pHoleBot.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // PASS 3D: ANOTASI HASIL JADI 3D (Bila mode "Hanya Benda Jadi" aktif)
        if (this.options.showFinishedOnly && this.segments.length > 0) {
            const bounds = this.getStockBounds();
            const pLabel = this.worldToScreenIso(bounds.centerX, bounds.centerY, 0);

            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#34d399';
            ctx.fillText('✨ WUJUD FISIK BENDA KERJA 3D HASIL SAYATAN', pLabel.x, pLabel.y - 25);
        }

        ctx.restore();
    }

    drawPlannedToolpaths3DIso(ctx) {
        if (!this.segments || this.segments.length === 0) return;

        ctx.save();
        this.segments.forEach((seg) => {
            ctx.lineWidth = 1.8;

            if (seg.type === 'G00') {
                ctx.strokeStyle = '#ef4444';
                ctx.setLineDash([4, 3]);
            } else if (seg.type === 'G01') {
                ctx.strokeStyle = '#10b981';
                ctx.setLineDash([]);
            } else if (seg.type === 'G02') {
                ctx.strokeStyle = '#0ea5e9';
                ctx.setLineDash([]);
            } else if (seg.type === 'G03') {
                ctx.strokeStyle = '#f97316';
                ctx.setLineDash([]);
            } else if (seg.isHole) {
                ctx.strokeStyle = '#a855f7';
                ctx.setLineDash([2, 2]);
            }

            if (seg.points && seg.points.length > 0) {
                ctx.beginPath();
                const p0 = this.worldToScreenIso(seg.points[0].x, seg.points[0].y, seg.points[0].z);
                ctx.moveTo(p0.x, p0.y);
                for (let i = 1; i < seg.points.length; i++) {
                    const pt = this.worldToScreenIso(seg.points[i].x, seg.points[i].y, seg.points[i].z);
                    ctx.lineTo(pt.x, pt.y);
                }
                ctx.stroke();
            } else {
                const p1 = this.worldToScreenIso(seg.start.x, seg.start.y, seg.start.z);
                const p2 = this.worldToScreenIso(seg.end.x, seg.end.y, seg.end.z);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        });

        ctx.setLineDash([]);
        ctx.restore();
    }

    drawExecutedToolpaths3DIso(ctx) {
        if (!this.segments || this.currentSegmentIndex < 0) return;

        ctx.save();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#34d399';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 6;

        const maxIdx = Math.min(this.currentSegmentIndex, this.segments.length - 1);
        for (let i = 0; i <= maxIdx; i++) {
            const seg = this.segments[i];
            if (seg.type === 'G00') continue;

            const isCurrent = (i === this.currentSegmentIndex && this.currentSegmentIndex < this.segments.length);

            if (!isCurrent) {
                if (seg.points && seg.points.length > 0) {
                    ctx.beginPath();
                    const p0 = this.worldToScreenIso(seg.points[0].x, seg.points[0].y, seg.points[0].z);
                    ctx.moveTo(p0.x, p0.y);
                    for (let j = 1; j < seg.points.length; j++) {
                        const pt = this.worldToScreenIso(seg.points[j].x, seg.points[j].y, seg.points[j].z);
                        ctx.lineTo(pt.x, pt.y);
                    }
                    ctx.stroke();
                } else {
                    const p1 = this.worldToScreenIso(seg.start.x, seg.start.y, seg.start.z);
                    const p2 = this.worldToScreenIso(seg.end.x, seg.end.y, seg.end.z);
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            } else {
                ctx.beginPath();
                if (seg.points && seg.points.length > 2) {
                    const p0 = this.worldToScreenIso(seg.points[0].x, seg.points[0].y, seg.points[0].z);
                    ctx.moveTo(p0.x, p0.y);
                    const totalSegments = seg.points.length - 1;
                    const ptCount = Math.floor(this.currentProgress * totalSegments);
                    for (let j = 1; j <= ptCount; j++) {
                        const pt = this.worldToScreenIso(seg.points[j].x, seg.points[j].y, seg.points[j].z);
                        ctx.lineTo(pt.x, pt.y);
                    }
                    const p2 = this.worldToScreenIso(this.toolPos.x, this.toolPos.y, this.toolPos.z);
                    ctx.lineTo(p2.x, p2.y);
                } else {
                    const startX = seg.start ? seg.start.x : (seg.points ? seg.points[0].x : this.toolPos.x);
                    const startY = seg.start ? seg.start.y : (seg.points ? seg.points[0].y : this.toolPos.y);
                    const startZ = seg.start ? seg.start.z : (seg.points ? seg.points[0].z : this.toolPos.z);
                    const p1 = this.worldToScreenIso(startX, startY, startZ);
                    const p2 = this.worldToScreenIso(this.toolPos.x, this.toolPos.y, this.toolPos.z);
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                }
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    drawOriginMarker3DIso(ctx) {
        ctx.save();
        const p0 = this.worldToScreenIso(0, 0, 0);

        // X-Axis Red (Iso)
        const pX = this.worldToScreenIso(25, 0, 0);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(pX.x, pX.y);
        ctx.stroke();

        // Y-Axis Green (Iso)
        const pY = this.worldToScreenIso(0, 25, 0);
        ctx.strokeStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(pY.x, pY.y);
        ctx.stroke();

        // Z-Axis Blue (Straight Up in Iso)
        const pZ = this.worldToScreenIso(0, 0, 25);
        ctx.strokeStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(pZ.x, pZ.y);
        ctx.stroke();

        // Origin Dot
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(p0.x, p0.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 9px Fira Code, monospace';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`WCS 3D (0,0,0) [${this.getWCSLabel()}]`, p0.x - 25, p0.y + 15);

        ctx.restore();
    }

    // ==========================================
    // TOOL RENDERING & ANIMATION
    // ==========================================
    drawTool(ctx) {
        ctx.save();
        const isIso = (this.options.viewMode === 'iso');
        const pos = isIso 
            ? this.worldToScreenIso(this.toolPos.x, this.toolPos.y, this.toolPos.z)
            : this.worldToScreen2D(this.toolPos.x, this.toolPos.y);

        const toolRadius = Math.max(4, (this.options.toolDiameter / 2) * this.scale * (isIso ? 1.22474 : 1.0));
        const isCutting = (this.toolPos.z <= 0);

        if (isIso) {
            // In 3D: Draw endmill tool cylinder extending upwards
            const cylinderHeight = 35 * this.scale * 0.4;
            const topPos = { x: pos.x, y: pos.y - cylinderHeight };

            // Tool Shaft
            if (isFinite(pos.x) && isFinite(toolRadius)) {
                const shaftGrad = ctx.createLinearGradient(pos.x - toolRadius, 0, pos.x + toolRadius, 0);
                shaftGrad.addColorStop(0, '#64748b');
                shaftGrad.addColorStop(0.5, '#e2e8f0');
                shaftGrad.addColorStop(1, '#475569');
                ctx.fillStyle = shaftGrad;
            } else {
                ctx.fillStyle = '#64748b';
            }
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;

            ctx.fillRect(pos.x - toolRadius, topPos.y, toolRadius * 2, cylinderHeight);
            ctx.strokeRect(pos.x - toolRadius, topPos.y, toolRadius * 2, cylinderHeight);

            // Spindle Collet Holder
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(pos.x - toolRadius * 1.5, topPos.y - 12, toolRadius * 3, 12);
            ctx.strokeRect(pos.x - toolRadius * 1.5, topPos.y - 12, toolRadius * 3, 12);

            // Cutting tip glow
            ctx.fillStyle = isCutting ? '#10b981' : '#f59e0b';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // In 2D Top View: Draw tool circle with rotating flutes
            if (!isCutting) {
                // Safe Z shadow
                ctx.beginPath();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.arc(pos.x + 4, pos.y + 4, toolRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Cutter Body
            ctx.beginPath();
            ctx.fillStyle = isCutting ? 'rgba(16, 185, 129, 0.45)' : 'rgba(245, 158, 11, 0.35)';
            ctx.strokeStyle = isCutting ? '#10b981' : '#f59e0b';
            ctx.lineWidth = 2;
            ctx.arc(pos.x, pos.y, toolRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Rotating cutter flutes (Spindle rotation animation)
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(this.spindleAngle);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;

            ctx.beginPath();
            ctx.moveTo(-toolRadius, 0);
            ctx.lineTo(toolRadius, 0);
            ctx.moveTo(0, -toolRadius);
            ctx.lineTo(0, toolRadius);
            ctx.stroke();
            ctx.restore();

            // Center Point
            ctx.beginPath();
            ctx.fillStyle = '#ffffff';
            ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Target Reticle (High-Tech Circular Crosshair matching reference design)
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, toolRadius + 4, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(pos.x - toolRadius - 6, pos.y);
            ctx.lineTo(pos.x + toolRadius + 6, pos.y);
            ctx.moveTo(pos.x, pos.y - toolRadius - 6);
            ctx.lineTo(pos.x, pos.y + toolRadius + 6);
            ctx.stroke();

            // Tool HUD Tooltip Box (Two-line matching reference image)
            const curSeg = (this.segments && this.currentSegmentIndex >= 0) ? this.segments[this.currentSegmentIndex] : null;
            const modeStr = curSeg ? curSeg.type : (this.toolPos.z <= 0 ? 'G01' : 'G00');
            const zStatus = isCutting ? `Z ${this.toolPos.z.toFixed(1)} (CUT)` : `Z ${this.toolPos.z.toFixed(1)} (SAFE)`;
            const line1 = `${modeStr} | ${zStatus}`;
            const line2 = `G54 (0,0) ${this.getWCSLabel()}`;

            ctx.font = 'bold 9.5px Fira Code, monospace';
            const w1 = ctx.measureText(line1).width;
            const w2 = ctx.measureText(line2).width;
            const boxW = Math.max(w1, w2) + 16;
            const boxH = 34;
            const boxX = pos.x + toolRadius + 10;
            const boxY = pos.y - 12;

            ctx.fillStyle = 'rgba(8, 16, 36, 0.88)';
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(boxX, boxY, boxW, boxH, 8);
            } else {
                ctx.rect(boxX, boxY, boxW, boxH);
            }
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#f59e0b';
            ctx.fillText(line1, boxX + 8, boxY + 14);
            ctx.fillStyle = '#fef08a';
            ctx.fillText(line2, boxX + 8, boxY + 27);
        }

        ctx.restore();
    }

    // ==========================================
    // PARTICLES (BRAM / SPARK / CHIPS EFFECT)
    // ==========================================
    emitSparks(worldX, worldY, worldZ, count = 3) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3.0;
            this.particles.push({
                x: worldX,
                y: worldY,
                z: worldZ,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                vz: (Math.random() - 0.5) * speed,
                life: 1.0,
                color: Math.random() > 0.4 ? '#ffd700' : '#ff7a00',
                size: 1.5 + Math.random() * 2.0
            });
        }
    }

    updateParticles(deltaTime) {
        const decay = (deltaTime / 1000) * 3.5;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * 0.4;
            p.y += p.vy * 0.4;
            p.z += p.vz * 0.4;
            p.life -= decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawParticles(ctx) {
        if (this.particles.length === 0) return;
        ctx.save();
        const isIso = (this.options.viewMode === 'iso');

        this.particles.forEach((p) => {
            const screen = isIso ? this.worldToScreenIso(p.x, p.y, p.z) : this.worldToScreen2D(p.x, p.y);
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    // ==========================================
    // HOVER COORDINATE INSPECTOR (2D)
    // ==========================================
    drawCoordinateInspector2D(ctx) {
        const wX = this.mousePos.worldX;
        const wY = this.mousePos.worldY;
        const bounds = this.getStockBounds();
        const isInside = (wX >= bounds.minX && wX <= bounds.maxX && wY >= bounds.minY && wY <= bounds.maxY);

        ctx.save();
        const mouseCanvasX = this.mousePos.canvasX;
        const mouseCanvasY = this.mousePos.canvasY;

        // Crosshair
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(mouseCanvasX, 0);
        ctx.lineTo(mouseCanvasX, this.height);
        ctx.moveTo(0, mouseCanvasY);
        ctx.lineTo(this.width, mouseCanvasY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Tooltip box
        const text = `X: ${wX.toFixed(2)}  Y: ${wY.toFixed(2)}`;
        const status = isInside ? 'DI DALAM BENDA KERJA' : 'DI LUAR BENDA KERJA';
        
        ctx.font = '11px Fira Code, monospace';
        const textW = ctx.measureText(text).width + 16;
        const boxX = Math.min(this.width - textW - 12, Math.max(10, mouseCanvasX + 12));
        const boxY = Math.min(this.height - 45, Math.max(10, mouseCanvasY - 45));

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = isInside ? '#38bdf8' : '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(boxX, boxY, textW, 38, 8);
        } else {
            ctx.rect(boxX, boxY, textW, 38);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.fillText(text, boxX + 8, boxY + 16);

        ctx.font = 'bold 8.5px sans-serif';
        ctx.fillStyle = isInside ? '#38bdf8' : '#94a3b8';
        ctx.fillText(status, boxX + 8, boxY + 30);

        ctx.restore();
    }

    drawAxesIndicator(ctx) {
        ctx.save();
        
        // Position in bottom right corner matching reference design
        const originX = this.width - 48;
        const originY = this.height - 35;
        const len = 22;

        ctx.font = 'bold 11px Inter, sans-serif';

        if (this.options.viewMode === 'iso') {
            // Project 3D vector using the exact same rotZ and rotX
            const projectAxis = (vx, vy, vz) => {
                const cosZ = Math.cos(this.rotZ);
                const sinZ = Math.sin(this.rotZ);
                const x1 = vx * cosZ - vy * sinZ;
                const y1 = vx * sinZ + vy * cosZ;
                const z1 = vz;

                const cosX = Math.cos(this.rotX);
                const sinX = Math.sin(this.rotX);
                const isoX = x1 * 1.22474;
                const isoY = (y1 * sinX - z1 * cosX) * 1.22474;

                return {
                    x: originX + isoX * len,
                    y: originY + isoY * len
                };
            };

            const pX = projectAxis(1, 0, 0);
            const pY = projectAxis(0, 1, 0);
            const pZ = projectAxis(0, 0, 1);

            // +X Axis (Red)
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(pX.x, pX.y);
            ctx.stroke();
            this.drawMiniArrow(ctx, originX, originY, pX.x, pX.y, '#ef4444');
            ctx.fillStyle = '#ef4444';
            ctx.fillText('X', pX.x + 3, pX.y + 4);

            // +Y Axis (Green)
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(pY.x, pY.y);
            ctx.stroke();
            this.drawMiniArrow(ctx, originX, originY, pY.x, pY.y, '#10b981');
            ctx.fillStyle = '#10b981';
            ctx.fillText('Y', pY.x + 3, pY.y - 2);

            // +Z Axis (Cyan)
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(pZ.x, pZ.y);
            ctx.stroke();
            this.drawMiniArrow(ctx, originX, originY, pZ.x, pZ.y, '#38bdf8');
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('Z', pZ.x - 4, pZ.y - 4);
        } else {
            // --- CAD 3-AXIS VIEWPORT TRIAD (Matching Reference Image) ---
            // +X Axis (Red - Right)
            const xEndX = originX + len;
            const xEndY = originY;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(xEndX, xEndY);
            ctx.stroke();
            this.drawMiniArrow(ctx, originX, originY, xEndX, xEndY, '#ef4444');
            ctx.fillStyle = '#ef4444';
            ctx.fillText('X', xEndX + 4, xEndY + 4);

            // +Y Axis (Green - Diagonal Up-Right)
            const yEndX = originX + len * 0.7;
            const yEndY = originY - len * 0.7;
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(yEndX, yEndY);
            ctx.stroke();
            this.drawMiniArrow(ctx, originX, originY, yEndX, yEndY, '#10b981');
            ctx.fillStyle = '#10b981';
            ctx.fillText('Y', yEndX + 4, yEndY + 2);

            // +Z Axis (Cyan - Straight Up)
            const zEndX = originX;
            const zEndY = originY - len;
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(zEndX, zEndY);
            ctx.stroke();
            this.drawMiniArrow(ctx, originX, originY, zEndX, zEndY, '#38bdf8');
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('Z', zEndX - 4, zEndY - 4);
        }

        // Center Origin Dot (Red/Cyan junction)
        ctx.beginPath();
        ctx.fillStyle = '#ef4444';
        ctx.arc(originX, originY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawMiniArrow(ctx, fromX, fromY, toX, toY, color) {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const arrowLen = 5.5;
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.translate(toX, toY);
        ctx.rotate(angle);
        ctx.moveTo(0, 0);
        ctx.lineTo(-arrowLen, -arrowLen * 0.6);
        ctx.lineTo(-arrowLen, arrowLen * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // ==========================================
    // SIMULATION STEPPING & INTERPOLATION
    // ==========================================
    stepSimulation(deltaTime, onStepCallback) {
        if (!this.segments || this.segments.length === 0) return false;
        if (this.currentSegmentIndex < 0) {
            this.currentSegmentIndex = 0;
            this.currentProgress = 0;
        }
        if (this.currentSegmentIndex >= this.segments.length) {
            this.isSimulating = false;
            return false;
        }

        const seg = this.segments[this.currentSegmentIndex];
        const dist = seg.arcLength || seg.distance || 1.0;
        
        // Match Bubut's human-observable educational speed: Rapid 80 mm/s, Cutting 25 mm/s
        const baseSpeed = (seg.type === 'G00') ? 80.0 : 25.0;
        const speed = baseSpeed * this.playbackSpeed;
        const progressDelta = (speed * (deltaTime / 1000)) / Math.max(0.1, dist);

        this.currentProgress += progressDelta;

        if (this.currentProgress >= 1.0) {
            this.currentProgress = 0;
            this.currentSegmentIndex++;
            if (this.currentSegmentIndex >= this.segments.length) {
                this.isSimulating = false;
                this.toolPos = { x: seg.end.x, y: seg.end.y, z: seg.end.z };
                this.render();
                if (onStepCallback) onStepCallback(this.currentSegmentIndex, null, 1.0, true);
                return false;
            }
        }

        const currentSeg = this.segments[this.currentSegmentIndex];
        if (currentSeg) {
            if (currentSeg.points && currentSeg.points.length > 2) {
                // Continuous fractional interpolation along multi-point curves (G02/G03 arcs)
                const pts = currentSeg.points;
                const totalSegments = pts.length - 1;
                const rawIdx = Math.max(0, Math.min(totalSegments, this.currentProgress * totalSegments));
                const idx = Math.min(totalSegments - 1, Math.floor(rawIdx));
                const subT = rawIdx - idx;
                const p0 = pts[idx];
                const p1 = pts[idx + 1];
                this.toolPos = {
                    x: p0.x + (p1.x - p0.x) * subT,
                    y: p0.y + (p1.y - p0.y) * subT,
                    z: p0.z + (p1.z - p0.z) * subT
                };
            } else {
                // Continuous linear interpolation for 2-point moves (G00, G01, G81, G83)
                const start = currentSeg.start || (currentSeg.points ? currentSeg.points[0] : { x: 0, y: 0, z: 20 });
                const end = currentSeg.end || (currentSeg.points ? currentSeg.points[1] : start);
                const t = Math.max(0, Math.min(1, this.currentProgress));
                this.toolPos = {
                    x: start.x + (end.x - start.x) * t,
                    y: start.y + (end.y - start.y) * t,
                    z: start.z + (end.z - start.z) * t
                };
            }

            // Spindle rotation animation
            this.spindleAngle += 0.25 * this.playbackSpeed;
            if (this.spindleAngle > Math.PI * 2) this.spindleAngle -= Math.PI * 2;

            if (this.toolPos.z <= 0 && currentSeg.type !== 'G00' && Math.random() < 0.6) {
                this.emitSparks(this.toolPos.x, this.toolPos.y, this.toolPos.z, 2);
            }

            if (onStepCallback) {
                onStepCallback(this.currentSegmentIndex, currentSeg, this.currentProgress, false);
            }
        }

        this.updateParticles(deltaTime);
        this.render();
        return true;
    }
}

if (typeof window !== 'undefined') {
    window.MillingVisualizer = MillingVisualizer;
}
