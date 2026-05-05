#!/usr/bin/env python3
import sys, os, shutil
from datetime import datetime

if not os.path.exists('js/app.js') or not os.path.exists('index.html'):
    print('ERREUR : lance ce script depuis le dossier du projet')
    sys.exit(1)

ts = datetime.now().strftime('%Y%m%d_%H%M%S')
shutil.copy('js/app.js', f'/tmp/app.js.before-fix38-{ts}')
shutil.copy('index.html', f'/tmp/index.html.before-fix38-{ts}')
print(f'Backups : /tmp/app.js.before-fix38-{ts}')

with open('js/app.js') as f:
    c = f.read()

bcl_block = """
window.BCL_RATES = {
  source: "Banque Centrale du Luxembourg",
  source_short: "BCL",
  source_url: "https://www.bcl.lu/fr/statistiques/series_statistiques_luxembourg/01_Stat_po_mon/index.html",
  publication_period: "juin 2025",
  fetched_at: "2026-05-05",
  rates: { variable: 3.28, fixed_5: 3.20, fixed_10: 3.55, fixed_15: 3.65, fixed_20: 3.75, fixed_25: 3.85, fixed_30: 4.05 }
};
window.getBCLRate = function(d){
  var R = window.BCL_RATES.rates;
  if(!d) return R.fixed_25;
  if(d<=5) return R.fixed_5;
  if(d<=10) return R.fixed_10;
  if(d<=15) return R.fixed_15;
  if(d<=20) return R.fixed_20;
  if(d<=25) return R.fixed_25;
  return R.fixed_30;
};
window.getBCLSourceLabel = function(){
  var B = window.BCL_RATES;
  return 'Source : ' + B.source_short + ' - taux moyen marche ' + B.publication_period;
};
window.calcMensualite = function(m, t, d){
  if(!m || !t || !d) return 0;
  var mr = t/100/12, n = d*12;
  return m * mr / (1 - Math.pow(1+mr, -n));
};
window.calcFraisNotaireLU = function(p, isResi){
  if(!p) return 0;
  var droits = p * 0.06;
  var bell = Math.max(0, p * 0.01 - (isResi ? 30000 : 0));
  return Math.round(droits + bell);
};
"""

marker = "var CUR_TYPE_FILT='all';"
if marker not in c:
    print('ERREUR : marker CUR_TYPE_FILT introuvable')
    sys.exit(1)
c = c.replace(marker, marker + bcl_block, 1)
print('1a OK')

old_runSim = """window.runSim=function(){
  var m=+v('sm')||0,t=+v('st')||0,d=+v('sd')||0;
  var r=document.getElementById('sim-res');
  if(!r)return;
  if(!m||!t||!d){r.style.display='none';return}
  var mr=t/100/12,n=d*12,mens=m*mr/(1-Math.pow(1+mr,-n));
  var tot=mens*n,intr=tot-m;
  r.style.display='block';
  r.innerHTML='<div class="sr-v">'+fmt(Math.round(mens))+' \u20ac / mois</div><div class="sr-l">Co\u00fbt total : <strong>'+fmt(Math.round(tot))+' \u20ac</strong> \u00b7 Int\u00e9r\u00eats : <strong>'+fmt(Math.round(intr))+' \u20ac</strong></div>';
};"""

new_runSim = """window.runSim=function(){
  var m=+v('sm')||0,t=+v('st')||0,d=+v('sd')||0;
  var r=document.getElementById('sim-res');
  if(!r)return;
  if(!m||!t||!d){r.style.display='none';return}
  var mens = window.calcMensualite(m,t,d);
  var tot = mens*d*12, intr = tot-m;
  r.style.display='block';
  r.innerHTML='<div class="sr-v">'+fmt(Math.round(mens))+' \u20ac / mois</div><div class="sr-l">Co\u00fbt total : <strong>'+fmt(Math.round(tot))+' \u20ac</strong> \u00b7 Int\u00e9r\u00eats : <strong>'+fmt(Math.round(intr))+' \u20ac</strong></div><div style="margin-top:8px;font-size:11px;color:#888;font-style:italic">'+window.getBCLSourceLabel()+'</div>';
};
window.updateSimTaux = function(){
  var sel = document.getElementById('sm-tx');
  if(!sel) return;
  var val = sel.value;
  var rate = (val === 'variable') ? window.BCL_RATES.rates.variable : window.getBCLRate(parseInt(val,10));
  var inp = document.getElementById('st');
  if(inp){ inp.value = rate.toFixed(2); window.runSim(); }
};"""

if old_runSim not in c:
    print('ERREUR : runSim introuvable'); sys.exit(1)
c = c.replace(old_runSim, new_runSim, 1)
print('1b OK')

old_runRdt = """window.runRdt=function(){
  var p=+v('rp')||0,l=+v('rl')||0,c=+v('rc')||0;
  var r=document.getElementById('rdt-res');
  if(!r)return;
  if(!p||!l){r.style.display='none';return}
  var brut=(l*12/p)*100,net=((l*12-c)/p)*100;
  r.style.display='block';
  var alert5=brut>5?'<br><span style="color:var(--or)">\u26a0 Rendement &gt; 5 % au Luxembourg \u2014 v\u00e9rifiez le plafond l\u00e9gal.</span>':'';
  r.innerHTML='<div class="sr-v">'+brut.toFixed(2)+' % brut \u00b7 '+net.toFixed(2)+' % net</div><div class="sr-l">Loyer annuel : <strong>'+fmt(l*12)+' \u20ac</strong>'+alert5+'</div>';
};"""

new_runRdt = """window.runRdt=function(){
  var p=+v('rp')||0,l=+v('rl')||0,c=+v('rc')||0;
  var r=document.getElementById('rdt-res');
  if(!r)return;
  if(!p||!l){r.style.display='none';return}
  var loyerAn = l*12;
  var brut = (loyerAn/p)*100;
  var net = ((loyerAn-c)/p)*100;
  var revenuImpos = Math.max(0, (loyerAn-c) * 0.65);
  var netApresImpot = (revenuImpos / p) * 100;
  r.style.display='block';
  var alert5=brut>5?'<br><span style="color:var(--or)">\u26a0 Rendement &gt; 5 % - v\u00e9rifiez le plafond l\u00e9gal LU (loi 2006).</span>':'';
  r.innerHTML='<div class="sr-v">'+brut.toFixed(2)+' % brut \u00b7 '+net.toFixed(2)+' % net</div><div class="sr-l">Loyer annuel : <strong>'+fmt(loyerAn)+' \u20ac</strong> \u00b7 Net apr\u00e8s imp\u00f4t indicatif (abattement 35%) : <strong>'+netApresImpot.toFixed(2)+' %</strong>'+alert5+'</div>';
};"""

if old_runRdt not in c:
    print('ERREUR : runRdt introuvable'); sys.exit(1)
c = c.replace(old_runRdt, new_runRdt, 1)
print('1c OK')

old_runCap = """window.runCap=function(){
  var rv=+v('cr')||0,ch=+v('cc')||0,ap=+v('ca')||0,pr=+v('cb')||0;
  var r=document.getElementById('cap-res');
  if(!r)return;
  if(!rv){r.style.display='none';return}
  var dispo=(rv-ch)*0.35,dur=25,taux=3.5;
  var mr=taux/100/12,n=dur*12;
  var cap=dispo*(1-Math.pow(1+mr,-n))/mr+ap;
  var ok=pr&&pr<=cap;
  r.style.display='block';
  r.innerHTML='<div class="sr-v">'+fmt(Math.round(cap))+' \u20ac</div><div class="sr-l">Capacit\u00e9 max indicative (35 % effort, 25 ans @ 3.5 %). Mensualit\u00e9 disponible : <strong>'+fmt(Math.round(dispo))+' \u20ac</strong>'+(pr?'<br>Projet '+fmt(pr)+' \u20ac : <strong style="color:'+(ok?'#2d7a4f':'#b04040')+'">'+(ok?'Fin\u00e7able \u2713':'Au-dessus de la capacit\u00e9')+'</strong>':'')+'</div>';
};"""

new_runCap = """window.runCap=function(){
  var rv=+v('cr')||0,ch=+v('cc')||0,ap=+v('ca')||0,pr=+v('cb')||0;
  var r=document.getElementById('cap-res');
  if(!r)return;
  if(!rv){r.style.display='none';return}
  var durSel = document.getElementById('cd');
  var dur = durSel ? (parseInt(durSel.value,10)||25) : 25;
  var taux = window.getBCLRate(dur);
  var dispo = (rv-ch)*0.35;
  var mr = taux/100/12, n = dur*12;
  var cap = dispo*(1-Math.pow(1+mr,-n))/mr + ap;
  var ok = pr && pr<=cap;
  r.style.display='block';
  r.innerHTML='<div class="sr-v">'+fmt(Math.round(cap))+' \u20ac</div><div class="sr-l">Capacit\u00e9 max indicative (35 % effort, '+dur+' ans @ '+taux.toFixed(2)+' %). Mensualit\u00e9 disponible : <strong>'+fmt(Math.round(dispo))+' \u20ac</strong>'+(pr?'<br>Projet '+fmt(pr)+' \u20ac : <strong style="color:'+(ok?'#2d7a4f':'#b04040')+'">'+(ok?'Fin\u00e7able \u2713':'Au-dessus de la capacit\u00e9')+'</strong>':'')+'</div><div style="margin-top:8px;font-size:11px;color:#888;font-style:italic">'+window.getBCLSourceLabel()+'</div>';
};
window.updateCapDuree = function(){ window.runCap(); };"""

if old_runCap not in c:
    print('ERREUR : runCap introuvable'); sys.exit(1)
c = c.replace(old_runCap, new_runCap, 1)
print('1d OK')

sim_fiche = """
window.renderBienSimulator = function(b){
  if(!b || (b.transaction && b.transaction !== 'sale' && b.transaction !== 'vente')) return '';
  var price = parseFloat(b.price)||0;
  if(!price) return '';
  var defaultApport = Math.round(price * 0.20);
  var defaultDuree = 25;
  var defaultTaux = window.getBCLRate(defaultDuree);
  var T = (window.I18N && window.I18N[window.CURLANG]) || {};
  var L = {
    title: T['bd.simfin.t'] || 'Simulateur de financement',
    sub: T['bd.simfin.sub'] || 'Calculez votre mensualit\u00e9 indicative pour ce bien.',
    apport: T['bd.simfin.apport'] || 'Apport personnel (\u20ac)',
    duree: T['bd.simfin.duree'] || 'Dur\u00e9e du pr\u00eat (ann\u00e9es)',
    taux: T['bd.simfin.taux'] || 'Taux annuel (%)',
    disclaim: T['bd.simfin.disclaim'] || 'Estimation indicative non contractuelle. Pour un avis personnalis\u00e9, contactez votre courtier ou votre banque.'
  };
  return '<div class="bd-sect" style="margin-top:24px;background:#fafaf8;padding:24px;border-radius:6px">'+
    '<div class="bd-s-t">'+L.title+'</div>'+
    '<p style="font-family:Raleway,sans-serif;font-size:13px;color:#666;margin:8px 0 18px">'+L.sub+'</p>'+
    '<div class="g2">'+
      '<div class="fg"><label class="fl">'+L.apport+'</label><input class="fi" id="bsim-apport" type="number" value="'+defaultApport+'" oninput="window.runBienSim()"></div>'+
      '<div class="fg"><label class="fl">'+L.duree+'</label><select class="fi" id="bsim-duree" onchange="window.bsimUpdateTaux();window.runBienSim()" style="background:#fff">'+
        '<option value="15">15 ans</option><option value="20">20 ans</option><option value="25" selected>25 ans</option><option value="30">30 ans</option>'+
      '</select></div>'+
    '</div>'+
    '<div class="fg" style="margin-top:14px"><label class="fl">'+L.taux+'</label><input class="fi" id="bsim-taux" type="number" step="0.01" value="'+defaultTaux.toFixed(2)+'" oninput="window.runBienSim()"></div>'+
    '<div style="margin-top:6px;font-size:11px;color:#888;font-style:italic">'+window.getBCLSourceLabel()+'</div>'+
    '<div id="bsim-res" style="margin-top:18px;padding:18px;background:#fff;border-left:3px solid #b89448;border-radius:3px;font-family:Raleway,sans-serif;font-size:14px;line-height:1.7"></div>'+
    '<div style="margin-top:14px;padding:12px 16px;background:#fff8e6;border-left:3px solid #c79b3d;font-family:Raleway,sans-serif;font-size:11.5px;color:#666;line-height:1.5">'+L.disclaim+' <a href="'+window.BCL_RATES.source_url+'" target="_blank" rel="noopener" style="color:#b89448">Source : '+window.BCL_RATES.source+'</a>.</div>'+
  '</div>';
};
window.bsimUpdateTaux = function(){
  var sel = document.getElementById('bsim-duree');
  var inp = document.getElementById('bsim-taux');
  if(!sel || !inp) return;
  inp.value = window.getBCLRate(parseInt(sel.value, 10)).toFixed(2);
};
window.runBienSim = function(){
  var r = document.getElementById('bsim-res');
  if(!r) return;
  var b = window.CURRENT_BIEN_FOR_SIMILAR;
  var price = b ? parseFloat(b.price)||0 : 0;
  var apport = +document.getElementById('bsim-apport').value || 0;
  var duree = +document.getElementById('bsim-duree').value || 25;
  var taux = +document.getElementById('bsim-taux').value || 3.85;
  var montEmp = Math.max(0, price - apport);
  var mens = window.calcMensualite(montEmp, taux, duree);
  var coutCredit = (mens * duree * 12) - montEmp;
  var fraisNot = window.calcFraisNotaireLU(price, true);
  var coutTot = price + fraisNot + coutCredit;
  r.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:8px"><span>Montant emprunt\u00e9</span><strong>'+fmt(Math.round(montEmp))+' \u20ac</strong></div>'+
    '<div style="display:flex;justify-content:space-between;align-items:baseline;font-size:18px;color:#1a2b44;border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:8px"><span><strong>Mensualit\u00e9 estim\u00e9e</strong></span><strong style="font-size:22px;color:#b89448">'+fmt(Math.round(mens))+' \u20ac / mois</strong></div>'+
    '<div style="display:flex;justify-content:space-between"><span>Co\u00fbt total du cr\u00e9dit</span><span>'+fmt(Math.round(coutCredit))+' \u20ac</span></div>'+
    '<div style="display:flex;justify-content:space-between"><span>Frais de notaire (~7%)</span><span>'+fmt(fraisNot)+' \u20ac</span></div>'+
    '<div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid #eee"><span><strong>Co\u00fbt total op\u00e9ration</strong></span><strong>'+fmt(Math.round(coutTot))+' \u20ac</strong></div>';
};
"""

anchor = "/* \u2500\u2500\u2500 SIMULATEUR PR\u00caT \u2500\u2500\u2500 */"
if anchor not in c:
    print('ERREUR : anchor SIMULATEUR PRET introuvable'); sys.exit(1)
c = c.replace(anchor, sim_fiche + "\n" + anchor, 1)
print('1e OK')

old_desc = "(descHtml?'<div class=\"bd-sect\"><div class=\"bd-s-t\">'+(I18N[CURLANG]['bd.desc']||'Description')+'</div><div class=\"bd-desc\">'+descHtml+'</div></div>':'')+"
new_desc = old_desc + "(typeof window.renderBienSimulator==='function'?window.renderBienSimulator(b):'')+"

if old_desc not in c:
    print('ERREUR : pattern description introuvable'); sys.exit(1)
c = c.replace(old_desc, new_desc, 1)
print('1f OK')

with open('js/app.js', 'w') as f:
    f.write(c)
print('=== APP.JS PATCHE ===')

with open('index.html') as f:
    h = f.read()

old_pret = '<div class="g2"><div class="fg"><label class="fl" data-i18n="mod.sim.pret.taux">Taux annuel (%)</label><input class="fi" id="st" type="number" step="0.01" placeholder="3.50" oninput="runSim()"></div><div class="fg"><label class="fl" data-i18n="mod.sim.pret.duree">Dur\u00e9e (ann\u00e9es)</label><input class="fi" id="sd" type="number" placeholder="25" oninput="runSim()"></div></div>'
new_pret = '<div class="fg"><label class="fl">Type de taux (BCL)</label><select class="fi" id="sm-tx" onchange="updateSimTaux()" style="background:#fff"><option value="variable">Variable</option><option value="5">Fixe 5 ans</option><option value="10">Fixe 10 ans</option><option value="15">Fixe 15 ans</option><option value="20">Fixe 20 ans</option><option value="25" selected>Fixe 25 ans</option><option value="30">Fixe 30 ans</option></select></div><div class="g2"><div class="fg"><label class="fl" data-i18n="mod.sim.pret.taux">Taux annuel (%)</label><input class="fi" id="st" type="number" step="0.01" placeholder="3.85" oninput="runSim()"></div><div class="fg"><label class="fl" data-i18n="mod.sim.pret.duree">Dur\u00e9e (ann\u00e9es)</label><input class="fi" id="sd" type="number" placeholder="25" oninput="runSim()"></div></div>'

if old_pret not in h:
    print('ERREUR : pattern PRET introuvable'); sys.exit(1)
h = h.replace(old_pret, new_pret, 1)
print('2a OK')

old_cap = '<div class="g2"><div class="fg"><label class="fl" data-i18n="mod.sim.cap.charges">Charges mensuelles (\u20ac)</label><input class="fi" id="cc" type="number" placeholder="1 500" oninput="runCap()"></div><div class="fg"><label class="fl" data-i18n="mod.sim.cap.apport">Apport personnel (\u20ac)</label><input class="fi" id="ca" type="number" placeholder="100 000" oninput="runCap()"></div></div>'
new_cap = '<div class="g2"><div class="fg"><label class="fl" data-i18n="mod.sim.cap.charges">Charges mensuelles (\u20ac)</label><input class="fi" id="cc" type="number" placeholder="1 500" oninput="runCap()"></div><div class="fg"><label class="fl" data-i18n="mod.sim.cap.apport">Apport personnel (\u20ac)</label><input class="fi" id="ca" type="number" placeholder="100 000" oninput="runCap()"></div></div><div class="fg" style="margin-top:14px"><label class="fl">Dur\u00e9e du pr\u00eat (BCL)</label><select class="fi" id="cd" onchange="updateCapDuree()" style="background:#fff"><option value="15">15 ans</option><option value="20">20 ans</option><option value="25" selected>25 ans</option><option value="30">30 ans</option></select></div>'

if old_cap not in h:
    print('ERREUR : pattern CAPACITE introuvable'); sys.exit(1)
h = h.replace(old_cap, new_cap, 1)
print('2b OK')

with open('index.html', 'w') as f:
    f.write(h)
print('=== INDEX.HTML PATCHE ===')
print('TOUS PATCHES APPLIQUES')