const API_BASE_URL = 'http://127.0.0.1:5000';

// DOM элементы
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const selectFileBtn2 = document.getElementById('selectFileBtn2');
const fileInfoDiv = document.getElementById('fileInfo');
const fileNameSpan = document.getElementById('fileName');
const fileSizeSpan = document.getElementById('fileSize');
const removeFileBtn = document.getElementById('removeFileBtn');
const lectureText = document.getElementById('lectureText');
const charCountSpan = document.getElementById('charCount');
const generateBtn = document.getElementById('generateBtn');
const resultContentDiv = document.getElementById('resultContent');
const copyResultBtn = document.getElementById('copyResultBtn');
const clearResultBtn = document.getElementById('clearResultBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const downloadDocxBtn = document.getElementById('downloadDocxBtn');
const downloadTxtBtn = document.getElementById('downloadTxtBtn');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const tabs = document.querySelectorAll('.tab');
const panes = document.querySelectorAll('.tab-pane');

let currentFile = null;
let lastResultText = '';

// Переключение вкладок
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetId = tab.dataset.tab === 'questions' ? 'questionsPane' : 'chatPane';
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(targetId).classList.add('active');
    });
});

// Загрузка файла
function triggerFileInput() { fileInput.click(); }
if (selectFileBtn) selectFileBtn.addEventListener('click', triggerFileInput);
if (selectFileBtn2) selectFileBtn2.addEventListener('click', triggerFileInput);
if (uploadZone) uploadZone.addEventListener('click', triggerFileInput);

if (uploadZone) {
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#4f46e5';
    });
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = '#cbd5e1';
    });
    uploadZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#cbd5e1';
        const file = e.dataTransfer.files[0];
        if (file) await processFile(file);
    });
}

if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
        if (e.target.files[0]) await processFile(e.target.files[0]);
    });
}

async function processFile(file) {
    if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой (макс. 10 MB)');
        return;
    }
    currentFile = file;
    fileNameSpan.textContent = file.name;
    fileSizeSpan.textContent = formatBytes(file.size);
    fileInfoDiv.style.display = 'flex';
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.text) {
            lectureText.value = data.text;
            updateCharCounter();
        } else {
            alert('Ошибка чтения файла: ' + (data.error || 'неизвестная ошибка'));
        }
    } catch {
        alert('Ошибка соединения с сервером');
    }
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
        currentFile = null;
        fileInfoDiv.style.display = 'none';
        fileInput.value = '';
    });
}

function updateCharCounter() {
    const len = lectureText.value.length;
    charCountSpan.textContent = len;
    generateBtn.disabled = len < 500;
}
lectureText.addEventListener('input', updateCharCounter);

// Генерация вопросов
generateBtn.addEventListener('click', async () => {
    const text = lectureText.value.trim();
    if (text.length < 500) {
        alert('Минимум 500 символов');
        return;
    }
    generateBtn.disabled = true;
    resultContentDiv.innerHTML = '<div class="placeholder" style="padding:2rem"><i class="fas fa-spinner fa-pulse"></i> Генерация...</div>';
    try {
        const res = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (data.result) {
            lastResultText = data.result;
            resultContentDiv.innerHTML = `<div class="result-text">${escapeHtml(data.result).replace(/\n/g, '<br>')}</div>`;
        } else {
            resultContentDiv.innerHTML = `<div class="placeholder">Ошибка: ${escapeHtml(data.error)}</div>`;
        }
    } catch {
        resultContentDiv.innerHTML = '<div class="placeholder">Ошибка соединения с сервером</div>';
    } finally {
        generateBtn.disabled = false;
    }
});

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Копирование
copyResultBtn?.addEventListener('click', () => {
    if (!lastResultText) return alert('Нет результата');
    navigator.clipboard.writeText(lastResultText).then(() => alert('Скопировано'));
});

// Очистка
clearResultBtn?.addEventListener('click', () => {
    lastResultText = '';
    resultContentDiv.innerHTML = `<div class="placeholder"><i class="fas fa-arrow-left"></i><p>Сгенерируйте вопросы – они появятся здесь</p></div>`;
});

// Скачивание
downloadTxtBtn?.addEventListener('click', () => {
    if (!lastResultText) return alert('Нет результата');
    const blob = new Blob([lastResultText], { type: 'text/plain' });
    saveAs(blob, 'questions.txt');
});
downloadPdfBtn?.addEventListener('click', () => {
    if (!lastResultText) return alert('Нет результата');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(lastResultText, 170);
    doc.text(lines, 15, 15);
    doc.save('questions.pdf');
});
downloadDocxBtn?.addEventListener('click', async () => {
    if (!lastResultText) return alert('Нет результата');
    const { Document, Packer, Paragraph, TextRun } = window.docx;
    const doc = new Document({
        sections: [{
            children: [new Paragraph({ children: [new TextRun(lastResultText)] })]
        }]
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'questions.docx');
});

// Чат
sendChatBtn?.addEventListener('click', sendMessage);
chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const msg = chatInput.value.trim();
    if (!msg) return;
    addMessage('user', msg);
    chatInput.value = '';
    const typingId = showTyping();
    try {
        const res = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        removeTyping(typingId);
        if (data.result) addMessage('bot', data.result);
        else addMessage('bot', 'Ошибка: ' + (data.error || 'неизвестно'));
    } catch {
        removeTyping(typingId);
        addMessage('bot', 'Ошибка соединения с сервером');
    }
}

function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `message ${role === 'user' ? 'user' : 'bot'}`;
    const avatar = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    const sender = role === 'user' ? 'Вы' : 'Nova AI';
    div.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="bubble">
            <div class="sender">${sender}</div>
            <div class="text">${escapeHtml(text).replace(/\n/g, '<br>')}</div>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'message bot';
    div.id = id;
    div.innerHTML = `
        <div class="avatar"><i class="fas fa-robot"></i></div>
        <div class="bubble">
            <div class="sender">Nova AI</div>
            <div class="text"><i>печатает...</i></div>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

updateCharCounter();
