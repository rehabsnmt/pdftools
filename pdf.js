// ==========================================
// 1. CẤU HÌNH THƯ VIỆN BẢN QUYỀN
// ==========================================
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
const { PDFDocument, degrees } = PDFLib;

// ==========================================
// 2. KHAI BÁO BIẾN TOÀN CỤC & TRẠNG THÁI LỊCH SỬ (UNDO/REDO)
// ==========================================
let currentMode = ''; 
let uploadedFiles = [];
let pdfDocuments = [];
let sourcePdfDocuments = [];
let pagesData = []; 
let currentZoomIndex = -1;
let isListView = false; 
let lastSelectedIndex = -1; 

let currentModalZoom = 1;
let baseDisplayWidth = 0;
let baseDisplayHeight = 0;

// Undo & Redo System
let historyStates = [];
let historyIndex = -1;

// ==========================================
// 3. KHỞI TẠO DOM & GIAO DIỆN ZOOM
// ==========================================
const DOM = {
    uploadTitle: document.getElementById('uploadTitle'),
    executeText: document.getElementById('executeText'),
    zoomPageText: document.getElementById('zoomPageText'),
    previewTitle: document.getElementById('previewTitle'),
    
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

    btnUndo: document.getElementById('btnUndo'),
    btnRedo: document.getElementById('btnRedo'),

    zoomModal: document.getElementById('zoomModal'),
    zoomCanvas: document.getElementById('zoomCanvas'),
    closeModal: document.getElementById('closeModal'),
    btnPrevPage: document.getElementById('btnPrevPage'),
    btnNextPage: document.getElementById('btnNextPage')
};

// -- Giao diện Zoom In/Out --
const zoomWrapper = document.createElement('div');
zoomWrapper.style.width = '100%';
zoomWrapper.style.height = '80vh';
zoomWrapper.style.overflow = 'auto'; 
zoomWrapper.style.textAlign = 'center';
DOM.zoomCanvas.parentNode.insertBefore(zoomWrapper, DOM.zoomCanvas);
zoomWrapper.appendChild(DOM.zoomCanvas);

const zoomControls = document.createElement('div');
zoomControls.style.display = 'flex';
zoomControls.style.gap = '15px';
zoomControls.style.marginTop = '15px';
zoomControls.style.zIndex = '1001';

const btnZoomOut = document.createElement('button');
btnZoomOut.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>';
btnZoomOut.style.cssText = 'background: #E8E8E8; border: 2px solid #000; padding: 5px 15px; cursor: pointer; display: flex; align-items: center; justify-content: center;';

const btnZoomIn = document.createElement('button');
btnZoomIn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
btnZoomIn.style.cssText = 'background: #E8E8E8; border: 2px solid #000; padding: 5px 15px; cursor: pointer; display: flex; align-items: center; justify-content: center;';

zoomControls.appendChild(btnZoomOut);
zoomControls.appendChild(btnZoomIn);
DOM.zoomModal.appendChild(zoomControls);

function applyZoom() {
    DOM.zoomCanvas.style.width = `${baseDisplayWidth * currentModalZoom}px`;
    DOM.zoomCanvas.style.height = `${baseDisplayHeight * currentModalZoom}px`;
}

btnZoomIn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentModalZoom < 5) { currentModalZoom += 0.25; applyZoom(); }
});
btnZoomOut.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentModalZoom > 0.5) { currentModalZoom -= 0.25; applyZoom(); }
});
zoomWrapper.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0 && currentModalZoom < 5) currentModalZoom += 0.15;
        else if (e.deltaY > 0 && currentModalZoom > 0.5) currentModalZoom -= 0.15;
        applyZoom();
    }
});

// -- Gắn sự kiện đóng nút X trên Modal (Đã sửa lỗi) --
DOM.closeModal.addEventListener('click', () => {
    DOM.zoomModal.classList.remove('active');
});

// ==========================================
// 4. HỆ THỐNG UNDO / REDO
// ==========================================
function saveState() {
    if (historyIndex < historyStates.length - 1) {
        historyStates = historyStates.slice(0, historyIndex + 1);
    }
    historyStates.push(pagesData.map(p => ({...p})));
    historyIndex++;
    updateUndoRedoButtons();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        pagesData = historyStates[historyIndex].map(p => ({...p}));
        renderGrid();
        updateUndoRedoButtons();
    }
}

function redo() {
    if (historyIndex < historyStates.length - 1) {
        historyIndex++;
        pagesData = historyStates[historyIndex].map(p => ({...p}));
        renderGrid();
        updateUndoRedoButtons();
    }
}

function updateUndoRedoButtons() {
    DOM.btnUndo.disabled = historyIndex <= 0;
    DOM.btnRedo.disabled = historyIndex >= historyStates.length - 1;
    DOM.btnUndo.style.opacity = DOM.btnUndo.disabled ? '0.5' : '1';
    DOM.btnUndo.style.cursor = DOM.btnUndo.disabled ? 'not-allowed' : 'pointer';
    DOM.btnRedo.style.opacity = DOM.btnRedo.disabled ? '0.5' : '1';
    DOM.btnRedo.style.cursor = DOM.btnRedo.disabled ? 'not-allowed' : 'pointer';
}

DOM.btnUndo.addEventListener('click', undo);
DOM.btnRedo.addEventListener('click', redo);

// ==========================================
// 5. CHỌN TÍNH NĂNG VÀ QUẢN LÝ LUỒNG
// ==========================================
document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
        currentMode = card.dataset.mode;
        DOM.homeScreen.style.display = 'none';
        DOM.uploadScreen.style.display = 'flex';
        setupWorkspaceUI(); 
    });
});

function setupWorkspaceUI() {
    if (!currentMode) return;
    const isMerge = currentMode === 'merge';
    const isEncrypt = currentMode === 'encrypt';
    
    DOM.fileInput.multiple = isMerge;
    DOM.uploadTitle.innerText = isMerge ? 'KÉO THẢ NHIỀU FILE PDF VÀO ĐÂY' : 'KÉO THẢ FILE PDF VÀO ĐÂY';

    const isSelectionMode = ['extract', 'delete', 'rotate'].includes(currentMode);
    DOM.btnSelectAll.style.display = isSelectionMode ? 'flex' : 'none';
    DOM.btnInvert.style.display = isSelectionMode ? 'flex' : 'none';
    DOM.btnActionRotate.style.display = currentMode === 'rotate' ? 'flex' : 'none';
    
    const showUndoRedo = currentMode !== 'encrypt';
    DOM.btnUndo.style.display = showUndoRedo ? 'flex' : 'none';
    DOM.btnRedo.style.display = showUndoRedo ? 'flex' : 'none';

    if (DOM.encryptOptions) {
        DOM.encryptOptions.style.display = isEncrypt ? 'block' : 'none';
    }

    let execText = 'THỰC THI';
    if (currentMode === 'merge') execText = 'XUẤT FILE ĐÃ GỘP';
    else if (currentMode === 'extract') execText = 'TRÍCH XUẤT FILE';
    else if (currentMode === 'delete') execText = 'XÓA & XUẤT FILE';
    else if (currentMode === 'rotate') execText = 'XUẤT FILE ĐÃ XOAY';
    else if (currentMode === 'encrypt') execText = 'MÃ HÓA & XUẤT FILE';
    DOM.executeText.innerText = execText;
}

function resetToHome() {
    DOM.workspaceScreen.style.display = 'none';
    DOM.uploadScreen.style.display = 'none';
    DOM.homeScreen.style.display = 'block';
    DOM.fileInput.value = '';
    
    if(document.getElementById('userPassword')) document.getElementById('userPassword').value = '';
    if(document.getElementById('ownerPassword')) document.getElementById('ownerPassword').value = '';

    isListView = false;
    DOM.previewGrid.className = 'grid-view';
    DOM.btnToggleView.innerHTML = '<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> XEM CUỘN';

    currentMode = '';
    uploadedFiles = []; pdfDocuments = []; sourcePdfDocuments = []; pagesData = [];
    historyStates = []; historyIndex = -1; lastSelectedIndex = -1;
}

DOM.btnBackHome.addEventListener('click', resetToHome);
DOM.btnCancel.addEventListener('click', resetToHome);

DOM.btnToggleView.addEventListener('click', async () => {
    isListView = !isListView;
    if (isListView) {
        DOM.previewGrid.className = 'list-view';
        DOM.btnToggleView.innerHTML = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> XEM LƯỚI';
    } else {
        DOM.previewGrid.className = 'grid-view';
        DOM.btnToggleView.innerHTML = '<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> XEM CUỘN';
    }
    DOM.loadingMsg.style.display = 'block';
    DOM.previewGrid.innerHTML = '';
    await renderGrid();
    DOM.loadingMsg.style.display = 'none';
});

// ==========================================
// 6. XỬ LÝ UPLOAD FILE
// ==========================================
DOM.fileInput.addEventListener('change', e => handleFiles(e.target.files));
DOM.dropZone.addEventListener('dragover', e => { e.preventDefault(); DOM.dropZone.classList.add('drag-over'); });
DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('drag-over'); });
DOM.dropZone.addEventListener('drop', e => { e.preventDefault(); DOM.dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });

async function handleFiles(files) {
    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (validFiles.length === 0) return alert('Vui lòng chọn file PDF!');
    if (currentMode === 'merge' && validFiles.length < 2) return alert('Vui lòng chọn từ 2 file trở lên để Gộp!');

    pagesData = []; pdfDocuments = []; sourcePdfDocuments = [];
    historyStates = []; historyIndex = -1; lastSelectedIndex = -1;

    uploadedFiles = currentMode === 'merge' ? validFiles : [validFiles[0]];
    
    // Gán tên file vào Header Preview
    const fileNamesStr = uploadedFiles.map(f => f.name).join(', ');
    DOM.previewTitle.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> ${fileNamesStr}`;

    DOM.uploadScreen.style.display = 'none';
    DOM.workspaceScreen.style.display = 'flex';
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
        saveState(); // Lưu trạng thái gốc vào Undo/Redo
        await renderGrid();
    } catch (error) {
        alert("Lỗi tải file: " + error.message);
        resetToHome();
    }
    DOM.loadingMsg.style.display = 'none';
}

// ==========================================
// 7. RENDER GRID VÀ KÉO THẢ (VỚI TÍNH NĂNG CTRL+CLICK)
// ==========================================
async function renderGrid() {
    DOM.previewGrid.innerHTML = '';
    
    for (let i = 0; i < pagesData.length; i++) {
        const item = pagesData[i];
        const page = await pdfDocuments[item.fileIdx].getPage(item.pageIdx + 1);
        
        const renderScale = isListView ? 1.5 : 0.4;
        const viewport = page.getViewport({ scale: renderScale });
        
        const card = document.createElement('div');
        card.className = 'page-card';
        card.draggable = true;
        card.dataset.index = i;
        if(item.selected) card.classList.add('selected');
        
        const titleText = currentMode === 'merge' ? `${uploadedFiles[item.fileIdx].name} (Trang ${i + 1})` : `Trang ${i + 1}`;

        card.innerHTML = `
            <div class="selected-badge"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="canvas-frame">
                <canvas></canvas>
            </div>
            <div class="page-number" title="${titleText}">${titleText}</div>
            <button class="zoom-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
        `;
        
        const canvas = card.querySelector('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
        applyCardRotation(card, item.rotation);

        if (currentMode !== 'merge' && currentMode !== 'encrypt') {
            card.addEventListener('click', (e) => {
                if (e.ctrlKey && lastSelectedIndex !== -1) {
                    const start = Math.min(lastSelectedIndex, i);
                    const end = Math.max(lastSelectedIndex, i);
                    const targetState = pagesData[lastSelectedIndex].selected;
                    
                    for (let j = start; j <= end; j++) {
                        pagesData[j].selected = targetState;
                        const targetCard = DOM.previewGrid.querySelector(`.page-card[data-index="${j}"]`);
                        if (targetCard) targetCard.classList.toggle('selected', targetState);
                    }
                } else {
                    item.selected = !item.selected;
                    card.classList.toggle('selected', item.selected);
                    lastSelectedIndex = i; 
                }
                saveState(); // Lưu trạng thái sau khi Click
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
                lastSelectedIndex = -1; 
                saveState(); // Lưu trạng thái sau khi Kéo thả
                await renderGrid(); 
            }
        });

        DOM.previewGrid.appendChild(card);
    }
}

function applyCardRotation(card, rotation) {
    const frame = card.querySelector('.canvas-frame');
    if (frame) frame.style.transform = `rotate(${rotation}deg)`;
}

DOM.btnSelectAll.addEventListener('click', () => { 
    pagesData.forEach(p => p.selected = true); 
    Array.from(DOM.previewGrid.children).forEach(card => card.classList.add('selected'));
    saveState();
});
DOM.btnInvert.addEventListener('click', () => { 
    pagesData.forEach((p, i) => {
        p.selected = !p.selected; 
        const card = DOM.previewGrid.querySelector(`.page-card[data-index="${i}"]`);
        if (card) card.classList.toggle('selected', p.selected);
    });
    saveState();
});
DOM.btnActionRotate.addEventListener('click', () => {
    pagesData.forEach((p, i) => { 
        if (p.selected) {
            p.rotation = (p.rotation + 90) % 360; 
            const card = DOM.previewGrid.querySelector(`.page-card[data-index="${i}"]`);
            if (card) applyCardRotation(card, p.rotation);
        }
    });
    saveState();
});

// Phím tắt bàn phím Undo/Redo
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
    if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
});

// ==========================================
// 8. THỰC THI (XUẤT PDF HOẶC GỬI API MÃ HÓA)
// ==========================================
DOM.btnExecute.addEventListener('click', async () => {
    DOM.loadingMsg.style.display = 'block';
    try {
        if (currentMode === 'encrypt') { await processEncryptionViaAPI(); } 
        else { await processLocalPDF(); }
    } catch (error) { alert(error.message); }
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
    const response = await fetch(API_URL, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Lỗi kết nối máy chủ mã hóa!');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Encrypted_${uploadedFiles[0].name}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function processLocalPDF() {
    const newPdf = await PDFDocument.create();
    let pagesToKeep = [];
    if (currentMode === 'merge' || currentMode === 'rotate') pagesToKeep = pagesData; 
    else if (currentMode === 'extract') pagesToKeep = pagesData.filter(p => p.selected);
    else if (currentMode === 'delete') pagesToKeep = pagesData.filter(p => !p.selected);

    if (pagesToKeep.length === 0) throw new Error('Không có trang nào được chọn! Vui lòng chọn trang để xử lý.');

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
// 9. XEM TOÀN TRANG (ZOOM MODAL)
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
        const displayScale = Math.min((window.innerWidth * 0.85) / baseViewport.width, (window.innerHeight * 0.85) / baseViewport.height, 2.5);
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
        
        DOM.zoomPageText.innerText = currentMode === 'merge' ? `${uploadedFiles[item.fileIdx].name} (Trang ${index + 1})` : `Trang ${index + 1}`;
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
    if (e.target === DOM.zoomModal || e.target === zoomWrapper) DOM.zoomModal.classList.remove('active'); 
});
