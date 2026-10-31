        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, inMemoryPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, enableIndexedDbPersistence, doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'layanan-warga-rt10';
        const KETUA_RT_NAMA = "Ade Hilman Fatahillah";
        
        const firebaseConfig = {
            apiKey: "AIzaSyDWaFhPioQK36oJmkCadgwKL9CSo8ILWsM",
            authDomain: "mabu-park-rt-10.firebaseapp.com",
            projectId: "mabu-park-rt-10",
            storageBucket: "mabu-park-rt-10.firebasestorage.app",
            messagingSenderId: "886767560025",
            appId: "1:886767560025:web:96990fde548a7bae8d5848"
        };
        
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        setPersistence(auth, browserLocalPersistence).catch(() => setPersistence(auth, inMemoryPersistence));
const db = getFirestore(app);

// MENGAKTIFKAN CACHE OFFLINE FIRESTORE
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.log("Tab ganda terbuka, offline cache hanya jalan di satu tab.");
    } else if (err.code === 'unimplemented') {
        console.log("Browser tidak mendukung cache offline.");
    }
});
        const secondaryApp = initializeApp(firebaseConfig, "AdminHelperApp");
        const secondaryAuth = getAuth(secondaryApp);
        setPersistence(secondaryAuth, inMemoryPersistence).catch(() => {});

        window.currentUserData = null;
        let unSubs = [];
        let isFiturSOSEnabled = true;
        const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbydEnQUz9TIKloH_4TUQIP0jYK-SSHvv3OwLN6gR8lUMlUF554nQrhs1EUfxHezmVSJIQ/exec"; 

        const PILIHAN_NOMINAL_IURAN = [
            20000, 25000, 30000, 35000, 40000, 45000, 50000, 
            60000, 70000, 75000, 80000, 90000, 100000, 
            110000, 120000, 125000, 130000, 140000, 150000, 
            160000, 170000, 175000, 180000, 190000, 200000
        ];
        const DAFTAR_BULAN_IURAN = [
            'Okt 2026', 'Nov 2026', 'Des 2026', 
            'Jan 2027', 'Feb 2027', 'Mar 2027', 'Apr 2027', 'Mei 2027', 'Jun 2027', 'Jul 2027', 'Agu 2027', 'Sep 2027'
        ];
        let nominalIuranDefault = 50000;

        function formatRupiah(angka) {
            return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
        }

        function initDropdownIuran() {
            const aBln = document.getElementById('adminBulanIuran');
            const aNom = document.getElementById('adminNominalIuran');

            if (aBln && aBln.options.length === 0) DAFTAR_BULAN_IURAN.forEach(b => aBln.add(new Option(b, b)));
            if (aNom && aNom.options.length === 0) PILIHAN_NOMINAL_IURAN.forEach(n => aNom.add(new Option(formatRupiah(n), n)));
        }
        initDropdownIuran();

        window.showToast = function(msg, isError = false) {
            const toast = document.createElement('div');
            toast.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-full text-xs font-medium shadow-2xl z-[140] ${isError ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`;
            toast.innerText = msg;
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('opacity-0', 'translate-y-2'), 3000);
            setTimeout(() => toast.remove(), 3300);
        }

        window.lihatGambarModal = function(judul, base64Src) {
            const titleEl = document.getElementById('imgPreviewTitle'); const srcEl = document.getElementById('imgPreviewSrc'); const modEl = document.getElementById('imgPreviewModal');
            if (titleEl) titleEl.innerText = judul; if (srcEl) srcEl.src = base64Src; if (modEl) modEl.classList.remove('hidden');
        }

        window.togglePasswordVisibility = function(inputId, iconId) {
            const input = document.getElementById(inputId); const icon = document.getElementById(iconId);
            if (!input || !icon) return;
            if (input.type === 'password') { input.type = 'text'; icon.classList.replace('fa-eye', 'fa-eye-slash'); } 
            else { input.type = 'password'; icon.classList.replace('fa-eye-slash', 'fa-eye'); }
        };

        // ================= FITUR KAMERA FOTO REALTIME (WEBRTC) =================
        let liveStream = null;
        let currentFacingMode = 'environment';
        let camTargetConfig = null;

        window.bukaKameraRealtime = async function(prevId, icoId, hidId, textHideId = null, forceFacing = null) {
            camTargetConfig = { prevId, icoId, hidId, textHideId };
            if (forceFacing) currentFacingMode = forceFacing;
            else if (prevId !== 'KEEP') currentFacingMode = 'environment';

            const modal = document.getElementById('liveCameraModal');
            const video = document.getElementById('liveCameraVideo');
            const lbl = document.getElementById('camModeLabel');
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return showToast("Browser/HP ini tidak mengizinkan kamera langsung.", true);
            }

            try {
                if (liveStream) {
                    liveStream.getTracks().forEach(t => t.stop());
                }
                liveStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: currentFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false
                });
                video.srcObject = liveStream;
                if (lbl) lbl.innerText = currentFacingMode === 'user' ? 'Depan' : 'Belakang';
                modal.classList.remove('hidden');
            } catch (err) {
                showToast("Gagal membuka kamera: Pastikan izin kamera diaktifkan.", true);
            }
        };

        window.gantiArahKamera = async function() {
            currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
            if (camTargetConfig) {
                await bukaKameraRealtime(camTargetConfig.prevId, camTargetConfig.icoId, camTargetConfig.hidId, camTargetConfig.textHideId, currentFacingMode);
            }
        };

        window.tutupKameraRealtime = function() {
            if (liveStream) {
                liveStream.getTracks().forEach(t => t.stop());
                liveStream = null;
            }
            const video = document.getElementById('liveCameraVideo');
            if (video) video.srcObject = null;
            document.getElementById('liveCameraModal').classList.add('hidden');
        };

        window.jepretFotoRealtime = async function() {
            const video = document.getElementById('liveCameraVideo');
            if (!video || !liveStream) return;

            const canvas = document.createElement('canvas');
            let w = video.videoWidth || 800;
            let h = video.videoHeight || 600;
            if (w > h && w > 800) { h *= 800 / w; w = 800; }
            else if (h > 800) { w *= 800 / h; h = 800; }

            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(video, 0, 0, w, h);
            const b64 = canvas.toDataURL('image/jpeg', 0.65);

            tutupKameraRealtime();

            if (camTargetConfig && camTargetConfig.prevId === 'CHAT') {
                showToast("Mengirim foto kamera...");
                await kirimPayloadChat({ text: '', imageUrl: b64 });
            } else if (camTargetConfig) {
                const prev = document.getElementById(camTargetConfig.prevId);
                if (prev) { prev.src = b64; prev.classList.remove('hidden'); }
                const ico = document.getElementById(camTargetConfig.icoId);
                if (ico) ico.classList.add('hidden');
                const hid = document.getElementById(camTargetConfig.hidId);
                if (hid) hid.value = b64;
                if (camTargetConfig.textHideId) {
                    const tx = document.getElementById(camTargetConfig.textHideId);
                    if (tx) tx.classList.add('hidden');
                }
                showToast("📸 Foto berhasil diambil!");
            }
        };

        // ================= SISTEM TOMBOL DARURAT SOS & SIRENE =================
        function bunyikanSireneDarurat() {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                const ctx = new AudioCtx();
                for (let i = 0; i < 4; i++) {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(650, ctx.currentTime + i * 0.6);
                    osc.frequency.linearRampToValueAtTime(1100, ctx.currentTime + i * 0.6 + 0.3);
                    osc.frequency.linearRampToValueAtTime(650, ctx.currentTime + i * 0.6 + 0.55);
                    gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.6);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.6 + 0.58);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(ctx.currentTime + i * 0.6);
                    osc.stop(ctx.currentTime + i * 0.6 + 0.58);
                }
            } catch(e) {}
        }

        window.bukaModalSOS = function() {
            if (!isFiturSOSEnabled) return showToast("Fitur SOS saat ini dinonaktifkan oleh Pengurus RT.", true);
            showModal('sosModal', 'sosModalContent');
        };

        window.kirimSinyalSOS = async function(jenisBahaya) {
            if (!auth.currentUser) return;
            closeModal('sosModal', 'sosModalContent');
            const u = window.currentUserData || {};
            const namaPelapor = u.nama || 'Warga';
            const blokPelapor = `Blok ${u.blok || '-'} / No. ${u.no || '-'}`;

            try {
                await kirimPayloadChat({
                    text: `🚨 [SINYAL DARURAT SOS: ${jenisBahaya}] 🚨\nWarga: ${namaPelapor} (${blokPelapor}) membutuhkan pertolongan segera! Mohon warga sekitar merapat!`
                });
                await addDoc(collection(db, 'artifacts', appId, 'laporan'), {
                    userId: auth.currentUser.uid,
                    nama: namaPelapor,
                    blok: u.blok || '-',
                    no: u.no || '-',
                    layanan: `DARURAT SOS: ${jenisBahaya}`,
                    detail: `Panggilan Darurat ${jenisBahaya} di ${blokPelapor}`,
                    timestamp: Date.now()
                });
                await setDoc(doc(db, 'artifacts', appId, 'kas', 'config_sos'), {
                    activeSOS: {
                        jenis: jenisBahaya,
                        nama: namaPelapor,
                        blok: blokPelapor,
                        timestamp: Date.now()
                    }
                }, { merge: true }).catch(() => {});

                bunyikanSireneDarurat();
                showToast(`🚨 Sinyal Darurat ${jenisBahaya} telah dikirim ke seluruh warga!`);
            } catch(e) {
                showToast("Gagal mengirim sinyal SOS.", true);
            }
        };

        window.ubahStatusFiturSOS = async function(aktif) {
            try {
                await setDoc(doc(db, 'artifacts', appId, 'kas', 'config_sos'), {
                    enabled: aktif,
                    updatedAt: Date.now()
                }, { merge: true });
                showToast(aktif ? "Tombol SOS Warga Diaktifkan." : "Tombol SOS Warga Dinonaktifkan.");
            } catch(e) { showToast("Gagal mengubah pengaturan SOS.", true); }
        };

        window.matikanSinyalSOS = async function() {
            try {
                await setDoc(doc(db, 'artifacts', appId, 'kas', 'config_sos'), {
                    activeSOS: null,
                    clearedAt: Date.now()
                }, { merge: true });
                document.getElementById('sosActiveAlertBanner').classList.add('hidden');
                showToast("Status darurat telah diselesaikan & dimatikan.");
            } catch(e) { showToast("Gagal mematikan alarm.", true); }
        };

        // ================= PERBAIKAN FITUR SWIPE TO REPLY =================
        let replyingTo = null;
        let swipeStartX = 0;
        let swipeStartY = 0;
        let swipingEl = null;
        let isSwiping = false;

        document.addEventListener('touchstart', e => {
            const bubble = e.target.closest('.chat-bubble-wrapper');
            if(!bubble) return;
            swipeStartX = e.touches[0].clientX;
            swipeStartY = e.touches[0].clientY;
            swipingEl = bubble;
            isSwiping = false;
            swipingEl.style.transition = 'none';
        }, {passive: true});

        document.addEventListener('touchmove', e => {
            if(!swipingEl) return;
            let diffX = e.touches[0].clientX - swipeStartX;
            let diffY = e.touches[0].clientY - swipeStartY;

            // Pastikan geseran murni ke kanan dan lebih dominan dibanding gerakan vertikal
            if (diffX > 10 && Math.abs(diffX) > Math.abs(diffY)) {
                isSwiping = true;
            }

            if(isSwiping && diffX > 0 && diffX <= 75) { 
                swipingEl.style.transform = `translateX(${diffX}px)`;
            }
        }, {passive: true});

        document.addEventListener('touched', e => {
            // Placeholder aman
        });

        document.addEventListener('touchend', e => {
            if(!swipingEl) return;
            
            let endX = e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0].clientX : (e.clientX || swipeStartX);
            let diffX = endX - swipeStartX;

            swipingEl.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
            swipingEl.style.transform = `translateX(0px)`;
            
            if(isSwiping && diffX > 30) { 
                aktifkanBalas(
                    swipingEl.dataset.id, 
                    swipingEl.dataset.sender, 
                    swipingEl.dataset.text
                );
            }
            
            swipingEl = null;
            isSwiping = false;
        });
        // ================= BUKU KAS DIGITAL RT =================
        window.openKasModal = function() {
            loadBukuKas();
            showModal('kasModal', 'kasModalContent');
        };

        window.tambahTransaksiKas = async function() {
            const jenis = document.getElementById('kasJenisInput').value;
            const nom = Number(document.getElementById('kasNominalInput').value);
            const ket = document.getElementById('kasKetInput').value.trim();
            if (!nom || !ket) return showToast("Nominal dan keterangan wajib diisi!", true);
            try {
                await addDoc(collection(db, 'artifacts', appId, 'kas'), {
                    tipeDoc: 'transaksi',
                    jenis: jenis,
                    nominal: nom,
                    keterangan: ket,
                    oleh: (window.currentUserData && window.currentUserData.nama) ? window.currentUserData.nama : 'Pengurus RT',
                    timestamp: Date.now()
                });
                document.getElementById('kasNominalInput').value = '';
                document.getElementById('kasKetInput').value = '';
                showToast("Transaksi Kas disimpan!");
                loadBukuKas();
            } catch(e) { showToast("Gagal menyimpan kas.", true); }
        };

        window.hapusTransaksiKas = async function(id) {
            if (!confirm("Hapus catatan transaksi kas ini?")) return;
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'kas', id));
                showToast("Catatan kas dihapus.");
                loadBukuKas();
            } catch(e) {}
        };

        // OVERRIDE FULL EDIT KAS RT
        window.loadBukuKas = async function() {
            const wCont = document.getElementById('kasWargaListContainer');
            const aCont = document.getElementById('adminKasList');
            try {
                const s = await getDocs(collection(db, 'artifacts', appId, 'kas'));
                let list = []; let totalMasuk = 0; let totalKeluar = 0;

                s.forEach(d => {
                    if (d.id === 'config_iuran' || d.id === 'config_sos') return;
                    const item = d.data();
                    if (!item.nominal) return;
                    if (item.jenis === 'masuk') totalMasuk += Number(item.nominal);
                    else totalKeluar += Number(item.nominal);
                    list.push({ id: d.id, ...item });
                });

                list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                const saldoAkhir = totalMasuk - totalKeluar;

                const elSaldo = document.getElementById('kasTotalSaldo'); if (elSaldo) elSaldo.innerText = formatRupiah(saldoAkhir);
                const elMasuk = document.getElementById('kasTotalMasuk'); if (elMasuk) elMasuk.innerText = '+ ' + formatRupiah(totalMasuk);
                const elKeluar = document.getElementById('kasTotalKeluar'); if (elKeluar) elKeluar.innerText = '- ' + formatRupiah(totalKeluar);

                let hWarga = ''; let hAdmin = '';
                list.forEach(x => {
                    const isMasuk = x.jenis === 'masuk';
                    const tgl = x.timestamp ? new Date(x.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                    
                    hWarga += `<div class="bg-white p-3.5 rounded-xl border flex justify-between items-center shadow-sm">
                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 rounded-full flex items-center justify-center ${isMasuk ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}">
                                        <i class="fa-solid ${isMasuk ? 'fa-arrow-down' : 'fa-arrow-up'} text-xs"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-xs text-gray-800">${x.keterangan}</h4>
                                        <p class="text-[10px] text-gray-400">${tgl} • Dicatat: ${x.oleh || 'RT'}</p>
                                    </div>
                                </div>
                                <span class="font-bold text-xs ${isMasuk ? 'text-emerald-600' : 'text-red-600'}">${isMasuk ? '+' : '-'} ${formatRupiah(x.nominal)}</span>
                              </div>`;

                    const safeKet = x.keterangan.replace(/'/g, "\\'");
                    hAdmin += `<div class="bg-white p-2.5 rounded-xl border flex justify-between items-center mb-2 shadow-sm">
                                <div>
                                    <h4 class="font-bold text-xs text-gray-800">${x.keterangan}</h4>
                                    <p class="text-[10px] ${isMasuk ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}">${isMasuk ? '➕ Masuk:' : '➖ Keluar:'} ${formatRupiah(x.nominal)} <span class="text-gray-400 font-normal">(${tgl})</span></p>
                                </div>
                                <div class="flex gap-1 shrink-0">
                                    <button onclick="bukaEditKas('${x.id}', '${x.jenis}', ${x.nominal}, '${safeKet}')" class="w-7 h-7 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-lg text-xs transition"><i class="fa-solid fa-pen"></i></button>
                                    <button onclick="hapusTransaksiKas('${x.id}')" class="w-7 h-7 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-xs transition"><i class="fa-solid fa-trash"></i></button>
                                </div>
                              </div>`;
                });

                if (wCont) wCont.innerHTML = hWarga || '<p class="text-center text-xs text-gray-400 py-6">Belum ada catatan transaksi kas.</p>';
                if (aCont) aCont.innerHTML = hAdmin || '<p class="text-center text-xs text-gray-400 py-4">Belum ada transaksi.</p>';
            } catch(e) { console.log(e); }
        };

        window.bukaEditKas = function(id, jenis, nominal, ket) {
            document.getElementById('eKasId').value = id;
            document.getElementById('eKasJenis').value = jenis;
            document.getElementById('eKasNominal').value = nominal;
            document.getElementById('eKasKet').value = ket;
            showModal('editKasModal', 'editKasModalContent');
        };

        window.simpanEditKas = async function(e) {
            e.preventDefault();
            const id = document.getElementById('eKasId').value;
            const jns = document.getElementById('eKasJenis').value;
            const nom = Number(document.getElementById('eKasNominal').value);
            const ket = document.getElementById('eKasKet').value;
            
            if (!nom || !ket) return showToast("Semua form wajib diisi!", true);

            try {
                await updateDoc(doc(db, 'artifacts', appId, 'kas', id), {
                    jenis: jns, 
                    nominal: nom, 
                    keterangan: ket, 
                    diupdateOleh: (window.currentUserData && window.currentUserData.nama) ? window.currentUserData.nama : 'Pengurus RT',
                    updatedAt: Date.now()
                });
                showToast("✅ Transaksi Kas berhasil diperbarui!");
                closeModal('editKasModal', 'editKasModalContent');
                loadBukuKas();
            } catch(err) {
                showToast("Gagal memperbarui kas.", true);
            }
        };

        // ================= CETAK SURAT PENGANTAR PDF OTOMATIS =================
        window.cetakSuratPDF = function(encodedData) {
            try {
                const d = JSON.parse(decodeURIComponent(encodedData));
                if (!window.jspdf || !window.jspdf.jsPDF) return showToast("Library PDF belum siap, coba lagi.", true);
                
                const { jsPDF } = window.jspdf;
                const docPdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                
                docPdf.setFont("helvetica", "bold");
                docPdf.setFontSize(13);
                docPdf.text("RUKUN TETANGGA 010 RUKUN WARGA 002", 105, 18, { align: "center" });
                docPdf.setFontSize(15);
                docPdf.text("PERUMAHAN MABU PARK", 105, 25, { align: "center" });
                docPdf.setFont("helvetica", "normal");
                docPdf.setFontSize(10);
                docPdf.text("Desa Aweh, Kecamatan Kalanganyar, Kabupaten Lebak - Provinsi Banten", 105, 31, { align: "center" });
                
                docPdf.setLineWidth(0.8);
                docPdf.line(20, 35, 190, 35);
                docPdf.setLineWidth(0.2);
                docPdf.line(20, 36.2, 190, 36.2);

                docPdf.setFont("helvetica", "bold");
                docPdf.setFontSize(12);
                docPdf.text("SURAT PENGANTAR / KETERANGAN", 105, 46, { align: "center" });
                docPdf.setLineWidth(0.4);
                docPdf.line(68, 47, 142, 47);

                const tglSkrg = d.approvedAt ? new Date(d.approvedAt) : new Date();
                const noUrut = String(d.timestamp || Date.now()).slice(-4);
                const blnRomawi = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][tglSkrg.getMonth()];
                docPdf.setFont("helvetica", "normal");
                docPdf.setFontSize(10);
                docPdf.text(`Nomor: ${noUrut}/SP-RT.010/RW.002/${blnRomawi}/${tglSkrg.getFullYear()}`, 105, 52, { align: "center" });

                docPdf.setFontSize(11);
                const pembuka = "Yang bertanda tangan di bawah ini Ketua RT. 010 RW. 002 Perumahan Mabu Park, Desa Aweh, Kecamatan Kalanganyar, Kabupaten Lebak, dengan ini menerangkan bahwa:";
                const splitPembuka = docPdf.splitTextToSize(pembuka, 170);
                docPdf.text(splitPembuka, 20, 64);

                let yPos = 78;
                const rows = [
                    ["Nama Lengkap", d.nama || "-"],
                    ["NIK / No. KTP", d.nik || "-"],
                    ["Tempat, Tanggal Lahir", d.ttl || "-"],
                    ["Jenis Kelamin", d.jk || "-"],
                    ["Agama", d.agama || "-"],
                    ["Status Perkawinan", d.status_nikah || "-"],
                    ["Pekerjaan", d.pekerjaan || "-"],
                    ["Alamat Domisili", `Perumahan Mabu Park Blok ${d.blok || '-'} No. ${d.no || '-'}, RT.010/RW.002, Desa Aweh, Kec. Kalanganyar, Kab. Lebak`],
                    ["Keperluan Surat", d.keperluan || d.detail || "-"]
                ];

                rows.forEach(r => {
                    docPdf.setFont("helvetica", "normal");
                    docPdf.text(r[0], 25, yPos);
                    docPdf.text(":", 73, yPos);
                    docPdf.setFont("helvetica", r[0] === "Nama Lengkap" || r[0] === "Keperluan Surat" ? "bold" : "normal");
                    const valLines = docPdf.splitTextToSize(String(r[1]), 112);
                    docPdf.text(valLines, 77, yPos);
                    yPos += (valLines.length * 6.5) + 1.5;
                });

                yPos += 4;
                docPdf.setFont("helvetica", "normal");
                const penutup = "Orang tersebut di atas adalah benar warga kami yang berdomisili di lingkungan RT. 010 RW. 002 Perumahan Mabu Park. Demikian surat pengantar ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.";
                const splitPenutup = docPdf.splitTextToSize(penutup, 170);
                docPdf.text(splitPenutup, 20, yPos);

                yPos += 25;
                const tglIndo = tglSkrg.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                docPdf.text(`Kalanganyar, ${tglIndo}`, 145, yPos, { align: "center" });
                docPdf.text("Ketua RT. 010 / RW. 002", 145, yPos + 6, { align: "center" });

                docPdf.setDrawColor(0, 138, 15);
                docPdf.setTextColor(0, 138, 15);
                docPdf.setLineWidth(0.6);
                docPdf.circle(122, yPos + 18, 12, 'S');
                docPdf.setLineWidth(0.2);
                docPdf.circle(122, yPos + 18, 10.5, 'S');
                docPdf.setFont("helvetica", "bold");
                docPdf.setFontSize(6.5);
                docPdf.text("PENGURUS RT. 010", 122, yPos + 15.5, { align: "center" });
                docPdf.text("RW. 002 MABU PARK", 122, yPos + 18.5, { align: "center" });
                docPdf.text("TERVERIFIKASI", 122, yPos + 21.5, { align: "center" });

                docPdf.setTextColor(0, 0, 0);
                docPdf.setFont("helvetica", "bold");
                docPdf.setFontSize(11);
                docPdf.text(KETUA_RT_NAMA, 145, yPos + 30, { align: "center" });
                docPdf.setLineWidth(0.4);
                docPdf.setDrawColor(0, 0, 0);
                docPdf.line(118, yPos + 31, 172, yPos + 31);

                const fileName = `Surat_Pengantar_RT010_${(d.nama || 'Warga').replace(/[^a-z0-9]/gi, '_')}.pdf`;
                docPdf.save(fileName);
                showToast("📄 Surat Pengantar PDF berhasil diunduh!");
            } catch (err) {
                showToast("Gagal membuat PDF.", true);
            }
        };

        // ================= BIOMETRIC / FINGERPRINT =================
        function bufferToBase64(b) { return btoa(String.fromCharCode.apply(null, new Uint8Array(b))); }
        function base64ToBuffer(b) { const bin = atob(b); const a = new Uint8Array(bin.length); for (let i=0; i<bin.length; i++) a[i] = bin.charCodeAt(i); return a.buffer; }

        window.perbaruiStatusUI_Fingerprint = function() {
            const saved = localStorage.getItem('rt10_fp_cred');
            const txt = document.getElementById('fpStatusText'); const btn = document.getElementById('btnToggleFp');
            if(!txt || !btn) return;
            if(saved) { txt.innerText = 'Aktif di HP ini'; txt.classList.replace('text-gray-500', 'text-brand'); btn.innerText = 'Hapus'; btn.classList.replace('bg-brand', 'bg-red-500'); } 
            else { txt.innerText = 'Belum diaktifkan'; txt.classList.replace('text-brand', 'text-gray-500'); btn.innerText = 'Aktifkan'; btn.classList.replace('bg-red-500', 'bg-brand'); }
        };

        window.daftarkanFingerprint = async function() {
            if (localStorage.getItem('rt10_fp_cred')) { localStorage.removeItem('rt10_fp_cred'); perbaruiStatusUI_Fingerprint(); return showToast("Fingerprint dihapus."); }
            if (!window.PublicKeyCredential) return showToast("HP/Browser ini tidak mendukung Fingerprint.", true);
            const authTemp = sessionStorage.getItem('rt10_temp_auth');
            if (!authTemp) return showToast("Silakan Keluar (Logout) lalu Masuk ulang dengan Password terlebih dahulu.", true);

            try {
                const creds = JSON.parse(authTemp);
                const chal = new Uint8Array(32); window.crypto.getRandomValues(chal);
                const uidb = new Uint8Array(16); window.crypto.getRandomValues(uidb);
                const namaWarga = (window.currentUserData && window.currentUserData.nama) ? window.currentUserData.nama : "Warga RT.010";
                
                const c = await navigator.credentials.create({
                    publicKey: { 
                        challenge: chal, 
                        rp: { name: "Warga RT.010", id: window.location.hostname }, 
                        user: { id: uidb, name: atob(creds.email), displayName: namaWarga }, 
                        pubKeyCredParams: [{type: "public-key", alg: -7}, {type: "public-key", alg: -257}], 
                        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged", requireResidentKey: false }, 
                        timeout: 60000,
                        attestation: "none"
                    }
                });
                localStorage.setItem('rt10_fp_cred', JSON.stringify({ credId: bufferToBase64(c.rawId), email: creds.email, pass: creds.pass }));
                perbaruiStatusUI_Fingerprint(); showToast("✅ Fingerprint berhasil diaktifkan!");
            } catch(e) { showToast("Gagal aktivasi sidik jari: Pastikan kunci layar/sidik jari HP aktif.", true); }
        };

        window.handleFingerprintLogin = async function() {
            const saved = localStorage.getItem('rt10_fp_cred');
            if (!saved) return showToast("Belum ada Fingerprint aktif di HP ini. Masuk dengan password dulu.", true);
            const btn = document.getElementById('btnFingerprintLogin'); if(btn) btn.disabled = true;
            try {
                const d = JSON.parse(saved);
                const chal = new Uint8Array(32); window.crypto.getRandomValues(chal);
                await navigator.credentials.get({ 
                    publicKey: { challenge: chal, rpId: window.location.hostname, allowCredentials: [{id: base64ToBuffer(d.credId), type: 'public-key', transports: ['internal']}], userVerification: "required", timeout: 60000 } 
                });
                sessionStorage.setItem('rt10_temp_auth', JSON.stringify({ email: d.email, pass: d.pass }));
                await signInWithEmailAndPassword(auth, atob(d.email), atob(d.pass));
                showToast("Login Berhasil!");
            } catch(e) { showToast("Verifikasi sidik jari dibatalkan/gagal.", true); } finally { if(btn) btn.disabled = false; }
        };

        // ================= CHAT LOGIC =================
        let allChatMessages = []; let currentChatRoom = 'GLOBAL'; let currentChatPartner = null; let unreadChatCount = 0;
        function getPrivateRoomId(u1, u2) { return [u1, u2].sort().join('_'); }

        window.updateChatBadge = function(count) {
            unreadChatCount = count;
            const nb = document.getElementById('navChatBadge'); const hb = document.getElementById('headerChatBadge');
            if (count > 0) {
                if (nb) { nb.innerText = count; nb.classList.remove('hidden'); }
                if (hb) { hb.innerText = count; hb.classList.remove('hidden'); }
            } else {
                if (nb) nb.classList.add('hidden'); if (hb) hb.classList.add('hidden');
            }
        };

        window.pilihModeChat = async function(mode) {
            const bGrup = document.getElementById('subTabGrup'); const bJapri = document.getElementById('subTabJapri');
            if (mode === 'grup') {
                currentChatRoom = 'GLOBAL'; currentChatPartner = null;
                if(bGrup) bGrup.className = "flex-1 py-2 text-xs font-bold bg-white text-brand rounded-lg shadow-sm"; 
                if(bJapri) bJapri.className = "flex-1 py-2 text-xs font-medium text-gray-500 rounded-lg";
                document.getElementById('japriContactList').classList.add('hidden'); document.getElementById('activeChatHeader').classList.add('hidden');
                document.getElementById('chatMessagesBox').classList.remove('hidden'); document.getElementById('chatInputForm').classList.remove('hidden');
                renderChatMessages();
            } else {
                if(bJapri) bJapri.className = "flex-1 py-2 text-xs font-bold bg-white text-brand rounded-lg shadow-sm"; 
                if(bGrup) bGrup.className = "flex-1 py-2 text-xs font-medium text-gray-500 rounded-lg";
                document.getElementById('chatMessagesBox').classList.add('hidden'); document.getElementById('chatInputForm').classList.add('hidden'); document.getElementById('activeChatHeader').classList.add('hidden');
                document.getElementById('japriContactList').classList.remove('hidden');
                await loadDaftarKontakWarga();
            }
        };

        async function loadDaftarKontakWarga() {
            const cont = document.getElementById('japriContactList'); if(!cont) return;
            cont.innerHTML = '<div class="text-center py-5 text-gray-400">Loading...</div>';
            try {
                const snap = await getDocs(collection(db, 'artifacts', appId, 'users')); let html = '';
                snap.forEach(d => {
                    if (auth.currentUser && d.id === auth.currentUser.uid) return;
                    const u = d.data(); const nm = u.nama ? u.nama : 'Warga'; const bInfo = `Blok ${u.blok ? u.blok : '-'}/${u.no ? u.no : '-'}`;
                    const b = u.role === 'Admin RT' ? '<span class="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full">RT</span>' : '';
                    html += `<div onclick="bukaRuangJapri('${d.id}', '${nm.replace(/'/g, "\\'")}', '${bInfo}')" class="p-3 bg-white border rounded-xl flex items-center justify-between mb-2 shadow-sm cursor-pointer"><div class="flex items-center gap-3"><div class="w-10 h-10 bg-brand text-white rounded-full flex items-center justify-center font-bold">${nm.charAt(0)}</div><div><h4 class="font-bold text-sm">${nm}</h4><p class="text-xs text-gray-500">${bInfo}</p></div></div><div>${b}</div></div>`;
                });
                cont.innerHTML = html;
            } catch(e) { cont.innerHTML = '<p class="text-xs text-red-500 text-center">Gagal memuat warga.</p>'; }
        }

        window.bukaRuangJapri = function(uid, nm, blk, autoMsg = "") {
            currentChatPartner = { uid: uid, nama: nm, blok: blk }; currentChatRoom = getPrivateRoomId(auth.currentUser.uid, uid);
            closeModal('umkmModal', 'umkmModalContent');
            closeModal('iuranModal', 'iuranModalContent');
            switchTab('chat');
            const bGrup = document.getElementById('subTabGrup'); const bJapri = document.getElementById('subTabJapri');
            if(bJapri) bJapri.className = "flex-1 py-2 text-xs font-bold bg-white text-brand rounded-lg shadow-sm"; 
            if(bGrup) bGrup.className = "flex-1 py-2 text-xs font-medium text-gray-500 rounded-lg";
            const jl = document.getElementById('japriContactList'); if(jl) jl.classList.add('hidden'); 
            const ah = document.getElementById('activeChatHeader'); if(ah) ah.classList.remove('hidden');
            const cb = document.getElementById('chatMessagesBox'); if(cb) cb.classList.remove('hidden'); 
            const cf = document.getElementById('chatInputForm'); if(cf) cf.classList.remove('hidden');
            const at = document.getElementById('activeChatTitle'); if(at) at.innerText = nm;
            if(autoMsg) { const inp = document.getElementById('chatTextInput'); if(inp) inp.value = autoMsg; }
            renderChatMessages();
        };

        // OVERRIDE RENDER CHAT DENGAN SWIPE TO REPLY & QUOTE
        function renderChatMessages() {
            const box = document.getElementById('chatMessagesBox'); if (!box || !auth.currentUser) return;
            const fil = allChatMessages.filter(m => m.roomId === currentChatRoom).sort((a,b) => a.timestamp - b.timestamp);
            if (fil.length === 0) { box.innerHTML = '<div class="text-center text-gray-400 py-10 text-xs">Belum ada obrolan.</div>'; return; }
            
            let html = '';
            fil.forEach(m => {
                const isMe = m.senderId === auth.currentUser.uid;
                const tm = new Date(m.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
                
                let content = '';
                if (m.text) content += `<p class="text-sm leading-relaxed whitespace-pre-line">${m.text}</p>`;
                if (m.stickerUrl) content += `<img src="${m.stickerUrl}" class="w-16 h-16 object-contain my-1 drop-shadow-sm">`;
                if (m.imageUrl) content += `<img onclick="lihatGambarModal('Foto dari ${m.senderName}', '${m.imageUrl}')" src="${m.imageUrl}" class="w-full max-w-[220px] h-auto rounded-lg my-1.5 cursor-pointer border border-gray-200/50 shadow-sm">`;

                const safeText = (m.text || (m.imageUrl ? '📷 Mengirim Foto' : '😊 Mengirim Stiker')).replace(/"/g, '&quot;');
                const safeSender = (m.senderName || 'Warga').replace(/"/g, '&quot;');
                
                let replyQuote = '';
                if (m.replyTo) {
                    replyQuote = `<div class="bg-black/10 border-l-4 border-${isMe ? 'white' : 'brand'} p-2 rounded mb-1.5 text-left text-[10px] opacity-90">
                        <p class="font-bold ${isMe ? 'text-green-100' : 'text-brand'} mb-0.5">${m.replyTo.senderName}</p>
                        <p class="truncate cursor-pointer hover:opacity-75 transition">${m.replyTo.text}</p>
                    </div>`;
                }

                if (isMe) {
                    html += `<div class="flex justify-end mb-3 chat-bubble-wrapper" data-id="${m.id}" data-sender="Anda" data-text="${safeText}">
                        <div class="max-w-[80%] bg-brand text-white rounded-2xl rounded-tr-none px-3.5 py-2 shadow-sm">${replyQuote}${content}<p class="text-[9px] text-green-100 text-right mt-1">${tm}</p></div>
                    </div>`;
                } else {
                    html += `<div class="flex justify-start mb-3 chat-bubble-wrapper" data-id="${m.id}" data-sender="${safeSender}" data-text="${safeText}">
                        <div class="max-w-[80%] bg-white border border-gray-200 rounded-2xl rounded-tl-none px-3.5 py-2 shadow-sm"><p class="text-[10px] font-bold text-brand mb-0.5">${m.senderName}</p>${replyQuote}${content}<p class="text-[9px] text-gray-400 text-right mt-1">${tm}</p></div>
                    </div>`;
                }
            });
            box.innerHTML = html; box.scrollTop = box.scrollHeight;
        }

        window.kirimPesanChat = async function(e) {
            e.preventDefault(); const inp = document.getElementById('chatTextInput'); 
            if(!inp) return; const t = inp.value.trim(); if(!t || !auth.currentUser) return;
            inp.value = ''; await kirimPayloadChat({ text: t });
        };
        window.kirimStiker = async function(url) { document.getElementById('stickerMenu').classList.add('hidden'); await kirimPayloadChat({ text: '', stickerUrl: url }); };
        window.handleChatPhoto = function(e) {
            const f = e.target.files[0]; if(!f) return;
            showToast("Memproses foto...");
            const r = new FileReader(); r.onload = ev => {
                const i = new Image(); i.onload = async () => {
                    const c = document.createElement('canvas'); let w = i.width, h = i.height;
                    if(w > h && w > 800) { h *= 800/w; w = 800; } else if(h > 800) { w *= 800/h; h = 800; }
                    c.width = w; c.height = h; c.getContext('2d').drawImage(i, 0, 0, w, h);
                    await kirimPayloadChat({ text: '', imageUrl: c.toDataURL('image/jpeg', 0.6) });
                }; i.src = ev.target.result;
            }; r.readAsDataURL(f); e.target.value = '';
        };

        // OVERRIDE KIRIM PAYLOAD CHAT (SUPORT REPLY)
        async function kirimPayloadChat(payload) {
            if(!auth.currentUser) return; 
            const u = window.currentUserData ? window.currentUserData : {};
            
            if (replyingTo) { payload.replyTo = replyingTo; }
            
            try { 
                await addDoc(collection(db, 'artifacts', appId, 'chats'), Object.assign({ 
                    roomId: currentChatRoom, 
                    recipientId: currentChatPartner ? currentChatPartner.uid : 'ALL', 
                    senderId: auth.currentUser.uid, 
                    senderName: u.nama ? u.nama : 'Warga', 
                    senderBlok: `${u.blok ? u.blok : '-'}/${u.no ? u.no : '-'}`, 
                    senderRole: u.role ? u.role : 'Warga', 
                    timestamp: Date.now() 
                }, payload)); 
                batalBalas();
            } catch (err) { showToast("Gagal kirim pesan.", true); }
        }

        // ================= PASAR UMKM =================
        window.openUmkmModal = () => { loadUmkmWarga(); showModal('umkmModal', 'umkmModalContent'); }
        window.toggleUmkmForm = (show) => { 
            const f = document.getElementById('umkmForm'); if(!f) return;
            if(show) { f.classList.remove('hidden'); } else { f.classList.add('hidden'); f.reset(); document.getElementById('umkmImgPreview').classList.add('hidden'); document.getElementById('umkmImgIcon').classList.remove('hidden'); document.getElementById('umkmImgText').classList.remove('hidden'); document.getElementById('umkmBase64').value = ''; }
        }
        window.submitUmkm = async function(e) {
            e.preventDefault();
            const nm = document.getElementById('umkmNamaBarang').value; const hrg = document.getElementById('umkmHarga').value; const desk = document.getElementById('umkmDeskripsi').value; const img = document.getElementById('umkmBase64').value;
            try {
                const u = window.currentUserData || {};
                await addDoc(collection(db, 'artifacts', appId, 'pasar'), { sellerId: auth.currentUser.uid, sellerName: u.nama||'Warga', sellerBlok: `${u.blok||'-'}/${u.no||'-'}`, namaBarang: nm, harga: hrg, deskripsi: desk, imageBase64: img, timestamp: Date.now() });
                showToast("Dagangan diposting!"); toggleUmkmForm(false); loadUmkmWarga();
            } catch(err) { showToast("Gagal memposting dagangan.", true); }
        }
        window.loadUmkmWarga = async function() {
            const cont = document.getElementById('umkmListContainer'); if(!cont) return;
            cont.innerHTML = '<div class="col-span-2 text-center py-5 text-gray-400"><i class="fa-solid fa-spinner fa-spin"></i></div>';
            try {
                const s = await getDocs(query(collection(db, 'artifacts', appId, 'pasar'), orderBy('timestamp', 'desc')));
                let h = '';
                s.forEach(d => {
                    const b = d.data(); const isMe = auth.currentUser && b.sellerId === auth.currentUser.uid; const isAdmin = window.currentUserData && window.currentUserData.role === 'Admin RT';
                    const hrgFmt = formatRupiah(b.harga || 0);
                    const safeSeller = (b.sellerName || 'Warga').replace(/'/g, "\\'");
                    const safeBarang = (b.namaBarang || 'Produk').replace(/'/g, "\\'");
                    h += `<div class="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col relative">
                            ${(isMe || isAdmin) ? `<button onclick="hapusUmkm('${d.id}')" class="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-xs shadow z-10"><i class="fa-solid fa-trash"></i></button>` : ''}
                            <div class="h-32 bg-gray-100 w-full overflow-hidden flex justify-center items-center">
                                ${b.imageBase64 ? `<img onclick="lihatGambarModal('${safeBarang}', '${b.imageBase64}')" src="${b.imageBase64}" class="w-full h-full object-cover cursor-pointer">` : `<i class="fa-solid fa-store text-3xl text-gray-300"></i>`}
                            </div>
                            <div class="p-3 flex-1 flex flex-col">
                                <h4 class="font-bold text-sm text-gray-800 leading-tight mb-1">${b.namaBarang}</h4>
                                <p class="text-orange-600 font-bold text-sm mb-2">${hrgFmt}</p>
                                <p class="text-[10px] text-gray-500 mb-2 flex-1">${b.deskripsi||''}</p>
                                <div class="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                                    <div class="flex items-center gap-1.5"><div class="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex justify-center items-center text-[10px] font-bold">${(b.sellerName||'W').charAt(0)}</div><span class="text-[10px] font-medium text-gray-600 truncate max-w-[70px]">${b.sellerName||'Warga'}</span></div>
                                    ${!isMe ? `<button onclick="bukaRuangJapri('${b.sellerId}', '${safeSeller}', '${b.sellerBlok||'-'}', 'Halo, saya mau pesan ${safeBarang} (${hrgFmt}) di Pasar UMKM RT.010.')" class="bg-brand text-white px-3 py-1 rounded text-xs font-bold hover:bg-brand-dark transition">Beli</button>` : `<span class="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500">Lapak Anda</span>`}
                                </div>
                            </div>
                          </div>`;
                });
                cont.innerHTML = h || '<div class="col-span-2 text-center text-gray-500 py-5 text-sm">Belum ada dagangan warga.</div>';
            } catch(e) { cont.innerHTML = '<div class="col-span-2 text-center text-red-500 py-5 text-xs">Gagal memuat.</div>'; }
        }
        window.hapusUmkm = async function(id) {
            if(!confirm("Hapus dagangan ini?")) return;
            try { await deleteDoc(doc(db, 'artifacts', appId, 'pasar', id)); showToast("Dihapus."); loadUmkmWarga(); } catch(e) {}
        }

        // ================= KARTU IURAN DIGITAL =================
        window.openIuranModal = () => { 
            initDropdownIuran();
            const u = window.currentUserData || {};
            document.getElementById('kartuIuranNama').innerText = u.nama || 'Warga';
            document.getElementById('kartuIuranBlok').innerText = `Blok ${u.blok || '-'} / No. ${u.no || '-'}`;
            document.getElementById('kartuIuranNominalAktif').innerText = formatRupiah(nominalIuranDefault) + ' / bln';
            loadIuranUser(); 
            showModal('iuranModal', 'iuranModalContent'); 
        };
        
        window.loadIuranUser = async function() {
            const cont = document.getElementById('iuranListContainer'); if(!cont || !auth.currentUser) return;
            cont.innerHTML = '<div class="text-center py-10"><i class="fa-solid fa-spinner fa-spin text-gray-400 text-2xl"></i></div>';
            try {
                const s = await getDoc(doc(db, 'artifacts', appId, 'users', auth.currentUser.uid));
                const dataIuran = s.exists() && s.data().iuran ? s.data().iuran : {};
                const dataNominal = s.exists() && s.data().iuranNominal ? s.data().iuranNominal : {};
                let h = '';
                DAFTAR_BULAN_IURAN.forEach(bln => {
                    const status = dataIuran[bln];
                    const isLunas = status === 'Lunas';
                    const nomBln = dataNominal[bln] || nominalIuranDefault;
                    h += `<div class="p-3.5 border ${isLunas ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'} rounded-xl flex justify-between items-center shadow-sm select-none">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full flex justify-center items-center ${isLunas ? 'bg-green-600 text-white' : 'bg-red-50 text-red-500'}">
                                    <i class="fa-solid ${isLunas ? 'fa-check' : 'fa-clock'} text-lg"></i>
                                </div>
                                <div>
                                    <h4 class="font-bold text-sm ${isLunas ? 'text-green-900' : 'text-gray-800'}">${bln}</h4>
                                    <p class="text-[11px] ${isLunas ? 'text-green-700 font-semibold' : 'text-gray-500'}">Iuran: ${formatRupiah(nomBln)}</p>
                                </div>
                            </div>
                            <span class="px-3 py-1.5 text-xs font-bold rounded-lg ${isLunas ? 'bg-green-600 text-white shadow-sm' : 'bg-red-100 text-red-600'}">${isLunas ? '✓ LUNAS' : 'BELUM BAYAR'}</span>
                          </div>`;
                });
                cont.innerHTML = h;
            } catch(e) { cont.innerHTML = '<p class="text-center text-red-500 text-xs">Gagal memuat kartu iuran.</p>'; }
        };

        window.simpanNominalDefault = async function() {
            const aNom = document.getElementById('adminNominalIuran');
            if (!aNom) return;
            nominalIuranDefault = Number(aNom.value);
            try {
                await setDoc(doc(db, 'artifacts', appId, 'kas', 'config_iuran'), {
                    nominalDefault: nominalIuranDefault,
                    updatedAt: Date.now()
                }, { merge: true });
                showToast(`Nominal aktif diatur ke ${formatRupiah(nominalIuranDefault)}`);
            } catch(e) {}
        };

        window.kirimPengingatIuran = async function() {
            const bln = document.getElementById('adminBulanIuran').value;
            const nom = document.getElementById('adminNominalIuran').value;
            try {
                await setDoc(doc(db, 'artifacts', appId, 'kas', 'config_iuran'), {
                    nominalDefault: Number(nom),
                    reminderBulan: bln,
                    reminderNominal: Number(nom),
                    reminderTimestamp: Date.now()
                }, { merge: true });
                showToast(`🔔 Pengingat iuran bulan ${bln} (${formatRupiah(nom)}) dikirim ke warga yang belum lunas!`);
            } catch(e) { showToast("Gagal mengirim pengingat.", true); }
        };

        // ================= KODE IURAN LENGKAP & DINAMIS =================
        window.loadAdminIuran = async function() {
            initDropdownIuran();
            const blnSelect = document.getElementById('adminBulanIuran');
            if(!blnSelect) return;
            const selectedBln = blnSelect.value;
            const cont = document.getElementById('adminIuranWargaList'); if(!cont) return;
            cont.innerHTML = 'Loading...';
            
            try {
                const s = await getDocs(collection(db, 'artifacts', appId, 'users'));
                let h = '';
                s.forEach(d => {
                    const u = d.data();
                    const statusSaatIni = (u.iuran && u.iuran[selectedBln]) ? u.iuran[selectedBln] : 'BL';
                    const nomTercatat = (u.iuranNominal && u.iuranNominal[selectedBln]) !== undefined ? Number(u.iuranNominal[selectedBln]) : 0;
                    
                    const safeNama = (u.nama || 'Warga').replace(/'/g, "\\'");
                    const safeBlok = u.blok || '-';
                    const safeNo = u.no || '-';

                    // 1. GENERATE DROPDOWN NOMINAL DARI 0 SD 135.000 (KELIPATAN 5.000)
                    let optNominal = '';
                    for(let i = 0; i <= 135000; i += 5000) {
                        optNominal += `<option value="${i}" ${nomTercatat === i ? 'selected' : ''}>${formatRupiah(i)}</option>`;
                    }

                    h += `<div class="p-3 border rounded-xl flex flex-col gap-2 mb-2 bg-white shadow-sm border-gray-200">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="font-bold text-sm text-gray-800">${u.nama||'Warga'}</h4>
                                    <p class="text-[11px] text-gray-500">Blok ${safeBlok}/${safeNo}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-[11px] font-bold px-2 py-0.5 rounded ${statusSaatIni !== 'BL' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">${statusSaatIni}</p>
                                    <p class="text-[10px] text-gray-500 font-semibold mt-0.5">${formatRupiah(nomTercatat)}</p>
                                </div>
                            </div>
                            
                            <div class="flex items-center justify-between border-t pt-2 mt-1 gap-2">
                                <!-- DROPDOWN STATUS -->
                                <select id="stat_${d.id}" onchange="simpanIuranWarga('${d.id}', '${selectedBln}', '${safeNama}', '${safeBlok}', '${safeNo}', true)" class="w-1/2 text-[11px] font-bold border border-gray-300 rounded p-1.5 outline-none focus:ring-1 focus:ring-brand bg-gray-50">
                                    <option value="BL" ${statusSaatIni==='BL'?'selected':''}>BL - Belum</option>
                                    <option value="L" ${statusSaatIni==='L'?'selected':''}>L - Huni</option>
                                    <option value="LK" ${statusSaatIni==='LK'?'selected':''}>LK - Kosong</option>
                                    <option value="LA" ${statusSaatIni==='LA'?'selected':''}>LA - Non-Air</option>
                                    <option value="LC" ${statusSaatIni==='LC'?'selected':''}>LC - CCTV</option>
                                    <option value="P" ${statusSaatIni==='P'?'selected':''}>P - Pengurus</option>
                                    <option value="A" ${statusSaatIni==='A'?'selected':''}>A - Abai</option>
                                    <option value="T" ${statusSaatIni==='T'?'selected':''}>T - Tdk Mampu</option>
                                </select>
                                
                                <!-- DROPDOWN NOMINAL (0 - 135.000) -->
                                <select id="nom_${d.id}" onchange="simpanIuranWarga('${d.id}', '${selectedBln}', '${safeNama}', '${safeBlok}', '${safeNo}', false)" class="w-1/2 text-[11px] font-bold border border-gray-300 rounded p-1.5 outline-none focus:ring-1 focus:ring-brand bg-gray-50">
                                    ${optNominal}
                                </select>
                            </div>
                          </div>`;
                });
                cont.innerHTML = h || '<p class="text-xs text-gray-500 text-center">Data warga kosong.</p>';
            } catch(e) { cont.innerHTML = 'Gagal memuat.'; }
        };

        window.simpanIuranWarga = async function(uid, bulan, nama, blok, no, isStatusChange) {
            const statEl = document.getElementById('stat_' + uid);
            const nomEl = document.getElementById('nom_' + uid);
            let statusCode = statEl.value;
            let nomValue = Number(nomEl.value);

            // Fitur Pintar: Auto-set nominal jika Admin merubah Status
            if (isStatusChange) {
                const DAFTAR_NOMINAL = { 'L':100000, 'LK':50000, 'LA':70000, 'LC':80000, 'P':0, 'A':0, 'BL':0, 'T':0 };
                if (DAFTAR_NOMINAL[statusCode] !== undefined) {
                    nomValue = DAFTAR_NOMINAL[statusCode];
                    nomEl.value = nomValue; // Ubah tampilan dropdown nominal agar sesuai
                }
            }

            try {
                // 1. Update ke Firebase
                await updateDoc(doc(db, 'artifacts', appId, 'users', uid), { 
                    [`iuran.${bulan}`]: statusCode,
                    [`iuranNominal.${bulan}`]: nomValue
                });
                
                // 2. Kirim Data ke Google Spreadsheet
                const payloadIuran = {
                    action: "update_iuran",
                    nama: nama,
                    blok: blok,
                    no_rumah: no,
                    bulan: bulan, 
                    nominal: nomValue,
                    status: statusCode, 
                    waktu: new Date().toLocaleString('id-ID')
                };
                if (GOOGLE_SCRIPT_URL) fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payloadIuran) }).catch(()=>{});

                showToast(`Data tersimpan: ${statusCode} (Rp${nomValue.toLocaleString('id-ID')})`);
                loadAdminIuran(); // Refresh kartu untuk menampilkan label yang baru
            } catch(e) { showToast("Gagal update iuran.", true); }
        };

        // ================= NOTIFIKASI & REALTIME =================
        function cekTombolNotifikasi() {
            const notifModal = document.getElementById('notifPromptModal'); if (!notifModal) return;
            if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') { notifModal.classList.remove('hidden'); } else { notifModal.classList.add('hidden'); }
        }
        window.tutupPromptNotif = function() { const mod = document.getElementById('notifPromptModal'); if (mod) mod.classList.add('hidden'); }
        window.mintaIzinNotifikasi = async function() {
            tutupPromptNotif();
            if (!('Notification' in window)) return showToast("Tidak mendukung notifikasi.", true);
            const p = await Notification.requestPermission();
            if (p === 'granted') { kirimNotifikasiPesan('Aktif', 'Notifikasi berjalan.'); } else showToast("Mohon izinkan notifikasi di pengaturan browser.", true);
        };
        window.kirimNotifikasiPesan = function(judul, isi) {
            try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{}); } catch(e){}
            showToast(`🔔 ${judul}: ${isi}`);
            let newWorker;
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(reg => {
                reg.addEventListener('updatefound', () => {
                    newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        // Jika ada service worker baru dan yang lama sudah ada (update)
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            document.getElementById('updateBanner').classList.remove('hidden');
                        }
                    });
                });
            });

            // Reload saat service worker baru mengambil alih
            let refreshing;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                window.location.reload();
                refreshing = true;
            });
        }

        window.refreshAppUpdate = function() {
            if (newWorker) {
                // Sembunyikan banner dan suruh SW untuk skip waiting
                document.getElementById('updateBanner').classList.add('hidden');
                newWorker.postMessage({ action: 'skipWaiting' });
            }
        };
}

        function mulaiPantau(user) {
            unSubs.forEach(u => u()); unSubs = []; cekTombolNotifikasi();
            
            let initL = true;
            unSubs.push(onSnapshot(collection(db, 'artifacts', appId, 'laporan'), (s) => {
                if(initL) { initL=false; return; }
                s.docChanges().forEach(c => { 
                    if(c.type==='added' && c.doc.data().userId !== user.uid) { 
                        const lap = c.doc.data();
                        if (lap.layanan && lap.layanan.startsWith('DARURAT SOS')) {
                            bunyikanSireneDarurat();
                            kirimNotifikasiPesan(`🚨 ${lap.layanan}`, `${lap.nama} (Blok ${lap.blok}/${lap.no}) butuh bantuan!`);
                        } else {
                            kirimNotifikasiPesan(`Laporan Baru`, lap.layanan); 
                        }
                        const admView = document.getElementById('admViewLaporan'); 
                        if(admView && !admView.classList.contains('hidden')) loadAdminLaporan(); 
                    }
                });
            }, () => {}));

            let initC = true;
            unSubs.push(onSnapshot(collection(db, 'artifacts', appId, 'chats'), (s) => {
                allChatMessages = []; s.forEach(d => allChatMessages.push(Object.assign({id: d.id}, d.data()))); renderChatMessages();
                if(initC) { initC=false; return; }
                s.docChanges().forEach(c => {
                    const m = c.doc.data(); const isRT = window.currentUserData && window.currentUserData.role === 'Admin RT';
                    if(c.type==='added' && m.senderId !== user.uid && (m.roomId === 'GLOBAL' || m.recipientId === user.uid || isRT)) {
                        let msgText = m.text ? m.text : (m.imageUrl ? '[Mengirim Foto]' : '[Mengirim Stiker]');
                        if (msgText.includes('SINYAL DARURAT SOS')) bunyikanSireneDarurat();
                        kirimNotifikasiPesan(`Chat: ${m.senderName}`, msgText);
                        const cv = document.getElementById('chatView');
                        if(cv && cv.classList.contains('hidden')) { updateChatBadge(unreadChatCount + 1); }
                    }
                });
            }, () => {}));

            let initP = true;
            unSubs.push(onSnapshot(collection(db, 'artifacts', appId, 'pengumuman'), (s) => {
                if(initP) { initP=false; return; }
                s.docChanges().forEach(c => { if(c.type==='added') { loadPengumumanUtama(); const isRT = window.currentUserData && window.currentUserData.role === 'Admin RT'; if(!isRT) kirimNotifikasiPesan(`Pengumuman RT`, c.doc.data().judul); }});
            }, () => {}));

            unSubs.push(onSnapshot(doc(db, 'artifacts', appId, 'kas', 'config_sos'), (snap) => {
                const d = snap.exists() ? snap.data() : { enabled: true };
                isFiturSOSEnabled = d.enabled !== false;
                const bHead = document.getElementById('btnHeaderSOS');
                const bHome = document.getElementById('btnHomeSOS');
                const cbAdmin = document.getElementById('toggleFiturSOSCheckbox');
                if (cbAdmin) cbAdmin.checked = isFiturSOSEnabled;

                if (isFiturSOSEnabled) {
                    if (bHead) bHead.classList.remove('hidden');
                    if (bHome) bHome.classList.remove('hidden');
                } else {
                    if (bHead) bHead.classList.add('hidden');
                    if (bHome) bHome.classList.add('hidden');
                }

                const alertBanner = document.getElementById('sosActiveAlertBanner');
                const statusTxt = document.getElementById('adminStatusSOSText');
                const isRT = window.currentUserData && ['Admin RT', 'Pengurus RT', 'Bendahara', 'Sekretaris'].includes(window.currentUserData.role);
                const btnStopBanner = document.getElementById('btnAdminStopSOSBanner');
                if (btnStopBanner) {
                    if (isRT) btnStopBanner.classList.remove('hidden');
                    else btnStopBanner.classList.add('hidden');
                }

                if (d.activeSOS && d.activeSOS.jenis) {
                    if (alertBanner) {
                        document.getElementById('sosAlertTitle').innerText = `DARURAT: ${d.activeSOS.jenis}!`;
                        document.getElementById('sosAlertDesc').innerText = `Pelapor: ${d.activeSOS.nama} (${d.activeSOS.blok}) membutuhkan bantuan warga segera!`;
                        alertBanner.classList.remove('hidden');
                    }
                    if (statusTxt) statusTxt.innerText = `🚨 DARURAT AKTIF: ${d.activeSOS.jenis} oleh ${d.activeSOS.nama} (${d.activeSOS.blok})`;
                } else {
                    if (alertBanner) alertBanner.classList.add('hidden');
                    if (statusTxt) statusTxt.innerText = "Aman. Tidak ada sinyal darurat aktif.";
                }
            }, () => {}));

            unSubs.push(onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid), (snap) => {
                if (!snap.exists()) return;
                window.currentUserData = snap.data();
                const iuranMod = document.getElementById('iuranModal');
                if (iuranMod && !iuranMod.classList.contains('hidden')) loadIuranUser();
            }, () => {}));

            let initK = true;
            unSubs.push(onSnapshot(doc(db, 'artifacts', appId, 'kas', 'config_iuran'), (snap) => {
                if (!snap.exists()) return;
                const d = snap.data();
                if (d.nominalDefault) nominalIuranDefault = d.nominalDefault;
                if (d.reminderBulan) {
                    const myIuran = (window.currentUserData && window.currentUserData.iuran) ? window.currentUserData.iuran : {};
                    const sudahLunas = myIuran[d.reminderBulan] === 'Lunas';
                    const banner = document.getElementById('iuranReminderBanner');
                    if (!sudahLunas && banner) {
                        document.getElementById('iuranReminderTitle').innerText = `Pengingat Iuran Bulan ${d.reminderBulan}`;
                        document.getElementById('iuranReminderText').innerText = `Iuran sebesar ${formatRupiah(d.reminderNominal || nominalIuranDefault)} belum tercatat lunas di Kartu Iuran Anda.`;
                        banner.classList.remove('hidden');
                        if (!initK) kirimNotifikasiPesan(`Pengingat Iuran ${d.reminderBulan}`, `Mohon cek Kartu Iuran Digital Anda (${formatRupiah(d.reminderNominal || nominalIuranDefault)}).`);
                    } else if (banner) {
                        banner.classList.add('hidden');
                    }
                }
                initK = false;
            }, () => {}));

            let initH = true;
            unSubs.push(onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), (s) => {
                if(initH) { initH=false; return; }
                s.docChanges().forEach(c => { if(c.type==='modified') { kirimNotifikasiPesan(`Status Update`, `Permohonan ${c.doc.data().layanan}: ${c.doc.data().status}`); const rv = document.getElementById('riwayatView'); if(rv && !rv.classList.contains('hidden')) loadRiwayat(); }});
            }, () => {}));
        }

        // ================= AUTH =================
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const snap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid));
                    window.currentUserData = snap.exists() ? snap.data() : { nama: user.email.split('@')[0], role: 'Warga' };
                    showAppScreen(); prefillFormData(); perbaruiStatusUI_Fingerprint(); loadPengumumanUtama(); loadPollingUtama(); mulaiPantau(user);
                } catch(e) { showToast("Gagal memuat profil.", true); }
            } else { showAuthScreen(); }
        });

        window.setLoginRole = function(role) {
            const w = document.getElementById('tabWarga'); const a = document.getElementById('tabAdmin'); const e = document.getElementById('loginEmailContainer'); const mail = document.getElementById('loginEmail');
            if(role === 'admin') { if(a) a.className = "flex-1 py-2.5 text-sm font-bold bg-white text-brand rounded-lg shadow-sm"; if(w) w.className = "flex-1 py-2.5 text-sm font-medium text-gray-500 rounded-lg"; if(e) e.classList.add('hidden'); if(mail) mail.value = 'rt'; } 
            else { if(w) w.className = "flex-1 py-2.5 text-sm font-bold bg-white text-brand rounded-lg shadow-sm"; if(a) a.className = "flex-1 py-2.5 text-sm font-medium text-gray-500 rounded-lg"; if(e) e.classList.remove('hidden'); if(mail) mail.value = ''; }
        }
        window.switchAuthView = function(view) { ['loginForm','registerForm','forgotForm'].forEach(id => { const el = document.getElementById(id); if(el) el.classList.add('hidden'); }); const vEl = document.getElementById(view + 'Form'); if(vEl) vEl.classList.remove('hidden'); }
        function showAuthScreen() { const m = document.getElementById('mainAppContainer'); if(m) { m.classList.add('hidden'); m.classList.remove('flex'); } const a = document.getElementById('authContainer'); if(a) { a.classList.remove('hidden'); a.classList.add('flex'); } }
        function showAppScreen() {
            const a = document.getElementById('authContainer'); if(a) { a.classList.add('hidden'); a.classList.remove('flex'); }
            const m = document.getElementById('mainAppContainer'); if(m) { m.classList.remove('hidden'); m.classList.add('flex'); }
            
            const btnAd = document.getElementById('navAdminBtn'); const isRT = window.currentUserData && ['Admin RT', 'Pengurus RT', 'Bendahara', 'Sekretaris'].includes(window.currentUserData.role);
            if (btnAd) { if (isRT) { btnAd.classList.remove('hidden'); btnAd.classList.add('flex'); } else { btnAd.classList.add('hidden'); btnAd.classList.remove('flex'); } }
            
            const nm = (window.currentUserData && window.currentUserData.nama) ? window.currentUserData.nama : 'Warga';
            const wN = document.getElementById('welcomeName'); if(wN) wN.innerText = nm.split(' ')[0] + '!'; const pN = document.getElementById('profNama'); if(pN) pN.innerText = nm; 
            const pR = document.getElementById('profRole'); if(pR) pR.innerText = (window.currentUserData && window.currentUserData.role) ? window.currentUserData.role : 'Warga'; 
            const pE = document.getElementById('profEmail'); if(pE) pE.innerText = (window.currentUserData && window.currentUserData.email) ? window.currentUserData.email : '-'; 
            const pH = document.getElementById('profHp'); if(pH) pH.innerText = (window.currentUserData && window.currentUserData.hp) ? window.currentUserData.hp : '-'; 
            const pB = document.getElementById('profBlok'); if(pB) pB.innerText = (window.currentUserData && window.currentUserData.blok) ? window.currentUserData.blok : '-'; 
            const pNo = document.getElementById('profNo'); if(pNo) pNo.innerText = (window.currentUserData && window.currentUserData.no) ? window.currentUserData.no : '-';
            
            const pPic = (window.currentUserData && window.currentUserData.photoBase64) ? window.currentUserData.photoBase64 : null; const pd = document.getElementById('profPhotoDisplay'); const pi = document.getElementById('profIconDisplay');
            if (pPic) { if(pd) { pd.src = pPic; pd.classList.remove('hidden'); } if(pi) { pi.classList.add('hidden'); } }
        }
        function prefillFormData() {
            try {
                const u = window.currentUserData; if(!u) return;
                ['stdNama','tlNama','invNama','spNama','dwNamaSingle'].forEach(id => { const el = document.getElementById(id); if(el) el.value = u.nama ? u.nama : ''; });
                ['stdBlok','tlBlok','dwBlok','invBlok','spBlok'].forEach(id => { const el = document.getElementById(id); if(el) el.value = u.blok ? u.blok : ''; });
                ['stdNo','tlNo','dwNo','invNo','spNo'].forEach(id => { const el = document.getElementById(id); if(el) el.value = u.no ? u.no : ''; });
            } catch(e) {}
        }

        window.handleLogin = async function(e) {
            e.preventDefault(); const mailEl = document.getElementById('loginEmail'); const passEl = document.getElementById('loginPassword'); const btn = document.getElementById('btnLogin'); if(!mailEl || !passEl || !btn) return;
            const id = mailEl.value.trim(); const pw = passEl.value; btn.disabled = true;
            let em = id.includes('@') ? id : id.replace(/[^a-z0-9]/gi,'') + '@mabupark.local';
            if(id.toLowerCase()==='rt' && pw==='Kosong.19') em = 'hilmanmabu@gmail.com';
            try {
                sessionStorage.setItem('rt10_temp_auth', JSON.stringify({email: btoa(em), pass: btoa(pw)}));
                if(id.toLowerCase()==='rt' && pw==='Kosong.19') {
                    try { await signInWithEmailAndPassword(auth, em, pw); } catch(e) { const u = await createUserWithEmailAndPassword(auth, em, pw); await setDoc(doc(db, 'artifacts', appId, 'users', u.user.uid), {nama: KETUA_RT_NAMA, email:em, hp:'089', blok:'RT', no:'10', role:'Admin RT'}); } return;
                }
                await signInWithEmailAndPassword(auth, em, pw);
            } catch(e) { showToast("Login gagal. Periksa kembali akun/password.", true); } finally { btn.disabled = false; }
        }
        window.handleRegister = async function(e) {
            e.preventDefault(); const nEl = document.getElementById('regNama'); const eEl = document.getElementById('regEmail'); const pEl = document.getElementById('regPassword'); const b = document.getElementById('btnRegister'); if(!nEl || !eEl || !pEl || !b) return;
            const nm = nEl.value.trim(); const id = eEl.value.trim(); const pw = pEl.value; b.disabled = true;
            let em = id.includes('@') ? id : id.replace(/[^a-z0-9]/gi,'') + '@mabupark.local';
            try {
                sessionStorage.setItem('rt10_temp_auth', JSON.stringify({email: btoa(em), pass: btoa(pw)})); const c = await createUserWithEmailAndPassword(auth, em, pw);
                const hpV = document.getElementById('regHp') ? document.getElementById('regHp').value : ''; const blkV = document.getElementById('regBlok') ? document.getElementById('regBlok').value.toUpperCase() : ''; const noV = document.getElementById('regNo') ? document.getElementById('regNo').value : '';
                await setDoc(doc(db, 'artifacts', appId, 'users', c.user.uid), { nama: nm, email: id, hp: hpV, blok: blkV, no: noV, role: 'Warga' });
                showToast("Daftar sukses!");
            } catch(e) { showToast("Gagal mendaftar: Akun mungkin sudah terdaftar.", true); } finally { b.disabled = false; }
        }
        window.handleForgot = async function(e) {
            e.preventDefault(); const em = document.getElementById('forgotEmail').value.trim(); const btn = document.getElementById('btnForgot'); if(!em) return;
            btn.disabled = true;
            try { await sendPasswordResetEmail(auth, em); showToast("Link reset telah dikirim ke email Anda."); switchAuthView('login'); }
            catch(err) { showToast("Gagal mengirim link reset.", true); } finally { btn.disabled = false; }
        }
        window.handleLogout = async function() { unSubs.forEach(u => u()); unSubs = []; await signOut(auth); closeModal('profileModal', 'profileModalContent'); showToast("Logout berhasil."); }

        window.toggleEditProfile = function(isEdit) {
            const vMode = document.getElementById('profileViewMode'); const eMode = document.getElementById('profileEditMode');
            if(isEdit) {
                if(vMode) vMode.classList.add('hidden'); if(eMode) eMode.classList.remove('hidden');
                const eN = document.getElementById('editNama'); if(eN) eN.value = (window.currentUserData && window.currentUserData.nama) ? window.currentUserData.nama : ''; 
                const eH = document.getElementById('editHp'); if(eH) eH.value = (window.currentUserData && window.currentUserData.hp) ? window.currentUserData.hp : ''; 
                const eB = document.getElementById('editBlok'); if(eB) eB.value = (window.currentUserData && window.currentUserData.blok) ? window.currentUserData.blok : ''; 
                const eNo = document.getElementById('editNo'); if(eNo) eNo.value = (window.currentUserData && window.currentUserData.no) ? window.currentUserData.no : '';
                const pPic = (window.currentUserData && window.currentUserData.photoBase64) ? window.currentUserData.photoBase64 : null;
                const ePrev = document.getElementById('editPhotoPreview'); const eIco = document.getElementById('editIconPreview'); const eB64 = document.getElementById('editPhotoBase64');
                if(pPic) { if(ePrev) { ePrev.src = pPic; ePrev.classList.remove('hidden'); } if(eIco) eIco.classList.add('hidden'); if(eB64) eB64.value = pPic; }
            } else { if(vMode) vMode.classList.remove('hidden'); if(eMode) eMode.classList.add('hidden'); }
        }
        window.handleDocPhoto = function(e, prevId, icoId, hidId) {
            const f = e.target.files[0]; if(!f) return;
            const r = new FileReader(); r.onload = ev => {
                const i = new Image(); i.onload = () => {
                    const c = document.createElement('canvas'); let w = i.width, h = i.height;
                    if(w > h && w > 800) { h *= 800/w; w = 800; } else if(h > 800) { w *= 800/h; h = 800; }
                    c.width = w; c.height = h; c.getContext('2d').drawImage(i, 0, 0, w, h);
                    const b64 = c.toDataURL('image/jpeg', 0.6); const prev = document.getElementById(prevId); if(prev) { prev.src = b64; prev.classList.remove('hidden'); }
                    const ico = document.getElementById(icoId); if(ico) ico.classList.add('hidden'); const hid = document.getElementById(hidId); if(hid) hid.value = b64;
                }; i.src = ev.target.result;
            }; r.readAsDataURL(f);
        }
        window.handleProfilePhoto = e => window.handleDocPhoto(e, 'editPhotoPreview', 'editIconPreview', 'editPhotoBase64');

        window.saveProfile = async function(e) {
            e.preventDefault();
            try {
                const nV = document.getElementById('editNama') ? document.getElementById('editNama').value.trim() : ''; const hV = document.getElementById('editHp') ? document.getElementById('editHp').value.trim() : ''; const bV = document.getElementById('editBlok') ? document.getElementById('editBlok').value.toUpperCase() : ''; const noV = document.getElementById('editNo') ? document.getElementById('editNo').value : ''; const pbV = document.getElementById('editPhotoBase64') ? document.getElementById('editPhotoBase64').value : '';
                const u = { nama: nV, hp: hV, blok: bV, no: noV, photoBase64: pbV };
                await setDoc(doc(db, 'artifacts', appId, 'users', auth.currentUser.uid), u, {merge:true});
                window.currentUserData = Object.assign({}, window.currentUserData, u); showAppScreen(); toggleEditProfile(false); showToast("Tersimpan.");
            } catch(e) { showToast("Gagal menyimpan.", true); }
        }

        // ================= MODALS & FORMS =================
        window.openModal = function(srv) {
            try {
                const mT = document.getElementById('modalTitle'); if(mT) mT.innerText = srv === 'Surat Menyurat' ? 'Surat Pengantar RT' : srv; 
                const sT = document.getElementById('serviceType'); if(sT) sT.value = srv; 
                const mF = document.getElementById('mainForm'); if(mF) mF.reset(); 
                prefillFormData(); if (window.toggleKeluargaStatus) window.toggleKeluargaStatus();
                ['stdBukti','dwKtp','dwKk'].forEach(p => { const img = document.getElementById(p+'Preview'); const ico = document.getElementById(p+'Icon'); const b64 = document.getElementById(p+'Base64'); if(img){ img.src=''; img.classList.add('hidden'); } if(ico) ico.classList.remove('hidden'); if(b64) b64.value=''; });
                ['standardForm','suratPengantarForm','tanyaLaporForm','dataWargaForm'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });
                
                if(srv === 'Isi Data Warga') { document.getElementById('dataWargaForm').classList.remove('hidden'); } 
                else if(srv === 'Tanya & Lapor RT') { document.getElementById('tanyaLaporForm').classList.remove('hidden'); } 
                else if(srv === 'Surat Menyurat') { document.getElementById('suratPengantarForm').classList.remove('hidden'); }
                else { document.getElementById('standardForm').classList.remove('hidden'); }
                showModal('orderModal', 'modalContent');
            } catch (err) { showToast("Terjadi kesalahan sistem.", true); }
        }
        window.openProfileModal = () => { if(window.toggleEditProfile) window.toggleEditProfile(false); perbaruiStatusUI_Fingerprint(); showModal('profileModal', 'profileModalContent'); };
        window.openInventarisModal = () => { const f = document.getElementById('inventarisForm'); if(f) f.reset(); prefillFormData(); loadInventarisWarga(); showModal('inventarisModal', 'inventarisModalContent'); }

        window.submitForm = async function(e) {
            e.preventDefault(); const stEl = document.getElementById('serviceType'); const srv = stEl ? stEl.value : ''; const b = e.target.querySelector('button[type="submit"]'); if(b) b.disabled = true;
            let dObj = { layanan: srv, waktu: new Date().toLocaleString('id-ID') };
            let suratData = null;

            try {
                if (srv === 'Isi Data Warga') {
                    const skEl = document.querySelector('input[name="statusKeluarga"]:checked'); const sk = skEl ? skEl.value : '';
                    const srEl = document.querySelector('input[name="statusRumah"]:checked'); const sr = srEl ? srEl.value : '';
                    const ktEl = document.querySelector('input[name="statusKtp"]:checked'); const k = ktEl ? ktEl.value : '';
                    const nsEl = document.getElementById('dwNamaSingle'); const nsuEl = document.getElementById('dwNamaSuami'); const nisEl = document.getElementById('dwNamaIstri');
                    const nm = sk === 'Belum Berkeluarga/Single' ? (nsEl ? nsEl.value : '') : (nsuEl ? nsuEl.value : '');
                    const bEl = document.getElementById('dwBlok'); const noEl = document.getElementById('dwNo');
                    const alEl = document.getElementById('dwAlamat'); const agEl = document.getElementById('dwAgama'); const jwEl = document.getElementById('dwJiwa');
                    const ktpB = document.getElementById('dwKtpBase64'); const kkB = document.getElementById('dwKkBase64');
                    dObj = Object.assign(dObj, { 
                        nama: nm, blok: bEl?bEl.value:'', no_rumah: noEl?noEl.value:'', detail: `Pembaruan Data (${sk})`,
                        status_keluarga: sk, status_rumah: sr, nama_suami: nsuEl?nsuEl.value:'', nama_istri: nisEl?nisEl.value:'',
                        alamat_semula: alEl?alEl.value:'', agama: agEl?agEl.value:'', status_ktp: k, jumlah_jiwa: jwEl?jwEl.value:'',
                        foto_ktp: ktpB?ktpB.value:null, foto_kk: kkB?kkB.value:null 
                    });
                    if(auth.currentUser) await setDoc(doc(db, 'artifacts', appId, 'users', auth.currentUser.uid), {foto_ktp: dObj.foto_ktp, foto_kk: dObj.foto_kk}, {merge:true});
                } else if (srv === 'Surat Menyurat') {
                    const kepPilihan = document.getElementById('spKeperluanSelect').value;
                    const kepFinal = kepPilihan === 'Lainnya' ? document.getElementById('spKeperluanLain').value : kepPilihan;
                    suratData = {
                        nama: document.getElementById('spNama').value.trim(),
                        nik: document.getElementById('spNik').value.trim(),
                        ttl: document.getElementById('spTtl').value.trim(),
                        jk: document.getElementById('spJk').value,
                        agama: document.getElementById('spAgama').value,
                        status_nikah: document.getElementById('spStatusNikah').value,
                        pekerjaan: document.getElementById('spPekerjaan').value.trim(),
                        blok: document.getElementById('spBlok').value.toUpperCase().trim(),
                        no: document.getElementById('spNo').value.trim(),
                        keperluan: kepFinal
                    };
                    dObj = Object.assign(dObj, { nama: suratData.nama, blok: suratData.blok, no_rumah: suratData.no, detail: `Surat Pengantar: ${kepFinal} (NIK: ${suratData.nik})` });
                } else if (srv === 'Tanya & Lapor RT') {
                    const nEl = document.getElementById('tlNama'); const bEl = document.getElementById('tlBlok'); const noEl = document.getElementById('tlNo'); const jEl = document.getElementById('tlJenis'); const dEl = document.getElementById('tlDetail');
                    dObj = Object.assign(dObj, { nama: nEl?nEl.value:'', blok: bEl?bEl.value:'', no_rumah: noEl?noEl.value:'', jenis_laporan: jEl?jEl.value:'', detail: (jEl?jEl.value:'') + ' - ' + (dEl?dEl.value:'') });
                } else {
                    const nEl = document.getElementById('stdNama'); const bEl = document.getElementById('stdBlok'); const noEl = document.getElementById('stdNo'); const dEl = document.getElementById('stdDetail'); const fEl = document.getElementById('stdBuktiBase64');
                    dObj = Object.assign(dObj, { nama: nEl?nEl.value:'', blok: bEl?bEl.value:'', no_rumah: noEl?noEl.value:'', detail: dEl?dEl.value:'', foto_bukti: fEl?fEl.value:null });
                }
                if (GOOGLE_SCRIPT_URL) fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(dObj) }).catch(()=>{});
                await addDoc(collection(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'history'), { layanan: srv, timestamp: Date.now(), detail: dObj.detail, suratData: suratData, foto_bukti: dObj.foto_bukti||null, foto_ktp: dObj.foto_ktp||null, foto_kk: dObj.foto_kk||null, status: 'Menunggu' });
                await addDoc(collection(db, 'artifacts', appId, 'laporan'), { userId: auth.currentUser.uid, nama: dObj.nama, blok: dObj.blok, no: dObj.no_rumah, layanan: srv, detail: dObj.detail, timestamp: Date.now() });
                showToast("Permohonan terkirim ke Pengurus RT."); closeModal('orderModal', 'modalContent'); const rv = document.getElementById('riwayatView'); if(rv && !rv.classList.contains('hidden')) loadRiwayat();
            } catch(e) { showToast("Gagal mengirim laporan.", true); } finally { if(b) b.disabled = false; }
        }

        window.submitInventaris = async function(e) {
            e.preventDefault(); const cbs = document.querySelectorAll('.inv-checkbox:checked'); if(cbs.length===0) return showToast("Pilih minimal 1 barang.", true);
            const b = e.target.querySelector('button[type="submit"]'); if(b) b.disabled = true; let itm = []; cbs.forEach(c => itm.push(c.value));
            try {
                const dt = `Pinjam: ${itm.join(', ')}`; const nEl = document.getElementById('invNama'); const bEl = document.getElementById('invBlok'); const noEl = document.getElementById('invNo');
                await addDoc(collection(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'history'), { layanan: 'Inventaris', timestamp: Date.now(), detail: dt, status: 'Menunggu' });
                await addDoc(collection(db, 'artifacts', appId, 'laporan'), { userId: auth.currentUser.uid, nama: nEl?nEl.value:'', blok: bEl?bEl.value:'', no: noEl?noEl.value:'', layanan: 'Inventaris', detail: dt, timestamp: Date.now() });
                showToast("Permintaan terkirim."); closeModal('inventarisModal', 'inventarisModalContent'); const rv = document.getElementById('riwayatView'); if(rv && !rv.classList.contains('hidden')) loadRiwayat();
            } catch(e) { showToast("Gagal mengirim.", true); } finally { if(b) b.disabled = false; }
        }

        window.toggleKeluargaStatus = function() {
            const el = document.querySelector('input[name="statusKeluarga"]:checked'); const st = el ? el.value : 'Belum Berkeluarga/Single';
            const fB = document.getElementById('formBelumKeluarga'); const fS = document.getElementById('formSudahKeluarga');
            if (st === 'Belum Berkeluarga/Single') { if(fB) fB.classList.remove('hidden'); if(fS) fS.classList.add('hidden'); } else { if(fB) fB.classList.add('hidden'); if(fS) fS.classList.remove('hidden'); }
        }

        // ================= ADMIN & TAMBAH WARGA BARU =================
        window.openAdminModal = function() { 
            const isRT = window.currentUserData && ['Admin RT', 'Pengurus RT', 'Bendahara', 'Sekretaris'].includes(window.currentUserData.role);
            if(!isRT) return showToast("Akses ditolak.",true); showModal('adminModal', 'adminModalContent'); switchAdminTab('warga'); 
        }
        window.switchAdminTab = function(t) { 
            ['Warga','Laporan','Iuran','Kas','Sos','Inventaris','Pengumuman'].forEach(x => { 
                const v = document.getElementById('admView'+x); const b = document.getElementById('tabAdm'+x); 
                if(x.toLowerCase()===t){ if(v) v.classList.replace('hidden','block'); if(b) b.className="flex-1 whitespace-nowrap px-3 py-2 text-xs font-bold bg-white text-brand rounded-lg shadow-sm"; } 
                else { if(v) v.classList.replace('block','hidden'); if(b) b.className="flex-1 whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-500 rounded-lg"; } 
            }); 
            if(t==='warga') loadAdminWargaList(); 
            else if(t==='laporan') loadAdminLaporan(); 
            else if(t==='pengumuman') loadAdminPengumuman(); 
            else if(t==='inventaris') loadAdminInventaris(); 
            else if(t==='kas') loadBukuKas();
            else if(t==='iuran') loadAdminIuran();
        }

        window.toggleAdminAddWarga = function(show) {
            const f = document.getElementById('adminAddWargaForm');
            const b = document.getElementById('btnToggleAddWarga');
            if (!f || !b) return;
            if (show) {
                f.classList.remove('hidden');
                b.classList.add('hidden');
            } else {
                f.classList.add('hidden');
                b.classList.remove('hidden');
                f.reset();
                document.getElementById('admNewPass').value = 'warga010';
            }
        };

        window.simpanWargaBaruAdmin = async function(e) {
            e.preventDefault();
            const nm = document.getElementById('admNewNama').value.trim();
            const hp = document.getElementById('admNewHp').value.trim();
            const blok = document.getElementById('admNewBlok').value.toUpperCase().trim();
            const no = document.getElementById('admNewNo').value.trim();
            const role = document.getElementById('admNewRole').value;
            const rawId = document.getElementById('admNewEmail').value.trim();
            const pw = document.getElementById('admNewPass').value;
            const btn = document.getElementById('btnSubmitNewWarga');

            if (!nm || !rawId || pw.length < 6) return showToast("Lengkapi data & password minimal 6 karakter!", true);
            btn.disabled = true;
            btn.innerText = "Mendaftarkan...";

            const emailFinal = rawId.includes('@') ? rawId : rawId.replace(/[^a-z0-9]/gi, '') + '@mabupark.local';

            try {
                const cred = await createUserWithEmailAndPassword(secondaryAuth, emailFinal, pw);
                const newUid = cred.user.uid;
                await signOut(secondaryAuth);

                await setDoc(doc(db, 'artifacts', appId, 'users', newUid), {
                    nama: nm,
                    email: rawId,
                    hp: hp,
                    blok: blok,
                    no: no,
                    role: role,
                    createdAt: Date.now()
                });

                showToast(`✅ Warga "${nm}" berhasil ditambahkan!`);
                toggleAdminAddWarga(false);
                loadAdminWargaList();
            } catch (err) {
                if (err.code === 'auth/email-already-in-use') {
                    const customId = 'warga_' + Date.now();
                    await setDoc(doc(db, 'artifacts', appId, 'users', customId), {
                        nama: nm,
                        email: rawId,
                        hp: hp,
                        blok: blok,
                        no: no,
                        role: role,
                        createdAt: Date.now()
                    });
                    showToast(`✅ Data warga "${nm}" berhasil ditambahkan ke daftar!`);
                    toggleAdminAddWarga(false);
                    loadAdminWargaList();
                } else {
                    showToast("Gagal menambah warga: " + (err.message || "Periksa input"), true);
                }
            } finally {
                btn.disabled = false;
                btn.innerText = "Simpan & Buat Akun Warga";
            }
        };

        async function loadAdminWargaList() {
            const cont = document.getElementById('adminWargaList'); if(!cont) return; cont.innerHTML = 'Loading...';
            try {
                const s = await getDocs(collection(db, 'artifacts', appId, 'users')); let h = '';
                s.forEach(d => {
                    const u = d.data(); const dStr = encodeURIComponent(JSON.stringify({nama:u.nama?u.nama:'',hp:u.hp?u.hp:'',blok:u.blok?u.blok:'',no:u.no?u.no:'',role:u.role?u.role:''}));
                    h += `<div class="warga-card p-3 border rounded-xl bg-gray-50 flex items-center gap-3"><div class="flex-1"><h3 class="font-bold text-sm text-gray-800">${u.nama ? u.nama : 'Warga'}</h3><p class="text-xs text-gray-500">Blok ${u.blok ? u.blok : '-'}/${u.no ? u.no : '-'} • HP: ${u.hp ? u.hp : '-'} • <span class="font-semibold text-brand">${u.role ? u.role : 'Warga'}</span></p></div><div class="flex gap-2"><button onclick="openAdminEditModal('${d.id}', '${dStr}')" class="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200 transition"><i class="fa-solid fa-pen text-xs"></i></button><button onclick="hapusLaporanWarga('${d.id}', null, 'warga')" class="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 transition"><i class="fa-solid fa-trash text-xs"></i></button></div></div>`;
                }); cont.innerHTML = h || '<p class="text-center text-xs text-gray-400 py-4">Belum ada data warga.</p>';
            } catch(e) { cont.innerHTML = 'Gagal memuat.'; }
        }
        window.filterWarga = function() {
            let input = document.getElementById('searchWarga').value.toLowerCase(); let cards = document.querySelectorAll('.warga-card');
            cards.forEach(card => { if(card.innerText.toLowerCase().includes(input)) { card.style.display = 'flex'; } else { card.style.display = 'none'; } });
        }
        window.loadAdminLaporan = async function() {
            const cont = document.getElementById('adminLaporanList'); if(!cont) return; cont.innerHTML = 'Loading...';
            try {
                let r = []; const us = await getDocs(collection(db, 'artifacts', appId, 'users'));
                for(let i=0; i<us.docs.length; i++) { 
                    const u = us.docs[i]; 
                    const hs = await getDocs(collection(db, 'artifacts', appId, 'users', u.id, 'history')); 
                    hs.forEach(h => r.push(Object.assign({docId:h.id, userId:u.id, userName:u.data().nama, userBlok:u.data().blok}, h.data()))); 
                }
                r.sort(function(a,b){return b.timestamp-a.timestamp}); 
                let h='';
                r.forEach(x => { 
                    let pdfBtn = '';
                    const isSelesai = x.status === 'Selesai';

                    if (x.layanan === 'Surat Menyurat' && isSelesai) {
                        const payloadPdf = encodeURIComponent(JSON.stringify(Object.assign({ nama: x.userName, blok: x.userBlok, detail: x.detail, timestamp: x.timestamp, approvedAt: x.approvedAt }, x.suratData || {})));
                        pdfBtn = `<button onclick="cetakSuratPDF('${payloadPdf}')" class="text-[10px] bg-emerald-600 text-white px-2.5 py-1 rounded font-bold"><i class="fa-solid fa-file-pdf mr-1"></i>Unduh PDF</button>`;
                    }

                    // KARTU LAPORAN DENGAN KOTAK CEKLIS VERIFIKASI
                    h += `<div class="p-3 bg-white border rounded-xl shadow-sm mb-2">
                            <div class="flex justify-between items-start mb-1">
                                <div>
                                    <h4 class="font-bold text-sm text-gray-800">${x.layanan}</h4>
                                    <p class="text-[10px] text-gray-500">${x.userName} (Blok ${x.userBlok})</p>
                                </div>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded border ${isSelesai?'bg-green-100 text-green-700':x.status==='Diproses'?'bg-blue-100 text-blue-700':'bg-yellow-100 text-yellow-700'}">${x.status?x.status:'Menunggu'}</span>
                            </div>
                            <p class="text-xs mb-2 text-gray-600">${x.detail?x.detail:'-'}</p>
                            ${x.foto_bukti ? `<img onclick="lihatGambarModal('Bukti', '${x.foto_bukti}')" src="${x.foto_bukti}" class="h-20 rounded mb-2 cursor-pointer border">`:''}
                            
                            <div class="flex items-center justify-between border-t pt-2.5 mt-2 bg-gray-50 p-2 rounded-lg">
                                <label class="flex items-center gap-2 cursor-pointer select-none">
                                    <input type="checkbox" ${isSelesai ? 'checked' : ''} onchange="toggleVerifikasiAdmin('${x.userId}', '${x.docId}', this.checked)" class="w-4 h-4 accent-brand rounded cursor-pointer">
                                    <span class="text-xs font-bold ${isSelesai ? 'text-green-700' : 'text-gray-700'}">
                                        ${isSelesai ? '✓ Terverifikasi & Disetujui RT' : 'Centang untuk Verifikasi / Setujui'}
                                    </span>
                                </label>
                                ${pdfBtn}
                                <button onclick="hapusLaporanWarga('${x.userId}', '${x.docId}', 'laporan')" class="text-xs text-red-500 hover:text-red-700 p-1"><i class="fa-solid fa-trash"></i></button>
                            </div>
                          </div>`; 
                }); 
                cont.innerHTML = h ? h : '<p class="text-xs text-gray-400 text-center py-4">Belum ada laporan.</p>';
            } catch(e) { cont.innerHTML = '<p class="text-xs text-red-500 text-center">Gagal memuat laporan.</p>'; }
			
			window.toggleVerifikasiAdmin = async function(userId, docId, isChecked) {
         const statusBaru = isChecked ? 'Selesai' : 'Diproses';
         try {
             await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'history', docId), { 
                 status: statusBaru, 
                 approvedBy: KETUA_RT_NAMA, 
                 approvedAt: Date.now() 
             });
             showToast(isChecked ? "✅ Berhasil diverifikasi & disetujui!" : "Status verifikasi dibatalkan.");
             loadAdminLaporan();
         } catch (err) {
             showToast("Gagal memperbarui status verifikasi.", true);
             loadAdminLaporan();
         }
     };
        }
        window.updateLaporanStatus = async (uid, did, st) => { 
            try { 
                await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'history', did), { status: st, approvedBy: KETUA_RT_NAMA, approvedAt: Date.now() }); 
                showToast(st === 'Selesai' ? "Disetujui! Surat PDF siap diunduh." : "Status diubah."); 
                loadAdminLaporan(); 
            } catch(e){} 
        }
        window.hapusLaporanWarga = async (uid, did, type) => {
            if(!confirm("Yakin hapus?")) return;
            try { if(type==='laporan') await deleteDoc(doc(db, 'artifacts', appId, 'users', uid, 'history', did)); else await deleteDoc(doc(db, 'artifacts', appId, 'users', uid)); showToast("Dihapus."); type==='laporan'?loadAdminLaporan():loadAdminWargaList(); } catch(e) {}
        }
        window.closeConfirmModal = () => closeModal('confirmModal', 'confirmModalContent');
        window.loadAdminPengumuman = async function() {
            const cont = document.getElementById('adminPengumumanList'); if(!cont) return;
            try { const s = await getDocs(query(collection(db, 'artifacts', appId, 'pengumuman'), orderBy('timestamp', 'desc'))); let h=''; s.forEach(d => { h += `<div class="p-2 border rounded bg-white flex justify-between mb-2"><div><h4 class="font-bold text-sm">${d.data().judul}</h4><p class="text-xs text-gray-500">${d.data().isi}</p></div><button onclick="hapusPengumuman('${d.id}')" class="text-red-500"><i class="fa-solid fa-trash"></i></button></div>`; }); cont.innerHTML = h; } catch(e) {}
        }
        window.postPengumuman = async function() {
            try { const jEl = document.getElementById('pengJudul'); const iEl = document.getElementById('pengIsi'); await addDoc(collection(db, 'artifacts', appId, 'pengumuman'), { judul: jEl?jEl.value:'', isi: iEl?iEl.value:'', timestamp: Date.now() }); showToast("Diposting."); loadAdminPengumuman(); loadPengumumanUtama(); } catch(e) {}
        }
        window.hapusPengumuman = async function(id) { try { await deleteDoc(doc(db, 'artifacts', appId, 'pengumuman', id)); showToast("Dihapus."); loadAdminPengumuman(); loadPengumumanUtama(); } catch(e) {} }
        window.loadPengumumanUtama = async function() {
            try {
                const s = await getDocs(query(collection(db, 'artifacts', appId, 'pengumuman'), orderBy('timestamp', 'desc'))); const pc = document.getElementById('pengumumanContainer');
                if(!s.empty) { const d=s.docs[0].data(); const pj = document.getElementById('pengumumanJudul'); if(pj) pj.innerText=d.judul; const pi = document.getElementById('pengumumanIsi'); if(pi) pi.innerText=d.isi; if(pc) pc.classList.remove('hidden'); } else { if(pc) pc.classList.add('hidden'); }
            } catch(e) {}
        }

        // ================= INVENTARIS DINAMIS =================
        window.loadAdminInventaris = async function() {
            const cont = document.getElementById('adminInventarisList'); if(!cont) return; cont.innerHTML = 'Loading...';
            try {
                const s = await getDocs(query(collection(db, 'artifacts', appId, 'inventaris'), orderBy('timestamp', 'asc'))); let h = '';
                s.forEach(d => { h += `<div class="p-2 border rounded bg-white flex justify-between items-center mb-2"><div><h4 class="font-bold text-sm text-gray-800">${d.data().nama}</h4><p class="text-[10px] text-gray-500">${d.data().detail || '-'}</p></div><button onclick="hapusInventaris('${d.id}')" class="text-red-500 w-8 h-8 flex items-center justify-center bg-red-50 rounded hover:bg-red-100"><i class="fa-solid fa-trash text-xs"></i></button></div>`; });
                cont.innerHTML = h || '<p class="text-xs text-gray-500 text-center">Belum ada barang. Klik "Muat 13 Bawaan" di atas.</p>';
            } catch(e) { cont.innerHTML = '<p class="text-xs text-red-500">Gagal memuat.</p>'; }
        }
        window.tambahInventaris = async function() {
            const nEl = document.getElementById('invBaruNama'); const dEl = document.getElementById('invBaruDetail'); const nm = nEl ? nEl.value.trim() : ''; const dt = dEl ? dEl.value.trim() : '';
            if(!nm) return showToast("Nama barang wajib diisi!", true);
            try { await addDoc(collection(db, 'artifacts', appId, 'inventaris'), { nama: nm, detail: dt, timestamp: Date.now() }); showToast("Barang ditambahkan."); if(nEl) nEl.value = ''; if(dEl) dEl.value = ''; loadAdminInventaris(); } catch(e) { showToast("Gagal menambah.", true); }
        }
        window.hapusInventaris = async function(id) { if(!confirm("Hapus barang ini dari daftar inventaris?")) return; try { await deleteDoc(doc(db, 'artifacts', appId, 'inventaris', id)); showToast("Barang dihapus."); loadAdminInventaris(); } catch(e) { showToast("Gagal menghapus.", true); } }
        
        window.muatBarangBawaan = async function() {
            const btn = document.getElementById('btnMuatBawaan'); if(btn) { btn.disabled = true; btn.innerText = "Memuat..."; }
            const b = [
                {nama: "Gerobak", detail: ""},
                {nama: "Linggis", detail: ""},
                {nama: "Mesin potong rumput (Unit 1)", detail: "Tersedia 2 unit"},
                {nama: "Mesin potong rumput (Unit 2)", detail: "Tersedia 2 unit"},
                {nama: "Alat semprot tanaman elektrik", detail: ""},
                {nama: "Karpet", detail: ""},
                {nama: "Tenda 1", detail: "RUSAK - Patungan dengan RT 9"},
                {nama: "Kursi Plastik", detail: "Tersedia 30 pcs"},
                {nama: "Kabel + Lampu", detail: ""},
                {nama: "Garpu tanah kecil", detail: ""},
                {nama: "Pacul", detail: ""},
                {nama: "Speaker Aktif", detail: ""},
                {nama: "Sekop", detail: ""},
                {nama: "Megaphone", detail: ""}
            ];
            try { 
                for(let i=0; i<b.length; i++) { 
                    await addDoc(collection(db, 'artifacts', appId, 'inventaris'), { nama: b[i].nama, detail: b[i].detail, timestamp: Date.now()+i }); 
                } 
                showToast("Daftar barang berhasil dimuat!"); 
                loadAdminInventaris(); 
            } catch(e) { showToast("Gagal memuat.", true); } 
            finally { if(btn) { btn.disabled = false; btn.innerText = "Muat 13 Bawaan"; } }
        }

        window.loadInventarisWarga = async function() {
            const cont = document.getElementById('inventarisDynamicList'); if(!cont) return;
            cont.innerHTML = '<div class="text-center py-4"><i class="fa-solid fa-spinner fa-spin text-gray-400"></i></div>';
            try {
                const s = await getDocs(query(collection(db, 'artifacts', appId, 'inventaris'), orderBy('timestamp', 'asc')));
                let h = ''; let i = 1;
                s.forEach(d => {
                    const data = d.data();
                    h += `<label class="flex items-center justify-between p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-green-50 transition bg-white">
                            <div><span class="font-medium text-sm text-gray-800 block">${i}. ${data.nama}</span>
                            ${data.detail ? `<span class="text-[10px] text-gray-500 mt-0.5 block">${data.detail}</span>` : ''}</div>
                            <input type="checkbox" value="${data.nama}" class="w-5 h-5 border-gray-300 rounded inv-checkbox">
                          </label>`;
                    i++;
                });
                cont.innerHTML = h || '<p class="text-sm text-center text-gray-500 py-4">Belum ada barang yang dimasukkan oleh Admin RT.</p>';
            } catch(e) { cont.innerHTML = '<p class="text-xs text-center text-red-500 py-4">Gagal memuat daftar barang.</p>'; }
        }

        window.openAdminEditModal = (uid, data) => { 
            const d = JSON.parse(decodeURIComponent(data)); 
            const uidE = document.getElementById('adminEditUid'); if(uidE) uidE.value = uid; 
            const nE = document.getElementById('aEditNama'); if(nE) nE.value = d.nama; 
            const hE = document.getElementById('aEditHp'); if(hE) hE.value = d.hp; 
            const bE = document.getElementById('aEditBlok'); if(bE) bE.value = d.blok; 
            const noE = document.getElementById('aEditNo'); if(noE) noE.value = d.no; 
            const rE = document.getElementById('aEditRole'); if(rE) rE.value = d.role; 
            showModal('adminEditModal', 'adminEditModalContent'); 
        }
        window.closeAdminEditModal = () => closeModal('adminEditModal', 'adminEditModalContent');
        window.saveAdminEdit = async (e) => { 
            e.preventDefault(); 
            try { 
                const uid = document.getElementById('adminEditUid') ? document.getElementById('adminEditUid').value : ''; const nm = document.getElementById('aEditNama') ? document.getElementById('aEditNama').value : ''; const hp = document.getElementById('aEditHp') ? document.getElementById('aEditHp').value : ''; const b = document.getElementById('aEditBlok') ? document.getElementById('aEditBlok').value.toUpperCase() : ''; const no = document.getElementById('aEditNo') ? document.getElementById('aEditNo').value : ''; const r = document.getElementById('aEditRole') ? document.getElementById('aEditRole').value : '';
                await setDoc(doc(db, 'artifacts', appId, 'users', uid), { nama: nm, hp: hp, blok: b, no: no, role: r }, {merge:true}); showToast("Disimpan."); closeAdminEditModal(); loadAdminWargaList(); 
            } catch(e) {} 
        }

        window.switchTab = function(t) {
            ['homeView','chatView','riwayatView'].forEach(id => { const el = document.getElementById(id); if(el) el.classList.add('hidden'); });
            ['navBerandaBtn','navChatBtn','navRiwayatBtn'].forEach(id => { const el = document.getElementById(id); if(el) el.classList.replace('text-brand','text-gray-400'); });
            
            if(t==='riwayat') { const rv = document.getElementById('riwayatView'); if(rv) rv.classList.remove('hidden'); const nr = document.getElementById('navRiwayatBtn'); if(nr) nr.classList.replace('text-gray-400','text-brand'); loadRiwayat(); }
            else if(t==='chat') { const cv = document.getElementById('chatView'); if(cv) cv.classList.remove('hidden'); const nc = document.getElementById('navChatBtn'); if(nc) nc.classList.replace('text-gray-400','text-brand'); updateChatBadge(0); renderChatMessages(); }
            else { const hv = document.getElementById('homeView'); if(hv) hv.classList.remove('hidden'); const nb = document.getElementById('navBerandaBtn'); if(nb) nb.classList.replace('text-gray-400','text-brand'); }
        }

        window.loadRiwayat = async function() {
            const cont = document.getElementById('riwayatListContainer'); if(!cont) return; cont.innerHTML = 'Loading...';
            try {
                if(!auth.currentUser) return;
                const s = await getDocs(query(collection(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'history'), orderBy('timestamp', 'desc'))); let h='';
                const u = window.currentUserData || {};
                s.forEach(d => {
                    const item = d.data();
                    const l = item.layanan; const stat = item.status ? item.status : 'Menunggu'; const bg = stat==='Selesai'?'bg-green-100 text-green-700':stat==='Diproses'?'bg-blue-100 text-blue-700':'bg-yellow-100 text-yellow-700';
                    
                    let btnDownloadPdf = '';
                    if (l === 'Surat Menyurat' && stat === 'Selesai') {
                        const payloadPdf = encodeURIComponent(JSON.stringify(Object.assign({
                            nama: u.nama || 'Warga',
                            blok: u.blok || '-',
                            no: u.no || '-',
                            detail: item.detail,
                            timestamp: item.timestamp,
                            approvedAt: item.approvedAt
                        }, item.suratData || {})));
                        btnDownloadPdf = `<button onclick="cetakSuratPDF('${payloadPdf}')" class="mt-3 w-full bg-brand hover:bg-brand-dark text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow flex items-center justify-center gap-2 transition"><i class="fa-solid fa-file-pdf text-sm"></i> Download Surat Pengantar (PDF)</button>`;
                    }

                    h += `<div class="p-4 bg-white border rounded-xl shadow-sm flex gap-3"><div class="flex-1"><div class="flex justify-between items-start"><h4 class="font-bold text-sm">${l === 'Surat Menyurat' ? 'Surat Pengantar RT' : l}</h4><span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${bg}">${stat}</span></div><p class="text-xs text-gray-500 mt-1">${new Date(item.timestamp).toLocaleString('id-ID')}</p>${item.detail ? `<p class="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">${item.detail}</p>`:''}${btnDownloadPdf}</div></div>`;
                }); cont.innerHTML = h ? h : 'Belum ada riwayat permohonan.';
            } catch(e) { cont.innerHTML = 'Gagal memuat.'; }
        }

        function showModal(m, c) { const el = document.getElementById(m); const ct = document.getElementById(c); if(!el || !ct) return; el.classList.remove('hidden'); requestAnimationFrame(()=>{ el.classList.remove('opacity-0'); ct.classList.remove('translate-y-full', 'translate-y-8', 'scale-95'); }); }
        window.closeModal = function(m, c) { const el = document.getElementById(m); const ct = document.getElementById(c); if(!el || !ct) return; el.classList.add('opacity-0'); ct.classList.add((c==='confirmModalContent'||c==='sosModalContent')?'scale-95':'translate-y-full'); setTimeout(()=>el.classList.add('hidden'), 300); }

        // ================= PWA INSTALL =================
        let dPrompt; window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); dPrompt = e; setTimeout(() => { const pb = document.getElementById('pwaBanner'); if(pb) pb.classList.remove('hidden'); }, 2000); });
        window.hidePwaBanner = () => { const pb = document.getElementById('pwaBanner'); if(pb) pb.classList.add('hidden'); }
        window.installPwa = async () => { hidePwaBanner(); if (dPrompt) { dPrompt.prompt(); await dPrompt.userChoice; dPrompt = null; } }
        
        if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').then(r => { r.update(); setInterval(()=>r.update(), 60*1000); }); navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload()); }); }
  
