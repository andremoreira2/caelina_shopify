(() => {
  const initializePasswordPage = (root) => {
    if (!root || root.dataset.passwordInitialized === 'true') return;

    const dialog = root.querySelector('[data-password-dialog]');
    const openButton = root.querySelector('[data-password-open]');
    const closeButton = root.querySelector('[data-password-close]');
    const passwordInput = root.querySelector('#StorePassword');

    if (!dialog || !openButton || !closeButton) return;

    const openDialog = () => {
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
      window.requestAnimationFrame(() => passwordInput?.focus());
    };

    const closeDialog = () => {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
      openButton.focus();
    };

    openButton.addEventListener('click', openDialog);
    closeButton.addEventListener('click', closeDialog);
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeDialog();
    });

    root.dataset.passwordInitialized = 'true';

    if (root.querySelector('[data-password-error]')) openDialog();
  };

  const initializeAll = (scope = document) => {
    scope.querySelectorAll('[data-password-page]').forEach(initializePasswordPage);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeAll());
  } else {
    initializeAll();
  }

  document.addEventListener('shopify:section:load', (event) => initializeAll(event.target));
})();
