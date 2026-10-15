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
let isListView = false; // Biến kiểm tra dạng xem Lưới hay Cuộn Lớn

// Biến hỗ trợ tính năng Zoom In / Zoom Out Modal
let currentModalZoom = 1;
let baseDisplayWidth = 0;
let baseDisplayHeight = 0;

// ==========================================
// 3. KHỞI TẠO DOM & TIÊM HTML GIAO DIỆN ZOOM
// ==========================================
const DOM = {
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
    btnToggleView: document.getElementById('btnToggleView'),

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
btnZoomOut.style.cssText = 'background: #fff; border: none; font-size: 1.2rem; padding: 5px 15px; border-radius: 6px; cursor: pointer;';

const btnZoomIn = document.createElement('button');
btnZoomIn.innerText = '➕';
btnZoomIn.style.cssText = 'background: #fff; border: none; font-size: 1.2rem; padding: 5px 15px; border-radius: 6px; cursor: pointer;';

zoomControls.appendChild(btnZoomOut);
zoomControls.appendChild(btnZoomIn);
DOM.zoomModal.appendChild(zoomControls);

// Hàm áp dụng tỷ lệ Zoom lên Canvas Modal
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

zoomWrapper.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0 && currentModalZoom < 5) currentModalZoom += 0.15;
        else if (e.deltaY > 0 && currentModalZoom > 0.5) currentModalZoom -= 0.15;
        applyZoom();
    }
});

// ==========================================
// 4. CHỌN TÍNH NĂNG VÀ QUẢN LÝ LUỒNG
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
    DOM.uploadTitle.innerText = isMerge ? 'Kéo thả nhiều file PDF vào đây' : 'Kéo thả 1 file PDF vào đây';
    
    let subKey = 'Để chọn các trang cần xử lý';
    if (isMerge) subKey = 'Kéo thả để đổi vị trí các trang';
    else if (currentMode === 'rotate') subKey = 'Để xoay các trang bị ngược';
    else if (currentMode === 'encrypt') subKey = 'Để thiết lập mật khẩu và quyền';
    DOM.uploadSub.innerText = subKey;

    const isSelectionMode = ['extract', 'delete', 'rotate'].includes(currentMode);
    DOM.btnSelectAll.style.display = isSelectionMode ? 'flex' : 'none';
    DOM.btnInvert.style.display = isSelectionMode ? 'flex' : 'none';
    DOM.btnActionRotate.style.display = currentMode === 'rotate' ? 'flex' : 'none';

    if (DOM.encryptOptions) {
        DOM.encryptOptions.style.display = isEncrypt ? 'block' : 'none';
    }

    let execText = 'Thực Thi';
    if (currentMode === 'merge') execText = 'Xuất File Đã Gộp';
    else if (currentMode === 'extract') execText = 'Trích Xuất File';
    else if (currentMode === 'delete') execText = 'Xóa & Xuất File';
    else if (currentMode === 'rotate') execText = 'Xuất File Đã Xoay';
    else if (currentMode === 'encrypt') execText = 'Mã Hóa & Xuất File';
    
    DOM.executeText.innerText = execText;
}

function resetToHome() {
    DOM.workspaceScreen.style.display = 'none';
    DOM.uploadScreen.style.display = 'none';
    DOM.homeScreen.style.display = 'block';
    DOM.fileInput.value = '';
    
    if(document.getElementById('userPassword')) document.getElementById('userPassword').value = '';
    if(document.getElementById('ownerPassword')) document.getElementById('ownerPassword').value = '';

    // Reset chế độ xem về dạng lưới
    isListView = false;
    DOM.previewGrid.className = 'grid-view';
    DOM.btnToggleView.innerHTML = '📄 Dạng cuộn lớn';

    currentMode = '';
    uploadedFiles = []; pdfDocuments = []; sourcePdfDocuments = []; pagesData = [];
}

DOM.btnBackHome.addEventListener('click', resetToHome);
DOM.btnCancel.addEventListener('click', resetToHome);

// CHUYỂN ĐỔI CHẾ ĐỘ XEM
DOM.btnToggleView.addEventListener('click', async () => {
    isListView = !isListView;
    
    if (isListView) {
        DOM.previewGrid.className = 'list-view';
        DOM.btnToggleView.innerHTML = '🔲 Dạng lưới nhỏ';
    } else {
        DOM.previewGrid.className = 'grid-view';
        DOM.btnToggleView.innerHTML = '📄 Dạng cuộn lớn';
    }
    
    // Tải lại lưới (để canvas render ở độ phân giải lớn hơn cho sắc nét)
    DOM.loadingMsg.style.display = 'block';
    DOM.previewGrid.innerHTML = '';
    await renderGrid();
    DOM.loadingMsg.style.display = 'none';
});

// ==========================================
// 5. XỬ LÝ UPLOAD FILE
// ==========================================
DOM.fileInput.addEventListener('change', e => handleFiles(e.target.files));
DOM.dropZone.addEventListener('dragover', e => { e.preventDefault(); DOM.dropZone.classList.add('drag-over'); });
DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('drag-over'));
DOM.dropZone.addEventListener('drop', e => { e.preventDefault(); DOM.dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });

async function handleFiles(files) {
    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (validFiles.length === 0) return alert('Vui lòng chọn file PDF!');
    if (currentMode === 'merge' && validFiles.length < 2) return alert('Vui lòng chọn từ 2 file trở lên để Gộp!');

    pagesData = []; 
    pdfDocuments = []; 
    sourcePdfDocuments = [];

    uploadedFiles = currentMode === 'merge' ? validFiles : [validFiles[0]];
    
    DOM.uploadScreen.style.display = 'none';
    DOM.workspaceScreen.style.display = 'flex';
    
    DOM.loadingMsg.innerHTML = `⚡ Đang tải bản xem trước...`;
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
        alert("Lỗi tải file: " + error.message);
        resetToHome();
    }
    DOM.loadingMsg.style.display = 'none';
}

// ==========================================
// 6. RENDER GRID VÀ KÉO THẢ
// ==========================================
async function renderGrid() {
    DOM.previewGrid.innerHTML = '';
    
    for (let i = 0; i < pagesData.length; i++) {
        const item = pagesData[i];
        const page = await pdfDocuments[item.fileIdx].getPage(item.pageIdx + 1);
        
        // Render nét căng nếu đang ở dạng cuộn lớn (isListView = true)
        const renderScale = isListView ? 1.5 : 0.4;
        const viewport = page.getViewport({ scale: renderScale });
        
        const card = document.createElement('div');
        card.className = 'page-card';
        card.draggable = true;
        card.dataset.index = i;
        if(item.selected) card.classList.add('selected');
        
        const titleText = currentMode === 'merge' 
            ? `${uploadedFiles[item.fileIdx].name} (Trang ${i + 1})` 
            : `Trang ${i + 1}`;

        card.innerHTML = `
            <div class="selected-badge">✓</div>
            <canvas></canvas>
            <div class="page-number" style="color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${titleText}</div>
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
                await renderGrid(); 
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
// 7. THỰC THI (XUẤT PDF HOẶC GỬI API MÃ HÓA)
// ==========================================
DOM.btnExecute.addEventListener('click', async () => {
    DOM.loadingMsg.innerHTML = `⚡ Đang xử lý...`;
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

async function processEncryptionViaAPI() {
    if (!uploadedFiles || uploadedFiles.length === 0) throw new Error('Vui lòng chọn file PDF!');
    
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

    if (!response.ok) throw new Error('Lỗi kết nối máy chủ mã hóa!');

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

async function processLocalPDF() {
    const newPdf = await PDFDocument.create();
    let pagesToKeep = [];
    
    if (currentMode === 'merge' || currentMode === 'rotate') pagesToKeep = pagesData; 
    else if (currentMode === 'extract') pagesToKeep = pagesData.filter(p => p.selected);
    else if (currentMode === 'delete') pagesToKeep = pagesData.filter(p => !p.selected);

    if (pagesToKeep.length === 0) throw new Error('Không có trang nào để xuất! Vui lòng kiểm tra lại thao tác.');

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
// 8. XEM TOÀN TRANG (ZOOM MODAL)
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
        
        currentModalZoom = 1;
        
        let baseViewport = page.getViewport({ scale: 1 });
        const displayScale = Math.min(
            (window.innerWidth * 0.85) / baseViewport.width, 
            (window.innerHeight * 0.85) / baseViewport.height, 
            2.5 
        );
        
        const pixelRatio = (window.devicePixelRatio || 1) * 2; 
        const renderScale = displayScale * pixelRatio; 
        
        const renderViewport = page.getViewport({ scale: renderScale });
        const displayViewport = page.getViewport({ scale: displayScale });
        
        const ctx = DOM.zoomCanvas.getContext('2d');
        
        DOM.zoomCanvas.width = renderViewport.width; 
        DOM.zoomCanvas.height = renderViewport.height;
        
        baseDisplayWidth = displayViewport.width;
        baseDisplayHeight = displayViewport.height;
        applyZoom(); 

        await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
        
        DOM.zoomPageText.innerText = currentMode === 'merge' 
            ? `${uploadedFiles[item.fileIdx].name} (Trang ${index + 1})` 
            : `Trang ${index + 1}`;
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

DOM.zoomModal.addEventListener('click', e => { 
    if (e.target === DOM.zoomModal || e.target === zoomWrapper) {
        DOM.zoomModal.classList.remove('active'); 
    }
});
