const API_BASE_URL = 'http://127.0.0.1:5000';

// DOM elements
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
const resultContent = document.getElementById('resultContent');
const copyResultBtn = document.getElementById('copyResultBtn');
const clearResultBtn = document.getElementById('clearResultBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const downloadDocxBtn = document.getElementById('downloadDocxBtn');
const downloadTxtBtn = document.getElementById('downloadTxtBtn');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const questionsTab = document.getElementById('questionsTab');
const chatTab = document.getElementById('chatTab');

let currentFile = null;
let lastResultText = '';

// Tab switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (tab === 'questions') {
            questionsTab.classList.add('active');
            chatTab.classList.remove('active');
        } else {
            chatTab.classList.add('active');
            questionsTab.classList.remove('active');
        }
    });
});

// File upload handlers
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

selectFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});
selectFileBtn2.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
});

async function handleFile(file) {
    if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой. Максимум 10 MB');
        return;
    }
    currentFile = file;
    fileName.textContent = file.name;
    fileSizeSpan.textContent = formatFileSize(file.size);
    fileInfo.style.display = 'flex';

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
    } catch (err) {
        alert('Ошибка соединения с сервером');
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

removeFileBtn.addEventListener('click', () => {
    currentFile = null;
    fileInfo.style.display = 'none';
    fileInput.value = '';
});

function updateCharCounter() {
    const len = lectureText.value.length;
    charCounter.textContent = `${len} / 500 мин.`;
    if (len >= 500) charCounter.classList.add('valid');
    else charCounter.classList.remove('valid');
    generateBtn.disabled = len < 500;
}
lectureText.addEventListener('input', updateCharCounter);

// Generate questions
generateBtn.addEventListener('click', async () => {
    let text = lectureText.value.trim();
    if (text.length < 500) {
        alert('Минимум 500 символов');
        return;
    }
    generateBtn.disabled = true;
    resultContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>Генерация...</p></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        if (data.result) {
            lastResultText = data.result;
            displayResult(lastResultText);
        } else {
            resultContent.innerHTML = `<div style="color:#ef4444">Ошибка: ${data.error}</div>`;
        }
    } catch (err) {
        resultContent.innerHTML = '<div style="color:#ef4444">Ошибка соединения с сервером</div>';
    } finally {
        generateBtn.disabled = false;
    }
});

function displayResult(text) {
    resultContent.innerHTML = `<div class="result-text">${text.replace(/\n/g, '<br>')}</div>`;
}

copyResultBtn.addEventListener('click', () => {
    if (lastResultText) {
        navigator.clipboard.writeText(lastResultText);
        alert('Скопировано');
    }
});
clearResultBtn.addEventListener('click', () => {
    lastResultText = '';
    resultContent.innerHTML = `<div class="result-placeholder"><i class="fas fa-arrow-left"></i><p>Сгенерируйте вопросы — они появятся здесь</p></div>`;
});

downloadTxtBtn.addEventListener('click', () => {
    if (!lastResultText) return alert('Нет результата');
    const blob = new Blob([lastResultText], { type: 'text/plain' });
    saveAs(blob, 'questions.txt');
});
downloadPdfBtn.addEventListener('click', () => {
    if (!lastResultText) return alert('Нет результата');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(lastResultText, 180);
    doc.text(lines, 15, 15);
    doc.save('questions.pdf');
});
downloadDocxBtn.addEventListener('click', () => {
    if (!lastResultText) return alert('Нет результата');
    const { Document, Packer, Paragraph, TextRun } = window.docx;
    const doc = new Document({
        sections: [{
            children: [new Paragraph({ children: [new TextRun(lastResultText)] })]
        }]
    });
    Packer.toBlob(doc).then(blob => saveAs(blob, 'questions.docx'));
});

// Chat
sendChatBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    addMessage('user', message);
    chatInput.value = '';

    const typingId = showTypingIndicator();

    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await response.json();
        removeTypingIndicator(typingId);
        if (data.result) {
            addMessage('assistant', data.result);
        } else {
            addMessage('assistant', 'Ошибка: ' + (data.error || 'неизвестно'));
        }
    } catch (err) {
        removeTypingIndicator(typingId);
        addMessage('assistant', 'Ошибка соединения с сервером');
    }
}

function addMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role === 'user' ? 'user' : 'assistant'}`;
    const avatarIcon = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    const senderName = role === 'user' ? 'Вы' : 'Nova AI';
    msgDiv.innerHTML = `
        <div class="message-avatar">${avatarIcon}</div>
        <div class="message-content">
            <div class="message-sender">${senderName}</div>
            <div class="message-text">${text.replace(/\n/g, '<br>')}</div>
        </div>
    `;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.id = id;
    div.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="message-sender">Nova AI</div>
            <div class="message-text"><i>печатает...</i></div>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}
