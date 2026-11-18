'use strict';

const BCH_AI = (() => {
  const apiBase = location.hostname === 'wux9764.github.io'
    ? 'https://benchenghui-compliance-studio.wux9764.chatgpt.site'
    : '';

  async function prepareImage(file) {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(`无法读取「${file.name}」，请重新上传。`));
      element.src = file.url;
    });
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('此浏览器无法处理图片，请使用最新版浏览器。');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { name: file.name, dataUrl: canvas.toDataURL('image/jpeg', 0.85), sample: Boolean(file.sample) };
  }

  function isReport(report) {
    const a = report?.analysis;
    return a && typeof a.overview === 'string' && Array.isArray(a.observations)
      && a.observations.every(item => item && typeof item.title === 'string' && typeof item.detail === 'string' && typeof item.evidence === 'string')
      && Array.isArray(a.recommendations) && a.recommendations.every(item => typeof item === 'string')
      && Array.isArray(a.actionPlan) && a.actionPlan.every(item => item && typeof item.stage === 'string' && Array.isArray(item.tasks) && item.tasks.every(task => typeof task === 'string'))
      && Array.isArray(a.documents) && a.documents.every(item => typeof item === 'string')
      && Array.isArray(a.questions) && a.questions.every(item => typeof item === 'string')
      && typeof a.limitations === 'string';
  }

  async function generate(type, form, files) {
    const images = [];
    for (const file of files) images.push(await prepareImage(file));
    const body = JSON.stringify({ type, form, images });
    if (body.length > 15 * 1024 * 1024) throw new Error('处理后的图片仍较大，请减少图片张数后重试。');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(`${apiBase}/api/reports`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body, signal: controller.signal,
      });
      let report;
      try { report = await response.json(); }
      catch { throw new Error('AI 服务响应异常，请稍后重试。'); }
      if (!response.ok) throw new Error(report.error?.message || 'AI 分析失败，请稍后重试。');
      if (!isReport(report) || typeof report.id !== 'string') throw new Error('方案内容不完整，请重新生成。');
      return report;
    } catch (error) {
      if (controller.signal.aborted) throw new Error('AI 分析超时，请稍后重试或减少图片数量。');
      if (error instanceof TypeError) throw new Error('无法连接 AI 服务，请检查网络后重试。');
      throw error;
    } finally { clearTimeout(timeout); }
  }

  function renderReport(r) {
    const a = r.analysis;
    const escape = escapeHTML;
    const list = items => `<ul class="ai-report-list">${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`;
    const section = (number, title, content) => `<section class="panel report-section"><h2><span class="risk-index">${number}</span>${title}</h2>${content}</section>`;
    return `<div class="print-brand"><img src="assets/company-logo-original.png" alt="犇诚汇财税"></div>
      <button class="back-button" data-view="reports">${icon('arrow')} 查看我的方案</button>
      <div class="page-heading report-heading"><div><p class="eyebrow">YOUR NEXT STEP, MADE CLEAR</p><h1>${escape(r.form.company || '你的企业')}<br>财税合规参考方案</h1><div class="report-subtitle"><span>${escape(r.form.region)}</span><span>${escape(r.form.industry)}</span><span>${escape(r.type)}</span><span>${dateLabel(r.created)}</span></div></div><div class="report-tools"><button class="btn secondary" data-action="download">${icon('download')} 下载完整方案</button><button class="btn dark" data-action="print">${icon('file')} 打印方案</button></div></div>
      ${stepper(3)}
      <div class="demo-notice">${icon('info')}<span><strong>豆包视觉 AI 分析。</strong>本方案依据本次提交的图片与企业信息生成，需要由财税专业人员复核。${r.hasSample ? '本次包含演示样张，请勿作为真实业务结论。' : ''}</span></div>
      <div class="report-layout"><div class="report-main">
      ${section('01', '资料与总体情况', `<p class="ai-report-copy">${escape(a.overview)}</p>`)}
      ${section('02', '发现与核验事项', a.observations.map(item => `<article class="risk-item"><div class="risk-top"><h3>${escape(item.title)}</h3><span class="risk-badge">${escape(item.priority || '待核验')}</span></div><p>${escape(item.detail)}</p><p class="ai-evidence">资料依据 · ${escape(item.evidence)}</p></article>`).join(''))}
      ${section('03', '具体处理建议', list(a.recommendations))}
      ${section('04', '分阶段行动路径', a.actionPlan.map(item => `<article class="ai-action-stage"><h3>${escape(item.stage)}</h3>${list(item.tasks)}</article>`).join(''))}
      ${section('05', '待补充资料', list(a.documents))}
      ${section('06', '进一步确认的问题', list(a.questions))}
      </div><aside class="report-side"><section class="panel report-section"><p class="eyebrow">YOUR COMPLETE REPORT</p><h2>完整方案已生成</h2><p class="ai-report-copy">共 6 个内容模块，可直接阅读、下载和打印。</p><p class="side-report-reference">${escape(reportReference(r))}</p></section><div class="context-card"><span class="context-advisor-logo"><img src="assets/company-mark-original.png" alt=""></span><h3>带上方案，<br>和专业顾问进一步沟通。</h3><p>结合原始凭证与业务情况，确认实际处理方式。</p><button class="btn dark" data-action="consult">${icon('chat')} 联系财税顾问</button></div></aside></div>
      <p class="report-disclaimer">${escape(a.limitations)}<br>AI 输出供资料整理与初步参考，不构成审计、鉴证或正式涉税意见。方案记录保存在此浏览器，原始图片不写入方案记录。</p>`;
  }

  function reportText(r) {
    const a = r.analysis;
    const numbered = items => items.map((item, index) => `${index + 1}. ${item}`).join('\n');
    return `犇诚汇 · 财税合规参考方案（完整版）\n${r.form.company || '未命名企业'}\n报告编号：${reportReference(r)}\n${dateLabel(r.created)} | ${r.form.region} | ${r.form.industry}\n资料类型：${r.type}\n\n豆包视觉 AI 分析${r.hasSample ? ' · 包含演示样张' : ''}\n\n01. 资料与总体情况\n${a.overview}\n\n02. 发现与核验事项\n${a.observations.map((item, index) => `${index + 1}. ${item.title}（${item.priority}）\n${item.detail}\n资料依据：${item.evidence}`).join('\n\n')}\n\n03. 具体处理建议\n${numbered(a.recommendations)}\n\n04. 分阶段行动路径\n${a.actionPlan.map(item => `${item.stage}\n${numbered(item.tasks)}`).join('\n\n')}\n\n05. 待补充资料\n${numbered(a.documents)}\n\n06. 进一步确认的问题\n${numbered(a.questions)}\n\n${a.limitations}\n\nAI 输出供资料整理与初步参考，实际处理请由专业人员复核。\n犇诚汇财税咨询电话：0755-25129534`;
  }

  return { generate, isReport, renderReport, reportText };
})();
