/**
 * CNC Milling Educational Presets & Challenges
 * Author: Antigravity AI / Muhammad Harist Mishbahuddin
 * Standard: ISO / Fanuc 3-Axis Milling (G17 XY Plane)
 */

const CNC_PRESETS = [
    {
        id: 'preset-1',
        title: '1. Perataan Muka (Facing) & Alur Lurus (Linear Slot)',
        category: 'Dasar (G00, G01)',
        difficulty: 'Mudah',
        description: 'Latihan dasar pemesinan frais: Perataan permukaan atas benda kerja (Z0 ke Z-1.0) dengan lintasan zig-zag serta pembuatan alur pasak tengah.',
        learningObjective: 'Memahami koordinat bidang XY, posisi bidang aman (Safe Z), pemakanan vertikal (Z plunge), dan gerak potong lurus (G01).',
        stock: { lengthX: 100, widthY: 80, heightZ: 25, toolDiameter: 10 },
        code: `%
O0001 (PERATAAN MUKA DAN ALUR)
G21 G90 G17 G40 G49 G80
G28 G91 Z0
G90 G54
T01 M06 (ENDMILL D10)
S1500 M03
G00 X-10 Y10 (POSISI LUAR BENDA KERJA)
G00 Z5 (BIDANG AMAN)
G01 Z-1.0 F150 (TURUN KE KEDALAMAN POTONG)

(LINTASAN FACING ZIG-ZAG)
G01 X110 F350 (PASS 1)
G00 Y35
G01 X-10 (PASS 2)
G00 Y60
G01 X110 (PASS 3)
G00 Y70
G01 X-10 (PASS 4)

(ALUR LURUS TENGAH KEDALAMAN Z-3MM)
G00 Z5 (ANGKAT PAHAT)
G00 X20 Y40
G01 Z-3.0 F100
G01 X80 Y40 F250
G00 Z10 (ANGKAT AMAN)

G28 G91 Z0
M05
M30
%`
    },
    {
        id: 'preset-2',
        title: '2. Pemotongan Kontur Luar Balok & Chamfer 45°',
        category: 'Menengah (Interpolasi Linear X-Y)',
        difficulty: 'Mudah - Sedang',
        description: 'Mengefrais kontur tepi luar balok 100x80 mm dengan chamfer sudut C10 pada sisi depan dan pemakanan bertahap kedalaman Z-3 mm.',
        learningObjective: 'Mampu menghitung koordinat titik sudut chamfer 45° (interpolasi linear dua sumbu X dan Y simultan) serta lintasan lead-in dan lead-out.',
        stock: { lengthX: 100, widthY: 80, heightZ: 25, toolDiameter: 10 },
        code: `%
O0002 (KONTUR LUAR DAN SUDUT CHAMFER)
G21 G90 G17 G40 G49 G80
G28 G91 Z0
G90 G54
T01 M06 (ENDMILL D10)
S1800 M03 M08
G00 X-15 Y-15
G00 Z5
G01 Z-3.0 F120

(KONTUR LUAR KELILING DENGAN CHAMFER C10)
G01 X-5 Y5 F300 (LEAD IN)
G01 X-5 Y75
G01 X5 Y85 (CHAMFER SUDUT KIRI ATAS)
G01 X95 Y85
G01 X105 Y75 (CHAMFER SUDUT KANAN ATAS)
G01 X105 Y15
G01 X95 Y-5 (CHAMFER SUDUT KANAN BAWAH)
G01 X15 Y-5
G01 X-5 Y10 (CHAMFER SUDUT KIRI BAWAH)
G01 X-5 Y25 (OVERLAP)

(LEAD OUT & KELUAR)
G01 X-15 Y25
G00 Z10
M09
G28 G91 Z0
M05
M30
%`
    },
    {
        id: 'preset-3',
        title: '3. Kontur Kurva Radius Luar / Cembung (G02 CW Arc)',
        category: 'Kurva & Radius (G02)',
        difficulty: 'Sedang',
        description: 'Mengefrais balok dengan sudut radius cembung R15 pada keempat sudut luar menggunakan perintah G02 searah jarum jam.',
        learningObjective: 'Memahami prinsip kerja interpolasi melingkar G02 (Clockwise) pada bidang XY dengan parameter radius R.',
        stock: { lengthX: 100, widthY: 80, heightZ: 25, toolDiameter: 10 },
        code: `%
O0003 (KONTUR RADIUS CEMBUNG G02)
G21 G90 G17 G40 G49 G80
G28 G91 Z0
G90 G54
T01 M06 (ENDMILL D10)
S1600 M03
G00 X-15 Y20
G00 Z5
G01 Z-2.5 F120

(LEAD IN)
G01 X0 Y20 F280

(SISI KIRI LURUS KE MULAI RADIUS)
G01 Y65

(RADIUS SUDUT KIRI ATAS R15 DARI X0 Y65 KE X15 Y80)
G02 X15 Y80 R15

(SISI ATAS LURUS KE MULAI RADIUS)
G01 X85 Y80

(RADIUS SUDUT KANAN ATAS R15 DARI X85 Y80 KE X100 Y65)
G02 X100 Y65 R15

(SISI KANAN LURUS KE MULAI RADIUS)
G01 X100 Y15

(RADIUS SUDUT KANAN BAWAH R15 DARI X100 Y15 KE X85 Y0)
G02 X85 Y0 R15

(SISI BAWAH LURUS KE MULAI RADIUS)
G01 X15 Y0

(RADIUS SUDUT KIRI BAWAH R15 DARI X15 Y0 KE X0 Y15)
G02 X0 Y15 R15

(TUTUP KONTUR KE Y25)
G01 Y25

(LEAD OUT)
G00 X-15 Y25
G00 Z15
G28 G91 Z0
M05
M30
%`
    },
    {
        id: 'preset-4',
        title: '4. Kantong Melingkar (Circular Pocket) & Busur I, J (G03 CCW)',
        category: 'Kurva & Radius (G03 & I,J)',
        difficulty: 'Sedang - Mahir',
        description: 'Mengefrais kantong lingkaran penuh (full circle 360°) diameter 40 mm pada pusat benda kerja (X50 Y40) menggunakan format vektor pusat I dan J.',
        learningObjective: 'Membedakan format radius R dan vektor inkremental (I, J) untuk membuat lingkaran 360° penuh pada mesin frais CNC.',
        stock: { lengthX: 100, widthY: 80, heightZ: 25, toolDiameter: 8 },
        code: `%
O0004 (KANTONG MELINGKAR G03 DENGAN I DAN J)
G21 G90 G17 G40 G49 G80
G28 G91 Z0
G90 G54
T01 M06 (ENDMILL D8)
S2000 M03 M08

(POSISI PUSAT KANTONG X50 Y40)
G00 X50 Y40
G00 Z3
G01 Z-2.0 F80 (PLUNGE AWAL PUSAT)

(LINGKARAN DALAM R8: DARI X50 Y48 MEMUTAR PENUH J-8)
G01 Y48 F200
G03 X50 Y48 I0 J-8 (LINGKARAN RADIUS 8MM)

(LINGKARAN TENGAH R14: DARI X50 Y54 MEMUTAR PENUH J-14)
G01 Y54 F220
G03 X50 Y54 I0 J-14 (LINGKARAN RADIUS 14MM)

(LINGKARAN LUAR KANTONG FINISHING R20: MEMUTAR PENUH J-20)
G01 Y60 F250
G03 X50 Y60 I0 J-20 (LINGKARAN FINISHING RADIUS 20MM)

(RETRACT KELUAR)
G01 X50 Y40 F300 (KEMBALI KE PUSAT)
G00 Z15
M09
G28 G91 Z0
M05
M30
%`
    },
    {
        id: 'preset-5',
        title: '5. Kantong Persegi Bertingkat (Step Pocket)',
        category: 'Pemotongan Saku (Pocketing)',
        difficulty: 'Sedang',
        description: 'Pembuatan kantong persegi 60x40 mm dengan kedalaman bertahap Z-2 dan Z-4 mm serta pembersihan dasar kantong.',
        learningObjective: 'Memahami teknik pemotongan kantong (pocket roughing & finishing) dan pembagian kedalaman potong (step-down).',
        stock: { lengthX: 100, widthY: 80, heightZ: 25, toolDiameter: 8 },
        code: `%
O0005 (KANTONG PERSEGI BERTINGKAT)
G21 G90 G17 G40 G49 G80
G28 G91 Z0
G90 G54
T01 M06 (ENDMILL D8)
S1800 M03 M08

(PASS 1 KEDALAMAN Z-2.0 MM)
G00 X50 Y40
G00 Z3
G01 Z-2.0 F100
(SPIRAL POCKET EXPANSION)
G01 X60 Y40 F250
G01 X60 Y50
G01 X40 Y50
G01 X40 Y30
G01 X70 Y30
G01 X70 Y55
G01 X30 Y55
G01 X30 Y25
G01 X75 Y25
G01 X75 Y55
G01 X50 Y40

(PASS 2 KEDALAMAN Z-4.0 MM)
G01 Z-4.0 F80
(FINISHING KONTUR TEPI KANTONG)
G01 X75 Y25 F200
G01 X75 Y55
G01 X25 Y55
G01 X25 Y25
G01 X75 Y25
(OVERLAP KELUAR)
G01 X50 Y40
G00 Z15

M09
G28 G91 Z0
M05
M30
%`
    },
    {
        id: 'preset-6',
        title: '6. Pola Pengeboran Lubang Matriks (Drilling G81 & G83)',
        category: 'Siklus Pengeboran (Canned Cycles)',
        difficulty: 'Sedang',
        description: 'Pengeboran pola 4 lubang baut sudut balok (G81) dan lubang dalam tengah bertahap (Peck Drilling G83).',
        learningObjective: 'Menguasai siklus pengeboran G81 (Drilling sederhana) dan G83 (Deep Hole Peck Drilling) dengan parameter R, Z, Q, dan F.',
        stock: { lengthX: 100, widthY: 80, heightZ: 25, toolDiameter: 8 },
        code: `%
O0006 (SIKLUS PENGEBORAN MATRIKS G81 DAN G83)
G21 G90 G17 G40 G49 G80
G28 G91 Z0
G90 G54
T02 M06 (DRILL D8)
S1200 M03 M08
G00 X15 Y15
G00 Z10

(SIKLUS BOR G81: KEDALAMAN Z-12MM, BIDANG RETRACT R2MM)
G81 X15 Y15 Z-12.0 R2.0 F120 (LUBANG 1)
X85 Y15 (LUBANG 2)
X85 Y65 (LUBANG 3)
X15 Y65 (LUBANG 4)
G80 (BATALKAN SIKLUS BOR)

(PECK DRILLING G83 UNTUK LUBANG DALAM TEMBUS DI TENGAH)
G00 X50 Y40
G83 X50 Y40 Z-26.0 R2.0 Q4.0 F90
G80 (BATALKAN SIKLUS BOR)

G00 Z25
M09
G28 G91 Z0
M05
M30
%`
    },
    {
        id: 'preset-7',
        title: '7. Komponen Master Cetakan (Comprehensive Mold Plate)',
        category: 'Proyek Komprehensif',
        difficulty: 'Mahir',
        description: 'Proyek lengkap pemesinan frais: Perataan muka, kontur luar tirus & radius cembung, kantong saku dalam, serta pola lubang presisi.',
        learningObjective: 'Mengintegrasikan seluruh kompetensi pemrograman CNC Milling ISO/Fanuc dalam satu benda kerja manufaktur nyata.',
        stock: { lengthX: 100, widthY: 80, heightZ: 25, toolDiameter: 10 },
        code: `%
O0007 (MASTER CETAKAN KOMPREHENSIF)
G21 G90 G17 G40 G49 G80
G28 G91 Z0
G90 G54
T01 M06 (ENDMILL D10)
S1800 M03 M08
G00 X-10 Y-10 Z10

(1. KONTUR FINISHING LUAR DENGAN RADIUS R10)
G00 X-5 Y15
G01 Z-3.0 F120
G01 X0 Y15 F260
G01 Y65
G02 X15 Y80 R15 (RADIUS SUDUT 1)
G01 X85 Y80
G02 X100 Y65 R15 (RADIUS SUDUT 2)
G01 X100 Y15
G02 X85 Y0 R15 (RADIUS SUDUT 3)
G01 X15 Y0
G02 X0 Y15 R15 (RADIUS SUDUT 4)
G01 Y25
G00 Z5

(2. KANTONG OVAL TENGAH)
G00 X40 Y40
G01 Z-4.0 F100
G01 X60 Y40 F220
G02 X60 Y40 I0 J0 (LINGKARAN R10)
G01 X40 Y40
G00 Z5

(3. POLA LUBANG PIN PENJAMIN)
G81 X20 Y20 Z-10.0 R2.0 F120
X80 Y20
X80 Y60
X20 Y60
G80

G00 Z25
M09
G28 G91 Z0
M05
M30
%`
    },
    {
        id: 'preset-8',
        title: '8. Studi Kasus Error: Kesalahan Radius G02 & Tabrakan Z',
        category: 'Analisis Kesalahan Siswa',
        difficulty: 'Evaluasi & Diskusi',
        description: 'Contoh program yang sengaja memiliki kesalahan siswa: Nilai R busur kurva tidak valid serta gerak cepat G00 menabrak ke dalam benda kerja.',
        learningObjective: 'Melatih kepekaan siswa dalam menganalisis pesan diagnostik kesalahan kurva (Arc Geometry) dan pencegahan crash tabrakan pahat.',
        stock: { lengthX: 100, widthY: 80, heightZ: 25, toolDiameter: 10 },
        code: `%
O0008 (PROGRAM DENGAN KESALAHAN KURVA DAN CRASH)
G21 G90 G17 G40
T01 M06
M03 S1500

(KESALAHAN 1: G00 MENABRAK KE KEDALAMAN Z NEGATIF DI DALAM BENDA KERJA)
G00 X30 Y30 Z-4.0 (BAHAYA: CRASH G00 KE DALAM MATERIAL!)

G01 X50 Y30 F200
G01 X50 Y60

(KESALAHAN 2: RADIUS R2 TERLALU KECIL UNTUK BENTANG JARAK 25MM)
G02 X75 Y60 R2.0 (ERROR: R2 TIDAK DAPAT MENJANGKAU TITIK AKHIR!)

G01 X80 Y20
G00 Z10
M30
%`
    },
    {
        id: 'preset-9',
        title: '9. Alur Kurva Puzzle Kelopak 4 Sisi (4-Scallop Clover Slot)',
        category: 'Kurva & Alur Kompleks (G02)',
        difficulty: 'Menengah',
        description: 'Pembuatan alur parit kurva lekuk 4 sisi simetris adaptif diameter endmill pada titik nol pusat (WCS Center Datum). Bagian tengah tetap menjadi pulau utuh.',
        learningObjective: 'Memahami perpaduan pemotongan alur kontur kurva G01 dan G02 dengan lebar slot tepat mengikuti diameter pisau frais (Ø10 / Ø6).',
        stock: { lengthX: 100, widthY: 80, heightZ: 25, toolDiameter: 10, wcsMode: 'center' },
        code: `%
O0009 (ALUR KURVA KELOPAK 4 SISI)
G21 G90 G17 G40 G80
G28 G91 Z0
G90 G54
T01 M06 (ENDMILL D10)
S1800 M03
G00 X25 Y25 Z5
G01 Z-3.0 F150

(SISI ATAS)
G01 X10 Y25 F300
G02 X-10 Y25 R10
G01 X-25 Y25

(SISI KIRI)
G01 X-25 Y10
G02 X-25 Y-10 R10
G01 X-25 Y-25

(SISI BAWAH)
G01 X-10 Y-25
G02 X10 Y-25 R10
G01 X25 Y-25

(SISI KANAN)
G01 X25 Y-10
G02 X25 Y10 R10
G01 X25 Y25

G00 Z10
G28 G91 Z0
M05
M30
%`
    },
    {
        id: 'preset-10',
        title: '10. Test Case 1: Kontur Kotak Presisi D10 (Pulau 40x40 Tajam)',
        category: 'Validasi Arsitektur (Linear Kontur)',
        difficulty: 'Mudah',
        description: 'Verifikasi Test Case 1: Benda kerja 100x100x25 mm, G54 Center, Endmill D10. Parit lebar 10 mm, kedalaman Z-2, pulau tengah 40x40 mm sudut tajam, radius luar R=5 mm.',
        learningObjective: 'Memastikan keselarasan mutlak toolpath 2D, lintasan cutter 3D, dan hasil material removal CAD Solid.',
        stock: { lengthX: 100, widthY: 100, heightZ: 25, toolDiameter: 10, wcsMode: 'center' },
        code: `%
O0010 (TEST CASE 1 KONTUR KOTAK D10)
G21 G90 G17 G40 G80
G28 G91 Z0
G90 G54
T01 M06 (ENDMILL D10)
S1500 M03
G00 X-25 Y-25 Z5
G01 Z-2 F100
G01 X25 Y-25 F250
G01 X25 Y25
G01 X-25 Y25
G01 X-25 Y-25
G00 Z5
G28 G91 Z0
M05
M30
%`
    },
    {
        id: 'preset-11',
        title: '11. Test Case 2: Kurva S-Arc G02 & G03 (Concentric Offset)',
        category: 'Validasi Arsitektur (Interpolasi Busur)',
        difficulty: 'Sedang',
        description: 'Verifikasi Test Case 2: Benda kerja 100x100x25 mm, G54 Center, Endmill D10. Interpolasi busur G02 CW dan G03 CCW dengan offset konsentris.',
        learningObjective: 'Memvalidasi perhitungan matematis busur I/J, lebar pemotongan konstan = 10 mm, dan bounding box toolpath vs machining.',
        stock: { lengthX: 100, widthY: 100, heightZ: 25, toolDiameter: 10, wcsMode: 'center' },
        code: `%
O0011 (TEST CASE 2 KURVA G02 G03)
G21 G90 G17 G40 G80
G28 G91 Z0
G90 G54
T01 M06 (ENDMILL D10)
S1500 M03
G00 X0 Y0 Z5
G01 Z-2 F100
G02 X30 Y30 I30 J0 F200
G03 X0 Y0 I-30 J0
G00 Z5
G28 G91 Z0
M05
M30
%`
    }
];

if (typeof window !== 'undefined') {
    window.CNC_PRESETS = CNC_PRESETS;
}
