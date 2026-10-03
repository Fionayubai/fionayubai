// Small interactions: category filtering, expandable photo series, and keyboard-ready lightbox.
const filters = [...document.querySelectorAll('.filter')];
const projects = [...document.querySelectorAll('.film-project')];
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-selected', String(item === button)); });
  const selected = button.dataset.filter;
  projects.forEach(project => { project.hidden = selected !== 'all' && project.dataset.kind !== selected; });
}));

// Production Design is a still-image carousel: native swipe/trackpad scrolling plus controls.
const productionViewport = document.querySelector('.production-viewport');
if (productionViewport) {
  const productionSlides = [...productionViewport.querySelectorAll('.production-slide')];
  const pagination = document.querySelector('.production-pagination');
  const counterDisplay = document.querySelector('.production-count');
  let activeProductionSlide = 0;
  productionSlides.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'production-dot';
    dot.setAttribute('aria-label', `Show production design image ${index + 1}`);
    dot.setAttribute('aria-current', String(index === 0));
    dot.addEventListener('click', () => goToProductionSlide(index));
    pagination.append(dot);
  });
  function goToProductionSlide(index) {
    activeProductionSlide = (index + productionSlides.length) % productionSlides.length;
    productionViewport.scrollTo({ left: activeProductionSlide * productionViewport.clientWidth, behavior: 'smooth' });
    updateProductionControls();
  }
  function updateProductionControls() {
    const dots = [...pagination.querySelectorAll('.production-dot')];
    dots.forEach((dot, index) => dot.setAttribute('aria-current', String(index === activeProductionSlide)));
    counterDisplay.textContent = `${String(activeProductionSlide + 1).padStart(2, '0')} / ${String(productionSlides.length).padStart(2, '0')}`;
  }
  productionViewport.addEventListener('scroll', () => {
    activeProductionSlide = Math.round(productionViewport.scrollLeft / productionViewport.clientWidth);
    updateProductionControls();
  }, { passive: true });
  document.querySelector('.production-prev').addEventListener('click', () => goToProductionSlide(activeProductionSlide - 1));
  document.querySelector('.production-next').addEventListener('click', () => goToProductionSlide(activeProductionSlide + 1));
}

// Justified photography rows: preserve intrinsic ratios while sharing one row height.
const justifiedGalleries = [...document.querySelectorAll('.photo-section .gallery-grid')].map(grid => ({
  grid,
  photos: [...grid.querySelectorAll('.gallery-photo')],
  mode: null
}));
const maxJustifiedRowHeight = 320;
function galleryMode() {
  if (window.innerWidth <= 640) return 'mobile';
  if (window.innerWidth <= 1000) return 'tablet';
  return 'desktop';
}
function layoutJustifiedGallery(entry) {
  const { grid, photos } = entry;
  const mode = galleryMode();
  if (entry.mode !== mode) {
    const rowSizes = mode === 'desktop'
      ? (grid.dataset.rowSizes || '').split(',').map(Number).filter(Boolean)
      : Array(photos.length).fill(mode === 'tablet' ? 2 : 1);
    grid.replaceChildren();
    let photoIndex = 0;
    rowSizes.forEach(size => {
      if (photoIndex >= photos.length) return;
      const row = document.createElement('div');
      row.className = 'gallery-row';
      row.setAttribute('role', 'group');
      while (photoIndex < photos.length && row.childElementCount < size) row.append(photos[photoIndex++]);
      grid.append(row);
    });
    while (photoIndex < photos.length) {
      const row = document.createElement('div');
      row.className = 'gallery-row';
      row.setAttribute('role', 'group');
      row.append(photos[photoIndex++]);
      grid.append(row);
    }
    entry.mode = mode;
  }

  const availableWidth = grid.clientWidth;
  if (!availableWidth) return;
  const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
  grid.querySelectorAll('.gallery-row').forEach(row => {
    const items = [...row.querySelectorAll('.gallery-photo')];
    const ratios = items.map(item => {
      const image = item.querySelector('img');
      return image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 0;
    });
    if (ratios.some(ratio => !ratio)) return;

    const ratioTotal = ratios.reduce((sum, ratio) => sum + ratio, 0);
    const rowGaps = gap * Math.max(0, items.length - 1);
    const naturalHeight = (availableWidth - rowGaps) / ratioTotal;
    const isCenteredFinalPortrait = grid.dataset.centeredFinalRow === 'true' && row === grid.lastElementChild;
    const rowHeight = isCenteredFinalPortrait
      ? Math.min(250, maxJustifiedRowHeight)
      : Math.min(naturalHeight, maxJustifiedRowHeight);
    const contentWidth = ratioTotal * rowHeight + rowGaps;
    const isCapped = naturalHeight > maxJustifiedRowHeight || isCenteredFinalPortrait;

    row.style.width = isCapped ? `${contentWidth}px` : '100%';
    row.style.maxWidth = '100%';
    row.style.justifyContent = 'center';
    items.forEach((item, index) => {
      item.style.width = `${ratios[index] * rowHeight}px`;
      item.style.height = `${rowHeight}px`;
    });
  });
}
function layoutAllJustifiedGalleries() {
  justifiedGalleries.forEach(layoutJustifiedGallery);
}
justifiedGalleries.forEach(({ grid }) => {
  grid.querySelectorAll('img').forEach(image => image.addEventListener('load', layoutAllJustifiedGalleries));
});
window.addEventListener('resize', layoutAllJustifiedGalleries, { passive: true });
layoutAllJustifiedGalleries();

const dialog = document.querySelector('.lightbox');
const closeButton = dialog.querySelector('.lightbox-close');
const imageArea = dialog.querySelector('.lightbox-image');
const counter = dialog.querySelector('.lightbox-count');
let galleryItems = [];
let currentImage = 0;
function showImage(index) {
  currentImage = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[currentImage];
  const image = document.createElement('img');
  image.src = item.src;
  image.alt = `${item.series}, photograph ${String(currentImage + 1).padStart(2, '0')}`;
  imageArea.replaceChildren(image);
  counter.textContent = `${String(currentImage + 1).padStart(2, '0')} / ${String(galleryItems.length).padStart(2, '0')}`;
}
document.querySelectorAll('.gallery-photo').forEach(button => button.addEventListener('click', () => {
  const series = button.closest('.series');
  const buttons = [...series.querySelectorAll('.gallery-photo')];
  galleryItems = buttons.map(photo => ({ series: series.dataset.series, src: photo.querySelector('img').src }));
  showImage(buttons.indexOf(button));
  dialog.showModal();
}));
closeButton.addEventListener('click', () => dialog.close());
dialog.querySelector('.lightbox-prev').addEventListener('click', () => showImage(currentImage - 1));
dialog.querySelector('.lightbox-next').addEventListener('click', () => showImage(currentImage + 1));
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') showImage(currentImage - 1);
  if (event.key === 'ArrowRight') showImage(currentImage + 1);
});

// Let the little hand-drawn marks lean toward the pointer, then settle back.
const portraitStage = document.querySelector('.hero-portrait-wrap');
const doodles = [...document.querySelectorAll('.doodle[data-doodle]')];
if (portraitStage && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  portraitStage.addEventListener('pointermove', event => {
    const box = portraitStage.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - .5;
    const y = (event.clientY - box.top) / box.height - .5;
    doodles.forEach((doodle, index) => {
      const direction = index === 0 ? 1 : -1;
      doodle.style.transform = `translate(${x * 11 * direction}px, ${y * 9 * direction}px) rotate(${x * 10}deg)`;
    });
  });
  portraitStage.addEventListener('pointerleave', () => {
    doodles.forEach(doodle => { doodle.style.transform = ''; });
  });
}
