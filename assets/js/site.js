/* Renderização e interações do site. Sem dependências ou etapa de build. */
(() => {
  'use strict';
  const data = window.SITE_DATA;
  if (!data || !window.SiteRender) return;
  const base = document.body.dataset.base || '';
  const dialog = document.querySelector('#preview');
  const content = document.querySelector('#preview-content');
  const dialogClose = dialog?.querySelector('.dialog-close');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const {projectURL, resumeType, resumeText, tags, projectActions, placeholder} = window.SiteRender;
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const slugify = value => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const tagLabel = tag => '#' + String(tag).replace(/^#+/, '');
  const availableTags = [...new Set((data.gallery || []).flatMap(item => item.tags || []))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const tagSlugs = new Map();
  const slugTags = new Map();
  availableTags.forEach(tag => {
    const baseSlug = slugify(data.galleryTagSlugs?.[tag] || tag) || 'tag';
    let slug = baseSlug;
    let suffix = 2;
    while (slugTags.has(slug)) slug = `${baseSlug}-${suffix++}`;
    tagSlugs.set(tag, slug);
    slugTags.set(slug, tag);
  });
  const alias = data.profile.alias || 'Peduardo.';
  function paintName(element, text) {
    element.textContent = text;
    if (text === alias && text.endsWith('.')) {
      element.textContent = text.slice(0, -1);
      const dot = document.createElement('span');
      dot.className = 'name-accent';
      dot.textContent = '.';
      element.append(dot);
    }
  }
  const footer = document.querySelector('[data-profile-footer]');
  if (footer) footer.textContent = data.profile.name;
  const linksPage = document.querySelector('.links-main');
  if (linksPage) {
    const profile = data.profile;
    const heading = linksPage.querySelector('#nome');
    const wordmark = document.querySelector('.wordmark');
    const nameButton = document.createElement('button');
    nameButton.type = 'button';
    nameButton.className = 'profile-name-toggle';
    nameButton.title = 'Trocar o nome com o cabeçalho';
    heading.replaceChildren(nameButton);
    let swapped = Math.random() < 0.5;
    let changing = false;
    function updateNames() {
      paintName(nameButton, swapped ? alias : profile.name);
      if (wordmark) paintName(wordmark, swapped ? profile.name : alias);
      nameButton.setAttribute('aria-pressed', String(swapped));
      nameButton.setAttribute('aria-label', (swapped ? alias : profile.name) + ' — trocar nome com o cabeçalho');
    }
    updateNames();
    nameButton.addEventListener('click', () => {
      if (changing) return;
      changing = true;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const names = [nameButton, wordmark].filter(Boolean);
      names.forEach(element => element.classList.add('name-changing'));
      window.setTimeout(() => {
        swapped = !swapped;
        updateNames();
        names.forEach(element => element.classList.remove('name-changing'));
        changing = false;
      }, reduced ? 0 : 180);
    });
    const picture = linksPage.querySelector('.profile-picture');
    picture.src = base + profile.photo;
    picture.alt = `Retrato de ${profile.name}`;
    linksPage.querySelector('picture source').srcset = base + profile.stillPhoto;
    linksPage.querySelector('#profile-status').textContent = profile.statuses.length ? profile.statuses[0] + '.' : '';
    const tablist = linksPage.querySelector('[data-links-tabs]');
    if (tablist) {
      const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
      const panels = Array.from(linksPage.querySelectorAll('[role="tabpanel"]'));
      const activateTab = (tab, focus = false) => {
        tabs.forEach(button => {
          const selected = button === tab;
          button.setAttribute('aria-selected', String(selected));
          button.tabIndex = selected ? 0 : -1;
        });
        panels.forEach(panel => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
        if (focus) tab.focus();
      };
      tablist.hidden = false;
      tablist.addEventListener('click', event => {
        const tab = event.target.closest('[role="tab"]');
        if (tabs.includes(tab)) activateTab(tab);
      });
      tablist.addEventListener('keydown', event => {
        const index = tabs.indexOf(event.target);
        if (index < 0) return;
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        activateTab(tabs[next], true);
      });
      activateTab(tabs[0]);
    }
  }
  // Nas páginas sem perfil, o cabeçalho também recebe um dos nomes ao entrar.
  if (!linksPage) {
    const wordmark = document.querySelector('.wordmark');
    if (wordmark) paintName(wordmark, Math.random() < 0.5 ? data.profile.name : alias);
  }
  const track = (event, params) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event,
      page_path: location.pathname,
      project_key: '',
      image_key: '',
      platform: '',
      contact_method: '',
      link_url: '',
      ...params
    });
  };
  // Delegação cobre também os links criados ao abrir as prévias.
  const absoluteURL = url => new URL(url, document.baseURI).href;
  function trackLink(event) {
    if (event.type === 'auxclick' && event.button !== 1) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href, document.baseURI);
    if (url.protocol === 'mailto:') {
      track('contact_click', {contact_method: 'email'});
      return;
    }
    if (!['http:', 'https:'].includes(url.protocol)) return;
    // Não envia parâmetros de compartilhamento ou fragmentos do destino.
    const link_url = url.origin + url.pathname;
    for (const project of data.projects) {
      const bookLink = (project.links || []).find(item => absoluteURL(item.url) === url.href);
      if (bookLink) {
        track('book_link', {project_key: project.id, platform: bookLink.label, link_url});
        return;
      }
      if (project.playlist && absoluteURL(project.playlist) === url.href) {
        track('playlist_click', {project_key: project.id, platform: 'Spotify', link_url});
        return;
      }
    }
    const host = url.hostname.replace(/^www\./, '');
    const platform = {'instagram.com': 'Instagram', 'tiktok.com': 'TikTok'}[host];
    if (platform) track('social_click', {platform, link_url});
  }
  document.addEventListener('click', trackLink);
  document.addEventListener('auxclick', trackLink);
  let opener = null;
  let detailScrollTop = 0;
  let imageRequest = 0;
  async function loadExpandedImage(button, request) {
    const img = button.querySelector('img');
    const status = button.querySelector('.image-load-status');
    if (!img?.dataset.full || img.getAttribute('src') === img.dataset.full) return;
    button.setAttribute('aria-busy', 'true');
    status.textContent = 'Carregando imagem…';
    try {
      const full = new Image();
      full.src = img.dataset.full;
      await full.decode();
      if (request !== imageRequest || !button.isConnected) return;
      img.src = full.src;
      status.textContent = '';
    } catch {
      if (request !== imageRequest || !button.isConnected) return;
      status.textContent = 'Não foi possível carregar. Reduza e amplie para tentar novamente.';
    } finally {
      if (request === imageRequest && button.isConnected) button.removeAttribute('aria-busy');
    }
  }
  function setImageZoom(zoomed, focus = false) {
    const request = ++imageRequest;
    const wasZoomed = dialog.classList.contains('image-zoomed');
    if (zoomed && !wasZoomed) detailScrollTop = dialog.scrollTop;
    dialog.classList.toggle('image-zoomed', zoomed);
    const image = content.querySelector('[data-image-zoom]');
    if (image) {
      image.setAttribute('aria-pressed', String(zoomed));
      image.setAttribute('aria-label', zoomed ? 'Reduzir imagem e mostrar detalhes' : 'Ampliar imagem');
      image.title = zoomed ? 'Voltar aos detalhes' : 'Expandir imagem';
      if (zoomed) loadExpandedImage(image, request);
      else {
        const img = image.querySelector('img');
        if (img?.dataset.preview) img.src = img.dataset.preview;
        image.removeAttribute('aria-busy');
        const status = image.querySelector('.image-load-status');
        if (status) status.textContent = '';
      }
      if (!zoomed && focus) image.focus({preventScroll: true});
    }
    if (dialogClose) {
      dialogClose.textContent = '✕';
      dialogClose.setAttribute('aria-label', zoomed ? 'Voltar aos detalhes da imagem' : 'Fechar prévia');
      dialogClose.title = zoomed ? 'Voltar aos detalhes da imagem' : 'Fechar prévia';
    }
    if (zoomed) dialog.scrollTop = 0;
    else if (wasZoomed) dialog.scrollTop = detailScrollTop;
  }
  function requestPreviewClose() {
    if (dialog.classList.contains('image-zoomed')) setImageZoom(false, true);
    else dialog.close();
  }
  function showImage(item, project, linkToProject = true) {
    const imageLinks = (item.links || []).map(link => `<a class="button reading-link" href="${escape(link.url)}" target="_blank" rel="noopener noreferrer">${escape(link.label)} ↗</a>`).join('');
    const detailsPage = item.page || project?.page;
    const relatedLinks = (imageLinks ? `<div class="image-related-links" role="group" aria-label="Links relacionados">${imageLinks}</div>` : '') + (detailsPage && linkToProject ? `<div class="image-project-action"><a class="button primary project-explore" href="${escape(base + detailsPage)}">Conheça o projeto <span aria-hidden="true">→</span></a></div>` : '');
    const imageTags = (item.tags || []).map(tag => `<a class="image-tag" data-gallery-tag="${escape(tag)}" href="${escape(base + 'galeria/#' + tagSlugs.get(tag))}">${escape(tagLabel(tag))}</a>`).join('');
    show(`<div class="image-dialog-layout"><button type="button" class="image-dialog-art" data-image-zoom aria-pressed="false" aria-label="Ampliar imagem" title="Expandir imagem" style="--image-ratio:${item.width && item.height ? item.width / item.height : 1}"><img src="${escape(base + (item.thumbnail || item.image))}" data-preview="${escape(base + (item.thumbnail || item.image))}" data-full="${escape(base + item.image)}" ${item.width && item.height ? `width="${item.width}" height="${item.height}"` : ''} alt="${escape(item.alt || item.title)}"><span class="image-expand-icon" aria-hidden="true">⤢</span><span class="image-load-status" role="status"></span></button><div class="dialog-body"><header class="image-dialog-heading"><span class="eyebrow">${escape(item.type || item.subtitle || 'Imagem')}</span><h2 id="preview-title">${escape(item.title)}</h2></header>${item.context ? `<p class="synopsis">${escape(item.context)}</p>` : ''}${imageTags ? `<div class="image-tags" aria-label="Filtrar por tag">${imageTags}</div>` : ''}${relatedLinks ? `<div class="image-dialog-actions">${relatedLinks}</div>` : ''}</div></div>`, project, true);
  }
  function show(markup, project, image = false) {
    opener = document.activeElement;
    content.innerHTML = markup;
    dialog.classList.toggle('image-dialog', image);
    dialog.classList.toggle('project-dialog', !image);
    setImageZoom(false);
    dialog.style.setProperty('--accent', project?.accent || '#b84747');
    dialog.style.setProperty('--soft', project?.soft || '#f2e3dd');
    dialog.showModal();
    dialog.scrollTop = 0;
  }
  if (dialog && typeof dialog.showModal === 'function') {
    document.addEventListener('click', event => {
      const zoomButton = event.target.closest('[data-image-zoom]');
      if (zoomButton && dialog.contains(zoomButton)) {
        setImageZoom(!dialog.classList.contains('image-zoomed'));
        return;
      }
      const projectImage = event.target.closest('a[data-project-image]');
      if (projectImage && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        const page = document.querySelector('[data-project-page]');
        const id = page?.dataset.projectPage || new URLSearchParams(location.search).get('id');
        const project = data.projects.find(p => p.id === id);
        showImage({
          image: projectImage.dataset.imagePath,
          title: projectImage.dataset.imageTitle,
          alt: projectImage.dataset.imageAlt,
          context: projectImage.dataset.imageCaption,
          type: 'Imagem do projeto'
        }, project, false);
        return;
      }
      const projectLink = event.target.closest('a[data-project]');
      if (projectLink && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        const project = data.projects.find(p => p.id === projectLink.dataset.project);
        if (!project) return;
        event.preventDefault();
        // O fundo definido por uma variável CSS precisa de uma URL absoluta:
        // URLs relativas seriam resolvidas a partir de assets/css/site.css.
        const bannerImage = project.thumbnail || project.cover;
        const bannerURL = bannerImage
          ? new URL(base + bannerImage, document.baseURI).href.replace(/'/g, '%27')
          : '';
        show(`<div class="project-modal-scroll" role="region" aria-labelledby="preview-title" tabindex="0"><header class="dialog-heading ${bannerImage ? 'has-cover' : ''}"
            style="--banner-image: url('${escape(bannerURL)}')">${bannerImage ? `<img src="${escape(base + bannerImage)}" alt="Capa de ${escape(project.title)}">` : placeholder(project)}<div><h2 id="preview-title">${escape(project.title)}</h2><p>${escape(project.format)}</p></div></header><div class="dialog-body">${tags(project)}<span class="eyebrow">${escape(resumeType(project))}</span><p class="synopsis">${escape(resumeText(project))}</p></div></div>${projectActions(project, projectURL(project))}`, project);
        track('project_open', {project_key: project.id});
        return;
      }
      const galleryLink = event.target.closest('a[data-gallery]');
      if (galleryLink && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        const item = data.gallery.find(g => g.id === galleryLink.dataset.gallery);
        if (!item) return;
        const project = data.projects.find(p => p.id === item.project);
        event.preventDefault();
        showImage(item, project);
        track('gallery_open', {image_key:item.id});
      }
    });
    dialogClose?.addEventListener('click', requestPreviewClose);
    dialog.addEventListener('cancel', event => {
      if (dialog.classList.contains('image-zoomed')) {
        event.preventDefault();
        setImageZoom(false, true);
      }
    });
    // Fecha só quando o gesto começa e termina fora da janela.
    let pointerOutside = false;
    const outside = event => {
      const r = dialog.getBoundingClientRect();
      return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
    };
    dialog.addEventListener('pointerdown', event => {pointerOutside = outside(event);});
    dialog.addEventListener('click', event => {if (event.target === dialog && pointerOutside && outside(event)) requestPreviewClose(); pointerOutside = false;});
    dialog.addEventListener('close', () => {
      setImageZoom(false);
      if (opener && document.contains(opener)) opener.focus();
      content.replaceChildren();
    });
  }
  const filters = document.querySelector('.gallery-filters');
  if (filters) {
    const search = filters.querySelector('input');
    const tagFilters = filters.querySelector('.gallery-tag-filters');
    const filterToggle = document.querySelector('[data-gallery-filter-toggle]');
    const clearFilters = document.querySelector('[data-gallery-clear]');
    const shareFilter = document.querySelector('[data-gallery-share]');
    const empty = document.querySelector('.gallery-empty');
    const entries = Array.from(document.querySelectorAll('.gallery-masonry .gallery-item')).map(figure => ({figure, item: data.gallery.find(item => item.id === figure.querySelector('[data-gallery]')?.dataset.gallery)}));
    let selectedTag = '';
    let selectedType = '';
    const typeFilters = (data.galleryTypeFilters || []).filter(filter =>
      filter.id && filter.label && Array.isArray(filter.types) &&
      entries.some(({item}) => filter.types.includes(item?.type))
    );
    const allButton = document.createElement('button');
    allButton.type = 'button';
    allButton.textContent = 'Todas';
    allButton.dataset.tag = '';
    allButton.setAttribute('aria-pressed', 'true');
    tagFilters.append(allButton);
    const typeButtons = typeFilters.map(filter => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = filter.label;
      button.dataset.type = filter.id;
      button.setAttribute('aria-pressed', 'false');
      tagFilters.append(button);
      return button;
    });
    const selectedButton = document.createElement('button');
    selectedButton.type = 'button';
    selectedButton.hidden = true;
    selectedButton.setAttribute('aria-pressed', 'true');
    tagFilters.append(selectedButton);
    function filterImages(urlMode) {
      const query = normalize(search.value.trim());
      const typeFilter = typeFilters.find(filter => filter.id === selectedType);
      let hasResults = false;
      entries.forEach(({figure, item}) => {
        const searchable = [item?.title, item?.type || item?.subtitle, item?.context, ...(item?.tags || [])].join(' ');
        const visible = normalize(searchable).includes(query) &&
          (!selectedTag || (item?.tags || []).includes(selectedTag)) &&
          (!typeFilter || typeFilter.types.includes(item?.type));
        figure.hidden = !visible;
        if (visible) hasResults = true;
      });
      if (filterToggle) filterToggle.textContent = query || selectedTag || selectedType ? 'Buscar e filtrar · Ativos' : 'Buscar e filtrar';
      if (clearFilters) clearFilters.hidden = !query && !selectedTag && !selectedType;
      allButton.setAttribute('aria-pressed', String(!selectedTag && !selectedType));
      typeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.type === selectedType)));
      selectedButton.hidden = !selectedTag;
      selectedButton.dataset.tag = selectedTag;
      selectedButton.textContent = selectedTag ? tagLabel(selectedTag) : '';
      empty.hidden = hasResults;
      if (urlMode) writeURLFilters(urlMode);
    }
    function setFilterPanel(open) {
      filters.hidden = !open;
      filterToggle?.setAttribute('aria-expanded', String(open));
    }
    function writeURLFilters(mode) {
      const params = new URLSearchParams();
      if (search.value.trim()) params.set('q', search.value.trim());
      if (selectedType) params.set('type', selectedType);
      const hash = (selectedTag ? tagSlugs.get(selectedTag) : '') + (params.size ? '?' + params.toString() : '');
      const url = new URL(location.href);
      url.hash = hash;
      if (url.href === location.href) return;
      try {
        window.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url.href);
      } catch {
        window.location.hash = hash;
      }
    }
    function readURLFilters() {
      const hash = location.hash.slice(1);
      if (hash === 'conteudo') { filterImages(); return; }
      const separator = hash.indexOf('?');
      const tagPart = separator < 0 ? hash : hash.slice(0, separator);
      const params = new URLSearchParams(separator < 0 ? '' : hash.slice(separator + 1));
      let slug;
      try { slug = slugify(decodeURIComponent(tagPart)); } catch { slug = ''; }
      selectedTag = slugTags.get(slug) || availableTags.find(tag => slugify(tag) === slug) || '';
      selectedType = typeFilters.some(filter => filter.id === params.get('type')) ? params.get('type') : '';
      search.value = params.get('q') || '';
      if (selectedTag || selectedType || search.value) setFilterPanel(true);
      filterImages();
    }
    setFilterPanel(false);
    filterToggle?.addEventListener('click', () => {
      setFilterPanel(filters.hidden);
      if (!filters.hidden) search.focus({preventScroll: true});
    });
    clearFilters?.addEventListener('click', () => {
      selectedTag = '';
      selectedType = '';
      search.value = '';
      filterImages('push');
      if (!filters.hidden) search.focus({preventScroll: true});
    });
    shareFilter?.addEventListener('click', async () => {
      writeURLFilters('replace');
      if (location.protocol === 'file:') {
        notify('O link compartilhável fica disponível quando o site estiver publicado.');
        return;
      }
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(location.href);
          notify('Link desta seleção copiado!');
        } else {
          window.prompt('Copie o link desta seleção:', location.href);
        }
      } catch {
        notify('Não foi possível copiar. Copie o endereço da página para compartilhar.');
      }
    });
    window.addEventListener('hashchange', readURLFilters);
    window.addEventListener('popstate', readURLFilters);
    const toolbar = document.querySelector('.gallery-toolbar');
    if (toolbar) toolbar.hidden = false;
    const grid = document.querySelector('[data-gallery-grid]');
    const shuffle = document.querySelector('[data-gallery-shuffle]');
    const reset = document.querySelector('[data-gallery-reset]');
    if (grid && shuffle && reset) {
      const original = entries.map(entry => entry.figure);
      const wordmark = document.querySelector('.wordmark');
      let wordmarkIsAlias = wordmark?.textContent.trim() === alias;
      let wordmarkTimer;
      shuffle.disabled = original.length < 2;
      shuffle.addEventListener('click', () => {
        const shuffled = [...original];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        // Um novo clique deve produzir uma disposição diferente da atual.
        if (shuffled.length > 1 && shuffled.every((figure, i) => figure === grid.children[i])) {
          shuffled.push(shuffled.shift());
        }
        grid.append(...shuffled);
        reset.hidden = false;
        if (wordmark) {
          wordmarkIsAlias = !wordmarkIsAlias;
          window.clearTimeout(wordmarkTimer);
          const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          wordmark.classList.add('name-changing');
          wordmarkTimer = window.setTimeout(() => {
            paintName(wordmark, wordmarkIsAlias ? alias : data.profile.name);
            wordmark.classList.remove('name-changing');
          }, reduced ? 0 : 180);
        }
      });
      reset.addEventListener('click', () => {
        grid.append(...original);
        reset.hidden = true;
      });
    }
    filters.addEventListener('submit', event => event.preventDefault());
    search.addEventListener('input', () => filterImages('replace'));
    tagFilters.addEventListener('click', event => {
      const typeButton = event.target.closest('button[data-type]');
      if (typeButton) {
        selectedType = selectedType === typeButton.dataset.type ? '' : typeButton.dataset.type;
        filterImages('push');
        return;
      }
      const button = event.target.closest('button[data-tag]');
      if (!button) return;
      selectedTag = button.dataset.tag;
      if (!selectedTag) {
        search.value = '';
        selectedType = '';
      }
      filterImages('push');
    });
    document.addEventListener('click', event => {
      const link = event.target.closest('a[data-gallery-tag]');
      if (!link || !dialog?.contains(link) || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const tag = link.dataset.galleryTag;
      if (!tagSlugs.has(tag)) return;
      event.preventDefault();
      selectedTag = tag;
      selectedType = '';
      search.value = '';
      setFilterPanel(true);
      opener = null;
      if (dialog.open) dialog.close();
      filterImages('push');
      selectedButton.focus({preventScroll: true});
      filters.scrollIntoView({block: 'nearest'});
    });
    readURLFilters();
  }
  const status = document.querySelector('#profile-status');
  const statuses = data.profile.statuses;
  if (status && statuses.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const text = document.createElement('span');
    const dots = document.createElement('span');
    dots.className = 'status-dots';
    let i = 0, dotCount = 1, dotCycles = 0;
    text.textContent = statuses[i];
    dots.textContent = '.';
    status.replaceChildren(text, dots);
    // Dois ciclos de pontos antes de trocar a frase, como no site original.
    window.setInterval(() => {
      if (document.hidden) return;
      if (dotCount === 3) {
        dotCycles++;
        if (dotCycles === 2) {
          dotCycles = 0;
          status.classList.add('status-fading');
          window.setTimeout(() => {
            i = (i + 1) % statuses.length;
            text.textContent = statuses[i];
            dotCount = 1;
            dots.textContent = '.';
            status.classList.remove('status-fading');
          }, 300);
          return;
        }
      }
      dotCount = dotCount === 3 ? 1 : dotCount + 1;
      dots.textContent = '.'.repeat(dotCount);
    }, 500);
  }
  let toastTimer;
  function notify(message) {
    const toast = document.querySelector('#toast');
    toast.textContent = message;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {toast.textContent = '';}, 5000);
  }
  document.querySelector('[data-share]')?.addEventListener('click', async () => {
    if (location.protocol === 'file:') { notify('O compartilhamento fica disponível quando o site estiver publicado.'); return; }
    try {
      if (navigator.share) {
        await navigator.share({title:'Peduardo. · Obras e links', url:location.href});
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(location.href);
        notify('Link copiado!');
      } else {
        notify('Copie o endereço desta página para compartilhar.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') notify('Copie o endereço desta página para compartilhar.');
    }
  });
})();
