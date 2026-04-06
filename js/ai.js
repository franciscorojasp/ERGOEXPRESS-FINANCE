/* ════════════════════════════════════════════════════════════════════════════
   ERGOEXPRESS CRM — Módulo AI (Gemini Assistant)
   ════════════════════════════════════════════════════════════════════════════ */

const AI = (() => {
  let _isOpen = false;
  let _chatHistory = [];
  let _isTyping = false;

  function init() {
    // Escuchar atajos de teclado o eventos globales si es necesario
    console.log('[AI] Asistente inicializado');
  }

  function toggle() {
    _isOpen = !_isOpen;
    const panel = document.getElementById('ai-chat-panel');
    const fab = document.getElementById('ai-fab');
    if (!panel) return;

    if (_isOpen) {
      panel.classList.add('active');
      fab.classList.add('active');
      // Foco al input
      setTimeout(() => document.getElementById('ai-input')?.focus(), 300);
      
      // Mensaje de bienvenida si está vacío
      if (_chatHistory.length === 0) {
        _addMessage('assistant', '¡Hola! Soy **ERGO-AI**, tu asistente experto. ¿En qué puedo ayudarte hoy con el CRM?');
      }
    } else {
      panel.classList.remove('active');
      fab.classList.remove('active');
    }
  }

  async function sendMessage() {
    const input = document.getElementById('ai-input');
    const text = input.value.trim();
    if (!text || _isTyping) return;

    input.value = '';
    _addMessage('user', text);
    _setTyping(true);

    try {
      // Preparar contenido para Gemini (formato: [{role: 'user|model', parts: [{text: '...'}]}])
      const contents = _chatHistory.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      const res = await API.call('ASK_GEMINI', {
        geminiApiKey: CONFIG.GEMINI_API_KEY,
        model: CONFIG.GEMINI_MODEL,
        contents: contents
      });

      _setTyping(false);
      if (res.success) {
        _addMessage('assistant', res.answer);
      } else {
        _addMessage('assistant', 'Lo siento, hubo un error: ' + res.error);
      }
    } catch (e) {
      _setTyping(false);
      _addMessage('assistant', 'Error de conexión: ' + e.message);
    }
  }

  function _addMessage(role, text) {
    _chatHistory.push({ role, text });
    _renderMessages();
  }

  function _setTyping(val) {
    _isTyping = val;
    const typingInd = document.getElementById('ai-typing');
    if (typingInd) typingInd.style.display = val ? 'flex' : 'none';
    _scrollToBottom();
  }

  function _renderMessages() {
    const container = document.getElementById('ai-messages');
    if (!container) return;

    container.innerHTML = _chatHistory.map(m => `
      <div class="ai-msg ai-msg-${m.role}">
        <div class="ai-msg-content">${_formatText(m.text)}</div>
      </div>
    `).join('');

    _scrollToBottom();
  }

  function _scrollToBottom() {
    const container = document.getElementById('ai-messages');
    if (container) container.scrollTop = container.scrollHeight;
  }

  function _formatText(text) {
    // Markdown básico (negritas y saltos de línea)
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  // Manejar Enter en el input
  function handleKey(e) {
    if (e.key === 'Enter') sendMessage();
  }

  return { init, toggle, sendMessage, handleKey };
})();
