/**
 * CNC Milling Code Validator & Educational Diagnostic Engine
 * Author: Antigravity AI / Muhammad Harist Mishbahuddin
 * Standard: ISO / Fanuc 3-Axis Milling (XYZ Plane)
 */

class CNCMillingValidator {
    constructor() {
        this.knownGCodes = [
            0, 1, 2, 3, 4, 17, 18, 19, 20, 21, 28, 40, 41, 42, 43, 49,
            53, 54, 55, 56, 57, 58, 59, 80, 81, 82, 83, 84, 85, 90, 91, 98, 99
        ];
        this.knownMCodes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 30, 98, 99];
    }

    validate(parsedData, stock) {
        if (!stock) stock = { lengthX: 100, widthY: 80, heightZ: 25, toolDiameter: 10 };
        const errors = [];
        const technicalWarnings = [];
        const blocks = parsedData.blocks || [];
        const segments = parsedData.segments || [];

        const stockX = stock.lengthX;
        const stockY = stock.widthY;
        const stockZ = stock.heightZ;
        const toolR = (stock.toolDiameter || 10) / 2;
        const wcsMode = stock.wcsMode || 'bottom-left';

        let minBoundX = 0, minBoundY = 0;
        if (wcsMode === 'top-left') {
            minBoundX = 0;
            minBoundY = -stockY;
        } else if (wcsMode === 'bottom-right') {
            minBoundX = -stockX;
            minBoundY = 0;
        } else if (wcsMode === 'top-right') {
            minBoundX = -stockX;
            minBoundY = -stockY;
        } else if (wcsMode === 'center') {
            minBoundX = -stockX / 2;
            minBoundY = -stockY / 2;
        }
        const maxBoundX = minBoundX + stockX;
        const maxBoundY = minBoundY + stockY;

        let hasM30 = false;
        let hasSpindleStart = false;
        let hasFeedSet = false;

        blocks.forEach((block) => {
            if (block.isEmpty) return;

            const lineNum = block.lineNum;
            const tokens = block.tokens;

            // G-Code syntax check
            if (tokens['G']) {
                tokens['G'].forEach((g) => {
                    if (!this.knownGCodes.includes(g)) {
                        errors.push({
                            lineNum: lineNum,
                            type: 'ERROR',
                            category: 'SINTAKS G-CODE',
                            message: 'Baris ' + lineNum + ': Perintah G' + g + ' tidak dikenali dalam standar Fanuc/ISO Milling.',
                            hint: 'Periksa kembali ejaan kode G (gunakan G00, G01, G02, G03, G17, G90, G54, G81, dll).'
                        });
                    }
                });
            }

            // M-Code syntax check
            if (tokens['M']) {
                tokens['M'].forEach((m) => {
                    if (m === 3 || m === 4) hasSpindleStart = true;
                    if (m === 30 || m === 2) hasM30 = true;
                    if (!this.knownMCodes.includes(m)) {
                        technicalWarnings.push({
                            lineNum: lineNum,
                            type: 'WARNING',
                            category: 'SINTAKS M-CODE',
                            message: 'Baris ' + lineNum + ': Kode M' + m + ' bukan kode M standar mesin frais dasar.',
                            hint: 'Gunakan M03 (Spindle CW), M05 (Spindle Stop), M06 (Tool Change), M08 (Coolant), atau M30 (Program Selesai).'
                        });
                    }
                });
            }

            // Feedrate check
            if (tokens['F'] && tokens['F'][0] > 0) {
                hasFeedSet = true;
                const fVal = tokens['F'][0];
                if (fVal > 2500) {
                    technicalWarnings.push({
                        lineNum: lineNum,
                        type: 'WARNING',
                        category: 'PARAMETER TEKNIS',
                        message: 'Baris ' + lineNum + ': Nilai Feedrate F=' + fVal + ' mm/min sangat tinggi untuk pemesinan frais baja/aluminium.',
                        hint: 'Sesuaikan nilai F (umumnya 100 - 800 mm/min) agar cutter tidak patah dan getaran minim.'
                    });
                }
            }

            // Cutting motion without feedrate
            if ((tokens['G'] && (tokens['G'].includes(1) || tokens['G'].includes(2) || tokens['G'].includes(3))) && !hasFeedSet) {
                technicalWarnings.push({
                    lineNum: lineNum,
                    type: 'WARNING',
                    category: 'PARAMETER TEKNIS',
                    message: 'Baris ' + lineNum + ': Pemakanan potong tanpa nilai Feedrate (F).',
                    hint: 'Tambahkan parameter F (misal: F150 atau F250 mm/min) untuk menentukan kecepatan meja mesin.'
                });
                hasFeedSet = true;
            }

            // Z-Depth collision check (Deep cut into vice/bed)
            if (block.hasMotion && block.endPoint.z < -stockZ - 0.5) {
                technicalWarnings.push({
                    lineNum: lineNum,
                    type: 'WARNING',
                    category: 'KESELAMATAN MEJA & RAGUM',
                    message: 'Baris ' + lineNum + ': Kedalaman Z (' + block.endPoint.z.toFixed(2) + 'mm) melebihi tebal bahan kerja (' + stockZ + 'mm).',
                    hint: 'Bahaya menabrak alas ragum penjepit (vice) atau meja kerja mesin frais! Periksa kembali kedalaman potong.'
                });
            }
        });

        // Crash Warning: Rapid traverse (G00) plunging into raw stock material
        segments.forEach((seg) => {
            if (seg.type === 'G00') {
                const endZ = seg.end.z;
                const endX = seg.end.x;
                const endY = seg.end.y;

                // Checking if tool position is within stock XY bounds and below surface Z=0
                const isInsideXY = (endX >= minBoundX - toolR && endX <= maxBoundX + toolR && endY >= minBoundY - toolR && endY <= maxBoundY + toolR);
                const isCuttingDepth = (endZ < -0.05);

                if (isInsideXY && isCuttingDepth) {
                    errors.push({
                        lineNum: seg.lineNum,
                        type: 'ERROR',
                        category: 'TABRAKAN (CRASH)',
                        message: 'Baris ' + seg.lineNum + ': Gerak cepat G00 menembus ke dalam bahan kerja (X: ' + endX.toFixed(1) + ', Y: ' + endY.toFixed(1) + ', Z: ' + endZ.toFixed(1) + ').',
                        hint: 'Gunakan G01 dengan kecepatan pemakanan (F) saat pisau frais menyentuh atau memotong bahan kerja. G00 hanya untuk pergerakan bebas di udara (Z > 0).'
                    });
                }
            }
        });

        // Check for missing M30
        if (!hasM30 && blocks.length > 3) {
            technicalWarnings.push({
                lineNum: blocks[blocks.length - 1].lineNum,
                type: 'WARNING',
                category: 'STRUKTUR PROGRAM',
                message: 'Program belum memiliki perintah akhir program M30 atau M02.',
                hint: 'Biasakan menutup program CNC dengan M30 (Program End & Rewind).'
            });
        }

        // Check for missing Spindle Start
        if (!hasSpindleStart && segments.some(s => s.type === 'G01' || s.type === 'G02' || s.type === 'G03' || s.type === 'G81' || s.type === 'G83')) {
            technicalWarnings.push({
                lineNum: 1,
                type: 'WARNING',
                category: 'PARAMETER TEKNIS',
                message: 'Spindle belum dinyalakan dengan perintah M03 / M04 sebelum pemotongan.',
                hint: 'Sertakan perintah kecepatan putar (contoh: S1500 M03) di awal program frais.'
            });
        }

        // Incorporate parser geometry errors
        if (parsedData.errors && parsedData.errors.length > 0) {
            parsedData.errors.forEach((err) => {
                if (err.type === 'ERROR') {
                    errors.push({
                        lineNum: err.lineNum,
                        type: 'ERROR',
                        category: err.category || 'GEOMETRI KURVA',
                        message: err.message,
                        hint: 'Periksa koordinat titik awal, titik akhir, dan nilai radius R / vektor I, J.'
                    });
                } else {
                    technicalWarnings.push({
                        lineNum: err.lineNum,
                        type: 'WARNING',
                        category: err.category || 'GEOMETRI KURVA',
                        message: err.message,
                        hint: 'Periksa parameter busur kurva agar kontur benda kerja presisi.'
                    });
                }
            });
        }

        errors.sort((a, b) => (a.lineNum || 0) - (b.lineNum || 0));
        technicalWarnings.sort((a, b) => (a.lineNum || 0) - (b.lineNum || 0));

        const all = [...errors, ...technicalWarnings].sort((a, b) => (a.lineNum || 0) - (b.lineNum || 0));

        return {
            all: all,
            errors: errors,
            technicalWarnings: technicalWarnings,
            errorLines: [...new Set(errors.map(e => e.lineNum).filter(Boolean))],
            warningLines: [...new Set(technicalWarnings.map(w => w.lineNum).filter(Boolean))]
        };
    }
}

if (typeof window !== 'undefined') {
    window.CNCMillingValidator = CNCMillingValidator;
}
