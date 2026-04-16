// Конфигурация API (адрес бэкенда)
const API_BASE_URL = 'http://127.0.0.1:5000';  // замените при необходимости

// Элементы DOM
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
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

// Элементы чата
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const questionsTab = document.getElementById('questionsTab');
const chatTab = document.getElementById('chatTab');

let currentFile = null;
let lastResultText = '';

// Переключение вкладок
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.tab === 'questions') {
            questionsTab.classList.add('active');
            chatTab.classList.remove('active');
        } else {
            chatTab.classList.add('active');
            questionsTab.classList.remove('active');
        }
    });
});

// ========== ЗАГРУЗКА ФАЙЛОВ ==========
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
    handleFile(e.dataTransfer.files[0]);
});

selectFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

async function handleFile(file) {
    if (!file) return;
    currentFile = file;
    if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер 10MB');
        return;
    }
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.style.display = 'flex';

    const formData = new FormData();
    formData.append('file', file);
    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.text) {
            lectureText.value = data.text;
            updateCharCounter();
        } else {
            alert('Ошибка при чтении файла: ' + (data.error || 'неизвестная ошибка'));
        }
    } catch (err) {
        alert('Ошибка соединения с сервером');
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

removeFileBtn.addEventListener('click', () => {
    currentFile = null;
    fileInfo.style.display = 'none';
    fileInput.value = '';
});

// ========== ТЕКСТОВОЕ ПОЛЕ ==========
function updateCharCounter() {
    const length = lectureText.value.length;
    charCounter.textContent = `${length} / 500 мин.`;
    generateBtn.disabled = length < 500;
}
lectureText.addEventListener('input', updateCharCounter);

// ========== ГЕНЕРАЦИЯ ВОПРОСОВ ==========
generateBtn.addEventListener('click', async () => {
    const text = lectureText.value.trim();
    if (text.length < 500) {
        alert('Текст слишком короткий. Нужно минимум 500 символов');
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
            resultContent.innerHTML = `<p class="error">Ошибка: ${data.error}</p>`;
        }
    } catch (err) {
        resultContent.innerHTML = `<p class="error">Ошибка соединения с сервером</p>`;
    } finally {
        generateBtn.disabled = false;
    }
});

function displayResult(text) {
    resultContent.innerHTML = `<div class="result-text">${text.replace(/\n/g, '<br>')}</div>`;
}

// ========== КОПИРОВАНИЕ И ОЧИСТКА ==========
copyResultBtn.addEventListener('click', () => {
    if (!lastResultText) return alert('Нет результата');
    navigator.clipboard.writeText(lastResultText).then(() => alert('Скопировано'));
});

clearResultBtn.addEventListener('click', () => {
    lastResultText = '';
    resultContent.innerHTML = `<div class="result-placeholder"><i class="fas fa-arrow-left"></i><p>Сгенерируйте вопросы</p></div>`;
});

// ========== СКАЧИВАНИЕ ==========
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

// ========== ЧАТ ==========
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
            addMessage('assistant', 'Ошибка: ' + (data.error || 'неизвестная ошибка'));
        }
    } catch (err) {
        removeTypingIndicator(typingId);
        addMessage('assistant', 'Ошибка соединения с сервером');
    }
}

function addMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    const sender = role === 'user' ? 'Вы' : 'Nova AI';
    const avatarIcon = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    msgDiv.innerHTML = `
        <div class="message-avatar">${avatarIcon}</div>
        <div class="message-content">
            <div class="message-sender">${sender}</div>
            <div class="message-text">${text.replace(/\n/g, '<br>')}</div>
        </div>
    `;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'message assistant typing-indicator';
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
