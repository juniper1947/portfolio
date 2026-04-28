(function () {
  'use strict';

  var PASSCODE_HASH = '0199d21f1a640b5a46b786ad919703512a3c320d8adbb57eb93a5de124ab36cd';
  var AUTH_KEY = 'jru_admin_authenticated';
  var STORAGE_PREFIX = 'jru_text_overrides::';
  var EDITABLE_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, a, span, li, button, label, strong, em, small, blockquote, figcaption, td, th';

  var isEditMode = false;
  var barEl = null;

  function getPageKey() {
    return STORAGE_PREFIX + window.location.pathname;
  }

  function isAuthed() {
    return sessionStorage.getItem(AUTH_KEY) === '1';
  }

  function setAuthed(value) {
    sessionStorage.setItem(AUTH_KEY, value ? '1' : '0');
    document.dispatchEvent(
      new CustomEvent('jru-admin-auth-changed', {
        detail: { authenticated: value }
      })
    );
  }

  function collectEditableElements() {
    var all = Array.prototype.slice.call(document.querySelectorAll(EDITABLE_SELECTOR));
    return all.filter(function (el) {
      if (!el || el.closest('[data-admin-ui="true"]')) {
        return false;
      }

      var tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TITLE') {
        return false;
      }

      var text = el.textContent || '';
      return text.trim().length > 0;
    });
  }

  function getElementKey(el) {
    var parts = [];
    var current = el;

    while (current && current.nodeType === 1 && current !== document.body) {
      var tag = current.tagName.toLowerCase();
      var siblingIndex = 0;
      var sibling = current;

      while (sibling) {
        if (sibling.nodeType === 1 && sibling.tagName === current.tagName) {
          siblingIndex += 1;
        }
        sibling = sibling.previousElementSibling;
      }

      parts.unshift(tag + ':nth-of-type(' + siblingIndex + ')');
      current = current.parentElement;
    }

    return parts.join('>');
  }

  function assignStableIds(elements) {
    elements.forEach(function (el) {
      el.setAttribute('data-admin-id', getElementKey(el));
    });
  }

  function loadOverrides() {
    var raw = localStorage.getItem(getPageKey());
    if (!raw) {
      return {};
    }

    try {
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      console.warn('Admin editor: bad override JSON, clearing.', err);
      localStorage.removeItem(getPageKey());
      return {};
    }
  }

  function applyOverrides() {
    var elements = collectEditableElements();
    assignStableIds(elements);
    var overrides = loadOverrides();

    elements.forEach(function (el) {
      var id = el.getAttribute('data-admin-id');
      if (Object.prototype.hasOwnProperty.call(overrides, id)) {
        el.textContent = overrides[id];
      }
    });
  }

  function saveOverrides() {
    var elements = collectEditableElements();
    assignStableIds(elements);
    var payload = {};

    elements.forEach(function (el) {
      var id = el.getAttribute('data-admin-id');
      payload[id] = el.textContent;
    });

    localStorage.setItem(getPageKey(), JSON.stringify(payload));
  }

  function setEditable(enabled) {
    var elements = collectEditableElements();
    assignStableIds(elements);

    elements.forEach(function (el) {
      if (enabled) {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('data-admin-editing', 'true');
      } else {
        el.removeAttribute('contenteditable');
        el.removeAttribute('data-admin-editing');
      }
    });
  }

  function ensureBar() {
    if (barEl) {
      return barEl;
    }

    barEl = document.createElement('div');
    barEl.className = 'admin-editor-bar';
    barEl.setAttribute('data-admin-ui', 'true');
    barEl.hidden = true;

    var status = document.createElement('span');
    status.className = 'admin-editor-status';
    status.textContent = 'Admin edit mode';

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save Text';
    saveBtn.addEventListener('click', function () {
      saveOverrides();
      setAuthed(false);
      disableEditMode();
      status.textContent = 'Saved and logged out';
      window.setTimeout(function () {
        status.textContent = 'Admin edit mode';
      }, 1200);
    });

    var exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.textContent = 'Exit Edit';
    exitBtn.addEventListener('click', function () {
      disableEditMode();
    });

    var resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.textContent = 'Reset Page Text';
    resetBtn.addEventListener('click', function () {
      var ok = window.confirm('Reset all saved text changes on this page?');
      if (!ok) {
        return;
      }
      localStorage.removeItem(getPageKey());
      window.location.reload();
    });

    barEl.appendChild(status);
    barEl.appendChild(saveBtn);
    barEl.appendChild(exitBtn);
    barEl.appendChild(resetBtn);
    document.body.appendChild(barEl);

    return barEl;
  }

  function enableEditMode() {
    isEditMode = true;
    setEditable(true);
    ensureBar().hidden = false;
    document.body.classList.add('admin-editing-on');
  }

  function disableEditMode() {
    isEditMode = false;
    setEditable(false);
    if (barEl) {
      barEl.hidden = true;
    }
    document.body.classList.remove('admin-editing-on');
  }

  function hashText(input) {
    var encoder = new TextEncoder();
    return window.crypto.subtle.digest('SHA-256', encoder.encode(input)).then(function (buffer) {
      var bytes = new Uint8Array(buffer);
      var hex = '';
      for (var i = 0; i < bytes.length; i += 1) {
        hex += bytes[i].toString(16).padStart(2, '0');
      }
      return hex;
    });
  }

  async function authenticateAndToggle() {
    if (!isAuthed()) {
      var input = window.prompt('Admin passcode');
      if (input === null) {
        return;
      }
      var inputHash = await hashText(input);
      if (inputHash !== PASSCODE_HASH) {
        window.alert('Incorrect passcode.');
        return;
      }
      setAuthed(true);
    }

    if (isEditMode) {
      disableEditMode();
    } else {
      enableEditMode();
    }
  }

  function setupTrigger() {
    var footerTrigger = document.querySelector('.footer-name');
    if (footerTrigger) {
      var clickCount = 0;
      var timer = null;

      footerTrigger.classList.add('admin-trigger');
      footerTrigger.setAttribute('title', 'Admin access');
      footerTrigger.addEventListener('click', function () {
        clickCount += 1;

        if (timer) {
          window.clearTimeout(timer);
        }

        timer = window.setTimeout(function () {
          clickCount = 0;
        }, 1200);

        if (clickCount >= 3) {
          clickCount = 0;
          authenticateAndToggle();
        }
      });
      return;
    }

    var brandTrigger = document.querySelector('.brand');
    if (!brandTrigger) {
      return;
    }

    brandTrigger.classList.add('admin-trigger');
    brandTrigger.setAttribute('title', 'Double-click for admin access');
    brandTrigger.addEventListener('dblclick', function (event) {
      event.preventDefault();
      authenticateAndToggle();
    });
  }

  function setupKeyboardShortcut() {
    document.addEventListener('keydown', function (event) {
      var isToggle = event.ctrlKey && event.shiftKey && (event.key === 'E' || event.key === 'e');
      if (!isToggle) {
        return;
      }
      event.preventDefault();
      authenticateAndToggle();
    });
  }

  function init() {
    applyOverrides();
    setupTrigger();
    setupKeyboardShortcut();
    document.dispatchEvent(
      new CustomEvent('jru-admin-auth-changed', {
        detail: { authenticated: isAuthed() }
      })
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
