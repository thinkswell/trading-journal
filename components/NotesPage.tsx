import React, { useState, useMemo, useCallback } from 'react';
import { Note } from '../types';
import NoteEditor from './NoteEditor';
import ConfirmationModal from './ConfirmationModal';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { FiFileText } from 'react-icons/fi';

interface NotesPageProps {
  notes: Note[];
  onSaveNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onCreateNote: () => string;
}

const NotesPage: React.FC<NotesPageProps> = ({ notes, onSaveNote, onDeleteNote, onCreateNote }) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => note.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let filtered = [...notes];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        note =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
      );
    }

    if (selectedTag) {
      filtered = filtered.filter(note => note.tags.includes(selectedTag));
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notes, searchQuery, selectedTag]);

  const selectedNote = useMemo(() => {
    return notes.find(n => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  const handleNewNote = useCallback(() => {
    const newNoteId = onCreateNote();
    setSelectedNoteId(newNoteId);
  }, [onCreateNote]);

  const handleDeleteClick = useCallback((noteId: string) => {
    setNoteToDelete(noteId);
    setIsDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (noteToDelete) {
      onDeleteNote(noteToDelete);
      if (selectedNoteId === noteToDelete) {
        setSelectedNoteId(null);
      }
    }
    setIsDeleteModalOpen(false);
    setNoteToDelete(null);
  }, [noteToDelete, onDeleteNote, selectedNoteId]);

  const handleDeleteCancel = useCallback(() => {
    setIsDeleteModalOpen(false);
    setNoteToDelete(null);
  }, []);

  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div className="flex h-full gap-6">
      <div className="w-[40%] flex flex-col glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Notes</h2>
          <button
            onClick={handleNewNote}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] text-white text-sm font-bold rounded-lg hover:from-[#8b5cf6] hover:to-[#6A5ACD] transition-all duration-200 shadow-sm shadow-[#6A5ACD]/10"
          >
            <FiPlus className="w-4 h-4" />
            New Note
          </button>
        </div>

        <div className="relative mb-3">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A0A0A0] w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-10 pr-4 py-2 bg-[#121212] border border-[rgba(255,255,255,0.1)] rounded-lg text-white placeholder-[#A0A0A0] text-sm focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 outline-none transition-all duration-200"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2 py-1 text-xs rounded-full transition-all duration-200 ${
                selectedTag === null
                  ? 'bg-[#6A5ACD] text-white'
                  : 'bg-[rgba(255,255,255,0.1)] text-[#A0A0A0] hover:text-white'
              }`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2 py-1 text-xs rounded-full transition-all duration-200 ${
                  selectedTag === tag
                    ? 'bg-[#6A5ACD] text-white'
                    : 'bg-[rgba(255,255,255,0.1)] text-[#A0A0A0] hover:text-white'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FiFileText className="w-12 h-12 text-[#A0A0A0] mb-3" />
              <p className="text-[#A0A0A0] mb-2">
                {searchQuery || selectedTag ? 'No notes match your search' : 'No notes yet'}
              </p>
              {!searchQuery && !selectedTag && (
                <button
                  onClick={handleNewNote}
                  className="text-[#6A5ACD] hover:text-[#8b5cf6] text-sm font-medium transition-colors"
                >
                  Create your first note
                </button>
              )}
            </div>
          ) : (
            filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                  selectedNoteId === note.id
                    ? 'bg-[rgba(106,90,205,0.15)] border-[#6A5ACD]/30'
                    : 'bg-[rgba(255,255,255,0.03)] border-transparent hover:bg-[rgba(255,255,255,0.08)]'
                }`}
              >
                <h3 className="font-semibold text-white truncate mb-1">
                  {note.title || 'Untitled'}
                </h3>
                <p className="text-xs text-[#A0A0A0] line-clamp-2 mb-2">
                  {stripHtml(note.content).substring(0, 100) || 'No content'}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 flex-wrap">
                    {note.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 bg-[#6A5ACD]/20 rounded text-[10px] text-[#E0E0E0]"
                      >
                        {tag}
                      </span>
                    ))}
                    {note.tags.length > 3 && (
                      <span className="text-[10px] text-[#A0A0A0]">+{note.tags.length - 3}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#A0A0A0]">{formatDate(note.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="w-[60%] glass-card p-4">
        {selectedNote ? (
          <NoteEditor
            key={selectedNote.id}
            note={selectedNote}
            allTags={allTags}
            onSave={onSaveNote}
            onDelete={handleDeleteClick}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FiFileText className="w-16 h-16 text-[#A0A0A0] mb-4" />
            <p className="text-[#A0A0A0] mb-2">Select a note to view or edit</p>
            <button
              onClick={handleNewNote}
              className="flex items-center gap-2 text-[#6A5ACD] hover:text-[#8b5cf6] text-sm font-medium transition-colors"
            >
              <FiPlus className="w-4 h-4" />
              Create a new note
            </button>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmButtonText="Delete Note"
      />
    </div>
  );
};

export default NotesPage;