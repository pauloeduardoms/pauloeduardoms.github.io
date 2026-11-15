/* Templates compartilhados. Os dados vêm de conteudo.js, inclusive por file://. */
(() => {
  'use strict';
  const data = window.SITE_DATA;
  if (!data) return;
  const base = document.body.dataset.base || '';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const projectURL = project => project.page ? base + project.page : base + 'links/';
  const resumeType = project => project['type-resume'] || 'Resumo';
  const resumeText = project => project.synopsis || project.summary || 'A apresentação deste projeto está em preparação.';
  const tags = project => {
    const items = project.tags || [];
    const rows = [];
    for (let i = 0; i < items.length; i += 2) {
      rows.push(`<div class="tag-row">${items.slice(i, i + 2).map(t => `<span class="tag" style="--tag:${escape(t.color || project.accent || '#b84747')}">${escape(String(t.label).startsWith('#') ? t.label : '#' + t.label)}</span>`).join('')}</div>`);
    }
    return `<div class="tags work-tags">${rows.join('')}</div>`;
  };
  const placeholder = project => `<div class="placeholder-cover" role="img" aria-label="Capa de ${escape(project.title)} a adicionar"><small>${escape(project.format)}</small><div class="placeholder-title">${escape(project.title)}</div><small>Capa a adicionar</small></div>`;
  const cover = (project, thumb = false) => project.cover
    ? `<img src="${escape(base + (thumb ? project.thumbnail || project.cover : project.cover))}" alt="Capa de ${escape(project.title)}" ${thumb ? 'loading="lazy"' : ''}>`
    : placeholder(project);
  const externalLinks = project => {
    const reading = (project.links || []).map(link => `<a class="button reading-link" href="${escape(link.url)}" target="_blank" rel="noopener noreferrer">${link.icon ? `<img src="${escape(base + link.icon)}" alt="" width="20" height="20">` : ''}<span>${escape(link.label)}</span><span aria-hidden="true">↗</span></a>`).join('');
    return reading ? `<div class="reading-actions">${reading}</div>` : '';
  };
  const projectActions = (project, detailsURL) => {
    const access = externalLinks(project);
    const spotify = project.playlist ? `<a class="spotify-action" href="${escape(project.playlist)}" target="_blank" rel="noopener noreferrer" aria-label="Ouvir playlist de ${escape(project.title)} no Spotify" title="Ouvir no Spotify"><img src="${escape(base)}assets/img/spotify.webp" alt="" width="16" height="16"></a>` : '';
    const details = project.page && detailsURL ? `<a class="button project-explore" href="${escape(detailsURL)}"><span>Conheça o projeto</span><span aria-hidden="true">→</span></a>` : '';
    const extras = spotify + details;
    if (!access && !extras) return '';
    return `<footer class="project-modal-actions ${access && extras ? 'has-both' : ''}">${access ? `<div class="project-modal-access" role="group" aria-label="Links de acesso">${access}</div>` : ''}${extras ? `<div class="project-modal-extras" role="group" aria-label="Extras do projeto">${extras}</div>` : ''}</footer>`;
  };
  const card = project => `<article class="project-card" style="--accent:${escape(project.accent || '#b84747')};--soft:${escape(project.soft || '#f2e3dd')}"><div class="card-cover">${cover(project, true)}</div><div class="card-info"><h3><a class="card-title-link" data-project="${escape(project.id)}" href="${escape(projectURL(project))}">${escape(project.title)}</a></h3><p>${escape(project.format)}</p>${tags(project)}</div></article>`;
  const figure = (item, caption = false) => `<figure class="gallery-item"><a data-gallery="${escape(item.id)}" href="${escape(base + item.image)}" aria-label="Abrir ${escape(item.type || item.subtitle || 'imagem')}: ${escape(item.title)}"><img src="${escape(base + (item.thumbnail || item.image))}" alt="${escape(item.alt || item.title)}" ${item.thumbnailWidth && item.thumbnailHeight ? `width="${item.thumbnailWidth}" height="${item.thumbnailHeight}"` : ''} loading="lazy" decoding="async">${caption ? `<figcaption>${escape(item.title)}<small>${escape(item.type || item.subtitle)}</small></figcaption>` : ''}</a></figure>`;
  window.SiteRender = {projectURL, resumeType, resumeText, tags, externalLinks, projectActions, placeholder, card, figure};

  const featured = document.querySelector('[data-featured-projects]');
  if (featured) featured.innerHTML = data.projects.filter(p => p.featured !== false).map(card).join('');
  const others = document.querySelector('[data-other-projects]');
  if (others) {
    const projects = data.projects.filter(p => p.featured === false);
    others.innerHTML = projects.map(card).join('');
    others.closest('details').hidden = !projects.length;
  }
  const gallery = document.querySelector('[data-gallery-grid]');
  if (gallery) gallery.innerHTML = (data.gallery || []).map(item => figure(item)).join('');

  const contactCard = document.querySelector('[data-contact-card]');
  if (contactCard) {
    const contact = data.contact || {};
    const email = contact.email ? `<a class="contact-link" href="${escape('mailto:' + contact.email)}"><span class="contact-link-text"><strong>${escape(contact.buttonLabel || 'Vamos conversar por e-mail')}</strong><small>${escape(contact.email)}</small></span><span aria-hidden="true">↗</span></a>` : '';
    const profile = data.profile;
    const about = `<article class="contact-card about-card"><h2>Eu<span class="name-accent">.</span></h2><div class="about-description">${profile.description ? `<p class="contact-description">${escape(profile.description)}</p>` : ''}${profile.socialDescription ? `<p class="contact-description">${escape(profile.socialDescription)}</p>` : ''}</div>${profile.tags?.length ? tags(profile) : ''}</article>`;
    contactCard.innerHTML = `<div class="about-contact-cards">${about}<article class="contact-card"><div class="contact-invitation"><h2>${escape(contact.title || 'Tem um projeto em mente?')}</h2>${email}</div></article></div>`;
  }
})();
