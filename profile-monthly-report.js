/* Shadows Byte Gaming Official V2 - Informes mensuales privados y PDF local. */
(() => {
  'use strict';

  const el = (tag, className, content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  };
  const numeral = value => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };
  const toMadridMonth = () => {
    const parts = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', year: 'numeric', month: 'numeric' }).formatToParts(new Date());
    return { year: Number(parts.find(x => x.type === 'year').value), month: Number(parts.find(x => x.type === 'month').value) };
  };
  const monthLabel = yyyyMm => {
    if (!/^[0-9]{4}-[0-9]{2}$/.test(String(yyyyMm))) return '';
    return new Date(yyyyMm + '-15T12:00:00Z').toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };
  const dayLabel = date => {
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(date))) return 'Sin visitas';
    return new Date(date + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  };
  const format = value => numeral(value).toLocaleString('es-ES');
  const comparison = (current, previous) => {
    const a = numeral(current);
    const b = numeral(previous);
    if (!b) return a ? 'Sin referencia previa' : 'Sin cambios';
    const delta = (a - b) / b * 100;
    return (delta > 0 ? '+' : '') + delta.toFixed(1).replace('.', ',') + ' %';
  };

  // PDF minimalista y autocontenido: dos paginas A4, fuentes PDF estandar.
  // No usa CDN ni envia datos del historial a servicios externos.
  function createPdf(report) {
    const W = 595;
    const H = 842;
    const dark = [0.060, 0.057, 0.126];
    const purple = [0.47, 0.23, 0.71];
    const deepPurple = [0.26, 0.13, 0.43];
    const white = [1, 1, 1];
    const ink = [0.13, 0.13, 0.22];
    const muted = [0.41, 0.40, 0.48];
    const light = [0.95, 0.94, 0.98];
    const faint = [0.86, 0.83, 0.92];

    function latinText(value) {
      return String(value ?? '')
        .replace(/[–—−]/g, '-')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/…/g, '...')
        .replace(/[\r\n\t]/g, ' ')
        .replace(/[^\u0020-\u00FF]/g, '?');
    }
    const literal = value => latinText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const rgb = values => values.map(x => Number(x).toFixed(3)).join(' ');
    const pages = [];

    function page() {
      const ops = [];
      const fillRect = (x, top, width, height, color) => {
        ops.push(rgb(color) + ' rg ' + x.toFixed(2) + ' ' + (H - top - height).toFixed(2) + ' ' + width.toFixed(2) + ' ' + height.toFixed(2) + ' re f');
      };
      const rule = (x1, top1, x2, top2, color, lineWidth = 1) => {
        ops.push(rgb(color) + ' RG ' + lineWidth + ' w ' + x1 + ' ' + (H - top1) + ' m ' + x2 + ' ' + (H - top2) + ' l S');
      };
      const text = (value, x, top, size = 10, bold = false, color = ink) => {
        ops.push(rgb(color) + ' rg BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf 1 0 0 1 ' + x.toFixed(2) + ' ' + (H - top).toFixed(2) + ' Tm (' + literal(value) + ') Tj ET');
      };
      const finish = () => pages.push(ops.join('\n') + '\n');
      return { fillRect, rule, text, finish };
    }

    const title = monthLabel(report.month);
    const generated = new Date().toLocaleDateString('es-ES');
    const count = numeral(report.visits);
    const unique = numeral(report.unique_visitors);
    const previous = numeral(report.previous_visits);
    const delta = comparison(count, previous);
    const peak = numeral(report.peak_visits);
    const peakDate = peak ? dayLabel(report.peak_day) : 'Sin actividad';
    const days = Array.isArray(report.days) ? report.days : [];

    const a = page();
    a.fillRect(0, 0, W, 120, dark);
    a.fillRect(0, 0, 8, 120, purple);
    a.text('SHADOWS BYTE GAMING OFFICIAL V2', 38, 30, 11, true, [0.84, 0.71, 1]);
    a.text('INFORME MENSUAL DE VISITAS', 38, 65, 20, true, white);
    a.text(title.toUpperCase() + '  |  Generado: ' + generated, 38, 93, 11, false, white);
    a.text('RESUMEN DEL PERIODO', 38, 148, 12, true, purple);

    const cells = [
      { x: 38, y: 166, label: 'Visitas registradas', value: format(count) },
      { x: 303, y: 166, label: 'Visitantes unicos', value: format(unique) },
      { x: 38, y: 245, label: 'Periodo anterior', value: format(previous) },
      { x: 303, y: 245, label: 'Cambio de visitas', value: delta }
    ];
    for (const cell of cells) {
      a.fillRect(cell.x, cell.y, 254, 70, light);
      a.fillRect(cell.x, cell.y, 4, 70, purple);
      a.text(cell.label, cell.x + 15, cell.y + 22, 10, false, muted);
      const fontSize = cell.value.length > 15 ? 13 : 20;
      a.text(cell.value, cell.x + 15, cell.y + 50, fontSize, true, deepPurple);
    }
    a.text('DIA MAS ACTIVO', 38, 347, 10, true, muted);
    a.text(peakDate + '  -  ' + format(peak) + (peak === 1 ? ' visita' : ' visitas'), 38, 369, 13, true, dark);
    a.text('GRAFICO DE VISITAS POR DIA', 38, 403, 12, true, purple);
    const chartLeft = 42;
    const chartWidth = 508;
    const chartTop = 427;
    const chartHeight = 169;
    const bottom = chartTop + chartHeight;
    a.rule(chartLeft, bottom, chartLeft + chartWidth, bottom, faint);
    const maximum = Math.max(1, ...days.map(d => numeral(d.visits)));
    const nDays = Math.max(1, days.length);
    const gap = nDays > 20 ? 4 : 6;
    const barWidth = (chartWidth - gap * (nDays - 1)) / nDays;
    for (let i = 0; i < days.length; i++) {
      const item = days[i];
      const visits = numeral(item.visits);
      const barHeight = visits ? Math.max(6, visits / maximum * (chartHeight - 20)) : 0;
      const x = chartLeft + i * (barWidth + gap);
      if (visits) a.fillRect(x, bottom - barHeight, barWidth, barHeight, i % 2 ? purple : deepPurple);
      a.text(String(i + 1), x + 1, bottom + 16, nDays > 25 ? 7 : 8, false, muted);
    }
    a.text('Hasta el ' + dayLabel(report.through_day) + '  |  ' + format(count) + ' visitas', 38, 640, 11, true, dark);
    a.rule(38, 660, 557, 660, faint);
    a.text('Comparado con el mismo tramo del mes anterior:', 38, 684, 10, false, muted);
    a.text(monthLabel(report.previous_month) + ' (hasta el ' + dayLabel(report.previous_through) + ')', 38, 701, 10, false, ink);
    a.text('Los datos reflejan solo visitas registradas con el historial activo.', 38, 730, 9, false, muted);
    a.text('Las visitas anteriores al inicio del registro pueden no estar disponibles.', 38, 746, 9, false, muted);
    a.rule(38, 787, 557, 787, faint);
    a.text('Informe privado - generado en este navegador', 38, 811, 9, false, muted);
    a.text('1 / 2', 522, 811, 9, false, muted);
    a.finish();

    const b = page();
    b.fillRect(0, 0, W, 107, dark);
    b.fillRect(0, 0, 8, 107, purple);
    b.text('SHADOWS BYTE GAMING OFFICIAL V2', 38, 29, 10, true, [0.84, 0.71, 1]);
    b.text('DETALLE DIARIO', 38, 62, 21, true, white);
    b.text(title.toUpperCase(), 38, 87, 11, false, white);
    b.text('Visitas registradas y visitantes distintos cada dia', 38, 137, 11, false, muted);

    const half = Math.ceil(days.length / 2);
    for (let side = 0; side < 2; side++) {
      const data = days.slice(side * half, (side + 1) * half);
      const x = side ? 303 : 38;
      b.fillRect(x, 154, 254, 30, deepPurple);
      b.text('DIA', x + 9, 174, 9, true, white);
      b.text('VISITAS', x + 97, 174, 9, true, white);
      b.text('VISITANTES', x + 172, 174, 9, true, white);
      for (let j = 0; j < data.length; j++) {
        const item = data[j];
        const y = 188 + j * 30;
        if (j % 2 === 0) b.fillRect(x, y, 254, 30, light);
        b.text(dayLabel(item.date), x + 9, y + 20, 10, false, ink);
        b.text(format(item.visits), x + 108, y + 20, 10, true, deepPurple);
        b.text(format(item.visitors), x + 194, y + 20, 10, false, ink);
      }
    }
    b.rule(38, 706, 557, 706, faint);
    b.text('TOTAL DE VISITAS: ' + format(count), 38, 734, 12, true, deepPurple);
    b.text('VISITANTES UNICOS DEL MES: ' + format(unique), 38, 757, 10, true, dark);
    b.text('Cada visitante puede aparecer en varios dias, pero se cuenta solo', 38, 777, 9, false, muted);
    b.text('una vez en la cifra mensual de visitantes unicos.', 38, 791, 9, false, muted);
    b.text('2 / 2', 522, 811, 9, false, muted);
    b.finish();

    let output = '%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n';
    const offsets = [0];
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [5 0 R 6 0 R] /Count 2 >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 7 0 R >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 8 0 R >>',
      '<< /Length ' + pages[0].length + ' >>\nstream\n' + pages[0] + 'endstream',
      '<< /Length ' + pages[1].length + ' >>\nstream\n' + pages[1] + 'endstream'
    ];
    for (let i = 0; i < objects.length; i++) {
      offsets[i + 1] = output.length;
      output += (i + 1) + ' 0 obj\n' + objects[i] + '\nendobj\n';
    }
    const xrefStart = output.length;
    output += 'xref\n0 9\n0000000000 65535 f \n';
    for (let i = 1; i <= 8; i++) output += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    output += 'trailer\n<< /Root 1 0 R /Size 9 >>\nstartxref\n' + xrefStart + '\n%%EOF\n';
    const bytes = new Uint8Array(output.length);
    for (let i = 0; i < output.length; i++) bytes[i] = output.charCodeAt(i) & 255;
    return bytes;
  }

  function downloadPdf(report) {
    const bytes = createPdf(report);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ShadowsByte_Informe_Visitas_' + report.month + '.pdf';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function mount(statsPanel) {
    if (!statsPanel || statsPanel.querySelector('.sb-views-monthly-report') || typeof sb === 'undefined') return;
    const card = el('section', 'sb-views-monthly-report');
    card.setAttribute('aria-label', 'Informe mensual de visitas y descarga PDF');
    card.append(el('h3', '', '📄 Informe mensual de visitas'));
    card.append(el('p', 'sb-views-monthly-intro', 'Consulta las estadísticas de cada mes y descarga un informe privado en PDF, con un gráfico y el detalle diario.'));
    const controls = el('div', 'sb-views-monthly-controls');
    const selectorLabel = el('label', 'sb-views-monthly-label', 'Mes del informe');
    const selector = el('select', 'sb-views-monthly-select');
    selector.setAttribute('aria-label', 'Seleccionar mes del informe');
    const current = toMadridMonth();
    for (let i = 0; i < 12; i++) {
      const first = new Date(Date.UTC(current.year, current.month - 1 - i, 1));
      const value = first.toISOString().slice(0, 7);
      const option = el('option', '', monthLabel(value));
      option.value = value;
      selector.append(option);
    }
    selectorLabel.append(selector);
    const reload = el('button', 'outline-btn mini', '↻ Actualizar informe');
    reload.type = 'button';
    const exportBtn = el('button', 'gradient-btn mini sb-views-download-pdf', '⬇ Descargar PDF');
    exportBtn.type = 'button';
    exportBtn.disabled = true;
    controls.append(selectorLabel, reload, exportBtn);
    card.append(controls);
    const reportStatus = el('p', 'sb-views-monthly-status', 'Cargando informe mensual…');
    reportStatus.setAttribute('role', 'status');
    const overview = el('div', 'sb-views-monthly-overview');
    const fields = [
      ['visits', 'Visitas del mes'],
      ['unique_visitors', 'Visitantes únicos'],
      ['previous_visits', 'Tramo anterior'],
      ['change', 'Variación'],
      ['peak', 'Día más activo']
    ];
    const values = new Map();
    for (const [key, caption] of fields) {
      const tile = el('div', 'sb-views-monthly-metric');
      tile.append(el('small', '', caption));
      const number = el('strong', '', '—');
      tile.append(number);
      overview.append(tile);
      values.set(key, number);
    }
    const dailyTitle = el('h4', '', 'Visitas por día');
    const dailyScroll = el('div', 'sb-views-monthly-scroll');
    const dailyChart = el('div', 'sb-views-monthly-bars');
    dailyChart.setAttribute('role', 'list');
    dailyChart.setAttribute('aria-label', 'Visitas registradas por día del mes seleccionado');
    dailyScroll.append(dailyChart);
    card.append(reportStatus, overview, dailyTitle, dailyScroll);
    card.append(el('p', 'sb-views-monthly-note', 'Informe privado. Las visitas se registran con consentimiento mutuo; los meses anteriores a la activación del historial pueden aparecer sin actividad. En el mes actual se compara el mismo número de días del mes anterior.'));
    statsPanel.append(card);
    let revision = 0;
    let report = null;

    function render(data) {
      overview.hidden = false;
      dailyTitle.hidden = false;
      dailyScroll.hidden = false;
      const visits = numeral(data.visits);
      const previous = numeral(data.previous_visits);
      values.get('visits').textContent = format(visits);
      values.get('unique_visitors').textContent = format(data.unique_visitors);
      values.get('previous_visits').textContent = format(previous);
      values.get('change').textContent = comparison(visits, previous);
      values.get('peak').textContent = numeral(data.peak_visits)
        ? dayLabel(data.peak_day) + ' · ' + format(data.peak_visits)
        : 'Sin visitas';
      dailyChart.replaceChildren();
      const days = data.days;
      const max = Math.max(1, ...days.map(day => numeral(day.visits)));
      dailyChart.style.setProperty('--sb-day-count', String(days.length));
      for (const day of days) {
        const item = el('div', 'sb-views-monthly-column');
        item.setAttribute('role', 'listitem');
        const dateNumber = String(day.date).slice(-2);
        const visitsForDay = numeral(day.visits);
        item.title = dayLabel(day.date) + ': ' + format(visitsForDay) + ' visitas (' + format(day.visitors) + ' visitantes)';
        item.setAttribute('aria-label', item.title);
        const bar = el('span', 'sb-views-monthly-bar');
        bar.style.height = visitsForDay ? Math.max(7, Math.round(visitsForDay / max * 100)) + '%' : '0%';
        item.append(el('strong', '', format(visitsForDay)), bar, el('small', '', dateNumber));
        dailyChart.append(item);
      }
    }

    async function loadReport() {
      const ticket = ++revision;
      report = null;
      exportBtn.disabled = true;
      reload.disabled = true;
      selector.disabled = true;
      reportStatus.textContent = 'Cargando informe mensual…';
      const selected = selector.value;
      try {
        const { data, error } = await sb.rpc('get_profile_monthly_report', { report_month: selected + '-01' });
        if (!card.isConnected || ticket !== revision) return;
        if (error) throw error;
        if (!data || data.enabled !== true) {
          overview.hidden = true;
          dailyTitle.hidden = true;
          dailyScroll.hidden = true;
          reportStatus.textContent = 'Activa el historial de visitas para consultar y descargar tu informe mensual.';
          return;
        }
        if (data.month !== selected || !Array.isArray(data.days) || !data.days.length ||
          data.days.some(item => !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(item.date)))) {
          throw new Error('Datos mensuales inesperados');
        }
        report = data;
        render(report);
        reportStatus.textContent = 'Informe disponible: ' + monthLabel(report.month) + ' (hasta el ' + dayLabel(report.through_day) + ').';
        exportBtn.disabled = false;
      } catch (error) {
        if (!card.isConnected || ticket !== revision) return;
        overview.hidden = true;
        dailyTitle.hidden = true;
        dailyScroll.hidden = true;
        reportStatus.textContent = 'No se pudo cargar el informe. Pulsa Actualizar informe para reintentarlo.';
        console.warn('Error en informe mensual de visitas:', error);
      } finally {
        if (card.isConnected && ticket === revision) {
          reload.disabled = false;
          selector.disabled = false;
        }
      }
    }

    reload.addEventListener('click', loadReport);
    selector.addEventListener('change', loadReport);
    exportBtn.addEventListener('click', () => {
      if (!report || report.enabled !== true || report.month !== selector.value) return;
      try {
        downloadPdf(report);
        reportStatus.textContent = 'PDF descargado en este dispositivo. Los datos no se envían a otro servicio.';
      } catch (error) {
        reportStatus.textContent = 'No se pudo crear el PDF. Vuelve a intentarlo.';
        console.warn('Error al crear PDF mensual:', error);
      }
    });
    const historyCheckbox = statsPanel.closest('.sb-profile-views')?.querySelector('.sb-views-toggle input');
    if (historyCheckbox) {
      historyCheckbox.addEventListener('change', () => {
        report = null;
        exportBtn.disabled = true;
        reportStatus.textContent = 'Pulsa Actualizar informe después de cambiar la privacidad del historial.';
      });
    }
    loadReport();
  }

  let scheduled = false;
  function scan() {
    scheduled = false;
    const account = document.getElementById('account-profile');
    const statsPanel = account?.querySelector('.sb-views-stats-panel');
    if (statsPanel) mount(statsPanel);
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(scan);
  }
  function init() {
    const app = document.getElementById('app');
    if (!app) return;
    new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
    window.addEventListener('hashchange', schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
