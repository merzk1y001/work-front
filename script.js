const API_BASE_URL = 'http://127.0.0.1:5000';

// DOM
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const selectFileBtn2 = document.getElementById('selectFileBtn2');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSizeSpan = document.getElementById('fileSize');
const removeFileBtn = document.getElementById('removeFileBtn');
const lectureText = document.getElementById('lectureText');
const charCounter = document.getElementById('charCounter');
const generateBtn = document.getElementById('generateBtn');
const resultArea = document.getElementById('resultArea');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadPdf = document.getElementById('downloadPdf');
const downloadDocx = document.getElementById('downloadDocx');
const downloadTxt = document.getElementById('downloadTxt');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const tabs = document.querySelectorAll('.tab');
const questionsPanel = document.getElementById('questionsPanel');
const chatPanel = document.getElementById('chatPanel');

let currentFile = null;
let lastResult = '';

// Переключение вкладок
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.dataset.tab === 'questions') {
            questionsPanel.classList.add('active');
            chatPanel.classList.remove('active');
        } else {
            chatPanel.classList.add('active');
            questionsPanel.classList.remove('active');
        }
    });
});

// Загрузка файлов
function handleFileDrop(e) {
    e.preventDefault();
    uploadArea.style.borderColor = '#d1d5db';
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
}
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#6366f1';
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#d1d5db';
});
uploadArea.addEventListener('drop', handleFileDrop);
uploadArea.addEventListener('click', () => fileInput.click());
selectFileBtn.addEventListener('click', () => fileInput.click());
selectFileBtn2.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) processFile(e.target.files[0]);
});

async function processFile(file) {
    if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой');
        return;
    }
    currentFile = file;
    fileName.textContent = file.name;
    fileSizeSpan.textContent = formatSize(file.size);
    fileInfo.style.display = 'flex';
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.text) {
            lectureText.value = data.text;
            updateCounter();
        } else {
            alert('Ошибка чтения файла');
        }
    } catch {
        alert('Ошибка соединения с сервером');
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

removeFileBtn.addEventListener('click', () => {
    currentFile = null;
    fileInfo.style.display = 'none';
    fileInput.value = '';
});

function updateCounter() {
    const len = lectureText.value.length;
    charCounter.textContent = len;
    generateBtn.disabled = len < 500;
}
lectureText.addEventListener('input', updateCounter);

// Генерация
generateBtn.addEventListener('click', async () => {
    const text = lectureText.value.trim();
    if (text.length < 500) return alert('Текст слишком короткий');
    generateBtn.disabled = true;
    resultArea.innerHTML = '<div style="text-align:center">Генерация...</div>';
    try {
        const res = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (data.result) {
            lastResult = data.result;
            resultArea.innerHTML = `<div style="white-space:pre-wrap">${data.result.replace(/\n/g, '<br>')}</div>`;
        } else {
            resultArea.innerHTML = `<div class="error">Ошибка: ${data.error}</div>`;
        }
    } catch {
        resultArea.innerHTML = '<div class="error">Ошибка соединения</div>';
    } finally {
        generateBtn.disabled = false;
    }
});

// Копирование, очистка, скачивание
copyBtn.addEventListener('click', () => {
    if (lastResult) {
        navigator.clipboard.writeText(lastResult);
        alert('Скопировано');
    }
});
clearBtn.addEventListener('click', () => {
    lastResult = '';
    resultArea.innerHTML = '<div class="placeholder">⬅️ Сгенерируйте вопросы</div>';
});
downloadTxt.addEventListener('click', () => {
    if (lastResult) saveAs(new Blob([lastResult], {type: 'text/plain'}), 'questions.txt');
});
downloadPdf.addEventListener('click', () => {
    if (!lastResult) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(doc.splitTextToSize(lastResult, 180), 15, 15);
    doc.save('questions.pdf');
});
downloadDocx.addEventListener('click', () => {
    if (!lastResult) return;
    const { Document, Packer, Paragraph, TextRun } = window.docx;
    const doc = new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun(lastResult)] })] }] });
    Packer.toBlob(doc).then(blob => saveAs(blob, 'questions.docx'));
});

// Чат
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
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
        addMessage('bot', 'Ошибка соединения');
    }
}

function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `message ${role === 'user' ? 'user' : 'bot'}`;
    const avatar = role === 'user' ? '👤' : '🤖';
    const name = role === 'user' ? 'Вы' : 'Nova AI';
    div.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="bubble">
            <div class="name">${name}</div>
            <div class="text">${text.replace(/\n/g, '<br>')}</div>
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
        <div class="avatar">🤖</div>
        <div class="bubble">
            <div class="name">Nova AI</div>
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
