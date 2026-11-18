export function getItemTicketDetails(customization) {
  if (!customization) return [];

  const lines = [];

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
    const cleanCreams = customization.creamsSummary
      .replace(/\s*\+\s*/g, ', ')
      .replace('NORMAL (CASA)', 'CASA');
    lines.push({ label: 'CREMAS', value: cleanCreams, type: 'creams' });
  }

  // 4. EXTRAS: Queso, Huevo
  if (customization.selectedExtras?.length > 0) {
    const extrasList = customization.selectedExtras
      .map((e) => {
        const cleanName = e.name.replace(/^Extra\s+/i, '');
        return e.quantity > 1 ? `${e.quantity}x ${cleanName}` : cleanName;
      })
      .join(', ');
    lines.push({ label: 'EXTRAS', value: extrasList, type: 'extras' });
  }

  // 5. EMPAQUE / TAPER
  if (customization.packaging && customization.packaging.price > 0) {
    const pkgName = customization.packaging.name.replace(/^Taper Térmico\s+/i, 'TAPER ');
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
