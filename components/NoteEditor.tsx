import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Note } from '../types';
import RichTextEditor from './RichTextEditor';
import { FiX, FiTag } from 'react-icons/fi';

interface NoteEditorProps {
  note: Note;
  allTags: string[];
  onSave: (note: Note) => void;
  onDelete: (noteId: string) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, allTags, onSave, onDelete }) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags);
    setHasChanges(false);
  }, [note.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, content, tags, note]);

  const handleSave = useCallback(() => {
    const updatedNote: Note = {
      ...note,
      title: title.trim() || 'Untitled',
      content,
      tags,
    };
    onSave(updatedNote);
    setHasChanges(false);
  }, [note, title, content, tags, onSave]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasChanges(true);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput.trim());
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const addTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().replace(/,/g, '').trim();
    if (normalizedTag && !tags.includes(normalizedTag)) {
      const newTags = [...tags, normalizedTag];
      setTags(newTags);
      setHasChanges(true);
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    setHasChanges(true);
  };

  const filteredSuggestions = allTags.filter(
    tag => tag.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(tag)
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pr-2">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Note title..."
          className="w-full bg-transparent text-2xl font-bold text-white placeholder-[#A0A0A0] border-none outline-none mb-4"
        />

        <div className="relative mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <FiTag className="text-[#A0A0A0] w-4 h-4" />
            {tags.map(tag => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-1 bg-[#6A5ACD]/20 border border-[#6A5ACD]/30 rounded text-sm text-[#E0E0E0]"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-white transition-colors"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              ref={tagInputRef}
              type="text"
              value={tagInput}
              onChange={e => {
                setTagInput(e.target.value);
                setShowTagSuggestions(e.target.value.length > 0);
              }}
              onKeyDown={handleTagInputKeyDown}
              onFocus={() => setShowTagSuggestions(tagInput.length > 0)}
              onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
              placeholder={tags.length === 0 ? "Add tags..." : ""}
              className="bg-transparent border-none outline-none text-sm text-[#E0E0E0] placeholder-[#A0A0A0] w-32"
            />
          </div>
          {showTagSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-[#1A1A1A] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
              {filteredSuggestions.slice(0, 10).map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onMouseDown={() => addTag(suggestion)}
                  className="w-full text-left px-3 py-2 text-sm text-[#E0E0E0] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-[calc(100%-140px)]">
          <RichTextEditor
            content={content}
            onSave={handleContentChange}
            onContentChange={handleContentChange}
            hideSaveButton={true}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.1)] mt-4">
        <div className="text-sm text-[#A0A0A0]">
          {hasChanges ? 'Unsaved changes' : 'All changes saved'}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onDelete(note.id)}
            className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
              hasChanges
                ? 'bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] text-white hover:from-[#8b5cf6] hover:to-[#6A5ACD] shadow-sm shadow-[#6A5ACD]/10'
                : 'bg-[rgba(255,255,255,0.1)] text-[#A0A0A0] cursor-not-allowed'
            }`}
          >
            Save (Ctrl+S)
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;