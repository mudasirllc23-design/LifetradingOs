/**
 * NOTES MODULE
 * Complete Notes System with Search, Categories, Tags
 * Day 4: Self Improvement Module
 */

const Notes = (() => {

  // ---------- STATE ----------
  let notes = [];
  let editingId = null;
  let deleteTargetId = null;
  let activeCategory = 'all';
  let searchQuery = '';

  const CAT_CONFIG = {
    quick:    { emoji: '⚡', color: '#fbbf24' },
    learning: { emoji: '📚', color: '#a78bfa' },
    forex:    { emoji: '📈', color: '#4f9eff' },
    personal: { emoji: '💫', color: '#fb923c' },
  };

  // ---------- INIT ----------
  function init() {
    notes = Storage.getNotes();
    bindModalEvents();
    bindSearch();
    bindCategoryFilter();
    renderAll();
  }

  // ---------- RENDER ----------
  function renderAll() {
    renderNotesGrid();
  }

  function renderNotesGrid() {
    const grid    = document.getElementById('notesGrid');
    const emptyEl = document.getElementById('notesEmpty');
    if (!grid) return;

    let filtered = notes;

    // Category filter
    if (activeCategory !== 'all') {
      filtered = filtered.filter(n => n.category === activeCategory);
    }

    // Search filter
    if (searchQuery.length > 0) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    if (notes.length === 0) {
      grid.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'flex';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="no-filter-result" style="grid-column:1/-1">No notes match "${escHtml(searchQuery || activeCategory)}". <button class="link-btn" id="clearNoteFilter">Clear →</button></div>`;
      document.getElementById('clearNoteFilter')?.addEventListener('click', () => {
        searchQuery = '';
        activeCategory = 'all';
        document.getElementById('notesSearch').value = '';
        document.querySelectorAll('[data-ncat]').forEach(b => b.classList.toggle('active', b.dataset.ncat === 'all'));
        renderAll();
      });
      return;
    }

    // Sort newest first
    const sorted = [...filtered].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    grid.innerHTML = sorted.map(n => renderNoteCard(n)).join('');
    bindNoteCardEvents();
  }

  function renderNoteCard(n) {
    const cfg     = CAT_CONFIG[n.category] || { emoji: '📝', color: '#4f9eff' };
    const tags    = (n.tags || []).slice(0, 4);
    const preview = n.content.slice(0, 180) + (n.content.length > 180 ? '…' : '');
    const date    = formatDate(n.updatedAt || n.createdAt);
    const wordCount = n.content.split(/\s+/).filter(Boolean).length;

    return `
    <div class="note-card" data-id="${n.id}" style="--note-color:${cfg.color}">
      <div class="note-card-header">
        <span class="note-cat-tag" style="color:${cfg.color};background:${cfg.color}18">${cfg.emoji} ${capitalize(n.category)}</span>
        <div class="note-card-actions">
          <button class="icon-btn" data-action="edit-note" data-id="${n.id}" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn danger" data-action="delete-note" data-id="${n.id}" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>
      </div>

      <h4 class="note-title">${escHtml(n.title)}</h4>
      <p class="note-preview">${escHtml(preview)}</p>

      ${tags.length > 0 ? `
        <div class="note-tags">
          ${tags.map(t => `<span class="note-tag">#${escHtml(t.trim())}</span>`).join('')}
        </div>` : ''}

      <div class="note-card-footer">
        <span class="note-date">${date}</span>
        <span class="note-words">${wordCount} words</span>
      </div>

      <div class="note-color-strip" style="background:${cfg.color}"></div>
    </div>`;
  }

  function bindNoteCardEvents() {
    document.querySelectorAll('[data-action="edit-note"]').forEach(btn =>
      btn.addEventListener('click', e => openEditModal(e.currentTarget.dataset.id)));
    document.querySelectorAll('[data-action="delete-note"]').forEach(btn =>
      btn.addEventListener('click', e => openDeleteModal(e.currentTarget.dataset.id)));

    // Click card body to open in read/edit view
    document.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.note-card-actions')) return;
        openEditModal(card.dataset.id);
      });
    });
  }

  // ---------- MODAL EVENTS ----------
  function bindModalEvents() {
    document.getElementById('openAddNoteModal')?.addEventListener('click', openAddModal);
    ['closeNoteModal','cancelNoteModal'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', closeModal);
    });
    document.getElementById('noteModalOverlay')?.addEventListener('click', e => {
      if (e.target.id === 'noteModalOverlay') closeModal();
    });
    document.getElementById('saveNoteBtn')?.addEventListener('click', saveNote);

    // Delete modal
    document.getElementById('closeDeleteNoteModal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDeleteNoteModal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDeleteNoteBtn')?.addEventListener('click', confirmDelete);
    document.getElementById('deleteNoteModalOverlay')?.addEventListener('click', e => {
      if (e.target.id === 'deleteNoteModalOverlay') closeDeleteModal();
    });

    // Ctrl+S shortcut to save note
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        const overlay = document.getElementById('noteModalOverlay');
        if (overlay?.classList.contains('active')) {
          e.preventDefault();
          saveNote();
        }
      }
    });
  }

  function openAddModal() {
    editingId = null;
    setText('noteModalTitle', 'New Note');
    clearNoteForm();
    document.getElementById('noteModalOverlay').classList.add('active');
    setTimeout(() => document.getElementById('noteTitle')?.focus(), 100);
  }

  function openEditModal(id) {
    const n = notes.find(n => n.id === id);
    if (!n) return;
    editingId = id;
    setText('noteModalTitle', 'Edit Note');
    setVal('noteTitle',    n.title);
    setVal('noteCategory', n.category);
    setVal('noteContent',  n.content);
    setVal('noteTags',     (n.tags || []).join(', '));
    document.getElementById('noteModalOverlay').classList.add('active');
    setTimeout(() => document.getElementById('noteContent')?.focus(), 100);
  }

  function openDeleteModal(id) {
    deleteTargetId = id;
    const n = notes.find(n => n.id === id);
    if (n) setText('deleteNoteName', n.title);
    document.getElementById('deleteNoteModalOverlay').classList.add('active');
  }

  function closeModal() {
    editingId = null;
    clearNoteForm();
    document.getElementById('noteModalOverlay').classList.remove('active');
  }

  function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('deleteNoteModalOverlay').classList.remove('active');
  }

  function confirmDelete() {
    if (!deleteTargetId) return;
    const n = notes.find(n => n.id === deleteTargetId);
    notes = notes.filter(n => n.id !== deleteTargetId);
    if (n) Storage.addActivity({ icon: '🗑️', text: `Deleted note: ${n.title}`, color: '#f87171' });
    deleteTargetId = null;
    closeDeleteModal();
    saveAndRefresh();
  }

  function saveNote() {
    const title   = getVal('noteTitle').trim();
    const content = getVal('noteContent').trim();

    if (!title)   { shake(document.getElementById('noteTitle'));   return; }
    if (!content) { shake(document.getElementById('noteContent')); return; }

    const rawTags = getVal('noteTags');
    const tags = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const now = new Date().toISOString();

    if (editingId) {
      const idx = notes.findIndex(n => n.id === editingId);
      if (idx !== -1) {
        notes[idx] = {
          ...notes[idx],
          title,
          category:  getVal('noteCategory'),
          content,
          tags,
          updatedAt: now,
        };
      }
      Storage.addActivity({ icon: '✏️', text: `Updated note: ${title}`, color: '#a78bfa' });
    } else {
      notes.unshift({
        id:        uid(),
        title,
        category:  getVal('noteCategory'),
        content,
        tags,
        createdAt: now,
        updatedAt: now,
      });
      Storage.addActivity({ icon: '📝', text: `Created note: ${title}`, color: '#4f9eff' });
    }

    closeModal();
    saveAndRefresh();
  }

  function clearNoteForm() {
    setVal('noteTitle', '');
    setVal('noteCategory', 'quick');
    setVal('noteContent', '');
    setVal('noteTags', '');
  }

  // ---------- SEARCH ----------
  function bindSearch() {
    const input = document.getElementById('notesSearch');
    if (!input) return;
    input.addEventListener('input', () => {
      searchQuery = input.value.trim();
      renderAll();
    });
  }

  // ---------- CATEGORY FILTER ----------
  function bindCategoryFilter() {
    document.querySelectorAll('[data-ncat]').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('[data-ncat]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeCategory = e.currentTarget.dataset.ncat;
        renderAll();
      });
    });
  }

  // ---------- HELPERS ----------
  function saveAndRefresh() {
    Storage.saveNotes(notes);
    renderAll();
    if (typeof Dashboard !== 'undefined') Dashboard.renderActivity();
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7)  return `${diff} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function uid()       { return 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }
  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
  function getVal(id)  { const el = document.getElementById(id); return el ? el.value : ''; }
  function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
  function shake(el)   { if (!el) return; el.classList.add('shake'); setTimeout(()=>el.classList.remove('shake'),400); }

  return { init };
})();
