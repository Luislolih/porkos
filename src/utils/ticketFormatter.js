import { doesProductSupportCreams } from './productCategories';

export function getItemTicketDetails(customization, item = null, allCategories = []) {
  if (!customization) return [];

  const lines = [];

  // 0. DESTINO INDIVIDUAL: PARA LLEVAR / IR COMIENDO
  if (customization.consumptionType === 'PARA_LLEVAR') {
    lines.push({ label: 'PEDIDO', value: 'PARA LLEVAR (TÁPER)', type: 'takeout' });
  } else if (customization.consumptionType === 'CONSUMO_EXTERNO') {
    lines.push({ label: 'PEDIDO', value: 'IR COMIENDO', type: 'external' });
  }

  // 1. ENSALADA: COMPLETA / SIN ENSALADA / TOMATE, LECHUGA (1º EN COMANDA Y COCINA)
  if (customization.saladSummary) {
    let saladVal = customization.saladSummary;
    if (saladVal === 'CON ENSALADA COMPLETA') {
      saladVal = 'COMPLETA';
    } else if (saladVal === 'SIN ENSALADA') {
      saladVal = 'SIN ENSALADA';
    } else if (saladVal.startsWith('SOLO ')) {
      saladVal = saladVal.replace('SOLO ', '');
    }
    lines.push({ label: 'ENSALADA', value: saladVal, type: 'salad' });
  }

  // 2. PAPAS: HILO o FRITAS o SIN PAPAS (2º EN COMANDA Y COCINA)
  const papasMod = customization.selectedModifiers?.find(
    (m) =>
      m.groupId === 'mod_papas' ||
      m.groupId === 'mod_corte_papas' ||
      m.groupName?.toLowerCase().includes('papa')
  );

  if (papasMod) {
    const opt = papasMod.optionName.toLowerCase();
    let val;
    if (opt.includes('hilo')) {
      val = 'HILO';
    } else if (opt.includes('sin')) {
      val = 'SIN PAPAS';
    } else if (opt.includes('frita')) {
      val = 'FRITAS';
    } else {
      val = papasMod.optionName.toUpperCase();
    }
    lines.push({ label: 'PAPAS', value: val, type: 'papas' });
  }

  // Otros modificadores (ej. Chimichurri en choripán)
  customization.selectedModifiers?.forEach((m) => {
    if (
      m.groupId !== 'mod_papas' &&
      m.groupId !== 'mod_corte_papas' &&
      !m.groupName?.toLowerCase().includes('papa')
    ) {
      lines.push({
        label: m.groupName ? m.groupName.toUpperCase() : 'OPCIÓN',
        value: m.optionName.toUpperCase(),
        type: 'modifier',
      });
    }
  });

  // 3. CREMAS: MAYO, KETCHUP
  if (customization.creamsSummary) {
    const supportsCreams = item ? doesProductSupportCreams(item, allCategories) : true;
    if (supportsCreams) {
      const cleanCreams = customization.creamsSummary
        .replace(/\s*\+\s*/g, ', ')
        .replace('NORMAL (CASA)', 'CASA');
      lines.push({ label: 'CREMAS', value: cleanCreams, type: 'creams' });
    }
  }

  // 4. EXTRAS: Cada extra en su propia línea para distinguirse con precisión
  if (customization.selectedExtras?.length > 0) {
    customization.selectedExtras.forEach((e) => {
      const cleanName = (e?.name || e?.label || (typeof e === 'string' ? e : '') || 'Extra').replace(/^Extra\s+/i, '');
      const qty = e?.quantity || 1;
      lines.push({
        label: 'EXTRA',
        value: `${qty}x ${cleanName}`.toUpperCase(),
        type: 'extras',
      });
    });
  }

  // 5. EMPAQUE / TAPER
  if (customization.packaging && customization.packaging.price > 0) {
    const rawPkgName = customization.packaging.name || 'TAPER';
    const pkgName = rawPkgName.replace(/^Taper Térmico\s+/i, 'TAPER ');
    lines.push({ label: 'EMPAQUE', value: pkgName.toUpperCase(), type: 'packaging' });
  }

  // 6. TEMPERATURA
  if (customization.temperature) {
    const tempVal = customization.temperature === 'HELADA' ? 'Helada' : 'Sin Helar';
    lines.push({ label: 'TEMP', value: tempVal, type: 'temp' });
  }

  // 7. NOTA DE PREPARACIÓN
  if (customization.itemNotes) {
    lines.push({ label: 'NOTA', value: customization.itemNotes, type: 'note' });
  }

  return lines;
}
