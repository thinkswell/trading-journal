import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FiBold, FiItalic, FiUnderline, FiLink, FiImage } from 'react-icons/fi';
import Modal from './Modal';

interface RichTextEditorProps {
    content: string;
    onSave: (newContent: string) => void;
    onContentChange?: (newContent: string) => void;
    hideSaveButton?: boolean;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface ResizeState {
    image: HTMLImageElement | null;
    handle: ResizeHandle | null;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    aspectRatio: number;
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

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onSave, onContentChange, hideSaveButton = false }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const savedRange = useRef<Range | null>(null);
    const isUserTypingRef = useRef(false);
    const lastContentRef = useRef<string>('');
    const isInitialMountRef = useRef(true);
    const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
    const [handlePosition, setHandlePosition] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
    const resizeStateRef = useRef<ResizeState | null>(null);
    const resizeHandlesRef = useRef<HTMLDivElement>(null);

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
            executeCommand('insertHTML', `<img src="${base64String}" style="max-width: 100%; height: auto; border-radius: 8px; cursor: pointer;" />`);
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

    // Setup image click handlers using event delegation
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const handleImageClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'IMG') {
                e.preventDefault();
                e.stopPropagation();
                setSelectedImage(target as HTMLImageElement);
            }
        };

        // Use event delegation on the editor
        editor.addEventListener('click', handleImageClick);
        
        // Also set cursor style on all images (for both new and existing images)
        const updateImageStyles = () => {
            const images = editor.querySelectorAll('img');
            images.forEach((img) => {
                const imgElement = img as HTMLImageElement;
                if (!imgElement.style.cursor) {
                    imgElement.style.cursor = 'pointer';
                }
                // Ensure images have display block or inline-block for proper positioning
                if (!imgElement.style.display || imgElement.style.display === '') {
                    imgElement.style.display = 'block';
                }
            });
        };

        updateImageStyles();

        // Use MutationObserver to handle dynamically added images
        const observer = new MutationObserver(() => {
            updateImageStyles();
        });

        observer.observe(editor, {
            childList: true,
            subtree: true
        });

        return () => {
            editor.removeEventListener('click', handleImageClick);
            observer.disconnect();
        };
    }, [content]);

    // Update editor content when content prop changes (for prefilling notes)
    // Only update if user is NOT currently typing to avoid cursor jumping
    useEffect(() => {
        if (editorRef.current) {
            // On initial mount, set the content
            if (isInitialMountRef.current) {
                editorRef.current.innerHTML = content || '';
                lastContentRef.current = (content || '').trim();
                isInitialMountRef.current = false;
            } 
            // Only update if user is NOT typing and content actually changed from outside
            else if (!isUserTypingRef.current) {
                const currentContent = editorRef.current.innerHTML || '';
                const normalizedCurrent = currentContent.trim();
                const normalizedProp = (content || '').trim();
                
                // Update if content prop is different from last known external content
                // This handles cases where trade is saved from form and detail page needs to update
                if (normalizedProp !== lastContentRef.current) {
                    // Always update when prop content differs from last known external content
                    // This ensures updates when trade is saved from form
                    editorRef.current.innerHTML = content || '';
                    lastContentRef.current = normalizedProp;
                } else if (normalizedProp === lastContentRef.current && normalizedProp !== normalizedCurrent) {
                    // If prop matches last known but editor content is different, 
                    // sync to prop (external update took precedence, e.g., from form save)
                    editorRef.current.innerHTML = content || '';
                }
            }
        }
    }, [content]);

    // Handle clicks outside to deselect image
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            
            // Don't deselect if clicking on resize handles
            if (target.closest('.resize-handle') || target.closest('.resize-handles-container')) {
                return;
            }
            
            // Deselect if clicking outside editor
            if (editorRef.current && !editorRef.current.contains(target)) {
                setSelectedImage(null);
                return;
            }
            
            // Deselect if clicking on text or other non-image content
            if (target.tagName !== 'IMG' && !(target instanceof HTMLImageElement)) {
                // Check if we're clicking on the editor content (not on toolbar)
                if (editorRef.current && editorRef.current.contains(target)) {
                    // Only deselect if not clicking on a resize handle
                    if (!target.closest('.resize-handle')) {
                        setSelectedImage(null);
                    }
                }
            }
        };

        // Use mousedown to catch clicks before they bubble
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside, true);
        };
    }, []);

    // Get image position and dimensions for resize handles
    const getImageRect = useCallback((img: HTMLImageElement) => {
        const editorRect = editorRef.current?.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();
        if (!editorRect) return null;
        
        return {
            left: imgRect.left - editorRect.left,
            top: imgRect.top - editorRect.top,
            width: imgRect.width,
            height: imgRect.height
        };
    }, []);

    // Update handle positions when image is selected or scrolls
    useEffect(() => {
        if (!selectedImage || !editorRef.current) {
            setHandlePosition(null);
            return;
        }

        const updatePosition = () => {
            const rect = getImageRect(selectedImage);
            if (rect) {
                setHandlePosition(rect);
            }
        };

        updatePosition();

        // Update on scroll
        const handleScroll = () => updatePosition();
        const editor = editorRef.current;
        editor.addEventListener('scroll', handleScroll);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);

        // Also update when image loads (in case it's still loading)
        if (selectedImage.complete) {
            updatePosition();
        } else {
            selectedImage.addEventListener('load', updatePosition);
        }

        return () => {
            editor.removeEventListener('scroll', handleScroll);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
            selectedImage.removeEventListener('load', updatePosition);
        };
    }, [selectedImage, getImageRect]);

    // Start resize
    const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
        if (!selectedImage) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const rect = selectedImage.getBoundingClientRect();
        const startWidth = rect.width;
        const startHeight = rect.height;
        const aspectRatio = startWidth / startHeight;
        
        resizeStateRef.current = {
            image: selectedImage,
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startWidth,
            startHeight,
            aspectRatio
        };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!resizeStateRef.current || !selectedImage) return;
            
            const { handle, startX, startY, startWidth, startHeight, aspectRatio } = resizeStateRef.current;
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            const maintainAspect = !moveEvent.shiftKey;
            
            let newWidth = startWidth;
            let newHeight = startHeight;
            
            // Calculate new dimensions based on handle
            switch (handle) {
                case 'nw':
                    newWidth = startWidth - deltaX;
                    newHeight = maintainAspect ? newWidth / aspectRatio : startHeight - deltaY;
                    break;
                case 'ne':
                    newWidth = startWidth + deltaX;
                    newHeight = maintainAspect ? newWidth / aspectRatio : startHeight - deltaY;
                    break;
                case 'se':
                    newWidth = startWidth + deltaX;
                    newHeight = maintainAspect ? newWidth / aspectRatio : startHeight + deltaY;
                    break;
                case 'sw':
                    newWidth = startWidth - deltaX;
                    newHeight = maintainAspect ? newWidth / aspectRatio : startHeight + deltaY;
                    break;
            }
            
            // Enforce minimum size
            const minSize = 50;
            if (newWidth < minSize) {
                newWidth = minSize;
                if (maintainAspect) {
                    newHeight = newWidth / aspectRatio;
                }
            }
            if (newHeight < minSize) {
                newHeight = minSize;
                if (maintainAspect) {
                    newWidth = newHeight * aspectRatio;
                }
            }
            
            // Update image dimensions
            selectedImage.style.width = `${newWidth}px`;
            selectedImage.style.height = `${newHeight}px`;
            selectedImage.style.maxWidth = 'none';
            
            // Update handle position
            const rect = getImageRect(selectedImage);
            if (rect) {
                setHandlePosition(rect);
            }
            
            // Trigger content change
            if (editorRef.current && onContentChange) {
                onContentChange(editorRef.current.innerHTML);
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            resizeStateRef.current = null;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [selectedImage, onContentChange, getImageRect]);

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
                    {!hideSaveButton && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="ml-auto bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-2 px-4 rounded-lg text-sm 
                                      shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 transition-all duration-200 
                                      disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isSaving ? 'Saved!' : 'Save Notes'}
                        </button>
                    )}
                </div>
                <div className="relative">
                    <div
                        ref={editorRef}
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onPaste={handlePaste}
                        onInput={(e) => {
                            if (editorRef.current) {
                                isUserTypingRef.current = true;
                                if (onContentChange) {
                                    onContentChange(editorRef.current.innerHTML);
                                }
                                // Reset flag after a short delay
                                setTimeout(() => {
                                    isUserTypingRef.current = false;
                                }, 200);
                            }
                        }}
                        className="prose prose-invert max-w-none p-5 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-[#6A5ACD]/50 rounded-b-xl text-[#E0E0E0] bg-[rgba(255,255,255,0.02)]"
                    />
                    {selectedImage && handlePosition && (() => {
                        const rect = handlePosition;
                        const handleSize = 12;
                        const handleOffset = handleSize / 2;
                        
                        return (
                            <div
                                ref={resizeHandlesRef}
                                className="resize-handles-container absolute pointer-events-none"
                                style={{
                                    left: `${rect.left}px`,
                                    top: `${rect.top}px`,
                                    width: `${rect.width}px`,
                                    height: `${rect.height}px`
                                }}
                            >
                                {/* Corner handles */}
                                <div
                                    className="resize-handle absolute bg-[#6A5ACD] border-2 border-white rounded-full cursor-nwse-resize pointer-events-auto hover:bg-[#8b5cf6] transition-colors"
                                    style={{
                                        left: `-${handleOffset}px`,
                                        top: `-${handleOffset}px`,
                                        width: `${handleSize}px`,
                                        height: `${handleSize}px`
                                    }}
                                    onMouseDown={(e) => handleResizeStart(e, 'nw')}
                                />
                                <div
                                    className="resize-handle absolute bg-[#6A5ACD] border-2 border-white rounded-full cursor-nesw-resize pointer-events-auto hover:bg-[#8b5cf6] transition-colors"
                                    style={{
                                        right: `-${handleOffset}px`,
                                        top: `-${handleOffset}px`,
                                        width: `${handleSize}px`,
                                        height: `${handleSize}px`
                                    }}
                                    onMouseDown={(e) => handleResizeStart(e, 'ne')}
                                />
                                <div
                                    className="resize-handle absolute bg-[#6A5ACD] border-2 border-white rounded-full cursor-nwse-resize pointer-events-auto hover:bg-[#8b5cf6] transition-colors"
                                    style={{
                                        right: `-${handleOffset}px`,
                                        bottom: `-${handleOffset}px`,
                                        width: `${handleSize}px`,
                                        height: `${handleSize}px`
                                    }}
                                    onMouseDown={(e) => handleResizeStart(e, 'se')}
                                />
                                <div
                                    className="resize-handle absolute bg-[#6A5ACD] border-2 border-white rounded-full cursor-nesw-resize pointer-events-auto hover:bg-[#8b5cf6] transition-colors"
                                    style={{
                                        left: `-${handleOffset}px`,
                                        bottom: `-${handleOffset}px`,
                                        width: `${handleSize}px`,
                                        height: `${handleSize}px`
                                    }}
                                    onMouseDown={(e) => handleResizeStart(e, 'sw')}
                                />
                            </div>
                        );
                    })()}
                </div>
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