(function () {
  'use strict';

  var gallery = document.querySelector('.samples[data-gallery="image-preview"]');
  if (!gallery || !Array.isArray(window.pagePreviewImages)) {
    return;
  }

  function escapeAttr(value) {
    return String(value).replace(/"/g, '&quot;');
  }

  var maxCards = Number(window.pagePreviewMaxCards) > 0 ? Number(window.pagePreviewMaxCards) : 6;
  var imageUrls = window.pagePreviewImages
    .filter(function (url) {
      return typeof url === 'string' && url.trim().length > 0;
    })
    .slice(0, maxCards);

  var previewLinks = Array.isArray(window.pagePreviewLinks) ? window.pagePreviewLinks : [];

  var cardsHtml = imageUrls.map(function (url, index) {
    var safeUrl = escapeAttr(url);
    var alt = 'Preview image ' + (index + 1);
    var cardLink = typeof previewLinks[index] === 'string' ? previewLinks[index].trim() : '';
    var hasCardLink = cardLink.length > 0;
    var safeCardLink = hasCardLink ? escapeAttr(cardLink) : '';
    var cardOpen = hasCardLink
      ? '<a class="sample-card sample-card-clickable" href="' + safeCardLink + '" target="_blank" rel="noopener noreferrer">'
      : '<article class="sample-card">';
    var cardClose = hasCardLink ? '</a>' : '</article>';
    return (
      cardOpen +
        '<div class="sample-media">' +
          '<img src="' + safeUrl + '" alt="' + alt + '" loading="lazy" />' +
          (hasCardLink
            ? '<span class="sample-preview-btn">Open App</span>'
            : '<button class="sample-preview-btn" type="button" data-preview-src="' + safeUrl + '">Open Preview</button>') +
        '</div>' +
      cardClose
    );
  }).join('');

  gallery.innerHTML = cardsHtml;

  var dialog = document.getElementById('preview-lightbox');
  var dialogImage = document.getElementById('preview-lightbox-image');
  var closeBtn = document.getElementById('preview-close-btn');
  if (!dialog || !dialogImage || !closeBtn) {
    return;
  }

  gallery.addEventListener('click', function (event) {
    var button = event.target.closest('.sample-preview-btn');
    if (!button) {
      return;
    }
    var src = button.getAttribute('data-preview-src');
    if (!src) {
      return;
    }
    dialogImage.setAttribute('src', src);
    dialog.showModal();
  });

  closeBtn.addEventListener('click', function () {
    dialog.close();
  });

  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) {
      dialog.close();
    }
  });
})();
