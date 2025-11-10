import React, { useRef, useState } from 'react';
import { FiBold, FiItalic, FiUnderline, FiLink, FiImage } from 'react-icons/fi';
import Modal from './Modal';

interface RichTextEditorProps {
    content: string;
    onSave: (newContent: string) => void;
}

const EditorButton: React.FC<{ onMouseDown: (e: React.MouseEvent) => void, children: React.ReactNode, title: string }> = ({ onMouseDown, children, title }) => (
    <button
        type="button"
        title={title}
        onMouseDown={onMouseDown}
        className="p-2 rounded-lg text-[#E0E0E0] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-all duration-200 hover:scale-110"
    >
        {children}
    </button>
);

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onSave }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const savedRange = useRef<Range | null>(null);

    const executeCommand = (command: string, value?: string) => {
        if (savedRange.current) {
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(savedRange.current);
            }
        }
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        savedRange.current = null;
    };
    
    const saveSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            savedRange.current = selection.getRangeAt(0).cloneRange();
        } else {
            savedRange.current = null;
        }
    };

    const handleAction = (e: React.MouseEvent, command: string) => {
        e.preventDefault();
        saveSelection();

        if (command === 'createLink') {
            setUrlInput('https://');
            setIsUrlModalOpen(true);
        } else if (command === 'insertImage') {
            imageInputRef.current?.click();
        } else {
            executeCommand(command);
        }
    };

    const handleUrlConfirm = () => {
        if (urlInput) {
            executeCommand('createLink', urlInput);
        }
        setUrlInput('');
        setIsUrlModalOpen(false);
    };
    
    const insertImageAsBase64 = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            executeCommand('insertHTML', `<img src="${base64String}" style="max-width: 100%; height: auto; border-radius: 8px;" />`);
        };
        reader.readAsDataURL(file);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
           insertImageAsBase64(file);
        }
        // Reset file input to allow uploading the same file again
        e.target.value = '';
    };

    const handleSave = () => {
        if (editorRef.current) {
            setIsSaving(true);
            onSave(editorRef.current.innerHTML);
            setTimeout(() => setIsSaving(false), 1000);
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) {
                    insertImageAsBase64(file);
                }
                return;
            }
        }
        // Default paste behavior for text/html
        e.preventDefault();
        const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
        document.execCommand('insertHTML', false, text);
    };

    return (
        <>
            <div className="glass-card rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.1)] p-3 bg-[rgba(255,255,255,0.05)]">
                    <EditorButton title="Bold" onMouseDown={(e) => handleAction(e, 'bold')}>
                        <FiBold className="w-5 h-5" />
                    </EditorButton>
                    <EditorButton title="Italic" onMouseDown={(e) => handleAction(e, 'italic')}>
                        <FiItalic className="w-5 h-5" />
                    </EditorButton>
                    <EditorButton title="Underline" onMouseDown={(e) => handleAction(e, 'underline')}>
                        <FiUnderline className="w-5 h-5" />
                    </EditorButton>
                    <EditorButton title="Add Link" onMouseDown={(e) => handleAction(e, 'createLink')}>
                        <FiLink className="w-5 h-5" />
                    </EditorButton>
                    <EditorButton title="Add Image" onMouseDown={(e) => handleAction(e, 'insertImage')}>
                        <FiImage className="w-5 h-5" />
                    </EditorButton>
                    <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                    />
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="ml-auto bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-2 px-4 rounded-lg text-sm 
                                  shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 transition-all duration-200 
                                  disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isSaving ? 'Saved!' : 'Save Notes'}
                    </button>
                </div>
                <div
                    ref={editorRef}
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onPaste={handlePaste}
                    className="prose prose-invert max-w-none p-5 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-[#6A5ACD]/50 rounded-b-xl text-[#E0E0E0] bg-[rgba(255,255,255,0.02)]"
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            </div>
            <Modal isOpen={isUrlModalOpen} onClose={() => setIsUrlModalOpen(false)}>
                <div className="p-2">
                    <h3 className="text-2xl font-bold text-white mb-4">Enter the URL:</h3>
                    <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUrlConfirm(); } }}
                        className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white placeholder-[#A0A0A0] 
                                  focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                                  transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
                        placeholder="https://example.com"
                        autoFocus
                    />
                    <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-[rgba(255,255,255,0.1)]">
                        <button onClick={() => setIsUrlModalOpen(false)} 
                                className="bg-[#2C2C2C] hover:bg-[#3f3f46] text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                          Cancel
                        </button>
                        <button onClick={handleUrlConfirm} 
                                className="bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-3 px-6 rounded-lg 
                                          shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                          Confirm
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default RichTextEditor;