/**
 * ════════════════════════════════════════════════════════════════════════════
 * ERGOEXPRESS FINANCE — AI Connector (Groq Secure)
 * ════════════════════════════════════════════════════════════════════════════
 */

const AI_CONFIG = {
  MODEL: 'llama3-70b-8192', // Modelo Senior optimizado para análisis
  API_URL: 'https://api.groq.com/openai/v1/chat/completions',
  TEMPERATURE: 0.5
};

/**
 * Llama a la IA de Groq de forma segura usando la clave del servidor.
 */
function callGroqAI(userPrompt, history = []) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');
    if (!apiKey) throw new Error('API Key de Groq no configurada. Ejecute setupSecureAI().');

    const systemPrompt = `Eres ERGO-BI, el Auditor Senior y Consultor Estratégico de ERGOEXPRESS. 
    Tu experticia abarca: Finanzas corporativas en Venezuela (Hiperinflación), LOTTT, Providencias SENIAT 0030/0049 e Higiene y Seguridad Industrial.
    Contexto: Hoy es ${new Date().toLocaleDateString('es-VE')}. 
    Analiza con precisión matemática y tono ejecutivo de alto nivel.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userPrompt }
    ];

    const payload = {
      model: AI_CONFIG.MODEL,
      messages: messages,
      temperature: AI_CONFIG.TEMPERATURE,
      max_tokens: 2048
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(AI_CONFIG.API_URL, options);
    const json = JSON.parse(response.getContentText());

    if (response.getResponseCode() !== 200) {
      throw new Error(json.error?.message || 'Error en Groq API');
    }

    return {
      success: true,
      answer: json.choices[0].message.content
    };

  } catch (e) {
    console.error('[AI] Error:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Prepara el contexto financiero para el Auditor AI.
 */
function getAIContextSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const egresos = ss.getSheetByName('Finanzas_Egresos').getValues();
  const ingresos = ss.getSheetByName('Finanzas_Ingresos').getValues();
  
  // Resumen básico de los últimos 30 días
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  
  let totalEgresos = 0;
  let totalIngresos = 0;
  let categoriasMap = {};

  // Procesar Egresos
  for(let i = 1; i < egresos.length; i++) {
    const d = new Date(egresos[i][1]);
    if (d >= lastMonth) {
      const usd = Number(egresos[i][11]) || 0;
      totalEgresos += usd;
      const cat = egresos[i][3];
      categoriasMap[cat] = (categoriasMap[cat] || 0) + usd;
    }
  }

  // Procesar Ingresos
  for(let i = 1; i < ingresos.length; i++) {
    const d = new Date(ingresos[i][1]);
    if (d >= lastMonth) {
      totalIngresos += Number(ingresos[i][10]) || 0;
    }
  }

  return `
    RESUMEN FINANCIERO ÚLTIMOS 30 DÍAS (USD):
    - Ingresos Totales: $${totalIngresos.toFixed(2)}
    - Egresos Totales: $${totalEgresos.toFixed(2)}
    - Margen Operativo: $${(totalIngresos - totalEgresos).toFixed(2)}
    - Top Gastos por Categoría: ${JSON.stringify(categoriasMap)}
  `;
}
