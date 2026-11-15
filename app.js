'use strict';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE_KEY = 'bch-compliance-demo-v1';
const types = ['发票票据', '营业执照', '财务报表', '其他资料'];
const concerns = ['票据与凭证', '账务规范', '税务申报', '经营风险'];
const state = { view: 'start', step: 1, type: '发票票据', files: [], form: {company:'',region:'深圳',industry:'现代服务业',taxpayer:'暂不确定',concerns:['票据与凭证'],notes:''}, reports: [], currentReport: null, loading: false };
try {
 const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
 if (Array.isArray(stored)) state.reports = stored.filter(r => r && typeof r.id === 'string' && typeof r.type === 'string' && r.form && typeof r.form.company === 'string' && Array.isArray(r.checks)).slice(0, 30);
} catch (_) { /* Private browsing and blocked storage still support the full flow. */ }
let toastTimer, generationTimer;

function toast(message) {
 const el = $('#toast'); el.textContent = message; el.classList.add('visible');
 clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3200);
}
function persistReports() {
 try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reports)); }
 catch (_) { toast('浏览器未允许本地保存，当前方案仍可查看和导出。'); }
 updateCount();
}
function updateCount() { $('#report-count').textContent = state.reports.length; }
function focusMain() { $('#main').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'auto'}); }
function navigate(view) {
 if (state.loading) return toast('示例方案正在整理，请稍等片刻。');
 if (view === 'start' && state.step === 3) state.step = 1;
 state.view = view;
 render(); focusMain();
}
function stepper(active) {
 return `<div class="stepper" aria-label="体检进度">${['上传资料','补充信息','查看方案'].map((label,i) => `<div class="step ${i+1===active?'active':i+1<active?'done':''}" ${i+1===active?'aria-current="step"':''}><span class="step-number">${i+1<active?icon('check'):String(i+1).padStart(2,'0')}</span><span>${label}</span></div>${i<2?'<span class="step-line" aria-hidden="true"></span>':''}`).join('')}</div>`;
}
function hero() {
 return `<section class="hero"><div class="hero-copy"><div class="hero-label">${icon('spark')} 犇诚汇 · 企业财税助手</div><h1>拍一张，<br>让财税问题有<em>答案</em>。</h1><p class="hero-description">把复杂的资料，变成看得懂的建议。<br>从一张照片开始，走好企业合规的每一步。</p><div class="hero-meta"><span>${icon('shield')}专业视角</span><span>${icon('file')}清晰方案</span><span>${icon('check')}行动指引</span></div></div><div class="hero-art" aria-hidden="true"><div class="art-orbit"></div><div class="art-paper"><div class="paper-head">${icon('file')} COMPLIANCE</div><div class="paper-lines"><i></i><i></i><i></i><i></i></div><div class="paper-chart"><i></i><i></i><i></i><i></i></div></div><div class="art-badge">${icon('shield')} 每一步，更安心</div><div class="art-scan">${icon('search')}</div><span class="art-star">✧</span><span class="art-caption">CLARITY. CONFIDENCE. COMPLIANCE.</span></div></section>`;
}
function outcomes() {
 return `<aside class="support-column"><section class="panel outcomes-panel"><p class="eyebrow">FROM DOCUMENTS TO DECISIONS</p><h2>你将获得什么？</h2><ul class="outcomes-list"><li><span class="outcome-icon">${icon('search')}</span><div><h3>看清资料</h3><p>梳理关键信息<br>明确还需补充什么</p></div></li><li><span class="outcome-icon">${icon('shield')}</span><div><h3>了解风险</h3><p>关注容易忽略的环节<br>按优先级逐一核验</p></div></li><li><span class="outcome-icon">${icon('file')}</span><div><h3>知道怎么做</h3><p>清晰的处理步骤<br>完整的资料清单</p></div></li></ul></section><section class="example-card"><p class="eyebrow">A LITTLE PREVIEW</p><h3>好方案，先看一眼。</h3><p>体验从资料到合规建议的完整过程。</p><button data-action="example">查看示例方案 ${icon('arrow')}</button></section></aside>`;
}
function thumbnails() {
 if (!state.files.length) return '';
 return `<div class="thumb-grid">${state.files.map((file,i) => `<div class="thumbnail"><button class="thumbnail-preview" data-action="preview" data-index="${i}" aria-label="预览 ${escapeHTML(file.name)}"><img src="${file.url}" alt="${escapeHTML(file.name)}"></button><button class="remove" data-action="remove-file" data-index="${i}" aria-label="移除 ${escapeHTML(file.name)}">${icon('close')}</button><span class="thumbnail-name">${escapeHTML(file.name)}</span></div>`).join('')}</div>`;
}
function renderUpload() {
 return `${hero()}${stepper(1)}<div class="workspace-grid"><section class="panel upload-panel"><div class="panel-heading"><h2>${icon('up')} 上传你的资料</h2><span>先从一种资料开始</span></div><div class="material-types" aria-label="资料类型">${types.map(type=>`<button class="type-chip ${state.type===type?'selected':''}" data-action="select-type" data-type="${type}" aria-pressed="${state.type===type}">${type}</button>`).join('')}</div><div class="dropzone ${state.files.length?'has-files':''}" id="dropzone"><div class="upload-symbol">${icon('up')}</div><h3>拖拽图片到这里，或直接上传</h3><p>票据、执照、报表，都可以先拍下来</p><div class="upload-buttons"><button class="btn primary" data-action="upload">${icon('up')} ${state.files.length?'继续添加':'上传图片'}</button><button class="btn secondary" data-action="camera">${icon('camera')} 拍照上传</button></div></div>${thumbnails()}<div class="upload-hint"><span>JPG / PNG / WEBP · 单张 ≤ 10 MB · 最多 8 张</span><button class="text-btn" data-action="sample">试用示例资料 ${icon('arrow')}</button></div><p class="upload-error" id="upload-error" role="alert" hidden></p><div class="privacy-line">${icon('lock')} 此体验版图片仅在当前浏览器预览，不会上传</div><div class="panel-action"><p>${state.files.length?`已添加 <strong>${state.files.length}</strong> 张资料，可点缩略图查看`:'不确定怎么开始？<strong>试试右侧的示例方案</strong>'}</p><button class="btn primary" data-action="next" ${state.files.length?'':'disabled'}>下一步，补充信息 ${icon('arrow')}</button></div></section>${outcomes()}</div><div class="bottom-notes"><div class="bottom-note">${icon('camera')}<div><h3>随手拍，轻松开始</h3><p>保持文字清晰，尽量拍全资料四角。</p></div></div><div class="bottom-note">${icon('shield')}<div><h3>贴近真实业务</h3><p>结合企业信息，梳理需要核验的事项。</p></div></div><div class="bottom-note">${icon('chat')}<div><h3>复杂问题，有顾问</h3><p>从初步了解，到专业人员进一步复核。</p></div></div></div>`;
}
function options(values, selected) { return values.map(v=>`<option ${v===selected?'selected':''}>${escapeHTML(v)}</option>`).join(''); }
function renderForm() {
 const f = state.form;
 return `<button class="back-button" data-action="back-upload">${icon('arrow')} 返回上传资料</button><div class="page-heading"><p class="eyebrow">A LITTLE CONTEXT GOES A LONG WAY</p><h1>再了解你一点，<br>建议才能更贴近你的企业。</h1><p>不确定的信息可以先留空，后续再和顾问一起确认。</p></div>${stepper(2)}<div class="workspace-grid"><form class="panel form-panel" id="company-form"><h2>你的企业基本情况</h2><p class="form-intro">已选择「${escapeHTML(state.type)}」· 本次使用预设内容生成示例方案</p><div class="form-grid"><label class="field full">企业名称 <small>选填，也可以使用简称</small><input name="company" maxlength="60" autocomplete="organization" placeholder="例如：某某科技有限公司" value="${escapeHTML(f.company)}"></label><label class="field">所在地区<select name="region">${options(['深圳','广州','上海','北京','杭州','其他地区'],f.region)}</select></label><label class="field">所属行业<select name="industry">${options(['现代服务业','商贸流通','电子商务','生产制造','科技与软件','其他行业'],f.industry)}</select></label><label class="field full">纳税人类型<select name="taxpayer">${options(['暂不确定','小规模纳税人','一般纳税人','个体工商户'],f.taxpayer)}</select></label><div class="field full">你最想了解哪些问题？ <small>可多选</small><div class="concern-chips">${concerns.map(c=>`<button type="button" data-action="concern" data-concern="${c}" class="${f.concerns.includes(c)?'selected':''}" aria-pressed="${f.concerns.includes(c)}">${c}</button>`).join('')}</div></div><label class="field full">还有什么想告诉我们？ <small>选填</small><textarea name="notes" maxlength="500" placeholder="例如：想梳理历史账务，或了解需要补齐哪些资料……">${escapeHTML(f.notes)}</textarea></label></div><div class="form-actions"><p>${icon('info')} 当前为交互演示，未启用图片识别。<br>下一步先展示 50% 内容，剩余内容添加吴老师微信领取。</p><button class="btn primary" type="submit">${icon('spark')} 生成示例方案 ${icon('arrow')}</button></div></form><aside class="support-column"><div class="context-card">${icon('shield')}<h3>每个建议，<br>都从了解你开始。</h3><p>资料告诉我们“发生了什么”，企业情况帮助我们理解“应该关注什么”。</p><div class="context-divider"></div><div class="context-check">${icon('check')} 不确定的项目可以后续确认</div><div class="context-check">${icon('check')} 50% 预览可打印、可保存</div><div class="selected-files"><img src="${state.files[0].url}" alt="已选择资料预览"><div><h3 style="font-size:12px">已添加 ${state.files.length} 张资料</h3><p>${escapeHTML(state.type)} · 仅本机预览</p></div></div></div></aside></div>`;
}
const riskTemplates = {
 '发票票据': [
  {title:'票据信息与业务主体是否一致',body:'核对购买方名称、识别信息及开票内容，确认对应的交易主体与实际业务。示例不代表所选照片存在信息差异。'},
  {title:'业务资料能否相互印证',body:'将发票与合同、订单、交付记录及付款凭证对应整理，查看交易链条是否有资料缺口。'},
  {title:'入账与申报口径需要进一步核对',body:'结合业务发生期间、账务记录及已申报资料，由财税人员判断是否需要调整处理。'}
 ],
 '营业执照': [
  {title:'登记信息与实际经营是否一致',body:'核对企业名称、住所、经营范围等登记信息，与实际经营情况逐项对应。'},
  {title:'经营活动所需资料是否完整',body:'根据实际业务，梳理登记、业务资质和相关证明；是否需要许可应另行核验。'},
  {title:'企业基础档案是否持续更新',body:'梳理公司章程、变更记录及财税登记资料，检查信息是否同步、档案是否可追溯。'}
 ],
 '财务报表': [
  {title:'报表数据与账务记录是否衔接',body:'将各报表数据与对应科目余额、明细账及期初资料核对，逐项标记需要解释的差异。'},
  {title:'往来与成本是否有业务支持',body:'结合应收应付、收入成本明细，了解业务背景和原始凭证的完整程度。'},
  {title:'报表与已申报资料是否可勾稽',body:'由财税人员结合申报资料、业务实质及调整记录，核对财务与税务处理的差异。'}
 ],
 '其他资料': [
  {title:'资料用途与归属需要先确认',body:'先了解资料类型、所属企业、业务背景及形成期间，明确本次核验的范围。'},
  {title:'相关业务凭证是否齐全',body:'将资料与合同、付款、交付或账务记录对应，梳理尚需补充的关联文件。'},
  {title:'具体处理应由顾问进一步复核',body:'在了解原始资料与企业情况后，再判断需要关注的财税事项与处理路径。'}
 ]
};
const lockedModules = [
 {number:'04',title:'具体处理建议',description:'结合核验结果，明确处理方向'},
 {number:'05',title:'分阶段行动路径',description:'梳理执行步骤与跟进重点'},
 {number:'06',title:'完整资料准备清单',description:'明确需要补齐的业务资料'}
];
function dateLabel(iso) { const d=new Date(iso);return Number.isNaN(d.getTime())?'演示日期':d.toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}); }
function reportReference(r) {
 if(r.id==='example')return 'BCH-DEMO-001';
 const day=String(r.created||'').slice(0,10).replace(/-/g,'');
 return `BCH-${day}-${r.id.replace(/[^a-z0-9]/gi,'').slice(0,8).toUpperCase()}`;
}
function reportGate(r) {
 return `<section class="report-gate" aria-labelledby="gate-title"><div class="gate-copy"><span class="gate-kicker">${icon('lock')} 完整报告 · 后 50%</span><h2 id="gate-title">问题看清了，<br>下一步，和吴老师一起理清。</h2><p>你已阅读前 3 个模块。添加吴老师微信，<br>联系领取剩余 3 个模块的完整内容。</p><div class="locked-modules">${lockedModules.map(m=>`<div><span>${m.number}</span><strong>${m.title}</strong>${icon('lock')}</div>`).join('')}</div><div class="gate-reference">报告编号 <strong>${escapeHTML(reportReference(r))}</strong><button data-action="copy-report" aria-label="复制报告编号">复制</button></div><button class="btn primary" data-action="claim">${icon('chat')} 添加微信，领取完整报告 ${icon('arrow')}</button><small>添加后发送报告编号，由吴老师核验资料并提供完整方案。</small></div><div class="gate-qr"><img src="assets/wechat-qr-original.png" width="640" height="640" alt="吴老师个人微信二维码原图"><strong>犇诚汇财税 · 吴老师</strong><span>微信扫一扫，添加好友</span><a href="assets/wechat-qr-original.png" download="吴老师微信二维码-原图.png">保存二维码到手机 ${icon('download')}</a></div></section>`;
}
function renderReport() {
 const r=state.currentReport;
 if(!r) { state.view='reports'; return renderReports(); }
 const riskItems=riskTemplates[r.type]||riskTemplates['其他资料'];
 return `<div class="print-brand"><img src="assets/company-logo-original.png" alt="犇诚汇财税"></div><button class="back-button" data-view="reports">${icon('arrow')} 查看我的方案</button><div class="page-heading report-heading"><div><p class="eyebrow">YOUR NEXT STEP, MADE CLEAR</p><h1>${escapeHTML(r.form.company||'你的企业')}<br>财税合规参考方案</h1><div class="report-subtitle"><span>${escapeHTML(r.form.region)}</span><span>${escapeHTML(r.form.industry)}</span><span>${escapeHTML(r.type)}</span><span>${dateLabel(r.created)}</span></div></div><div class="report-tools"><button class="btn secondary" data-action="download">${icon('download')} 下载 50% 预览版</button><button class="btn dark" data-action="print">${icon('file')} 打印预览版</button></div></div>${stepper(3)}<div class="demo-notice">${icon('info')}<span><strong>示例报告 · 已开放 50%。</strong>内容来自预设模板，未读取或分析照片。完整方案需添加微信，联系顾问核验后领取。</span></div><div class="report-layout"><div class="report-main"><section class="panel report-summary"><div class="summary-emblem">${icon('shield')}</div><div><h2>先看清问题，再走好下一步。</h2><p>以下开放 3 个资料核验模块，帮助你了解需要关注什么。<br>后续处理建议、行动路径与资料清单，请联系吴老师领取。</p><div class="summary-tags"><span>预览 3 / 6 个模块</span><span>当前可阅读 50%</span><span>完整内容 · 微信领取</span></div></div></section><section class="panel report-section preview-section"><h2>${icon('search')} 资料核验方向</h2><p class="section-caption">前 50% 内容 · 以下为通用核验方向，不表示已发现实际风险。</p>${riskItems.map((item,i)=>`<article class="risk-item preview-module" data-module="${i+1}"><div class="risk-top"><h3><span class="risk-index">0${i+1}</span>${item.title}</h3><span class="risk-badge">待核验</span></div><p>${item.body}</p></article>`).join('')}</section>${reportGate(r)}</div><aside class="report-side"><section class="panel report-section preview-progress"><span class="eyebrow">YOUR REPORT PREVIEW</span><div class="preview-progress-title"><h2>已开放内容</h2><strong>50<span>%</span></strong></div><div class="progress-track"><i style="width:50%"></i></div><p class="section-caption">已展示 3 / 6 个内容模块</p><div class="preview-status"><span>${icon('check')} 资料核验方向</span><span>${icon('lock')} 处理建议与行动方案</span><span>${icon('lock')} 完整资料准备清单</span></div></section><div class="context-card"><span class="context-advisor-logo"><img src="assets/company-mark-original.png" alt=""></span><h3>剩余 50%，<br>添加吴老师微信领取。</h3><p>带上报告编号，方便我们了解本次资料，进一步提供完整方案。</p><code class="side-report-reference">${escapeHTML(reportReference(r))}</code><button class="btn dark" data-action="claim">${icon('chat')} 微信联系，领取完整版</button><p class="claim-footnote">发送报告编号，由吴老师与你一对一沟通。</p></div></aside></div><p class="report-disclaimer">本报告用于展示产品体验，不构成审计、鉴证或正式涉税意见。实际处理需结合完整资料、业务实质及适用规定，由专业人员确认。下载与打印仅包含已开放的 50% 内容；图片不会保存到方案记录。</p>`;
}
function renderReports() {
 return `<div class="page-heading"><p class="eyebrow">A CLEAR RECORD OF EVERY STEP</p><h1>我的方案</h1><p>留住每一次梳理，也留住下一步的方向。记录仅保存在此浏览器。</p></div>${state.reports.length?`<div class="report-list">${state.reports.map(r=>`<article class="panel saved-report">${icon('file')}<div class="saved-report-info"><h2>${escapeHTML(r.form.company||'未命名企业')} · 合规参考方案</h2><p>${dateLabel(r.created)} <span class="footer-divider">·</span> ${escapeHTML(r.type)} <span class="footer-divider">·</span> 50% 预览版</p></div><div class="saved-report-actions"><button class="delete-report" data-action="delete-report" data-id="${escapeHTML(r.id)}">删除</button><button class="btn secondary" data-action="open-report" data-id="${escapeHTML(r.id)}">查看方案 ${icon('arrow')}</button></div></article>`).join('')}</div><div style="margin-top:22px"><button class="btn primary" data-action="new">${icon('up')} 开始新的体检</button></div>`:`<section class="panel empty-state"><div class="empty-icon">${icon('file')}</div><h2>第一份方案，从一张照片开始。</h2><p>上传资料或试用示例，完成后就能在这里再次查看。</p><button class="btn primary" data-action="new">开始体验 ${icon('arrow')}</button><br><button class="text-btn" data-action="example" style="margin-top:15px">先看一份示例方案</button></section>`}`;
}
function renderGuide() {
 const faqs=[['可以上传哪些资料？','目前支持 JPG、PNG 和 WEBP 图片，单张不超过 10 MB，一次最多 8 张。建议将不同类型的资料分次体检。手机可直接拍照，平板和电脑可选择图片。'],['怎样拍照，资料更清晰？','把资料平放在光线充足的位置，避开反光和遮挡，尽量拍全四角。核对文字是否清晰可读；包含多页内容时，每页单独拍摄。'],['现在会真实识别和分析照片吗？','当前是可交互原型：图片仅在本机预览，尚未接入 OCR、图片理解或 AI 方案生成服务。所有方案均使用预设示例内容，不是对上传资料的实际判断。'],['照片和企业信息会保存在哪里？','图片只保留在当前页面的内存中，刷新或关闭后即释放，不会上传到服务器。生成的方案与填写的企业信息保存在此浏览器的本地存储中，清理浏览器数据后会消失。可以在“我的方案”中删除记录。'],['如何保存方案或联系顾问？','方案页面可以下载或打印已开放的 50% 预览版。添加吴老师微信并发送报告编号，可联系领取剩余 50% 的处理建议、行动路径及完整资料清单。完整报告由顾问核验资料后，通过微信沟通交付。']];
 return `<div class="page-heading"><p class="eyebrow">SIMPLE STEPS. CLEAR ANSWERS.</p><h1>第一次用，也能轻松上手。</h1><p>从准备资料到读懂方案，三个步骤就够了。</p></div><div class="guide-grid">${[['清晰拍照，上传资料','选择资料类型，拍全四角，确认文字清晰。一张照片，就能开启一次梳理。'],['补充背景，说明问题','填写地区、行业等企业情况，告诉我们你最关心什么。不确定的内容可以留待确认。'],['读懂方案，准备行动','先阅读 50% 的资料核验内容，保存预览版；添加吴老师微信，联系领取后续处理建议、行动路径与完整资料清单。']].map((item,i)=>`<section class="panel guide-card"><div class="guide-number">0${i+1}</div><h2>${item[0]}</h2><p>${item[1]}</p></section>`).join('')}</div><section class="panel faq-panel"><h2>你可能还想知道</h2>${faqs.map((f,i)=>`<details ${i===0?'open':''}><summary>${f[0]}</summary><p>${f[1]}</p></details>`).join('')}</section><div style="margin-top:24px"><button class="btn primary" data-view="start">我知道了，开始体验 ${icon('arrow')}</button></div>`;
}
function renderAbout() {
 return `<section class="about-hero"><p class="eyebrow">ABOUT BENCHENGHUI</p><h1>做企业身边，<br>听得懂的财税顾问。</h1><p>犇诚汇财税顾问（深圳）有限公司，立足深圳，为中小微企业提供财税服务。把专业判断放回真实业务，把复杂事项整理成清晰的工作。</p><p>专心 · 用心 · 耐心</p></section><div class="about-services"><section class="panel service-card">${icon('file')}<h2>账务与申报</h2><p>代理记账、账务梳理与申报服务，让经营记录更清楚。</p></section><section class="panel service-card">${icon('shield')}<h2>合规与顾问</h2><p>财税合规指导、内控梳理与财务顾问，围绕实际业务解决问题。</p></section><section class="panel service-card">${icon('building')}<h2>企业全程服务</h2><p>公司注册、审计及企业发展过程中的财税服务支持。</p></section></div><section class="panel contact-strip"><div><h2>从一个问题开始，聊聊你的企业。</h2><p>深圳市福田区滨河大道 5022 号 · 联合广场 A 座 3310</p></div><a class="btn dark" href="https://benchenghui.com/" target="_blank" rel="noopener noreferrer">访问犇诚汇官网 ↗</a></section>`;
}
function renderLoading() {
 return `<div class="page-heading"><p class="eyebrow">ONE STEP CLOSER TO CLARITY</p><h1>把下一步，为你理清。</h1></div>${stepper(3)}<section class="panel loading-panel"><div class="loading-orbit">${icon('spark')}</div><h2>正在整理示例方案</h2><p>使用预设内容展示方案，不会读取或分析图片。</p><div class="loading-steps"><span>${icon('check')}企业背景</span><span>${icon('check')}核验方向</span><span>${icon('file')}行动清单</span></div></section>`;
}
function render() {
 const view=state.view;
 $('#page-label').textContent=({start:'财税合规助手',reports:'我的方案',report:'合规参考方案',guide:'使用指南',about:'关于犇诚汇'})[view]||'财税合规助手';
 const selected=view==='report'?'reports':view;
 $$('[data-view]').forEach(el=>{el.classList.toggle('active',el.dataset.view===selected);if(el.matches('.nav-item,.mobile-nav button')){if(el.dataset.view===selected)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');}});
 const html=state.loading?renderLoading():view==='start'?(state.step===1?renderUpload():renderForm()):view==='reports'?renderReports():view==='report'?renderReport():view==='guide'?renderGuide():renderAbout();
 $('#main').innerHTML=`<div class="view-transition">${html}</div>`;
 updateCount();
 const form=$('#company-form');
 if(form) {
  form.addEventListener('input',captureForm);
  form.addEventListener('change',captureForm);
  form.addEventListener('submit',e=>{e.preventDefault();captureForm();createReport();});
 }
 const dz=$('#dropzone');
 if(dz){
  dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('dragover');});
  dz.addEventListener('dragleave',e=>{if(!dz.contains(e.relatedTarget))dz.classList.remove('dragover');});
  dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('dragover');addFiles(e.dataTransfer.files);});
 }

}
function captureForm() {
 const form=$('#company-form');if(!form)return;
 const data=new FormData(form);
 for(const field of ['company','region','industry','taxpayer','notes'])state.form[field]=String(data.get(field)||'').trim();
}
async function addFiles(files) {
 const errors=[];
 for(const file of [...files]){
  if(state.files.length>=8){errors.push('一次最多添加 8 张图片。');break;}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){errors.push(`「${file.name}」暂不支持，请使用 JPG、PNG 或 WEBP 图片。`);continue;}
  if(file.size>10*1024*1024){errors.push(`「${file.name}」超过 10 MB，请压缩后再试。`);continue;}
  if(state.files.some(f=>f.name===file.name&&f.size===file.size)){errors.push(`「${file.name}」已添加。`);continue;}
  const url=URL.createObjectURL(file);
  try{
   await new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src=url;});
   if(state.files.length>=8){URL.revokeObjectURL(url);errors.push('一次最多添加 8 张图片。');break;}
   state.files.push({name:file.name,size:file.size,url});
  }catch(_){URL.revokeObjectURL(url);errors.push(`「${file.name}」无法读取，请重新选择。`);}
 }
 if(state.view==='start'&&state.step===1)render();
 const error=$('#upload-error');
 if(errors.length&&error){error.textContent=[...new Set(errors)].join(' ');error.hidden=false;}
 else if(state.files.length)toast(`已添加 ${state.files.length} 张资料，可以继续下一步。`);
 $('#file-input').value='';$('#camera-input').value='';
}
function addSample() {
 if(!state.files.some(f=>f.sample)){
  if(state.files.length>=8)return toast('已达到 8 张上限，请先移除一张资料。');
  state.files.push({name:'演示发票 · 非真实票据',size:0,url:'sample-invoice.svg',sample:true});
 }
 state.type='发票票据';state.view='start';state.step=1;render();toast('已添加演示样张，点击下一步继续体验。');
}
function createReport() {
 if(state.loading)return;
 state.loading=true;render();focusMain();
 generationTimer=setTimeout(()=>{
  const r={id:globalThis.crypto?.randomUUID?.()||`demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,created:new Date().toISOString(),type:state.type,form:JSON.parse(JSON.stringify(state.form)),checks:[false,false,false,false],fileCount:state.files.length};
  state.reports.unshift(r);state.reports=state.reports.slice(0,30);state.currentReport=r;persistReports();
  state.loading=false;state.step=3;state.view='report';render();focusMain();
 },1200);
}
function showExample() {
 state.currentReport={id:'example',created:new Date().toISOString(),type:'发票票据',form:{company:'示例科技有限公司',region:'深圳',industry:'科技与软件',taxpayer:'暂不确定',concerns:['票据与凭证'],notes:''},checks:[false,false,false,false],fileCount:1};
 state.view='report';render();focusMain();
}
function showDialog(html, label='提示') {
 const d=$('#dialog');$('#dialog-content').innerHTML=html;d.setAttribute('aria-label',label);d.showModal();
}
const closeButton=()=>`<button class="dialog-close" data-action="close-dialog" aria-label="关闭">${icon('close')}</button>`;
function showWeChat(report = null) {
 const reference=report?reportReference(report):'';
 showDialog(`<div class="dialog-inner wechat-dialog">${closeButton()}<span class="gate-kicker">${icon('chat')} 犇诚汇财税 · 吴老师</span><h2>${report?'添加微信，领取完整报告。':'让专业顾问，陪你理清下一步。'}</h2><p>${report?'你已阅读 50% 内容。添加吴老师微信后，发送报告编号，联系领取剩余 50%。':'微信扫一扫添加好友，告诉我们你的业务情况与财税问题。'}</p><img class="dialog-wechat-qr" src="assets/wechat-qr-original.png" width="640" height="640" alt="吴老师个人微信二维码原图">${report?`<div class="dialog-report-reference"><span>报告编号</span><strong>${escapeHTML(reference)}</strong><button data-action="copy-report">复制编号</button></div>`:''}<div class="wechat-instructions">电脑：使用微信扫一扫<br>同一部手机：保存二维码，在微信扫一扫中从相册选择</div><div class="dialog-actions"><a class="btn primary" href="assets/wechat-qr-original.png" download="吴老师微信二维码-原图.png">${icon('download')} 保存微信二维码</a></div><p class="wechat-delivery-note">${report?'完整报告由吴老师核验资料后，通过微信与你沟通交付。':'也可致电咨询：'}${report?'':`<a href="tel:075525129534">0755-25129534</a>`}</p>${report?'<a class="wechat-phone" href="tel:075525129534">电话咨询 0755-25129534 ↗</a>':''}</div>`,report?'添加微信领取完整报告':'添加吴老师微信');
}
function consult() { showWeChat(state.view==='report'?state.currentReport:null); }
function reportText(r) {
 const risks=riskTemplates[r.type]||riskTemplates['其他资料'];
 return `犇诚汇 · 财税合规参考报告（50% 预览版）\n${r.form.company||'未命名企业'}\n报告编号：${reportReference(r)}\n${dateLabel(r.created)} | ${r.form.region} | ${r.form.industry}\n资料类型：${r.type}\n\n【示例报告 · 已开放 3 / 6 个模块】\n此内容由预设模板生成，未读取或分析照片，不代表对企业的真实诊断。\n\n前 50%：资料核验方向\n${risks.map((x,i)=>`0${i+1}. ${x.title}\n${x.body}`).join('\n\n')}\n\n后 50%：联系领取完整报告\n04. 具体处理建议（待联系领取）\n05. 分阶段行动路径（待联系领取）\n06. 完整资料准备清单（待联系领取）\n\n添加犇诚汇财税吴老师微信，发送报告编号 ${reportReference(r)}，由顾问核验资料后提供完整报告。\n请返回网页扫描或保存吴老师微信二维码：\nhttps://benchenghui-compliance-studio.wux9764.chatgpt.site/\n\n本文件仅包含已开放的 50% 内容，不构成审计、鉴证或正式涉税意见。\n犇诚汇财税咨询电话：0755-25129534`;
}
function resetFlow() {
 for(const f of state.files)if(!f.sample)URL.revokeObjectURL(f.url);
 state.files=[];state.step=1;state.view='start';state.type='发票票据';state.form={company:'',region:'深圳',industry:'现代服务业',taxpayer:'暂不确定',concerns:['票据与凭证'],notes:''};render();focusMain();
}
document.addEventListener('click',async e=>{
 const view=e.target.closest('[data-view]');
 if(view){e.preventDefault();navigate(view.dataset.view);return;}
 const target=e.target.closest('[data-action]');if(!target)return;
 const action=target.dataset.action;
 if(action==='upload')$('#file-input').click();
 if(action==='camera')$('#camera-input').click();
 if(action==='sample')addSample();
 if(action==='example')showExample();
 if(action==='consult')consult();
 if(action==='claim')showWeChat(state.currentReport);
 if(action==='copy-report'&&state.currentReport){
  try{await navigator.clipboard.writeText(reportReference(state.currentReport));toast('报告编号已复制，添加微信后发送给吴老师。');}
  catch(_){toast('请长按或选中报告编号进行复制。');}
 }
 if(action==='close-dialog')$('#dialog').close();
 if(action==='select-type'){state.type=target.dataset.type;render();}
 if(action==='remove-file'){
  const [file]=state.files.splice(Number(target.dataset.index),1);if(file&&!file.sample)URL.revokeObjectURL(file.url);render();
 }
 if(action==='preview'){
  const f=state.files[Number(target.dataset.index)];if(f)showDialog(`<div class="dialog-inner image-dialog">${closeButton()}<img src="${f.url}" alt="${escapeHTML(f.name)}"><p>${escapeHTML(f.name)}</p></div>`,'资料预览');
 }
 if(action==='next'&&state.files.length){state.step=2;render();focusMain();}
 if(action==='back-upload'){captureForm();state.step=1;render();focusMain();}
 if(action==='concern'){
  captureForm();const c=target.dataset.concern;
  state.form.concerns=state.form.concerns.includes(c)?state.form.concerns.filter(x=>x!==c):[...state.form.concerns,c];
  target.classList.toggle('selected',state.form.concerns.includes(c));target.setAttribute('aria-pressed',String(state.form.concerns.includes(c)));
 }
 if(action==='open-report'){state.currentReport=state.reports.find(x=>x.id===target.dataset.id);state.view='report';render();focusMain();}
 if(action==='new')resetFlow();
 if(action==='delete-report'){
  const id=target.dataset.id;
  showDialog(`<div class="dialog-inner">${closeButton()}<div class="dialog-icon">${icon('file')}</div><h2>删除这份方案？</h2><p>删除后将从此浏览器移除记录，已下载的文件不受影响。</p><div class="dialog-actions"><button class="btn secondary" data-action="close-dialog">保留方案</button><button class="btn primary" data-action="confirm-delete" data-id="${escapeHTML(id)}">删除方案</button></div></div>`,'删除方案确认');
 }
 if(action==='confirm-delete'){
  state.reports=state.reports.filter(x=>x.id!==target.dataset.id);persistReports();$('#dialog').close();render();toast('这份方案已从本浏览器删除。');
 }
 if(action==='download'&&state.currentReport){
  const r=state.currentReport,url=URL.createObjectURL(new Blob(['\ufeff'+reportText(r)],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download=`${(r.form.company||'企业').replace(/[\\/:*?"<>|]/g,'_')}-财税合规报告-50%预览版.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('已导出 50% 预览版，完整报告请联系吴老师领取。');
 }
 if(action==='print')window.print();
 if(action==='copy-phone'){
  try{await navigator.clipboard.writeText('0755-25129534');toast('咨询电话已复制。');}
  catch(_){toast('请长按上方电话号码复制，或直接点击拨打。');}
 }
});
$('#file-input').addEventListener('change',e=>addFiles(e.target.files));
$('#camera-input').addEventListener('change',e=>addFiles(e.target.files));
$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const rect=e.target.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)e.target.close();}});
document.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault();});
document.addEventListener('drop',e=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault();});
render();
