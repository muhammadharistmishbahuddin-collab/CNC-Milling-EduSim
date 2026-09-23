/**
 * CNC Milling G-Code Parser & 3D Geometry Engine
 * Author: Antigravity AI / Muhammad Harist Mishbahuddin
 * Standard: ISO / Fanuc 3-Axis Milling Format (G17 XY Plane, Z Depth)
 */

class MillingGCodeParser {
    constructor(options = {}) {
        this.options = Object.assign({
            defaultStockX: 100,
            defaultStockY: 80,
            defaultStockZ: 25,
            defaultToolD: 10,
            arcTolerance: 0.05
        }, options);
    }

    parse(gcodeText) {
        const lines = gcodeText.split(/\r?\n/);
        const blocks = [];
        const segments = [];
        const errors = [];
        
        // Machine initial home/park position
        let currentX = 0;
        let currentY = 0;
        let currentZ = 20; // Safe height above workpiece
        let currentFeed = 150;
        let currentSpindle = 0;
        let currentTool = 1;
        let motionMode = 'G00';
        let distanceMode = 'G90'; // G90 Absolute, G91 Incremental
        let planeMode = 'G17';    // G17 XY plane (default milling)
        let unitMode = 'G21';     // G21 Metric
        let spindleState = 'M05'; // M03 CW, M04 CCW, M05 Stop
        let coolantState = 'M09'; // M08 On, M09 Off
        let cutterComp = 'G40';   // G40 Off, G41 Left, G42 Right
        let activeCycle = null;   // G81, G83, or null
        let cycleRPlane = 2.0;    // Retract plane for cycles
        let cyclePeckQ = 2.0;     // Peck depth for G83
        let detectedToolDiameter = null;

        let totalCuttingDist = 0;
        let totalRapidDist = 0;
        let minCutX = Infinity, maxCutX = -Infinity;
        let minCutY = Infinity, maxCutY = -Infinity;
        let minCutZ = Infinity, maxCutZ = -Infinity;

        lines.forEach((rawLine, lineIndex) => {
            const lineNum = lineIndex + 1;

            // Check for tool diameter declaration in comment or D word, e.g. (ENDMILL D10), (D12), (Ø10), (PISAU D8)
            const toolCommentMatch = rawLine.match(/\((?:ENDMILL|CUTTER|TOOL|PISAU)?\s*[DØ](\d+(?:\.\d+)?)\s*(?:MM)?\)/i) ||
                                     rawLine.match(/T\d+\s+M0?6\s*\([^)]*[DØ](\d+(?:\.\d+)?)[^)]*\)/i);
            if (toolCommentMatch && !detectedToolDiameter) {
                const detectedD = parseFloat(toolCommentMatch[1]);
                if (detectedD > 0 && detectedD <= 100) {
                    detectedToolDiameter = detectedD;
                }
            }

            let cleanLine = rawLine.replace(/\([^\)]*\)/g, '').replace(/;.*$/, '').trim().toUpperCase();
            
            if (!cleanLine) {
                blocks.push({
                    lineNum: lineNum,
                    raw: rawLine,
                    isEmpty: true,
                    tokens: {}
                });
                return;
            }

            const tokens = {};
            const tokenRegex = /([A-Z])\s*([+-]?\d*\.?\d+)/g;
            let match;
            while ((match = tokenRegex.exec(cleanLine)) !== null) {
                const key = match[1];
                const val = parseFloat(match[2]);
                if (!tokens[key]) tokens[key] = [];
                tokens[key].push(val);
            }

            const gCodes = tokens['G'] || [];
            const mCodes = tokens['M'] || [];

            // Distance & Unit Modes
            if (gCodes.includes(90)) distanceMode = 'G90';
            if (gCodes.includes(91)) distanceMode = 'G91';
            if (gCodes.includes(21)) unitMode = 'G21';
            if (gCodes.includes(20)) unitMode = 'G20';

            // Work Plane
            if (gCodes.includes(17)) planeMode = 'G17';
            if (gCodes.includes(18)) planeMode = 'G18';
            if (gCodes.includes(19)) planeMode = 'G19';

            // Cutter Radius Compensation
            if (gCodes.includes(40)) cutterComp = 'G40';
            if (gCodes.includes(41)) cutterComp = 'G41';
            if (gCodes.includes(42)) cutterComp = 'G42';

            // Motion Modes
            if (gCodes.includes(0)) { motionMode = 'G00'; activeCycle = null; }
            if (gCodes.includes(1)) { motionMode = 'G01'; activeCycle = null; }
            if (gCodes.includes(2)) { motionMode = 'G02'; activeCycle = null; }
            if (gCodes.includes(3)) { motionMode = 'G03'; activeCycle = null; }

            // Canned Cycles
            if (gCodes.includes(80)) { activeCycle = null; motionMode = 'G00'; }
            if (gCodes.includes(81)) { activeCycle = 'G81'; motionMode = 'G81'; }
            if (gCodes.includes(83)) { activeCycle = 'G83'; motionMode = 'G83'; }

            // Spindle & Coolant M-Codes
            if (mCodes.includes(3)) spindleState = 'M03';
            if (mCodes.includes(4)) spindleState = 'M04';
            if (mCodes.includes(5)) spindleState = 'M05';
            if (mCodes.includes(8)) coolantState = 'M08';
            if (mCodes.includes(9)) coolantState = 'M09';

            if (tokens['F']) currentFeed = tokens['F'][0];
            if (tokens['S']) currentSpindle = tokens['S'][0];
            if (tokens['T']) currentTool = tokens['T'][0];
            if (tokens['R'] && activeCycle) cycleRPlane = tokens['R'][0];
            if (tokens['Q'] && activeCycle) cyclePeckQ = tokens['Q'][0];

            let targetX = currentX;
            let targetY = currentY;
            let targetZ = currentZ;
            let hasCoordChange = false;

            // Coordinate Calculation (Absolute G90 vs Incremental G91)
            if (tokens['X'] !== undefined) {
                const rawX = tokens['X'][0];
                targetX = (distanceMode === 'G90') ? rawX : (currentX + rawX);
                hasCoordChange = true;
            }

            if (tokens['Y'] !== undefined) {
                const rawY = tokens['Y'][0];
                targetY = (distanceMode === 'G90') ? rawY : (currentY + rawY);
                hasCoordChange = true;
            }

            if (tokens['Z'] !== undefined) {
                const rawZ = tokens['Z'][0];
                targetZ = (distanceMode === 'G90') ? rawZ : (currentZ + rawZ);
                hasCoordChange = true;
            }

            // G28 Machine Reference Home
            if (gCodes.includes(28)) {
                if (tokens['Z'] !== undefined) {
                    targetZ = 30;
                } else if (tokens['X'] !== undefined || tokens['Y'] !== undefined) {
                    targetX = 0;
                    targetY = 0;
                } else {
                    targetX = 0;
                    targetY = 0;
                    targetZ = 30;
                }
                motionMode = 'G00';
                hasCoordChange = true;
            }

            const startPoint = { x: currentX, y: currentY, z: currentZ };
            const endPoint = { x: targetX, y: targetY, z: targetZ };

            const blockData = {
                lineNum: lineNum,
                raw: rawLine,
                clean: cleanLine,
                tokens: tokens,
                motionMode: activeCycle || motionMode,
                distanceMode: distanceMode,
                planeMode: planeMode,
                feed: currentFeed,
                spindle: currentSpindle,
                tool: currentTool,
                spindleState: spindleState,
                coolantState: coolantState,
                cutterComp: cutterComp,
                startPoint: startPoint,
                endPoint: endPoint,
                hasMotion: hasCoordChange || (activeCycle && (tokens['X'] !== undefined || tokens['Y'] !== undefined))
            };

            if (blockData.hasMotion) {
                // Handling Canned Cycles (G81, G83)
                if (activeCycle === 'G81' || activeCycle === 'G83') {
                    const holeX = targetX;
                    const holeY = targetY;
                    const holeZ = (tokens['Z'] !== undefined) ? targetZ : -10;
                    const rZ = (tokens['R'] !== undefined) ? tokens['R'][0] : cycleRPlane;

                    // 1. Rapid traverse to hole position in XY
                    const rapidDistXY = Math.hypot(holeX - currentX, holeY - currentY);
                    if (rapidDistXY > 0.001) {
                        segments.push({
                            lineNum: lineNum,
                            type: 'G00',
                            start: { x: currentX, y: currentY, z: currentZ },
                            end: { x: holeX, y: holeY, z: currentZ },
                            feed: currentFeed,
                            spindle: currentSpindle,
                            spindleState: spindleState,
                            coolantState: coolantState,
                            distance: rapidDistXY
                        });
                        totalRapidDist += rapidDistXY;
                    }

                    // 2. Rapid to R plane
                    const rapidDownDist = Math.abs(currentZ - rZ);
                    segments.push({
                        lineNum: lineNum,
                        type: 'G00',
                        start: { x: holeX, y: holeY, z: currentZ },
                        end: { x: holeX, y: holeY, z: rZ },
                        feed: currentFeed,
                        spindle: currentSpindle,
                        spindleState: spindleState,
                        coolantState: coolantState,
                        distance: rapidDownDist
                    });
                    totalRapidDist += rapidDownDist;

                    // 3. Drill down to hole bottom (G01 / cycle cutting)
                    const drillDist = Math.abs(rZ - holeZ);
                    segments.push({
                        lineNum: lineNum,
                        type: activeCycle,
                        cutting: true,
                        isHole: true,
                        start: { x: holeX, y: holeY, z: rZ },
                        end: { x: holeX, y: holeY, z: holeZ },
                        center: null,
                        radius: null,
                        feed: currentFeed,
                        spindle: currentSpindle,
                        spindleState: spindleState,
                        coolantState: coolantState,
                        distance: drillDist,
                        points: [
                            { x: holeX, y: holeY, z: rZ },
                            { x: holeX, y: holeY, z: holeZ }
                        ]
                    });
                    totalCuttingDist += drillDist;

                    // 4. Retract back to R or safe plane
                    segments.push({
                        lineNum: lineNum,
                        type: 'G00',
                        start: { x: holeX, y: holeY, z: holeZ },
                        end: { x: holeX, y: holeY, z: rZ },
                        feed: currentFeed,
                        spindle: currentSpindle,
                        spindleState: spindleState,
                        coolantState: coolantState,
                        distance: drillDist
                    });
                    totalRapidDist += drillDist;

                    minCutX = Math.min(minCutX, holeX);
                    maxCutX = Math.max(maxCutX, holeX);
                    minCutY = Math.min(minCutY, holeY);
                    maxCutY = Math.max(maxCutY, holeY);
                    minCutZ = Math.min(minCutZ, holeZ);
                    maxCutZ = Math.max(maxCutZ, rZ);

                    currentX = holeX;
                    currentY = holeY;
                    currentZ = rZ;
                } else if (motionMode === 'G00' || motionMode === 'G01') {
                    const dist = Math.hypot(targetX - currentX, targetY - currentY, targetZ - currentZ);
                    if (motionMode === 'G00') {
                        totalRapidDist += dist;
                    } else {
                        totalCuttingDist += dist;
                        if (currentFeed <= 0) {
                            errors.push({
                                lineNum: lineNum,
                                type: 'WARNING',
                                category: 'PARAMETER',
                                message: 'Baris ' + lineNum + ': Gerak pemotongan ' + motionMode + ' tanpa nilai Feedrate (F).'
                            });
                        }
                    }

                    segments.push({
                        lineNum: lineNum,
                        type: motionMode,
                        cutting: (motionMode !== 'G00'),
                        isHole: false,
                        start: { x: currentX, y: currentY, z: currentZ },
                        end: { x: targetX, y: targetY, z: targetZ },
                        center: null,
                        radius: null,
                        feed: currentFeed,
                        spindle: currentSpindle,
                        spindleState: spindleState,
                        coolantState: coolantState,
                        cutterComp: cutterComp,
                        distance: dist,
                        points: [
                            { x: currentX, y: currentY, z: currentZ },
                            { x: targetX, y: targetY, z: targetZ }
                        ]
                    });

                    if (motionMode !== 'G00') {
                        minCutX = Math.min(minCutX, currentX, targetX);
                        maxCutX = Math.max(maxCutX, currentX, targetX);
                        minCutY = Math.min(minCutY, currentY, targetY);
                        maxCutY = Math.max(maxCutY, currentY, targetY);
                        minCutZ = Math.min(minCutZ, currentZ, targetZ);
                        maxCutZ = Math.max(maxCutZ, currentZ, targetZ);
                    }

                    currentX = targetX;
                    currentY = targetY;
                    currentZ = targetZ;
                } else if (motionMode === 'G02' || motionMode === 'G03') {
                    const arcResult = this.calculateArc({
                        lineNum: lineNum,
                        type: motionMode,
                        startX: currentX,
                        startY: currentY,
                        startZ: currentZ,
                        endX: targetX,
                        endY: targetY,
                        endZ: targetZ,
                        tokens: tokens,
                        errors: errors
                    });

                    if (arcResult) {
                        arcResult.spindle = currentSpindle;
                        arcResult.spindleState = spindleState;
                        arcResult.coolantState = coolantState;
                        arcResult.cutterComp = cutterComp;
                        segments.push(arcResult);
                        totalCuttingDist += arcResult.arcLength;

                        // Bounds
                        arcResult.points.forEach(pt => {
                            minCutX = Math.min(minCutX, pt.x);
                            maxCutX = Math.max(maxCutX, pt.x);
                            minCutY = Math.min(minCutY, pt.y);
                            maxCutY = Math.max(maxCutY, pt.y);
                            minCutZ = Math.min(minCutZ, pt.z);
                            maxCutZ = Math.max(maxCutZ, pt.z);
                        });
                    } else {
                        // Fallback invalid arc straight line
                        const dist = Math.hypot(targetX - currentX, targetY - currentY, targetZ - currentZ);
                        segments.push({
                            lineNum: lineNum,
                            type: motionMode,
                            start: { x: currentX, y: currentY, z: currentZ },
                            end: { x: targetX, y: targetY, z: targetZ },
                            feed: currentFeed,
                            spindle: currentSpindle,
                            spindleState: spindleState,
                            coolantState: coolantState,
                            cutterComp: cutterComp,
                            isInvalidArc: true,
                            distance: dist
                        });
                        totalCuttingDist += dist;
                    }

                    currentX = targetX;
                    currentY = targetY;
                    currentZ = targetZ;
                }
            }

            blocks.push(blockData);
        });

        const stats = {
            totalLines: lines.length,
            totalSegments: segments.length,
            totalCuttingDist: parseFloat(totalCuttingDist.toFixed(2)),
            totalRapidDist: parseFloat(totalRapidDist.toFixed(2)),
            totalDist: parseFloat((totalCuttingDist + totalRapidDist).toFixed(2)),
            estimatedTimeSec: currentFeed > 0 ? parseFloat(((totalCuttingDist / currentFeed) * 60 + (totalRapidDist / 3000) * 60).toFixed(1)) : 0
        };

        const toolpathBoundingBox = {
            hasCut: minCutX !== Infinity,
            minX: minCutX !== Infinity ? parseFloat(minCutX.toFixed(2)) : 0,
            maxX: maxCutX !== -Infinity ? parseFloat(maxCutX.toFixed(2)) : 0,
            minY: minCutY !== Infinity ? parseFloat(minCutY.toFixed(2)) : 0,
            maxY: maxCutY !== -Infinity ? parseFloat(maxCutY.toFixed(2)) : 0,
            minZ: minCutZ !== Infinity ? parseFloat(minCutZ.toFixed(2)) : 0,
            maxZ: maxCutZ !== -Infinity ? parseFloat(maxCutZ.toFixed(2)) : 0
        };

        const toolR = (detectedToolDiameter && detectedToolDiameter > 0) ? (detectedToolDiameter / 2) : 5.0;
        const machiningBoundingBox = {
            hasCut: toolpathBoundingBox.hasCut,
            minX: toolpathBoundingBox.hasCut ? parseFloat((toolpathBoundingBox.minX - toolR).toFixed(2)) : 0,
            maxX: toolpathBoundingBox.hasCut ? parseFloat((toolpathBoundingBox.maxX + toolR).toFixed(2)) : 0,
            minY: toolpathBoundingBox.hasCut ? parseFloat((toolpathBoundingBox.minY - toolR).toFixed(2)) : 0,
            maxY: toolpathBoundingBox.hasCut ? parseFloat((toolpathBoundingBox.maxY + toolR).toFixed(2)) : 0,
            minZ: toolpathBoundingBox.hasCut ? parseFloat(toolpathBoundingBox.minZ.toFixed(2)) : 0,
            maxZ: 0
        };

        return {
            blocks: blocks,
            segments: segments,
            parsedToolpath: segments,
            stats: stats,
            boundingBox: toolpathBoundingBox,
            toolpathBoundingBox: toolpathBoundingBox,
            machiningBoundingBox: machiningBoundingBox,
            errors: errors,
            distanceMode: distanceMode,
            planeMode: planeMode,
            detectedToolDiameter: detectedToolDiameter
        };
    }

    calculateArc(params) {
        const lineNum = params.lineNum;
        const type = params.type;
        const startX = params.startX;
        const startY = params.startY;
        const startZ = params.startZ;
        const endX = params.endX;
        const endY = params.endY;
        const endZ = params.endZ;
        const tokens = params.tokens;
        const errors = params.errors;

        const chordDist = Math.hypot(endX - startX, endY - startY);
        const isCW = (type === 'G02');

        let centerX, centerY, radius;

        if (tokens['R'] !== undefined) {
            const rawR = tokens['R'][0];
            radius = Math.abs(rawR);
            const isMajorArc = (rawR < 0);

            if (chordDist < 1e-6) {
                errors.push({
                    lineNum: lineNum,
                    type: 'WARNING',
                    category: 'GEOMETRI KURVA',
                    message: 'Baris ' + lineNum + ': Busur ' + type + ' dengan format R tidak dapat membuat lingkaran penuh 360°. Gunakan format I dan J.'
                });
                return null;
            }

            if (chordDist > 2 * radius + 1e-4) {
                const minReqR = (chordDist / 2).toFixed(2);
                errors.push({
                    lineNum: lineNum,
                    type: 'ERROR',
                    category: 'GEOMETRI KURVA',
                    message: 'Baris ' + lineNum + ': Nilai Radius R=' + rawR + ' terlalu kecil untuk menjangkau titik akhir (X: ' + endX.toFixed(2) + ', Y: ' + endY.toFixed(2) + '). Jarak titik=' + chordDist.toFixed(2) + 'mm, minimal R=' + minReqR + 'mm.'
                });
                return null;
            }

            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            const hSquare = Math.max(0, radius * radius - (chordDist / 2) * (chordDist / 2));
            const h = Math.sqrt(hSquare);

            const dX = (endX - startX) / chordDist;
            const dY = (endY - startY) / chordDist;

            // Normal unit vector in XY
            // Perpendicular to (dX, dY): CW turns right (+dY, -dX), CCW turns left (-dY, +dX)
            const nX = dY;
            const nY = -dX;

            if (isCW) {
                if (!isMajorArc) {
                    centerX = midX + h * nX;
                    centerY = midY + h * nY;
                } else {
                    centerX = midX - h * nX;
                    centerY = midY - h * nY;
                }
            } else {
                if (!isMajorArc) {
                    centerX = midX - h * nX;
                    centerY = midY - h * nY;
                } else {
                    centerX = midX + h * nX;
                    centerY = midY + h * nY;
                }
            }
        } else if (tokens['I'] !== undefined || tokens['J'] !== undefined) {
            const incI = tokens['I'] ? tokens['I'][0] : 0;
            const incJ = tokens['J'] ? tokens['J'][0] : 0;

            centerX = startX + incI;
            centerY = startY + incJ;

            const rStart = Math.hypot(startX - centerX, startY - centerY);
            const rEnd = Math.hypot(endX - centerX, endY - centerY);
            radius = rStart;

            if (rStart < 1e-6) {
                errors.push({
                    lineNum: lineNum,
                    type: 'ERROR',
                    category: 'GEOMETRI KURVA',
                    message: 'Baris ' + lineNum + ': Vektor I=' + incI + ', J=' + incJ + ' menghasilkan radius 0.'
                });
                return null;
            }

            if (Math.abs(rStart - rEnd) > this.options.arcTolerance && chordDist > 1e-4) {
                errors.push({
                    lineNum: lineNum,
                    type: 'WARNING',
                    category: 'GEOMETRI KURVA',
                    message: 'Baris ' + lineNum + ': Vektor I=' + incI + ', J=' + incJ + ' menghasilkan selisih radius awal (' + rStart.toFixed(2) + 'mm) & akhir (' + rEnd.toFixed(2) + 'mm) sebesar ' + Math.abs(rStart - rEnd).toFixed(3) + 'mm.'
                });
            }
        } else {
            errors.push({
                lineNum: lineNum,
                type: 'ERROR',
                category: 'GEOMETRI KURVA',
                message: 'Baris ' + lineNum + ': Perintah kurva ' + type + ' memerlukan parameter R atau I, J.'
            });
            return null;
        }

        const startAngle = Math.atan2(startY - centerY, startX - centerX);
        let endAngle = Math.atan2(endY - centerY, endX - centerX);

        let deltaAngle;
        if (chordDist < 1e-5) {
            // Full circle 360 degrees
            deltaAngle = 2 * Math.PI;
        } else {
            if (isCW) {
                deltaAngle = startAngle - endAngle;
                if (deltaAngle <= 0) deltaAngle += 2 * Math.PI;
            } else {
                deltaAngle = endAngle - startAngle;
                if (deltaAngle <= 0) deltaAngle += 2 * Math.PI;
            }
        }

        const arcLength = radius * deltaAngle;
        const numPoints = Math.max(16, Math.ceil(deltaAngle / (Math.PI / 24)));
        const arcPoints = [];

        for (let i = 0; i <= numPoints; i++) {
            const fraction = i / numPoints;
            const currentAngle = isCW 
                ? startAngle - fraction * deltaAngle 
                : startAngle + fraction * deltaAngle;
            
            const pX = centerX + radius * Math.cos(currentAngle);
            const pY = centerY + radius * Math.sin(currentAngle);
            const pZ = startZ + fraction * (endZ - startZ); // Supports helical ramp
            
            arcPoints.push({ x: pX, y: pY, z: pZ });
        }

        return {
            lineNum: lineNum,
            type: type,
            cutting: true,
            isHole: false,
            isCW: isCW,
            start: { x: startX, y: startY, z: startZ },
            end: { x: endX, y: endY, z: endZ },
            center: { x: centerX, y: centerY, z: startZ },
            radius: radius,
            feed: params.feed || 0,
            startAngle: startAngle,
            endAngle: endAngle,
            deltaAngle: deltaAngle,
            arcLength: arcLength,
            distance: arcLength,
            points: arcPoints
        };
    }
}

if (typeof window !== 'undefined') {
    window.MillingGCodeParser = MillingGCodeParser;
}
