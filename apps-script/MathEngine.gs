/**
 * ════════════════════════════════════════════════════════════════════════════
 * ERGOEXPRESS FINANCE — Mathematical & BI Engine
 * ════════════════════════════════════════════════════════════════════════════
 */

const MATH_CONSTANTS = {
  DEFAULT_INFLATION: 10.0, // 1000% anual (Factor 11)
  MONTHS_IN_YEAR: 12,
  DAYS_IN_YEAR: 365
};

/**
 * Calcula el valor proyectado ajustado por inflación compuesta.
 * @param {number} baseAmount Monto actual
 * @param {number} annualRate Tasa anual (ej: 10.0 para 1000%)
 * @param {number} days Dias a proyectar
 */
function getProjectedAmount(baseAmount, annualRate, days) {
  // Formula: VF = VP * (1 + r)^(t/365)
  const rate = annualRate;
  const time = days / 365;
  return baseAmount * Math.pow(1 + rate, time);
}

/**
 * Calcula el Punto de Equilibrio (Break-even Point)
 * @param {Object} totals { ingresos, fijos, variables }
 */
function calculateBreakEven(totals) {
  const { ingresos, fijos, variables } = totals;
  
  if (ingresos === 0) return 0;

  // Margen de Contribución = (Ingresos - Variables) / Ingresos
  const margenContribucion = (ingresos - variables) / ingresos;
  
  if (margenContribucion <= 0) return Infinity; // No hay equilibrio posible con margen negativo

  // PE = Costos Fijos / Margen de Contribución
  return fijos / margenContribucion;
}

/**
 * Agrupa egresos por tipo (Fijo/Variable) basándose en mapeo dinámico.
 */
function categorizeExpenses(expensesRaw, categoryConfig) {
  let fijos = 0;
  let variables = 0;

  expensesRaw.forEach(row => {
    const cat = row[3];
    const amount = Number(row[11]) || 0;
    const type = categoryConfig[cat] || 'variable'; // Por defecto variable si no está mapeado

    if (type === 'fijo') {
      fijos += amount;
    } else {
      variables += amount;
    }
  });

  return { fijos, variables };
}

/**
 * Genera serie de datos para proyecciones multi-escala.
 */
function generateProjectionSeries(baseMonthlyRevenue, inflationRate) {
  const steps = [
    { label: 'Ahora', days: 0 },
    { label: '15 Días', days: 15 },
    { label: '1 Mes', days: 30 },
    { label: '3 Meses', days: 90 },
    { label: '6 Meses', days: 180 },
    { label: '1 Año', days: 365 },
    { label: '2 Años', days: 730 },
    { label: '3 Años', days: 1095 },
    { label: '5 Años', days: 1825 }
  ];

  return steps.map(s => ({
    label: s.label,
    amount: getProjectedAmount(baseMonthlyRevenue, inflationRate, s.days),
    inflationImpact: getProjectedAmount(baseMonthlyRevenue, inflationRate, s.days) - baseMonthlyRevenue
  }));
}
