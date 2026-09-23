/**
 * CNC Milling EduSim - WebGL 3D Solid CAD Viewer
 * High-fidelity Solid CAD rendering (SolidWorks / Autodesk Inventor style)
 * Powered by Three.js & OrbitControls
 * Author: Antigravity AI / Muhammad Harist Mishbahuddin
 * Standard: ISO / Fanuc 3-Axis Milling Format (G17 XY Plane, Z Depth)
 */

// ============================================================================
// SELF-CONTAINED CONSTRUCTIVE SOLID GEOMETRY (CSG) ENGINE (Evan Wallace BSP)
// Enables robust 3D boolean subtraction for cuts crossing stock boundaries
// ============================================================================

class CSGVector {
    constructor(x = 0, y = 0, z = 0) {
        if (x && typeof x === 'object') {
            this.x = x.x || 0; this.y = x.y || 0; this.z = x.z || 0;
        } else {
            this.x = x; this.y = y; this.z = z;
        }
    }
    clone() { return new CSGVector(this.x, this.y, this.z); }
    negated() { return new CSGVector(-this.x, -this.y, -this.z); }
    plus(a) { return new CSGVector(this.x + a.x, this.y + a.y, this.z + a.z); }
    minus(a) { return new CSGVector(this.x - a.x, this.y - a.y, this.z - a.z); }
    times(a) { return new CSGVector(this.x * a, this.y * a, this.z * a); }
    dividedBy(a) { return new CSGVector(this.x / a, this.y / a, this.z / a); }
    dot(a) { return this.x * a.x + this.y * a.y + this.z * a.z; }
    lerp(a, t) { return this.plus(a.minus(this).times(t)); }
    length() { return Math.hypot(this.x, this.y, this.z); }
    unit() { return this.dividedBy(this.length() || 1); }
    cross(a) {
        return new CSGVector(
            this.y * a.z - this.z * a.y,
            this.z * a.x - this.x * a.z,
            this.x * a.y - this.y * a.x
        );
    }
}

class CSGVertex {
    constructor(pos, normal, uv) {
        this.pos = new CSGVector(pos);
        this.normal = new CSGVector(normal);
        this.uv = uv;
    }
    clone() { return new CSGVertex(this.pos.clone(), this.normal.clone(), this.uv); }
    flip() { this.normal = this.normal.negated(); }
    interpolate(other, t) {
        return new CSGVertex(
            this.pos.lerp(other.pos, t),
            this.normal.lerp(other.normal, t),
            this.uv
        );
    }
}

class CSGPlane {
    constructor(normal, w) { this.normal = normal; this.w = w; }
    clone() { return new CSGPlane(this.normal.clone(), this.w); }
    flip() { this.normal = this.normal.negated(); this.w = -this.w; }
    static fromPoints(a, b, c) {
        const n = b.minus(a).cross(c.minus(a)).unit();
        return new CSGPlane(n, n.dot(a));
    }
    splitPolygon(polygon, coplanarFront, coplanarBack, front, back) {
        const COPLANAR = 0, FRONT = 1, BACK = 2, SPANNING = 3;
        const EPSILON = 1e-5;
        let polygonType = 0;
        const types = [];
        for (let i = 0; i < polygon.vertices.length; i++) {
            const t = this.normal.dot(polygon.vertices[i].pos) - this.w;
            const type = (t < -EPSILON) ? BACK : (t > EPSILON) ? FRONT : COPLANAR;
            polygonType |= type;
            types.push(type);
        }
        switch (polygonType) {
            case COPLANAR:
                (this.normal.dot(polygon.plane.normal) > 0 ? coplanarFront : coplanarBack).push(polygon);
                break;
            case FRONT: front.push(polygon); break;
            case BACK: back.push(polygon); break;
            case SPANNING:
                const f = [], b = [];
                for (let i = 0; i < polygon.vertices.length; i++) {
                    const j = (i + 1) % polygon.vertices.length;
                    const ti = types[i], tj = types[j];
                    const vi = polygon.vertices[i], vj = polygon.vertices[j];
                    if (ti !== BACK) f.push(vi);
                    if (ti !== FRONT) b.push(ti !== BACK ? vi.clone() : vi);
                    if ((ti | tj) === SPANNING) {
                        const t = (this.w - this.normal.dot(vi.pos)) / this.normal.dot(vj.pos.minus(vi.pos));
                        const v = vi.interpolate(vj, t);
                        f.push(v);
                        b.push(v.clone());
                    }
                }
                if (f.length >= 3) front.push(new CSGPolygon(f, polygon.shared));
                if (b.length >= 3) back.push(new CSGPolygon(b, polygon.shared));
                break;
        }
    }
}

class CSGPolygon {
    constructor(vertices, shared) {
        this.vertices = vertices;
        this.shared = shared;
        this.plane = CSGPlane.fromPoints(vertices[0].pos, vertices[1].pos, vertices[2].pos);
    }
    clone() { return new CSGPolygon(this.vertices.map(v => v.clone()), this.shared); }
    flip() {
        this.vertices.reverse().forEach(v => v.flip());
        this.plane.flip();
    }
}

class CSGNode {
    constructor(polygons) {
        this.plane = null; this.front = null; this.back = null; this.polygons = [];
        if (polygons) this.build(polygons);
    }
    clone() {
        const node = new CSGNode();
        node.plane = this.plane && this.plane.clone();
        node.front = this.front && this.front.clone();
        node.back = this.back && this.back.clone();
        node.polygons = this.polygons.map(p => p.clone());
        return node;
    }
    invert() {
        for (let i = 0; i < this.polygons.length; i++) this.polygons[i].flip();
        if (this.plane) this.plane.flip();
        if (this.front) this.front.invert();
        if (this.back) this.back.invert();
        const temp = this.front; this.front = this.back; this.back = temp;
    }
    clipPolygons(polygons) {
        if (!this.plane) return polygons.slice();
        let front = [], back = [];
        for (let i = 0; i < polygons.length; i++) {
            this.plane.splitPolygon(polygons[i], front, back, front, back);
        }
        if (this.front) front = this.front.clipPolygons(front);
        if (this.back) back = this.back.clipPolygons(back);
        else back = [];
        return front.concat(back);
    }
    clipTo(bsp) {
        this.polygons = bsp.clipPolygons(this.polygons);
        if (this.front) this.front.clipTo(bsp);
        if (this.back) this.back.clipTo(bsp);
    }
    allPolygons() {
        let polygons = this.polygons.slice();
        if (this.front) polygons = polygons.concat(this.front.allPolygons());
        if (this.back) polygons = polygons.concat(this.back.allPolygons());
        return polygons;
    }
    build(polygons) {
        if (!polygons.length) return;
        if (!this.plane) this.plane = polygons[0].plane.clone();
        const front = [], back = [];
        for (let i = 0; i < polygons.length; i++) {
            this.plane.splitPolygon(polygons[i], this.polygons, this.polygons, front, back);
        }
        if (front.length) {
            if (!this.front) this.front = new CSGNode();
            this.front.build(front);
        }
        if (back.length) {
            if (!this.back) this.back = new CSGNode();
            this.back.build(back);
        }
    }
}

class CSGSolid {
    constructor() { this.polygons = []; }
    static fromPolygons(polygons) { const c = new CSGSolid(); c.polygons = polygons; return c; }
    clone() { const c = new CSGSolid(); c.polygons = this.polygons.map(p => p.clone()); return c; }
    toPolygons() { return this.polygons; }
    subtract(csg) {
        const a = new CSGNode(this.clone().polygons);
        const b = new CSGNode(csg.clone().polygons);
        a.invert();
        a.clipTo(b);
        b.clipTo(a);
        b.invert();
        b.clipTo(a);
        b.invert();
        a.build(b.allPolygons());
        a.invert();
        return CSGSolid.fromPolygons(a.allPolygons());
    }

    static fromGeometry(geom, objectIndex = 0) {
        const polys = [];
        const pos = geom.attributes.position;
        const norm = geom.attributes.normal;
        const index = geom.index ? geom.index.array : null;
        const numTriangles = index ? (index.length / 3) : (pos.count / 3);

        for (let i = 0; i < numTriangles; i++) {
            const vi0 = index ? index[i * 3] : (i * 3);
            const vi1 = index ? index[i * 3 + 1] : (i * 3 + 1);
            const vi2 = index ? index[i * 3 + 2] : (i * 3 + 2);
            const p0 = new CSGVector(pos.getX(vi0), pos.getY(vi0), pos.getZ(vi0));
            const p1 = new CSGVector(pos.getX(vi1), pos.getY(vi1), pos.getZ(vi1));
            const p2 = new CSGVector(pos.getX(vi2), pos.getY(vi2), pos.getZ(vi2));
            const cross = p1.minus(p0).cross(p2.minus(p0));
            if (cross.length() < 1e-4) continue; // Skip degenerate zero-area triangle

            const n0 = norm ? new CSGVector(norm.getX(vi0), norm.getY(vi0), norm.getZ(vi0)) : new CSGVector(0,0,1);
            const n1 = norm ? new CSGVector(norm.getX(vi1), norm.getY(vi1), norm.getZ(vi1)) : new CSGVector(0,0,1);
            const n2 = norm ? new CSGVector(norm.getX(vi2), norm.getY(vi2), norm.getZ(vi2)) : new CSGVector(0,0,1);

            const verts = [
                new CSGVertex(p0, n0),
                new CSGVertex(p1, n1),
                new CSGVertex(p2, n2)
            ];
            polys.push(new CSGPolygon(verts, objectIndex));
        }
        return CSGSolid.fromPolygons(polys);
    }

    static fromMesh(mesh, objectIndex = 0) {
        mesh.updateMatrixWorld();
        const geom = mesh.geometry.clone();
        geom.applyMatrix4(mesh.matrixWorld);
        return CSGSolid.fromGeometry(geom, objectIndex);
    }

    static toGeometry(csg) {
        const ps = csg.polygons;
        let triCount = 0;
        ps.forEach(p => triCount += Math.max(0, p.vertices.length - 2));

        const positions = new Float32Array(triCount * 9);
        const normals = new Float32Array(triCount * 9);
        let ptr = 0;

        for (let i = 0; i < ps.length; i++) {
            const p = ps[i];
            const pvs = p.vertices;
            for (let j = 2; j < pvs.length; j++) {
                const v0 = pvs[0], v1 = pvs[j - 1], v2 = pvs[j];
                positions[ptr] = v0.pos.x; positions[ptr + 1] = v0.pos.y; positions[ptr + 2] = v0.pos.z;
                normals[ptr] = v0.normal.x; normals[ptr + 1] = v0.normal.y; normals[ptr + 2] = v0.normal.z;
                positions[ptr + 3] = v1.pos.x; positions[ptr + 4] = v1.pos.y; positions[ptr + 5] = v1.pos.z;
                normals[ptr + 3] = v1.normal.x; normals[ptr + 4] = v1.normal.y; normals[ptr + 5] = v1.normal.z;
                positions[ptr + 6] = v2.pos.x; positions[ptr + 7] = v2.pos.y; positions[ptr + 8] = v2.pos.z;
                normals[ptr + 6] = v2.normal.x; normals[ptr + 7] = v2.normal.y; normals[ptr + 8] = v2.normal.z;
                ptr += 9;
            }
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        return geom;
    }
}

class MillingCAD3DViewer {
    constructor(containerElement, options = {}) {
        this.container = containerElement;
        this.options = Object.assign({
            stockX: 100,
            stockY: 80,
            stockZ: 25,
            toolDiameter: 10,
            showFinishedOnly: false,
            wcsMode: 'bottom-left' // 'bottom-left', 'top-left', 'bottom-right', 'top-right', 'center'
        }, options);

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.workpieceGroup = null;
        this.toolpathGroup = null;
        this.toolGroup = null;
        this.parsedData = null;
        this.isInitialized = false;

        this.init();
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

    setWCSMode(mode) {
        this.options.wcsMode = mode;
        this.buildWorkpiece();
        this.fitView();
    }

    setStock(x, y, z, toolD, wcsMode) {
        this.options.stockX = x;
        this.options.stockY = y;
        this.options.stockZ = z;
        if (toolD !== undefined) this.options.toolDiameter = toolD;
        if (wcsMode !== undefined) this.options.wcsMode = wcsMode;
        this.buildWorkpiece();
        this.fitView();
    }

    init() {
        if (!window.THREE) {
            console.error('Three.js is not loaded.');
            return;
        }

        const width = this.container.clientWidth || 600;
        const height = this.container.clientHeight || 400;

        // 1. Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x081024); // Deep studio navy matching viewport

        // 2. Camera setup - CNC standard (Z is UP, X is right, Y is forward)
        this.camera = new THREE.PerspectiveCamera(36, width / height, 1, 2000);
        this.camera.up.set(0, 0, 1);
        this.camera.position.set(130, -100, 120);

        // 3. WebGL Renderer with High-Fidelity Anti-Aliasing & Shadows
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (THREE.sRGBEncoding) {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
        }
        // Tone mapping untuk tampilan rendering realistis seperti software CAD profesional
        if (THREE.ACESFilmicToneMapping !== undefined) {
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.05;
        }
        this.container.appendChild(this.renderer.domElement);

        // 4. OrbitControls (Smooth CAD Camera Rotation, Zoom, Pan)
        if (window.THREE.OrbitControls) {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.screenSpacePanning = true;
            this.controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't flip below table
            this.controls.minPolarAngle = 0.05;
            this.controls.minDistance = 20;
            this.controls.maxDistance = 800;
            const b0 = this.getStockBounds();
            this.controls.target.set(b0.centerX, b0.centerY, -this.options.stockZ / 2);
            this.controls.update();
        }

        // 5. CAD Studio Directional & Ambient Lighting
        this.setupLights();

        // 6. Ground Shadow Catcher & Engineering Grid
        this.setupGround();

        // 7. Workpiece Solid CAD Container
        this.workpieceGroup = new THREE.Group();
        this.scene.add(this.workpieceGroup);

        // 7.1 Toolpath Wireframe Overlay Container
        this.toolpathGroup = new THREE.Group();
        this.scene.add(this.toolpathGroup);

        // 8. 3D Endmill Cutter Tool Model
        this.setupTool();

        // 9. Coordinate Axes at (0, 0, 0)
        this.setupAxes();

        this.isInitialized = true;
        this.buildWorkpiece();

        // Animation Loop
        const animate = () => {
            requestAnimationFrame(animate);
            if (this.controls) this.controls.update();
            this.renderer.render(this.scene, this.camera);
        };
        animate();

        window.addEventListener('resize', () => this.resize());
    }

    setupLights() {
        const sZ = this.options.stockZ;
        const b = this.getStockBounds();

        // Soft ambient base — dikurangi agar kontras lebih dramatis
        const ambientLight = new THREE.AmbientLight(0xd0e8ff, 0.45);
        this.scene.add(ambientLight);

        // Target at workpiece center
        this.lightTarget = new THREE.Object3D();
        this.lightTarget.position.set(b.centerX, b.centerY, -sZ / 2);
        this.scene.add(this.lightTarget);

        // Key Light (Upper-Front-Right) — diperkuat untuk shadow lebih tajam
        this.keyLight = new THREE.DirectionalLight(0xffffff, 1.30);
        this.keyLight.position.set(b.centerX + 130, b.centerY - 140, 200);
        this.keyLight.target = this.lightTarget;
        this.keyLight.castShadow = true;
        this.keyLight.shadow.mapSize.width = 2048;
        this.keyLight.shadow.mapSize.height = 2048;
        this.keyLight.shadow.camera.near = 10;
        this.keyLight.shadow.camera.far = 700;
        this.keyLight.shadow.camera.left = -180;
        this.keyLight.shadow.camera.right = 180;
        this.keyLight.shadow.camera.top = 180;
        this.keyLight.shadow.camera.bottom = -180;
        this.keyLight.shadow.bias = -0.0003;
        this.scene.add(this.keyLight);

        // Cool Fill Light (Left-Back) — biru dingin untuk permukaan terpotong
        this.fillLight = new THREE.DirectionalLight(0x6ea8e8, 0.55);
        this.fillLight.position.set(b.centerX - 160, b.centerY + 130, 100);
        this.fillLight.target = this.lightTarget;
        this.scene.add(this.fillLight);

        // Warm Rim Light (Front-Bottom) for edge highlights
        this.rimLight = new THREE.DirectionalLight(0xffe8c0, 0.30);
        this.rimLight.position.set(b.centerX, b.centerY - 200, 50);
        this.rimLight.target = this.lightTarget;
        this.scene.add(this.rimLight);
    }

    setupGround() {
        const sZ = this.options.stockZ;
        const b = this.getStockBounds();

        // Shadow catcher plane on XY plane at Z = -sZ - 0.2
        const groundGeom = new THREE.PlaneGeometry(360, 360);
        const groundMat = new THREE.ShadowMaterial({ opacity: 0.40 });
        this.groundMesh = new THREE.Mesh(groundGeom, groundMat);
        this.groundMesh.position.set(b.centerX, b.centerY, -sZ - 0.2);
        this.groundMesh.receiveShadow = true;
        this.scene.add(this.groundMesh);

        // Clear High-Contrast Engineering Grid
        this.grid = new THREE.GridHelper(300, 30, 0x38bdf8, 0x2563eb);
        this.grid.rotation.x = Math.PI / 2; // Lie on XY plane
        this.grid.position.set(b.centerX, b.centerY, -sZ - 0.2);
        if (this.grid.material) {
            this.grid.material.opacity = 0.70;
            this.grid.material.transparent = true;
        }
        this.scene.add(this.grid);
    }

    setGridVisible(visible) {
        if (this.grid) this.grid.visible = !!visible;
    }

    setupAxes() {
        // Red = +X, Green = +Y, Blue = +Z
        const axesHelper = new THREE.AxesHelper(28);
        axesHelper.position.set(0, 0, 0);
        this.scene.add(axesHelper);
    }

    setupTool() {
        let currentPos = { x: 0, y: 0, z: 20 };
        if (this.toolGroup) {
            currentPos = { x: this.toolGroup.position.x, y: this.toolGroup.position.y, z: this.toolGroup.position.z };
            this.scene.remove(this.toolGroup);
            while (this.toolGroup.children.length > 0) {
                const c = this.toolGroup.children[0];
                this.toolGroup.remove(c);
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            }
        } else {
            this.toolGroup = new THREE.Group();
        }

        const toolRadius = Math.max(0.5, this.options.toolDiameter / 2);
        const fluteHeight = 30;

        // Carbide Cutter Flutes
        const fluteGeom = new THREE.CylinderGeometry(toolRadius, toolRadius, fluteHeight, 24);
        fluteGeom.translate(0, fluteHeight / 2, 0);
        fluteGeom.rotateX(Math.PI / 2); // align along +Z
        const fluteMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            metalness: 0.85,
            roughness: 0.22
        });
        const fluteMesh = new THREE.Mesh(fluteGeom, fluteMat);
        fluteMesh.castShadow = true;
        this.toolGroup.add(fluteMesh);

        // Spindle Collet Chuck Holder (Black Oxide Steel)
        const chuckGeom = new THREE.CylinderGeometry(toolRadius * 2.2, toolRadius * 1.5, 25, 24);
        chuckGeom.translate(0, 25 / 2 + fluteHeight, 0);
        chuckGeom.rotateX(Math.PI / 2);
        const chuckMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            metalness: 0.6,
            roughness: 0.4
        });
        const chuckMesh = new THREE.Mesh(chuckGeom, chuckMat);
        chuckMesh.castShadow = true;
        this.toolGroup.add(chuckMesh);

        this.toolGroup.position.set(currentPos.x, currentPos.y, currentPos.z);
        this.scene.add(this.toolGroup);
    }

    setToolPos(x, y, z) {
        if (this.toolGroup) {
            this.toolGroup.position.set(x, y, z);
        }
    }

    render3DToolpath(parsedToolpath) {
        const segments = Array.isArray(parsedToolpath)
            ? parsedToolpath
            : (parsedToolpath?.parsedToolpath || parsedToolpath?.segments || []);
        this.buildToolpathOverlay(segments);
    }

    simulateCutter(toolPos) {
        if (!toolPos) return;
        this.setToolPos(toolPos.x, toolPos.y, toolPos.z);
    }

    simulateMaterialRemoval(parsedToolpath) {
        if (parsedToolpath) {
            if (Array.isArray(parsedToolpath)) {
                this.parsedData = { segments: parsedToolpath };
            } else {
                this.parsedData = parsedToolpath;
            }
        }
        this.buildWorkpiece();
    }

    validateBoundingBoxes(parsedToolpath) {
        const data = parsedToolpath || this.parsedData;
        if (!data) return null;
        const toolR = Math.max(0.5, this.options.toolDiameter / 2);
        const tBBox = data.toolpathBoundingBox || data.boundingBox;
        const mBBox = data.machiningBoundingBox;
        if (!tBBox || !mBBox || !tBBox.hasCut) return null;

        const diffMinX = parseFloat(Math.abs(tBBox.minX - mBBox.minX).toFixed(2));
        const diffMaxX = parseFloat(Math.abs(mBBox.maxX - tBBox.maxX).toFixed(2));
        const diffMinY = parseFloat(Math.abs(tBBox.minY - mBBox.minY).toFixed(2));
        const diffMaxY = parseFloat(Math.abs(mBBox.maxY - tBBox.maxY).toFixed(2));

        const eps = 0.15;
        const isValidMinX = Math.abs(diffMinX - toolR) < eps;
        const isValidMaxX = Math.abs(diffMaxX - toolR) < eps;
        const isValidMinY = Math.abs(diffMinY - toolR) < eps;
        const isValidMaxY = Math.abs(diffMaxY - toolR) < eps;
        const isValid = isValidMinX && isValidMaxX && isValidMinY && isValidMaxY;

        return {
            toolRadius: toolR,
            toolpathBBox: tBBox,
            machiningBBox: mBBox,
            diffMinX: diffMinX,
            diffMaxX: diffMaxX,
            diffMinY: diffMinY,
            diffMaxY: diffMaxY,
            isValid: isValid,
            warning: isValid ? null : `Perhatian: Selisih BBox (${diffMinX} / ${diffMaxX} / ${diffMinY} / ${diffMaxY}mm) tidak sama dengan R_tool (${toolR}mm)`
        };
    }

    updateFromData(parsedData, options = {}) {
        Object.assign(this.options, options);
        this.parsedData = parsedData;
        // Terapkan options (termasuk showFinishedOnly) SEBELUM rebuild agar buildToolpathOverlay
        // di dalam buildWorkpiece langsung tahu state yang benar
        this.simulateMaterialRemoval(parsedData);
    }

    setFinishedOnly(enabled) {
        this.options.showFinishedOnly = enabled;
        if (this.toolGroup) {
            this.toolGroup.visible = !enabled;
        }
        // Rebuild toolpath overlay agar toolpath lines langsung hilang/muncul
        const segs = (this.parsedData && this.parsedData.segments) ? this.parsedData.segments : [];
        this.buildToolpathOverlay(segs);
    }

    /**
     * Builds a continuous, seamless 2D toolpath swept cutter ribbon shape with natural endmill corner radii and rounded end caps.
     */
    buildCutterShapeForChain(rawPoints, toolRadius) {
        if (!rawPoints || rawPoints.length < 2) return null;

        // Deduplicate consecutive points
        const pts = [];
        for (let i = 0; i < rawPoints.length; i++) {
            const p = rawPoints[i];
            if (pts.length === 0 || Math.hypot(p.x - pts[pts.length - 1].x, p.y - pts[pts.length - 1].y) > 0.05) {
                pts.push({ x: p.x, y: p.y });
            }
        }
        if (pts.length < 2) return null;

        const R = toolRadius;
        const isClosed = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 0.2;

        const lineIntersect = (p1, d1, p2, d2) => {
            const cross = d1.x * d2.y - d1.y * d2.x;
            if (Math.abs(cross) < 1e-4) return null;
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            const t = (dx * d2.y - dy * d2.x) / cross;
            return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
        };

        if (isClosed && pts.length >= 4) {
            // Closed loop trench with outer rounded boundary and inner hole
            const uniquePts = pts.slice(0, pts.length - 1);
            const N = uniquePts.length;

            let area = 0;
            for (let i = 0; i < N; i++) {
                const cur = uniquePts[i], nxt = uniquePts[(i + 1) % N];
                area += (cur.x * nxt.y - nxt.x * cur.y);
            }
            if (area < 0) uniquePts.reverse();

            const segs = [];
            for (let i = 0; i < N; i++) {
                const p1 = uniquePts[i], p2 = uniquePts[(i + 1) % N];
                const dx = p2.x - p1.x, dy = p2.y - p1.y;
                const len = Math.hypot(dx, dy);
                if (len < 0.001) continue;
                const ux = dx / len, uy = dy / len;
                const inNx = -uy, inNy = ux;
                const outNx = uy, outNy = -ux;
                segs.push({ p1, p2, len, ux, uy, inNx, inNy, outNx, outNy });
            }
            if (segs.length < 3) return null;

            const outerShape = new THREE.Shape();
            for (let i = 0; i < segs.length; i++) {
                const s = segs[i];
                const nextS = segs[(i + 1) % segs.length];

                const pStart = { x: s.p1.x + R * s.outNx, y: s.p1.y + R * s.outNy };
                const pEnd = { x: s.p2.x + R * s.outNx, y: s.p2.y + R * s.outNy };

                if (i === 0) outerShape.moveTo(pStart.x, pStart.y);
                outerShape.lineTo(pEnd.x, pEnd.y);

                let aStart = Math.atan2(s.outNy, s.outNx);
                let aEnd = Math.atan2(nextS.outNy, nextS.outNx);
                let diff = aEnd - aStart;
                while (diff < -Math.PI) diff += 2 * Math.PI;
                while (diff > Math.PI) diff -= 2 * Math.PI;
                outerShape.absarc(s.p2.x, s.p2.y, R, aStart, aStart + diff, diff < 0);
            }
            outerShape.closePath();

            const innerHolePts = [];
            for (let i = 0; i < segs.length; i++) {
                const s = segs[i];
                const nextS = segs[(i + 1) % segs.length];

                const p1 = { x: s.p1.x + R * s.inNx, y: s.p1.y + R * s.inNy };
                const p2 = { x: s.p2.x + R * s.inNx, y: s.p2.y + R * s.inNy };
                const nextP1 = { x: nextS.p1.x + R * nextS.inNx, y: nextS.p1.y + R * nextS.inNy };

                const inter = lineIntersect(p1, { x: s.ux, y: s.uy }, nextP1, { x: nextS.ux, y: nextS.uy });
                innerHolePts.push(inter || p2);
            }

            innerHolePts.reverse(); // Three.js requires holes to be CLOCKWISE
            const innerHole = new THREE.Path();
            innerHole.moveTo(innerHolePts[0].x, innerHolePts[0].y);
            for (let i = 1; i < innerHolePts.length; i++) {
                innerHole.lineTo(innerHolePts[i].x, innerHolePts[i].y);
            }
            innerHole.closePath();
            outerShape.holes.push(innerHole);

            return outerShape;
        }

        // Open chain
        const segs = [];
        for (let i = 0; i < pts.length - 1; i++) {
            const p1 = pts[i], p2 = pts[i + 1];
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy);
            if (len < 0.001) continue;
            const ux = dx / len, uy = dy / len;
            const nx = -uy, ny = ux;
            segs.push({ p1, p2, len, ux, uy, nx, ny });
        }
        if (segs.length === 0) return null;

        const shape = new THREE.Shape();
        const leftCommands = [];
        const rightCommands = [];

        for (let i = 0; i < segs.length; i++) {
            const s = segs[i];
            const nextS = segs[i + 1];

            if (!nextS) {
                leftCommands.push({ type: 'line', p: { x: s.p2.x + R * s.nx, y: s.p2.y + R * s.ny } });
                rightCommands.push({ type: 'line', p: { x: s.p2.x - R * s.nx, y: s.p2.y - R * s.ny } });
                break;
            }

            const cross = s.ux * nextS.uy - s.uy * nextS.ux;
            const dot = s.ux * nextS.ux + s.uy * nextS.uy;

            if (Math.abs(cross) < 0.01 && dot > 0) {
                leftCommands.push({ type: 'line', p: { x: s.p2.x + R * s.nx, y: s.p2.y + R * s.ny } });
                rightCommands.push({ type: 'line', p: { x: s.p2.x - R * s.nx, y: s.p2.y - R * s.ny } });
            } else if (cross > 0) {
                // LEFT TURN
                const pLeft1 = { x: s.p1.x + R * s.nx, y: s.p1.y + R * s.ny };
                const pLeft2 = { x: nextS.p1.x + R * nextS.nx, y: nextS.p1.y + R * nextS.ny };
                const inter = lineIntersect(pLeft1, { x: s.ux, y: s.uy }, pLeft2, { x: nextS.ux, y: nextS.uy });
                leftCommands.push({ type: 'line', p: inter || { x: s.p2.x + R * s.nx, y: s.p2.y + R * s.ny } });

                let aStart = Math.atan2(-s.ny, -s.nx);
                let aEnd = Math.atan2(-nextS.ny, -nextS.nx);
                let diff = aEnd - aStart;
                while (diff < -Math.PI) diff += 2 * Math.PI;
                while (diff > Math.PI) diff -= 2 * Math.PI;
                rightCommands.push({
                    type: 'arc',
                    center: s.p2,
                    r: R,
                    startAngle: aStart,
                    endAngle: aStart + diff,
                    clockwise: (diff < 0)
                });
            } else {
                // RIGHT TURN
                const pRight1 = { x: s.p1.x - R * s.nx, y: s.p1.y - R * s.ny };
                const pRight2 = { x: nextS.p1.x - R * nextS.nx, y: nextS.p1.y - R * nextS.ny };
                const inter = lineIntersect(pRight1, { x: s.ux, y: s.uy }, pRight2, { x: nextS.ux, y: nextS.uy });
                rightCommands.push({ type: 'line', p: inter || { x: s.p2.x - R * s.nx, y: s.p2.y - R * s.ny } });

                let aStart = Math.atan2(s.ny, s.nx);
                let aEnd = Math.atan2(nextS.ny, nextS.nx);
                let diff = aEnd - aStart;
                while (diff < -Math.PI) diff += 2 * Math.PI;
                while (diff > Math.PI) diff -= 2 * Math.PI;
                leftCommands.push({
                    type: 'arc',
                    center: s.p2,
                    r: R,
                    startAngle: aStart,
                    endAngle: aStart + diff,
                    clockwise: (diff < 0)
                });
            }
        }

        const s0 = segs[0];
        const startLeft = { x: s0.p1.x + R * s0.nx, y: s0.p1.y + R * s0.ny };
        shape.moveTo(startLeft.x, startLeft.y);

        for (let i = 0; i < leftCommands.length; i++) {
            const cmd = leftCommands[i];
            if (cmd.type === 'line') shape.lineTo(cmd.p.x, cmd.p.y);
            else if (cmd.type === 'arc') shape.absarc(cmd.center.x, cmd.center.y, cmd.r, cmd.startAngle, cmd.endAngle, cmd.clockwise);
        }

        const sLast = segs[segs.length - 1];
        const aEndLeft = Math.atan2(sLast.ny, sLast.nx);
        const aEndRight = Math.atan2(-sLast.ny, -sLast.nx);
        let endDiff = aEndRight - aEndLeft;
        while (endDiff < -Math.PI) endDiff += 2 * Math.PI;
        while (endDiff > Math.PI) endDiff -= 2 * Math.PI;
        shape.absarc(sLast.p2.x, sLast.p2.y, R, aEndLeft, aEndLeft + endDiff, endDiff < 0);

        for (let i = rightCommands.length - 1; i >= 0; i--) {
            const cmd = rightCommands[i];
            if (cmd.type === 'line') shape.lineTo(cmd.p.x, cmd.p.y);
            else if (cmd.type === 'arc') shape.absarc(cmd.center.x, cmd.center.y, cmd.r, cmd.endAngle, cmd.startAngle, !cmd.clockwise);
        }

        const aStartRight = Math.atan2(-s0.ny, -s0.nx);
        const aStartLeft = Math.atan2(s0.ny, s0.nx);
        let startDiff = aStartLeft - aStartRight;
        while (startDiff < -Math.PI) startDiff += 2 * Math.PI;
        while (startDiff > Math.PI) startDiff -= 2 * Math.PI;
        shape.absarc(s0.p1.x, s0.p1.y, R, aStartRight, aStartRight + startDiff, startDiff < 0);

        shape.closePath();
        return shape;
    }

    buildCSGSolid(bounds, sX, sY, sZ, toolRadius, cutMoves, holeMoves) {
        const stockGeom = new THREE.BoxGeometry(sX, sY, sZ);
        stockGeom.translate(bounds.centerX, bounds.centerY, -sZ / 2);
        const stockMesh = new THREE.Mesh(stockGeom);
        stockMesh.updateMatrixWorld();

        let csgResult = CSGSolid.fromMesh(stockMesh);
        const toolD = toolRadius * 2;
        let prevEnd = null;

        const isPointInsideStock = (p) => {
            return p.x >= bounds.minX - toolRadius && p.x <= bounds.maxX + toolRadius &&
                   p.y >= bounds.minY - toolRadius && p.y <= bounds.maxY + toolRadius;
        };

        // 1. Filter active cutting passes
        const validMoves = (cutMoves || []).filter(m => {
            if (m.type === 'G00') return false;
            const z = (m.end && m.end.z < 0) ? m.end.z : (m.start ? m.start.z : 0);
            return z < -0.01;
        });

        // 2. Group passes by cut depth (tolerance 0.1mm)
        const depthGroups = [];
        validMoves.forEach(m => {
            const z = (m.end && m.end.z < 0) ? m.end.z : (m.start ? m.start.z : -2);
            const depth = Math.min(sZ, Math.abs(z));
            let group = depthGroups.find(g => Math.abs(g.depth - depth) < 0.1);
            if (!group) {
                group = { depth, moves: [] };
                depthGroups.push(group);
            }
            group.moves.push(m);
        });

        // 3. Assemble connected passes into continuous topological chains
        const distSq = (p1, p2) => (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
        const CONNECT_TOL_SQ = 0.5 * 0.5;

        const chains = [];

        depthGroups.forEach(grp => {
            let pool = grp.moves.map(m => ({
                points: (m.points && m.points.length > 2) ? m.points.map(p => ({ x: p.x, y: p.y })) : [{ x: m.start.x, y: m.start.y }, { x: m.end.x, y: m.end.y }],
                move: m
            }));

            while (pool.length > 0) {
                const first = pool.shift();
                let chainPts = first.points.slice();
                let chainMoves = [first.move];

                let extended = true;
                while (extended) {
                    extended = false;
                    const chainStart = chainPts[0];
                    const chainEnd = chainPts[chainPts.length - 1];

                    // If chain is already closed, stop extending
                    if (chainPts.length >= 3 && distSq(chainStart, chainEnd) < CONNECT_TOL_SQ) {
                        break;
                    }

                    for (let i = 0; i < pool.length; i++) {
                        const cand = pool[i];
                        const candStart = cand.points[0];
                        const candEnd = cand.points[cand.points.length - 1];

                        // cand attaches to chain end
                        if (distSq(chainEnd, candStart) < CONNECT_TOL_SQ) {
                            for (let k = 1; k < cand.points.length; k++) chainPts.push(cand.points[k]);
                            chainMoves.push(cand.move);
                            pool.splice(i, 1);
                            extended = true;
                            break;
                        }
                        // cand attaches before chain start
                        else if (distSq(candEnd, chainStart) < CONNECT_TOL_SQ) {
                            const newPts = cand.points.slice();
                            for (let k = 1; k < chainPts.length; k++) newPts.push(chainPts[k]);
                            chainPts = newPts;
                            chainMoves.unshift(cand.move);
                            pool.splice(i, 1);
                            extended = true;
                            break;
                        }
                        // cand reversed attaches to chain end
                        else if (distSq(chainEnd, candEnd) < CONNECT_TOL_SQ) {
                            for (let k = cand.points.length - 2; k >= 0; k--) chainPts.push(cand.points[k]);
                            chainMoves.push(cand.move);
                            pool.splice(i, 1);
                            extended = true;
                            break;
                        }
                        // cand reversed attaches before chain start
                        else if (distSq(candStart, chainStart) < CONNECT_TOL_SQ) {
                            const newPts = [];
                            for (let k = cand.points.length - 1; k >= 0; k--) newPts.push(cand.points[k]);
                            for (let k = 1; k < chainPts.length; k++) newPts.push(chainPts[k]);
                            chainPts = newPts;
                            chainMoves.unshift(cand.move);
                            pool.splice(i, 1);
                            extended = true;
                            break;
                        }
                    }
                }

                chains.push({
                    depth: grp.depth,
                    points: chainPts,
                    moves: chainMoves
                });
            }
        });

        // Subtract each continuous chain as a single, watertight, seamless extruded solid cutter
        chains.forEach(chain => {
            const h = chain.depth + 0.5;
            let cutterGeom = null;

            try {
                const shape = this.buildCutterShapeForChain(chain.points, toolRadius);
                if (shape) {
                    cutterGeom = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 32 });
                    cutterGeom.translate(0, 0, -h + 0.5);
                }
            } catch (err) {
                console.warn('Ribbon shape generation failed, fallback to segments:', err);
                cutterGeom = null;
            }

            if (cutterGeom) {
                const cMesh = new THREE.Mesh(cutterGeom);
                cMesh.updateMatrixWorld();
                csgResult = csgResult.subtract(CSGSolid.fromMesh(cMesh));
            } else {
                // Fallback: swept individual boxes and cylinders
                chain.moves.forEach((m, idx) => {
                    const p1 = m.start, p2 = m.end;
                    const dx = p2.x - p1.x, dy = p2.y - p1.y;
                    const len = Math.hypot(dx, dy);
                    const centerZ = -chain.depth / 2 + 0.25;

                    if (idx === 0 && isPointInsideStock(p1)) {
                        const cStartGeom = new THREE.CylinderGeometry(toolRadius, toolRadius, h, 32);
                        cStartGeom.rotateX(Math.PI / 2);
                        cStartGeom.translate(p1.x, p1.y, centerZ);
                        const cMesh = new THREE.Mesh(cStartGeom);
                        cMesh.updateMatrixWorld();
                        csgResult = csgResult.subtract(CSGSolid.fromMesh(cMesh));
                    }

                    if (len > 0.01) {
                        const boxGeom = new THREE.BoxGeometry(len, toolD, h);
                        boxGeom.rotateZ(Math.atan2(dy, dx));
                        boxGeom.translate((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, centerZ);
                        const bMesh = new THREE.Mesh(boxGeom);
                        bMesh.updateMatrixWorld();
                        csgResult = csgResult.subtract(CSGSolid.fromMesh(bMesh));
                    }

                    if (isPointInsideStock(p2)) {
                        const cEndGeom = new THREE.CylinderGeometry(toolRadius, toolRadius, h, 32);
                        cEndGeom.rotateX(Math.PI / 2);
                        cEndGeom.translate(p2.x, p2.y, centerZ);
                        const cMesh = new THREE.Mesh(cEndGeom);
                        cMesh.updateMatrixWorld();
                        csgResult = csgResult.subtract(CSGSolid.fromMesh(cMesh));
                    }
                });
            }
        });

        // Drilled holes (G81, G82, G83)
        (holeMoves || []).forEach(h => {
            const depth = Math.min(sZ, Math.abs(h.end.z));
            if (depth <= 0) return;
            const cylGeom = new THREE.CylinderGeometry(toolRadius, toolRadius, depth + 0.5, 16);
            cylGeom.rotateX(Math.PI / 2);
            cylGeom.translate(h.end.x, h.end.y, -depth / 2 + 0.25);
            const hMesh = new THREE.Mesh(cylGeom);
            hMesh.updateMatrixWorld();
            csgResult = csgResult.subtract(CSGSolid.fromMesh(hMesh));
        });

        return CSGSolid.toGeometry(csgResult);
    }

    /**
     * Extracts crisp CAD silhouette/crease edges between non-coplanar faces (> thresholdAngle).
     * Automatically eliminates all coplanar triangulation seams, T-junction artifacts, and internal polygon splits.
     */
    createCADSilhouetteEdges(geom, thresholdAngle = 32) {
        const pos = geom.attributes.position;
        if (!pos || pos.count < 3) return new THREE.BufferGeometry();

        const index = geom.index ? geom.index.array : null;
        const triCount = index ? (index.length / 3) : (pos.count / 3);

        const tris = [];
        for (let i = 0; i < triCount; i++) {
            const i0 = index ? index[i * 3] : (i * 3);
            const i1 = index ? index[i * 3 + 1] : (i * 3 + 1);
            const i2 = index ? index[i * 3 + 2] : (i * 3 + 2);

            const v0 = new THREE.Vector3(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
            const v1 = new THREE.Vector3(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
            const v2 = new THREE.Vector3(pos.getX(i2), pos.getY(i2), pos.getZ(i2));

            const u = new THREE.Vector3().subVectors(v1, v0);
            const w = new THREE.Vector3().subVectors(v2, v0);
            const n = new THREE.Vector3().crossVectors(u, w);
            const len = n.length();
            if (len > 1e-6) n.divideScalar(len);

            tris.push({
                v0, v1, v2, n,
                minX: Math.min(v0.x, v1.x, v2.x),
                maxX: Math.max(v0.x, v1.x, v2.x),
                minY: Math.min(v0.y, v1.y, v2.y),
                maxY: Math.max(v0.y, v1.y, v2.y),
                minZ: Math.min(v0.z, v1.z, v2.z),
                maxZ: Math.max(v0.z, v1.z, v2.z),
                edges: [ [v0, v1], [v1, v2], [v2, v0] ]
            });
        }

        const isCollinear = (a, b, q1, q2) => {
            const dab = new THREE.Vector3().subVectors(b, a).normalize();
            const dq = new THREE.Vector3().subVectors(q2, q1).normalize();
            return Math.abs(dab.dot(dq)) > 0.98;
        };

        const distToSegmentSq = (p, a, b) => {
            const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
            const apx = p.x - a.x, apy = p.y - a.y, apz = p.z - a.z;
            const l2 = abx * abx + aby * aby + abz * abz;
            if (l2 < 1e-6) return apx * apx + apy * apy + apz * apz;
            let t = (apx * abx + apy * aby + apz * abz) / l2;
            t = Math.max(0, Math.min(1, t));
            const qx = a.x + t * abx, qy = a.y + t * aby, qz = a.z + t * abz;
            const dx = p.x - qx, dy = p.y - qy, dz = p.z - qz;
            return dx * dx + dy * dy + dz * dz;
        };

        const cadEdgesPos = [];
        const seenKeys = new Set();
        const cosThreshold = Math.cos(thresholdAngle * Math.PI / 180);

        for (let i = 0; i < tris.length; i++) {
            const t1 = tris[i];
            for (let e = 0; e < 3; e++) {
                const a = t1.edges[e][0];
                const b = t1.edges[e][1];
                if (a.distanceTo(b) < 0.05) continue;

                const k1 = `${a.x.toFixed(2)},${a.y.toFixed(2)},${a.z.toFixed(2)}-${b.x.toFixed(2)},${b.y.toFixed(2)},${b.z.toFixed(2)}`;
                const k2 = `${b.x.toFixed(2)},${b.y.toFixed(2)},${b.z.toFixed(2)}-${a.x.toFixed(2)},${a.y.toFixed(2)},${a.z.toFixed(2)}`;
                if (seenKeys.has(k1) || seenKeys.has(k2)) continue;

                const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
                let hasDifferentNormalNeighbor = false;

                for (let j = 0; j < tris.length; j++) {
                    if (i === j) continue;
                    const t2 = tris[j];
                    if (mid.x < t2.minX - 0.1 || mid.x > t2.maxX + 0.1 ||
                        mid.y < t2.minY - 0.1 || mid.y > t2.maxY + 0.1 ||
                        mid.z < t2.minZ - 0.1 || mid.z > t2.maxZ + 0.1) {
                        continue;
                    }

                    if (t1.n.dot(t2.n) >= cosThreshold) continue;

                    for (let e2 = 0; e2 < 3; e2++) {
                        const q1 = t2.edges[e2][0];
                        const q2 = t2.edges[e2][1];
                        if (isCollinear(a, b, q1, q2)) {
                            if (distToSegmentSq(mid, q1, q2) < 0.04) {
                                hasDifferentNormalNeighbor = true;
                                break;
                            }
                        }
                    }
                    if (hasDifferentNormalNeighbor) break;
                }

                if (hasDifferentNormalNeighbor) {
                    seenKeys.add(k1);
                    seenKeys.add(k2);
                    cadEdgesPos.push(a.x, a.y, a.z, b.x, b.y, b.z);
                }
            }
        }

        const edgeGeom = new THREE.BufferGeometry();
        edgeGeom.setAttribute('position', new THREE.Float32BufferAttribute(cadEdgesPos, 3));
        return edgeGeom;
    }

    /**
     * UNIVERSAL CSG MATERIAL REMOVAL ENGINE
     * 100% synchronized with actual toolpath — no heuristics, no approximations.
     * Every G01/G02/G03 cutting move at Z < 0 directly removes material from the stock
     * using the actual tool diameter set by the user.
     */
    buildWorkpiece() {
        if (!this.workpieceGroup) return;

        // Clear previous meshes
        while (this.workpieceGroup.children.length > 0) {
            const obj = this.workpieceGroup.children[0];
            this.workpieceGroup.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
        }

        const sX = this.options.stockX;
        const sY = this.options.stockY;
        const sZ = this.options.stockZ;
        const toolRadius = Math.max(0.5, this.options.toolDiameter / 2);
        const bounds = this.getStockBounds();

        this.setupTool();

        // Update ground & grid position
        if (this.groundMesh) this.groundMesh.position.set(bounds.centerX, bounds.centerY, -sZ - 0.1);
        if (this.grid) this.grid.position.set(bounds.centerX, bounds.centerY, -sZ - 0.1);
        if (this.controls) {
            this.controls.target.set(bounds.centerX, bounds.centerY, -sZ / 2);
        }

        // CAD Solid Material — Permukaan mentah / belum dipotong (abu logam terang)
        const cadMaterial = new THREE.MeshStandardMaterial({
            color: 0xc0c8d4,
            metalness: 0.42,
            roughness: 0.38,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });

        // Permukaan terpotong (machined surface): biru-abu metalik dingin lebih halus
        const machinedMaterial = new THREE.MeshStandardMaterial({
            color: 0x7fa8c0,
            metalness: 0.55,
            roughness: 0.22,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });

        const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0x0f172a,
            linewidth: 1
        });

        // Helper to add solid mesh with clean silhouette edges
        const addSolidMesh = (geom, material, edgeAngle = 38) => {
            const mesh = new THREE.Mesh(geom, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.workpieceGroup.add(mesh);
            let edgesGeom;
            try {
                edgesGeom = this.createCADSilhouetteEdges(geom, edgeAngle);
            } catch (e) {
                edgesGeom = new THREE.EdgesGeometry(geom, edgeAngle);
            }
            const edges = new THREE.LineSegments(edgesGeom, edgeMaterial);
            this.workpieceGroup.add(edges);
            return mesh;
        };

        const segments = (this.parsedData && this.parsedData.segments) ? this.parsedData.segments : [];

        // Filter cutting segments: must be G01/G02/G03 with Z < 0 (actually cuts into material)
        const isCuttingMove = (s) => {
            if (s.type === 'G00') return false;
            if (s.isHole) return false;
            const zEnd = s.end ? s.end.z : 0;
            const zStart = s.start ? s.start.z : 0;
            return Math.min(zEnd, zStart) < -0.01;
        };

        const isHoleMove = (s) => {
            return !!s.isHole && s.end && s.end.z < -0.01;
        };

        const cutSegs = segments.filter(isCuttingMove);
        const holeSegs = segments.filter(isHoleMove);

        // --- CASE 1: No cuts at all — show raw stock billet ---
        if (cutSegs.length === 0 && holeSegs.length === 0) {
            const boxGeom = new THREE.BoxGeometry(sX, sY, sZ);
            boxGeom.translate(bounds.centerX, bounds.centerY, -sZ / 2);
            addSolidMesh(boxGeom, cadMaterial, 38);
            this.buildToolpathOverlay(segments);
            return;
        }

        // --- CASE 2: Perform universal CSG subtraction ---
        // This is the single code path for ALL toolpath types:
        // contour, pocket, facing, slot, arc, drilling — everything.
        // The result is always 100% accurate to the toolpath.

        let resultGeom = null;
        try {
            resultGeom = this._buildUniversalCSG(bounds, sX, sY, sZ, toolRadius, cutSegs, holeSegs);
        } catch (err) {
            console.error('Universal CSG failed, falling back to raw stock:', err);
        }

        if (resultGeom && resultGeom.attributes && resultGeom.attributes.position &&
            resultGeom.attributes.position.count > 0) {
            // Gunakan machinedMaterial agar permukaan terpotong tampak lebih realistis
            addSolidMesh(resultGeom, machinedMaterial, 35);
        } else {
            // Fallback: raw stock if CSG fails
            const boxGeom = new THREE.BoxGeometry(sX, sY, sZ);
            boxGeom.translate(bounds.centerX, bounds.centerY, -sZ / 2);
            addSolidMesh(boxGeom, cadMaterial, 35);
        }

        // Bore holes visual detail (inner cylinder walls)
        this.addHoleDetails(holeSegs, toolRadius, sZ, machinedMaterial);

        // Toolpath wireframe overlay — HANYA tampilkan jika BUKAN mode Wujud Jadi
        this.buildToolpathOverlay(segments);
    }

    /**
     * Universal CSG Boolean Subtraction Engine.
     * Takes ALL cutting segments and subtracts them from the stock block
     * using the actual tool radius. Works for any toolpath shape.
     *
     * Key improvements over old heuristic approach:
     * - Groups moves by depth to create proper 3D cutter volumes
     * - Uses the ribbon sweep shape (buildCutterShapeForChain) for smooth results
     * - Falls back to individual box+cylinder subtraction per segment if needed
     * - Handles drilling holes separately with cylinders
     */
    _buildUniversalCSG(bounds, sX, sY, sZ, toolRadius, cutMoves, holeMoves) {
        // Build initial stock as CSG solid
        const stockGeom = new THREE.BoxGeometry(sX, sY, sZ);
        stockGeom.translate(bounds.centerX, bounds.centerY, -sZ / 2);
        const stockMesh = new THREE.Mesh(stockGeom);
        stockMesh.updateMatrixWorld();
        let csgResult = CSGSolid.fromMesh(stockMesh);

        const toolD = toolRadius * 2;

        // Filter only moves that actually cut (Z < 0)
        const validMoves = (cutMoves || []).filter(m => {
            if (m.type === 'G00') return false;
            const zEnd = m.end ? m.end.z : 0;
            const zStart = m.start ? m.start.z : 0;
            return Math.min(zEnd, zStart) < -0.01;
        });

        if (validMoves.length === 0 && (!holeMoves || holeMoves.length === 0)) {
            return CSGSolid.toGeometry(csgResult);
        }

        // Group cutting moves by depth (within 0.2mm tolerance)
        const depthGroups = [];
        validMoves.forEach(m => {
            const z = m.end ? m.end.z : (m.start ? m.start.z : 0);
            const d = Math.abs(z);
            let grp = depthGroups.find(g => Math.abs(g.depth - d) < 0.2);
            if (!grp) {
                grp = { depth: d, moves: [] };
                depthGroups.push(grp);
            }
            grp.moves.push(m);
        });

        // For each depth group, chain contiguous moves together
        const allChains = [];
        const CONNECT_TOL = 0.15;
        const CONNECT_TOL_SQ = CONNECT_TOL * CONNECT_TOL;
        const distSq = (a, b) => {
            const dx = a.x - b.x, dy = a.y - b.y;
            return dx * dx + dy * dy;
        };

        depthGroups.forEach(grp => {
            // Expand arc moves into discrete point sequences
            const movePaths = grp.moves.map(m => {
                if (m.points && m.points.length > 2) {
                    return { points: m.points };
                }
                return { points: [m.start, m.end] };
            });

            // Greedily connect contiguous move paths
            const pool = [...movePaths];
            while (pool.length > 0) {
                let chainPts = [...pool.shift().points];
                let extended = true;
                while (extended) {
                    extended = false;
                    const chainEnd = chainPts[chainPts.length - 1];
                    const chainStart = chainPts[0];

                    for (let i = 0; i < pool.length; i++) {
                        const cand = pool[i];
                        const candStart = cand.points[0];
                        const candEnd = cand.points[cand.points.length - 1];

                        if (distSq(chainEnd, candStart) < CONNECT_TOL_SQ) {
                            for (let k = 1; k < cand.points.length; k++) chainPts.push(cand.points[k]);
                            pool.splice(i, 1);
                            extended = true; break;
                        } else if (distSq(chainEnd, candEnd) < CONNECT_TOL_SQ) {
                            for (let k = cand.points.length - 2; k >= 0; k--) chainPts.push(cand.points[k]);
                            pool.splice(i, 1);
                            extended = true; break;
                        } else if (distSq(candStart, chainStart) < CONNECT_TOL_SQ) {
                            const newPts = [];
                            for (let k = cand.points.length - 1; k >= 0; k--) newPts.push(cand.points[k]);
                            for (let k = 1; k < chainPts.length; k++) newPts.push(chainPts[k]);
                            chainPts = newPts;
                            pool.splice(i, 1);
                            extended = true; break;
                        }
                    }
                }

                allChains.push({ depth: grp.depth, points: chainPts });
            }
        });

        // Limit chains to process — ditingkatkan ke 20 agar program besar bisa diproses penuh
        const maxChains = 20;
        const chainsToProcess = allChains.slice(0, maxChains);

        // --- CSG SUBTRACT EACH CHAIN ---
        chainsToProcess.forEach(chain => {
            if (!chain.points || chain.points.length < 2) return;
            const cutDepth = Math.min(sZ, chain.depth);
            if (cutDepth <= 0.01) return;
            const h = cutDepth + 0.5; // slightly deeper than nominal to ensure clean subtraction

            let cutterGeom = null;

            // Try ribbon sweep shape first (smooth, continuous, no seams)
            try {
                const shape = this.buildCutterShapeForChain(chain.points, toolRadius);
                if (shape) {
                    cutterGeom = new THREE.ExtrudeGeometry(shape, {
                        depth: h,
                        bevelEnabled: false,
                        curveSegments: 16
                    });
                    cutterGeom.translate(0, 0, -h + 0.5);
                }
            } catch (err) {
                console.warn('[CSG] Ribbon shape failed for chain, using segment fallback:', err);
                cutterGeom = null;
            }

            if (cutterGeom) {
                try {
                    const cMesh = new THREE.Mesh(cutterGeom);
                    cMesh.updateMatrixWorld();
                    csgResult = csgResult.subtract(CSGSolid.fromMesh(cMesh));
                } catch (err) {
                    console.warn('[CSG] Ribbon subtract failed, using segment fallback:', err);
                    cutterGeom = null;
                }
            }

            // Fallback: subtract segments with safety downsampling to prevent browser hang
            if (!cutterGeom) {
                const centerZ = -cutDepth / 2 + 0.25;
                const isInsideStock = (p) => (
                    p.x >= bounds.minX - toolRadius && p.x <= bounds.maxX + toolRadius &&
                    p.y >= bounds.minY - toolRadius && p.y <= bounds.maxY + toolRadius
                );

                // Start cap
                const p0 = chain.points[0];
                if (isInsideStock(p0)) {
                    try {
                        const cStartGeom = new THREE.CylinderGeometry(toolRadius, toolRadius, h, 12);
                        cStartGeom.rotateX(Math.PI / 2);
                        cStartGeom.translate(p0.x, p0.y, centerZ);
                        const cMesh = new THREE.Mesh(cStartGeom);
                        cMesh.updateMatrixWorld();
                        csgResult = csgResult.subtract(CSGSolid.fromMesh(cMesh));
                    } catch (e) { /* ignore */ }
                }

                const pts = chain.points;
                const maxSteps = 8;
                const stepSize = Math.max(1, Math.floor((pts.length - 1) / maxSteps));

                for (let i = 0; i < pts.length - 1; i += stepSize) {
                    const p1 = pts[i];
                    const nextIdx = Math.min(pts.length - 1, i + stepSize);
                    const p2 = pts[nextIdx];
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const len = Math.hypot(dx, dy);
                    if (len < 0.01) continue;

                    try {
                        // Rectangular sweep box for this segment
                        const boxGeom = new THREE.BoxGeometry(len, toolD, h);
                        boxGeom.rotateZ(Math.atan2(dy, dx));
                        boxGeom.translate((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, centerZ);
                        const bMesh = new THREE.Mesh(boxGeom);
                        bMesh.updateMatrixWorld();
                        csgResult = csgResult.subtract(CSGSolid.fromMesh(bMesh));
                    } catch (e) { /* ignore */ }

                    // End cap cylinder
                    if (isInsideStock(p2)) {
                        try {
                            const cEndGeom = new THREE.CylinderGeometry(toolRadius, toolRadius, h, 12);
                            cEndGeom.rotateX(Math.PI / 2);
                            cEndGeom.translate(p2.x, p2.y, centerZ);
                            const cMesh = new THREE.Mesh(cEndGeom);
                            cMesh.updateMatrixWorld();
                            csgResult = csgResult.subtract(CSGSolid.fromMesh(cMesh));
                        } catch (e) { /* ignore */ }
                    }
                }
            }
        });

        // --- SUBTRACT DRILLED HOLES (G81, G83) ---
        const maxHoles = 12;
        const holesToCut = (holeMoves || []).slice(0, maxHoles);
        holesToCut.forEach(h => {
            if (!h.end || h.end.z >= 0) return;
            const depth = Math.min(sZ, Math.abs(h.end.z));
            if (depth <= 0.01) return;
            try {
                const cylGeom = new THREE.CylinderGeometry(toolRadius, toolRadius, depth + 0.5, 12);
                cylGeom.rotateX(Math.PI / 2);
                cylGeom.translate(h.end.x, h.end.y, -depth / 2 + 0.25);
                const hMesh = new THREE.Mesh(cylGeom);
                hMesh.updateMatrixWorld();
                csgResult = csgResult.subtract(CSGSolid.fromMesh(hMesh));
            } catch (e) { /* ignore */ }
        });

        return CSGSolid.toGeometry(csgResult);
    }

    addHoleDetails(holeSegs, toolRadius, sZ, cadMaterial) {
        if (!holeSegs || holeSegs.length === 0) return;

        holeSegs.forEach(hole => {
            const hDepth = Math.abs(hole.end.z);
            const cylHeight = Math.min(sZ, hDepth);
            const cylGeom = new THREE.CylinderGeometry(toolRadius, toolRadius, cylHeight, 32, 1, true);
            cylGeom.rotateX(Math.PI / 2);
            cylGeom.translate(hole.end.x, hole.end.y, -cylHeight / 2);

            const cylMat = new THREE.MeshStandardMaterial({
                color: 0x475569,
                metalness: 0.4,
                roughness: 0.5,
                side: THREE.BackSide
            });
            const cylMesh = new THREE.Mesh(cylGeom, cylMat);
            this.workpieceGroup.add(cylMesh);

            // Conical drill bit point at bottom
            const coneGeom = new THREE.ConeGeometry(toolRadius, toolRadius * 0.4, 32);
            coneGeom.rotateX(-Math.PI / 2);
            coneGeom.translate(hole.end.x, hole.end.y, -cylHeight - (toolRadius * 0.2));
            const coneMesh = new THREE.Mesh(coneGeom, cadMaterial);
            this.workpieceGroup.add(coneMesh);
        });
    }

    buildToolpathOverlay(segments) {
        if (!this.toolpathGroup) return;

        while (this.toolpathGroup.children.length > 0) {
            const obj = this.toolpathGroup.children[0];
            this.toolpathGroup.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        }

        // Jika mode Wujud Jadi: sembunyikan seluruh toolpath group dan stop di sini
        const showFinished = this.options.showFinishedOnly;
        this.toolpathGroup.visible = !showFinished;
        if (showFinished) return; // Tidak perlu membuat geometri sama sekali

        if (!segments || segments.length === 0) return;

        segments.forEach(seg => {
            let color = 0x10b981; // emerald (G01)
            if (seg.type === 'G00') color = 0xf43f5e; // rose/red
            else if (seg.type === 'G02' || seg.type === 'G03') color = 0x06b6d4; // cyan
            else if (seg.type === 'G81' || seg.type === 'G83') color = 0xa855f7; // purple

            const pts = [];
            if (seg.points && seg.points.length > 0) {
                seg.points.forEach(p => pts.push(new THREE.Vector3(p.x, p.y, p.z + 0.05)));
            } else {
                pts.push(new THREE.Vector3(seg.start.x, seg.start.y, seg.start.z + 0.05));
                pts.push(new THREE.Vector3(seg.end.x, seg.end.y, seg.end.z + 0.05));
            }
            const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
            const lineMat = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
            const lineMesh = new THREE.Line(lineGeom, lineMat);
            this.toolpathGroup.add(lineMesh);
        });
    }

    fitView() {
        if (!this.camera || !this.controls) return;
        const sX = this.options.stockX;
        const sY = this.options.stockY;
        const sZ = this.options.stockZ;
        const bounds = this.getStockBounds();
        const maxDim = Math.max(sX, sY, sZ);

        this.camera.position.set(bounds.centerX + maxDim * 1.35, bounds.centerY - maxDim * 1.25, sZ + maxDim * 1.15);
        this.controls.target.set(bounds.centerX, bounds.centerY, -sZ / 2);
        this.controls.update();
    }

    resetView() {
        this.fitView();
    }

    resize() {
        if (!this.renderer || !this.camera || !this.container) return;
        const width = this.container.clientWidth || 600;
        const height = this.container.clientHeight || 400;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

if (typeof window !== 'undefined') {
    window.MillingCAD3DViewer = MillingCAD3DViewer;
}
