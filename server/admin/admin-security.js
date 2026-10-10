/* Biff City · back office : page SÉCURITÉ.
   - Le compte admin (création la première fois, avec le jeton de secours ; changer de mot de passe).
   - L'envoi des codes de connexion par e-mail (réglages SMTP ; le mot de passe d'application n'est jamais renvoyé ici, seulement « configuré »).
   - Les sessions ouvertes (fermer une session, ou toutes les autres) et le journal des connexions. */
(function () {
  'use strict';
  const HC = window.HC, { $, $$, esc, img, dt, ago } = HC;
  const val = id => ($('#' + id) || {}).value || '';

  // compte admin : à créer avec le jeton de secours (la première fois, ou pour repartir d'un mot de passe oublié)
  HC.accountForm = (first) => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<form class="modal sec-acc"><h3>${first ? 'Créer ton compte admin' : 'Recréer le compte admin'}</h3>
      <p>${first ? 'Pour ne plus entrer avec le jeton : ton e-mail et un mot de passe à toi (12 caractères au moins).' : 'L\'ancien compte et toutes ses sessions seront supprimés.'} Ensuite, la connexion se fera par e-mail + mot de passe (+ un code envoyé par e-mail une fois l'envoi réglé).</p>
      <div class="fld"><label>E-mail</label><input id="ac-email" type="email" autocomplete="username" value="contact@biffcity.fr"></div>
      <div class="fld"><label>Mot de passe</label><input id="ac-pw" type="password" autocomplete="new-password" minlength="12"></div>
      <div class="fld"><label>Le même, encore une fois</label><input id="ac-pw2" type="password" autocomplete="new-password" minlength="12"></div>
      <p class="err" id="ac-err"></p>
      <div class="mb"><button type="button" class="btn ghost" data-r="0">Plus tard</button><button class="btn green" type="submit">Créer le compte</button></div></form>`;
    document.body.appendChild(bg);
    bg.querySelector('[data-r]').onclick = () => bg.remove();
    bg.querySelector('form').onsubmit = async e => {
      e.preventDefault(); const er = $('#ac-err', bg); er.textContent = '';
      if (val('ac-pw').length < 12) return er.textContent = 'Le mot de passe doit faire au moins 12 caractères.';
      if (val('ac-pw') !== val('ac-pw2')) return er.textContent = 'Les deux mots de passe ne sont pas les mêmes.';
      try { await HC.api('/admin/api/account', { email: val('ac-email'), password: val('ac-pw'), password2: val('ac-pw2') }); }
      catch (x) { return er.textContent = x.message; }
      bg.remove(); HC.logout('Compte créé : connecte-toi avec ton e-mail et ton mot de passe.');   // le jeton n'est plus gardé dans ce navigateur
    };
    setTimeout(() => $('#ac-pw', bg).focus(), 50);
  };

  const browser = ua => { ua = ua || ''; const b = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navigateur';
    const o = /iPhone|iPad/.test(ua) ? 'iPhone / iPad' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : ''; return o ? `${b} · ${o}` : b; };

  HC.PAGES.security = async () => {
    const S = await HC.api('/admin/api/security'), M = S.smtp;
    HC.main(`<div class="page-head"><div><h1>Sécurité</h1><div class="sub">Ton compte, le code envoyé par e-mail, les sessions ouvertes</div></div></div>
      <div class="sec-grid">
        <section class="card"><div class="card-h">${img('icon-lock')}Compte admin</div>
          ${S.email ? `<p>Connexion avec <b>${esc(S.email)}</b> + mot de passe${M.ready ? ' + code par e-mail' : ' (le code par e-mail n\'est pas encore réglé)'}.</p>` : '<p>Aucun compte pour l\'instant : on entre avec le jeton.</p>'}
          ${S.via === 'session' ? `<form id="pw-form" class="sec-form"><div class="fld"><label>Mot de passe actuel</label><input id="pw-old" type="password" autocomplete="current-password"></div>
            <div class="fld"><label>Nouveau mot de passe <small>12 caractères au moins</small></label><input id="pw-new" type="password" autocomplete="new-password"></div>
            <div class="fld"><label>Le même, encore une fois</label><input id="pw-new2" type="password" autocomplete="new-password"></div>
            <button class="btn green" type="submit">Changer le mot de passe</button><p class="help">Les autres sessions sont fermées.</p></form>`
          : `<button class="btn green" id="acc-new">${S.email ? 'Recréer le compte (mot de passe oublié)' : 'Créer ton compte admin'}</button><p class="help">Tu es entrée avec le jeton de secours : il sert aussi à recréer le compte si tu oublies ton mot de passe.</p>`}
        </section>
        <section class="card"><div class="card-h">${img('app-msg')}Code de connexion par e-mail<small>${M.ready ? '<span class="tag ok">réglé</span>' : '<span class="tag warn">pas réglé</span>'}</small></div>
          <form id="smtp-form" class="sec-form">
            <div class="row2"><div class="fld"><label>Serveur SMTP</label><input id="sm-host" value="${esc(M.host || 'smtp.gmail.com')}"></div><div class="fld"><label>Port</label><input id="sm-port" type="number" value="${esc(M.port || 465)}"></div></div>
            <div class="fld"><label>Identifiant</label><input id="sm-user" autocomplete="off" value="${esc(M.user || 'contact.lucidstudio@gmail.com')}"></div>
            <div class="fld"><label>Mot de passe d'application ${M.passSet ? '<span class="tag ok">configuré</span>' : ''}</label><input id="sm-pass" type="password" autocomplete="new-password" placeholder="${M.passSet ? 'laisser vide pour garder l\'actuel' : '16 lettres données par Google'}"></div>
            <div class="fld"><label>Expéditeur</label><input id="sm-from" value="${esc(M.from || 'Biff City <contact@biffcity.fr>')}"></div>
            <div class="sec-btns"><button class="btn green" type="submit">Enregistrer</button><button class="btn ghost" type="button" id="sm-test" ${M.ready ? '' : 'disabled'}>Envoyer un e-mail de test</button></div>
            <p class="help">Tant que ce n'est pas réglé, la connexion se fait avec le seul mot de passe (jamais bloquée). Le code part à l'adresse du compte admin.</p></form>
        </section>
      </div>
      <section class="card"><div class="card-h">${img('nav-city')}Sessions ouvertes<small>12 h chacune</small></div>
        ${S.sessions.length ? `<div style="overflow-x:auto"><table class="ptable" style="display:table"><tr><th>Appareil</th><th>Connexion</th><th>Dernière activité</th><th>Fin</th><th></th></tr>
          ${S.sessions.map(s => `<tr><td>${esc(browser(s.ua))}${s.current ? ' <span class="tag ok">celle-ci</span>' : ''}<br><small class="muted">${esc(s.ip || '')}</small></td><td>${esc(dt(s.created))}</td><td>${esc(ago(s.last))}</td><td>${esc(dt(s.expires))}</td>
          <td class="r"><button class="btn sm ${s.current ? 'ghost' : 'red'}" data-rv="${s.id}">${s.current ? 'Se déconnecter' : 'Fermer'}</button></td></tr>`).join('')}</table></div>
          ${S.sessions.some(s => !s.current) ? '<button class="btn ghost" id="rv-all" style="margin-top:12px">Fermer toutes les autres sessions</button>' : ''}` : HC.empty('Aucune session ouverte avec le compte.', null)}
      </section>
      <section class="card"><div class="card-h">${img('hdr-missions')}Connexions<small>les 100 dernières (jamais le mot de passe ni le code)</small></div>
        ${S.log.length ? `<div style="overflow-x:auto"><table class="ptable" style="display:table"><tr><th>Quand</th><th></th><th>Quoi</th><th>Compte</th><th>Connexion depuis</th></tr>
          ${S.log.map(l => `<tr><td>${esc(dt(l.t))}</td><td>${l.ok ? '<span class="tag ok">ok</span>' : '<span class="tag ko">refusé</span>'}</td><td>${esc(l.what)}</td><td>${esc(l.email || '–')}</td><td><small>${esc(l.ip || '')} · ${esc(browser(l.ua))}</small></td></tr>`).join('')}</table></div>` : HC.empty('Rien pour l\'instant.', null)}
      </section>`);

    const acc = $('#acc-new'); if (acc) acc.onclick = () => HC.accountForm(!S.email);
    const pf = $('#pw-form'); if (pf) pf.onsubmit = async e => {
      e.preventDefault(); if (val('pw-new') !== val('pw-new2')) return HC.toast('Les deux mots de passe ne sont pas les mêmes.', null, true);
      try { await HC.api('/admin/api/password', { old: val('pw-old'), password: val('pw-new'), password2: val('pw-new2') }); HC.toast('Mot de passe changé', 'icon-check'); HC.route(); } catch (x) {}
    };
    $('#smtp-form').onsubmit = async e => {
      e.preventDefault();
      try { await HC.api('/admin/api/smtp', { host: val('sm-host'), port: +val('sm-port'), user: val('sm-user'), pass: val('sm-pass'), from: val('sm-from') }); HC.toast('Réglages enregistrés', 'icon-check'); HC.start(); } catch (x) {}
    };
    $('#sm-test').onclick = async () => { try { const r = await HC.api('/admin/api/smtp-test', {}); HC.toast('E-mail de test envoyé à ' + r.to, 'icon-check'); } catch (x) {} };
    $$('[data-rv]').forEach(b => b.onclick = async () => {
      const cur = S.sessions.find(s => s.id === +b.dataset.rv && s.current); if (cur) return HC.logout();
      await HC.api('/admin/api/session-revoke', { id: +b.dataset.rv }); HC.toast('Session fermée', 'icon-check'); HC.route(); });
    const all = $('#rv-all'); if (all) all.onclick = async () => { await HC.api('/admin/api/session-revoke', { others: true }); HC.toast('Les autres sessions sont fermées', 'icon-check'); HC.route(); };
  };
})();
