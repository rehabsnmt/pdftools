// ==========================================
// 1. CẤU HÌNH THƯ VIỆN BẢN QUYỀN
// ==========================================
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
const { PDFDocument, degrees } = PDFLib;

// ==========================================
// 2. KHAI BÁO BIẾN TOÀN CỤC
// ==========================================
let currentMode = ''; 
let uploadedFiles = [];
let pdfDocuments = [];
let sourcePdfDocuments = [];
let pagesData = []; 
let currentZoomIndex = -1;

// Biến hỗ trợ tính năng Zoom In / Zoom Out Modal
let currentModalZoom = 1;
let baseDisplayWidth = 0;
let baseDisplayHeight = 0;

let currentLang = localStorage.getItem('pdf_lang') || 'vi';
let isDarkMode = localStorage.getItem('pdf_theme') === 'dark';

// ==========================================
// 3. TỪ ĐIỂN ĐA NGÔN NGỮ
// ==========================================
const dict = {
    vi: {
        lang_btn: "🇻🇳 VI",
        home_title: "Bạn muốn làm gì?", home_sub: "Vui lòng chọn một tính năng để bắt đầu",
        mode_merge: "Gộp PDF", desc_merge: "Nối nhiều file thành một",
        mode_extract: "Tách PDF", desc_extract: "Trích xuất các trang đã chọn",
        mode_delete: "Xóa Trang", desc_delete: "Loại bỏ các trang thừa",
        mode_rotate: "Xoay PDF", desc_rotate: "Sửa lỗi trang bị ngược",
        mode_encrypt: "Bảo mật PDF", desc_encrypt: "Đặt mật khẩu & Phân quyền", 
        
        btn_back: "Quay lại", btn_select_all: "Chọn tất cả", btn_invert: "Đảo chọn",
        btn_rotate_selected: "Xoay 90°", btn_cancel: "Hủy",
        msg_processing: "Đang xử lý...", msg_loading: "Đang tải bản xem trước...",
        
        up_title_multi: "Kéo thả nhiều file PDF vào đây", up_sub_multi: "Kéo thả để đổi vị trí các trang",
        up_title_single: "Kéo thả 1 file PDF vào đây", 
        up_sub_rotate: "Để xoay các trang bị ngược", 
        up_sub_select: "Để chọn các trang cần xử lý",
        up_sub_encrypt: "Để thiết lập mật khẩu và quyền", 
        
        exec_merge: "Xuất File Đã Gộp", exec_extract: "Trích Xuất File", 
        exec_delete: "Xóa & Xuất File", exec_rotate: "Xuất File Đã Xoay",
        exec_encrypt: "Mã Hóa & Xuất File", 
        
        alert_no_file: "Vui lòng chọn file PDF!", alert_merge_count: "Vui lòng chọn từ 2 file trở lên để Gộp!",
        alert_no_page: "Không có trang nào để xuất! Vui lòng kiểm tra lại thao tác.",
        alert_api_error: "Lỗi kết nối máy chủ mã hóa!", 
        page_text: "Trang",

        // TỪ ĐIỂN PHẦN BẢO MẬT (ENCRYPT)
        enc_title: "Cài đặt Bảo mật & Quyền truy cập",
        enc_user_pwd: "Mật khẩu mở file (User Password)",
        enc_owner_pwd: "Mật khẩu quản lý quyền (Owner Password)",
        enc_permissions: "Cho phép thực hiện:",
        chk_print: "In ấn",
        chk_highres: "In độ phân giải cao",
        chk_copy: "Sao chép văn bản & hình ảnh",
        chk_modify: "Chỉnh sửa nội dung",
        chk_fill: "Điền biểu mẫu",
        chk_annotate: "Thêm nhận xét (Annotation)",
        chk_assemble: "Chèn, xoay, xóa trang"
    },
    en: {
        lang_btn: "🇺🇸 EN",
        home_title: "What do you want to do?", home_sub: "Please select a feature to start",
        mode_merge: "Merge PDF", desc_merge: "Combine multiple files into one",
        mode_extract: "Extract PDF", desc_extract: "Extract selected pages",
        mode_delete: "Delete Pages", desc_delete: "Remove unwanted pages",
        mode_rotate: "Rotate PDF", desc_rotate: "Fix upside-down pages",
        mode_encrypt: "Encrypt PDF", desc_encrypt: "Set password & permissions", 
        
        btn_back: "Back", btn_select_all: "Select All", btn_invert: "Invert",
        btn_rotate_selected: "Rotate 90°", btn_cancel: "Cancel",
        msg_processing: "Processing...", msg_loading: "Loading preview...",
        
        up_title_multi: "Drag & drop multiple PDFs here", up_sub_multi: "Drag & drop to reorder pages",
        up_title_single: "Drag & drop 1 PDF file here", 
        up_sub_rotate: "To rotate upside-down pages", 
        up_sub_select: "To select pages for processing",
        up_sub_encrypt: "To set security options", 
        
        exec_merge: "Export Merged File", exec_extract: "Extract Selected File", 
        exec_delete: "Delete & Export", exec_rotate: "Export Rotated File",
        exec_encrypt: "Encrypt & Export File", 
        
        alert_no_file: "Please select a PDF file!", alert_merge_count: "Please select 2 or more files to Merge!",
        alert_no_page: "No pages selected to export! Please check your selection.",
        alert_api_error: "Server connection error during encryption!", 
        page_text: "Page",

        enc_title: "Security & Permissions Settings",
        enc_user_pwd: "Open Document Password (User)",
        enc_owner_pwd: "Permissions Password (Owner)",
        enc_permissions: "Allow the following:",
        chk_print: "Printing",
        chk_highres: "High Resolution Printing",
        chk_copy: "Copying text & images",
        chk_modify: "Modifying content",
        chk_fill: "Filling form fields",
        chk_annotate: "Commenting (Annotations)",
        chk_assemble: "Insert, rotate, delete pages"
    }
};

// ==========================================
// 4. KHỞI TẠO DOM & TIÊM HTML GIAO DIỆN ZOOM
// ==========================================
const DOM = {
    btnToggleLang: document.getElementById('btnToggleLang'),
    btnToggleTheme: document.getElementById('btnToggleTheme'),
    uploadTitle: document.getElementById('uploadTitle'),
    uploadSub: document.getElementById('uploadSub'),
    executeText: document.getElementById('executeText'),
    zoomPageText: document.getElementById('zoomPageText'),
    
    homeScreen: document.getElementById('homeScreen'),
    uploadScreen: document.getElementById('uploadScreen'),
    workspaceScreen: document.getElementById('workspaceScreen'),
    fileInput: document.getElementById('fileInput'),
    dropZone: document.getElementById('dropZone'),
    previewGrid: document.getElementById('previewGrid'),
    loadingMsg: document.getElementById('loadingMsg'),
    
    encryptOptions: document.getElementById('encryptOptions'), 
    
    btnBackHome: document.getElementById('btnBackHome'),
    btnCancel: document.getElementById('btnCancel'),
    btnExecute: document.getElementById('btnExecute'),
    btnSelectAll: document.getElementById('btnSelectAll'),
    btnInvert: document.getElementById('btnInvert'),
    btnActionRotate: document.getElementById('btnActionRotate'),

    zoomModal: document.getElementById('zoomModal'),
    zoomCanvas: document.getElementById('zoomCanvas'),
    closeModal: document.getElementById('closeModal'),
    btnPrevPage: document.getElementById('btnPrevPage'),
    btnNextPage: document.getElementById('btnNextPage')
};

// ------ THIẾT LẬP GIAO DIỆN ZOOM IN/OUT TỰ ĐỘNG ------
const zoomWrapper = document.createElement('div');
zoomWrapper.style.width = '100%';
zoomWrapper.style.height = '80vh';
zoomWrapper.style.overflow = 'auto'; // Tạo thanh cuộn khi zoom to
zoomWrapper.style.textAlign = 'center';
DOM.zoomCanvas.parentNode.insertBefore(zoomWrapper, DOM.zoomCanvas);
zoomWrapper.appendChild(DOM.zoomCanvas);

const zoomControls = document.createElement('div');
zoomControls.style.display = 'flex';
zoomControls.style.gap = '15px';
zoomControls.style.marginTop = '15px';
zoomControls.style.zIndex = '1001';

const btnZoomOut = document.createElement('button');
btnZoomOut.innerText = '➖';
btnZoomOut.className = 'btn';
btnZoomOut.style.fontSize = '1.2rem';
btnZoomOut.style.padding = '5px 15px';

const btnZoomIn = document.createElement('button');
btnZoomIn.innerText = '➕';
btnZoomIn.className = 'btn';
btnZoomIn.style.fontSize = '1.2rem';
btnZoomIn.style.padding = '5px 15px';

zoomControls.appendChild(btnZoomOut);
zoomControls.appendChild(btnZoomIn);
DOM.zoomModal.appendChild(zoomControls);

// Hàm áp dụng tỷ lệ Zoom lên Canvas
function applyZoom() {
    DOM.zoomCanvas.style.width = `${baseDisplayWidth * currentModalZoom}px`;
    DOM.zoomCanvas.style.height = `${baseDisplayHeight * currentModalZoom}px`;
}

btnZoomIn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentModalZoom < 5) {
        currentModalZoom += 0.25;
        applyZoom();
    }
});

btnZoomOut.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentModalZoom > 0.5) {
        currentModalZoom -= 0.25;
        applyZoom();
    }
});

// Hỗ trợ giữ Ctrl + Lăn chuột để phóng to thu nhỏ
zoomWrapper.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0 && currentModalZoom < 5) currentModalZoom += 0.15;
        else if (e.deltaY > 0 && currentModalZoom > 0.5) currentModalZoom -= 0.15;
        applyZoom();
    }
});

// ==========================================
// 5. GIAO DIỆN & NGÔN NGỮ LOGIC
// ==========================================
function applyTheme() {
    if (isDarkMode) {
        document.body.setAttribute('data-theme', 'dark');
        DOM.btnToggleTheme.innerText = '🌞';
    } else {
        document.body.removeAttribute('data-theme');
        DOM.btnToggleTheme.innerText = '🌙';
    }
    localStorage.setItem('pdf_theme', isDarkMode ? 'dark' : 'light');
}

function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
    DOM.btnToggleLang.innerText = dict[currentLang].lang_btn;
    localStorage.setItem('pdf_lang', currentLang);
    
    if (currentMode) setupWorkspaceUI(); 
}

DOM.btnToggleTheme.addEventListener('click', () => { isDarkMode = !isDarkMode; applyTheme(); });
DOM.btnToggleLang.addEventListener('click', () => { currentLang = currentLang === 'vi' ? 'en' : 'vi'; applyLanguage(); });

applyTheme();
applyLanguage();

// ==========================================
// 6. CHỌN TÍNH NĂNG VÀ QUẢN LÝ LUỒNG
// ==========================================
document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
        currentMode = card.dataset.mode;
        DOM.homeScreen.style.display = 'none';
        DOM.uploadScreen.style.display = 'block';
        setupWorkspaceUI(); 
    });
});

function setupWorkspaceUI() {
    if (!currentMode) return;
    const isMerge = currentMode === 'merge';
    const isEncrypt = currentMode === 'encrypt';
    
    DOM.fileInput.multiple = isMerge;
    
    DOM.uploadTitle.innerText = dict[currentLang][isMerge ? 'up_title_multi' : 'up_title_single'];
    
    let subKey = 'up_sub_select';
    if (isMerge) subKey = 'up_sub_multi';
    else if (currentMode === 'rotate') subKey = 'up_sub_rotate';
    else if (currentMode === 'encrypt') subKey = 'up_sub_encrypt';
    DOM.uploadSub.innerText = dict[currentLang][subKey];

    const isSelectionMode = ['extract', 'delete', 'rotate'].includes(currentMode);
    DOM.btnSelectAll.style.display = isSelectionMode ? 'block' : 'none';
    DOM.btnInvert.style.display = isSelectionMode ? 'block' : 'none';
    DOM.btnActionRotate.style.display = currentMode === 'rotate' ? 'block' : 'none';

    if (DOM.encryptOptions) {
        DOM.encryptOptions.style.display = isEncrypt ? 'block' : 'none';
    }

    DOM.executeText.innerText = dict[currentLang][`exec_${currentMode}`];
}

function resetToHome() {
    DOM.workspaceScreen.style.display = 'none';
    DOM.uploadScreen.style.display = 'none';
    DOM.homeScreen.style.display = 'block';
    DOM.fileInput.value = '';
    
    if(document.getElementById('userPassword')) document.getElementById('userPassword').value = '';
    if(document.getElementById('ownerPassword')) document.getElementById('ownerPassword').value = '';

    currentMode = '';
    uploadedFiles = []; pdfDocuments = []; sourcePdfDocuments = []; pagesData = [];
}

DOM.btnBackHome.addEventListener('click', resetToHome);
DOM.btnCancel.addEventListener('click', resetToHome);

// ==========================================
// 7. XỬ LÝ UPLOAD FILE
// ==========================================
DOM.fileInput.addEventListener('change', e => handleFiles(e.target.files));
DOM.dropZone.addEventListener('dragover', e => { e.preventDefault(); DOM.dropZone.classList.add('drag-over'); });
DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('drag-over'));
DOM.dropZone.addEventListener('drop', e => { e.preventDefault(); DOM.dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });

async function handleFiles(files) {
    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (validFiles.length === 0) return alert(dict[currentLang].alert_no_file);
    if (currentMode === 'merge' && validFiles.length < 2) return alert(dict[currentLang].alert_merge_count);

    pagesData = []; 
    pdfDocuments = []; 
    sourcePdfDocuments = [];

    uploadedFiles = currentMode === 'merge' ? validFiles : [validFiles[0]];
    
    DOM.uploadScreen.style.display = 'none';
    DOM.workspaceScreen.style.display = 'flex';
    
    DOM.loadingMsg.innerHTML = `⚡ ${dict[currentLang].msg_loading}`;
    DOM.loadingMsg.style.display = 'block';
    DOM.previewGrid.innerHTML = '';
    
    try {
        for (let fileIdx = 0; fileIdx < uploadedFiles.length; fileIdx++) {
            const buffer = await uploadedFiles[fileIdx].arrayBuffer();
            
            sourcePdfDocuments[fileIdx] = await PDFDocument.load(buffer.slice(0));
            const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
            pdfDocuments[fileIdx] = pdfJsDoc;

            for (let pageIdx = 0; pageIdx < pdfJsDoc.numPages; pageIdx++) {
                pagesData.push({ fileIdx, pageIdx, selected: false, rotation: 0 });
            }
        }
        await renderGrid();
    } catch (error) {
        alert("Error: " + error.message);
        resetToHome();
    }
    DOM.loadingMsg.style.display = 'none';
}

// ==========================================
// 8. RENDER GRID VÀ KÉO THẢ
// ==========================================
async function renderGrid() {
    DOM.previewGrid.innerHTML = '';
    
    for (let i = 0; i < pagesData.length; i++) {
        const item = pagesData[i];
        const page = await pdfDocuments[item.fileIdx].getPage(item.pageIdx + 1);
        const viewport = page.getViewport({ scale: 0.4 });
        
        const card = document.createElement('div');
        card.className = 'page-card';
        card.draggable = true;
        card.dataset.index = i;
        if(item.selected) card.classList.add('selected');
        
        // SỬA LỖI ĐÁNH SỐ: Sử dụng i + 1 (vị trí mảng hiện tại) để số trang luôn cập nhật đúng khi kéo thả
        const titleText = currentMode === 'merge' 
            ? `${uploadedFiles[item.fileIdx].name} (${dict[currentLang].page_text} ${i + 1})` 
            : `${dict[currentLang].page_text} ${i + 1}`;

        card.innerHTML = `
            <div class="selected-badge">✓</div>
            <canvas></canvas>
            <div class="page-number" style="font-size:0.75rem; color:var(--text-muted); margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${titleText}</div>
            <button class="zoom-btn" title="Zoom">🔍</button>
        `;
        
        const canvas = card.querySelector('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
        applyCardRotation(card, item.rotation);

        if (currentMode !== 'merge' && currentMode !== 'encrypt') {
            card.addEventListener('click', () => {
                item.selected = !item.selected;
                card.classList.toggle('selected', item.selected);
            });
        }

        card.querySelector('.zoom-btn').addEventListener('click', e => { e.stopPropagation(); openZoomModal(i); });

        // Logic kéo thả sắp xếp
        card.addEventListener('dragstart', e => { card.classList.add('dragging'); e.dataTransfer.setData('text/plain', i); });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
        card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
        card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
        card.addEventListener('drop', async e => {
            e.preventDefault();
            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
            const toIdx = parseInt(card.dataset.index);
            if (fromIdx !== toIdx) {
                const movedPage = pagesData.splice(fromIdx, 1)[0];
                pagesData.splice(toIdx, 0, movedPage);
                await renderGrid(); // Rerender sẽ tự đánh lại số thứ tự (i + 1)
            }
        });

        DOM.previewGrid.appendChild(card);
    }
}

function applyCardRotation(card, rotation) {
    const canvas = card.querySelector('canvas');
    if (canvas) canvas.style.transform = `rotate(${rotation}deg)`;
}

DOM.btnSelectAll.addEventListener('click', () => { pagesData.forEach(p => p.selected = true); renderGrid(); });
DOM.btnInvert.addEventListener('click', () => { pagesData.forEach(p => p.selected = !p.selected); renderGrid(); });
DOM.btnActionRotate.addEventListener('click', () => {
    pagesData.forEach(p => { if (p.selected) p.rotation = (p.rotation + 90) % 360; });
    renderGrid();
});

// ==========================================
// 9. THỰC THI (XUẤT PDF HOẶC GỬI API MÃ HÓA)
// ==========================================
DOM.btnExecute.addEventListener('click', async () => {
    DOM.loadingMsg.innerHTML = `⚡ ${dict[currentLang].msg_processing}`;
    DOM.loadingMsg.style.display = 'block';
    
    try {
        if (currentMode === 'encrypt') {
            await processEncryptionViaAPI();
        } else {
            await processLocalPDF();
        }
    } catch (error) { 
        alert(error.message); 
    }
    
    DOM.loadingMsg.style.display = 'none';
});

// Hàm xử lý MÃ HÓA gửi qua Backend Node.js
async function processEncryptionViaAPI() {
    if (!uploadedFiles || uploadedFiles.length === 0) throw new Error(dict[currentLang].alert_no_file);
    
    const formData = new FormData();
    formData.append('pdfFile', uploadedFiles[0]); 
    
    formData.append('userPassword', document.getElementById('userPassword').value);
    formData.append('ownerPassword', document.getElementById('ownerPassword').value);
    formData.append('permPrint', document.getElementById('permPrint').checked);
    formData.append('permHighResPrint', document.getElementById('permHighResPrint').checked);
    formData.append('permCopy', document.getElementById('permCopy').checked);
    formData.append('permModify', document.getElementById('permModify').checked);
    formData.append('permFillForms', document.getElementById('permFillForms').checked);
    formData.append('permAnnotate', document.getElementById('permAnnotate').checked);
    formData.append('permAssemble', document.getElementById('permAssemble').checked);

    const API_URL = 'http://localhost:3000/api/encrypt'; 

    const response = await fetch(API_URL, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error(dict[currentLang].alert_api_error);

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Encrypted_${uploadedFiles[0].name}`;
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Hàm xử lý các tác vụ cục bộ (Gộp, Tách, Xóa, Xoay)
async function processLocalPDF() {
    const newPdf = await PDFDocument.create();
    let pagesToKeep = [];
    
    if (currentMode === 'merge' || currentMode === 'rotate') pagesToKeep = pagesData; 
    else if (currentMode === 'extract') pagesToKeep = pagesData.filter(p => p.selected);
    else if (currentMode === 'delete') pagesToKeep = pagesData.filter(p => !p.selected);

    if (pagesToKeep.length === 0) throw new Error(dict[currentLang].alert_no_page);

    for (const item of pagesToKeep) {
        const sourcePdf = sourcePdfDocuments[item.fileIdx];
        const copiedPages = await newPdf.copyPages(sourcePdf, [item.pageIdx]);
        const page = copiedPages[0];
        if (item.rotation !== 0) page.setRotation(degrees(page.getRotation().angle + item.rotation));
        newPdf.addPage(page);
    }
    
    const bytes = await newPdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `PDF_Tools_${currentMode}_${Date.now()}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==========================================
// 10. XEM TOÀN TRANG (ZOOM MODAL)
// ==========================================
async function openZoomModal(index) {
    currentZoomIndex = index;
    DOM.zoomModal.classList.add('active');
    DOM.zoomPageText.innerText = `...`;
    
    DOM.btnPrevPage.style.display = index > 0 ? 'block' : 'none';
    DOM.btnNextPage.style.display = index < pagesData.length - 1 ? 'block' : 'none';

    try {
        const item = pagesData[index];
        const page = await pdfDocuments[item.fileIdx].getPage(item.pageIdx + 1);
        
        // Reset hệ số zoom về mặc định khi mở trang mới
        currentModalZoom = 1;
        
        let baseViewport = page.getViewport({ scale: 1 });
        const displayScale = Math.min(
            (window.innerWidth * 0.85) / baseViewport.width, 
            (window.innerHeight * 0.85) / baseViewport.height, 
            2.5 
        );
        
        const pixelRatio = (window.devicePixelRatio || 1) * 2; // Nhân hệ số để siêu nét
        const renderScale = displayScale * pixelRatio; 
        
        const renderViewport = page.getViewport({ scale: renderScale });
        const displayViewport = page.getViewport({ scale: displayScale });
        
        const ctx = DOM.zoomCanvas.getContext('2d');
        
        DOM.zoomCanvas.width = renderViewport.width; 
        DOM.zoomCanvas.height = renderViewport.height;
        
        baseDisplayWidth = displayViewport.width;
        baseDisplayHeight = displayViewport.height;
        applyZoom(); // Áp dụng kích thước ban đầu bằng CSS

        await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
        
        // Đánh lại số thứ tự (index + 1) để khớp với Grid khi kéo thả
        DOM.zoomPageText.innerText = currentMode === 'merge' 
            ? `${uploadedFiles[item.fileIdx].name} (${dict[currentLang].page_text} ${index + 1})` 
            : `${dict[currentLang].page_text} ${index + 1}`;
    } catch (error) {
        console.error(error);
        DOM.zoomPageText.innerText = "Error!";
    }
}

DOM.btnPrevPage.addEventListener('click', (e) => { e.stopPropagation(); if (currentZoomIndex > 0) openZoomModal(currentZoomIndex - 1); });
DOM.btnNextPage.addEventListener('click', (e) => { e.stopPropagation(); if (currentZoomIndex < pagesData.length - 1) openZoomModal(currentZoomIndex + 1); });

document.addEventListener('keydown', (e) => {
    if (!DOM.zoomModal.classList.contains('active')) return;
    if (e.key === 'ArrowLeft' && currentZoomIndex > 0) openZoomModal(currentZoomIndex - 1);
    else if (e.key === 'ArrowRight' && currentZoomIndex < pagesData.length - 1) openZoomModal(currentZoomIndex + 1);
    else if (e.key === 'Escape') DOM.zoomModal.classList.remove('active');
});

// Click ra ngoài (nhưng không phải vào canvas hay nút zoom) để đóng modal
DOM.zoomModal.addEventListener('click', e => { 
    if (e.target === DOM.zoomModal || e.target === zoomWrapper) {
        DOM.zoomModal.classList.remove('active'); 
    }
});
