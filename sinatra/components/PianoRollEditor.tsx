import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MidiNote, previewMidiNotes } from '../api';
import { InstrumentType, MUSICAL_KEYS } from '../types';
import { Play, Square, Loader2 } from 'lucide-react';

interface PianoRollEditorProps {
    notes: MidiNote[];
    onChange: (notes: MidiNote[]) => void;
    onClose: () => void;
    instrument: InstrumentType;
    trackName: string;
}

const NOTE_HEIGHT_PX = 20;
const PX_PER_SECOND = 100;
const MIN_NOTE_DURATION = 0.1;
const SNAP_GRID = 0.125; // 1/16th note at 120bpm approx

// Helper to snap time to grid
const snapToGrid = (val: number, grid: number) => {
    return Math.round(val / grid) * grid;
};

// Start from C1 (24) to C7 (96)
const MIN_PITCH = 24;
const MAX_PITCH = 96;
const NUM_KEYS = MAX_PITCH - MIN_PITCH + 1;

export const PianoRollEditor: React.FC<PianoRollEditorProps> = ({
    notes,
    onChange,
    onClose,
    instrument,
    trackName
}) => {
    const [zoom, setZoom] = useState(1);
    const [scrollTop, setScrollTop] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Stop audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handlePlay = async () => {
        if (isPlaying) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            setIsPlaying(false);
            return;
        }

        setIsLoadingAudio(true);
        try {
            const blob = await previewMidiNotes(notes, instrument);
            const url = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.src = url;
            } else {
                audioRef.current = new Audio(url);
                audioRef.current.onended = () => setIsPlaying(false);
            }

            await audioRef.current.play();
            setIsPlaying(true);
        } catch (e) {
            console.error("Preview failed", e);
            alert("Failed to play preview");
        } finally {
            setIsLoadingAudio(false);
        }
    };

    // Local state for dragging
    const [dragState, setDragState] = useState<{
        type: 'move' | 'resize-left' | 'resize-right' | 'create';
        noteIndex: number; // -1 for create
        startX: number;
        startY: number;
        originalStart: number;
        originalEnd: number;
        originalPitch: number;
    } | null>(null);

    // Selection state
    const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(null);

    // Calculate canvas width based on last note
    const duration = useMemo(() => {
        if (notes.length === 0) return 10;
        return Math.max(10, ...notes.map(n => n.end)) + 2;
    }, [notes]);

    const widthPx = duration * PX_PER_SECOND * zoom;
    const heightPx = NUM_KEYS * NOTE_HEIGHT_PX;

    // Utility to get time/pitch from mouse coordinates
    const getCoordinates = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return { time: 0, pitch: 0 };
        const rect = scrollContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
        const y = e.clientY - rect.top + scrollContainerRef.current.scrollTop;

        // Time
        const time = Math.max(0, x / (PX_PER_SECOND * zoom));

        // Pitch (inverted: higher y = lower pitch)
        // 0 is top (MAX_PITCH), heightPx is bottom (MIN_PITCH)
        const pitchIndex = Math.floor(y / NOTE_HEIGHT_PX);
        const pitch = MAX_PITCH - pitchIndex;

        return { time, pitch: Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch)) };
    };

    const handleMouseDown = (e: React.MouseEvent, index: number, type: 'move' | 'resize-left' | 'resize-right') => {
        e.stopPropagation();
        const note = notes[index];
        setSelectedNoteIndex(index);
        setDragState({
            type,
            noteIndex: index,
            startX: e.clientX,
            startY: e.clientY,
            originalStart: note.start,
            originalEnd: note.end,
            originalPitch: note.pitch,
        });
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        // If clicking empty space, deselect or create note?
        // Let's implement double-click to create, click to deselect
        setSelectedNoteIndex(null);
    };

    const handleCanvasDoubleClick = (e: React.MouseEvent) => {
        const { time, pitch } = getCoordinates(e);
        const start = snapToGrid(time, SNAP_GRID);
        const newNote: MidiNote = {
            pitch,
            start,
            end: start + 0.25, // default duration
            velocity: 100,
        };
        onChange([...notes, newNote]);
    }

    // --- Drag Logic ---
    useEffect(() => {
        if (!dragState) return;

        const handleMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - dragState.startX;
            const dy = e.clientY - dragState.startY;
            const dTime = dx / (PX_PER_SECOND * zoom);

            // Calculate pitch change (steps of NOTE_HEIGHT_PX)
            // Positive dy (down) means pitch decreases
            const dPitch = -Math.round(dy / NOTE_HEIGHT_PX);

            const newNotes = [...notes];
            const note = { ...newNotes[dragState.noteIndex] };

            if (dragState.type === 'move') {
                // Quantize start time
                const rawStart = dragState.originalStart + dTime;
                const snappedStart = snapToGrid(rawStart, SNAP_GRID);
                const duration = note.end - note.start;

                note.start = Math.max(0, snappedStart);
                note.end = note.start + duration;
                note.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, dragState.originalPitch + dPitch));
            } else if (dragState.type === 'resize-right') {
                const rawEnd = dragState.originalEnd + dTime;
                const snappedEnd = snapToGrid(rawEnd, SNAP_GRID);
                note.end = Math.max(note.start + MIN_NOTE_DURATION, snappedEnd);
            } else if (dragState.type === 'resize-left') {
                const rawStart = dragState.originalStart + dTime;
                const snappedStart = snapToGrid(rawStart, SNAP_GRID);
                const maxStart = note.end - MIN_NOTE_DURATION;
                note.start = Math.max(0, Math.min(maxStart, snappedStart));
            }

            newNotes[dragState.noteIndex] = note;
            onChange(newNotes);
        };

        const handleMouseUp = () => {
            setDragState(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, notes, onChange, zoom]);

    // Handle delete key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteIndex !== null) {
                const newNotes = notes.filter((_, i) => i !== selectedNoteIndex);
                onChange(newNotes);
                setSelectedNoteIndex(null);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedNoteIndex, notes, onChange]);

    // Generate piano keys
    const keys = [];
    for (let p = MAX_PITCH; p >= MIN_PITCH; p--) {
        const isBlack = [1, 3, 6, 8, 10].includes(p % 12);
        const noteName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][p % 12];
        const octave = Math.floor(p / 12) - 1;
        keys.push(
            <div
                key={p}
                className={`h-[${NOTE_HEIGHT_PX}px] border-b border-zinc-800 flex items-center justify-end pr-1 text-[10px] ${isBlack ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-300 text-zinc-900'
                    }`}
                style={{ height: NOTE_HEIGHT_PX }}
            >
                {noteName === 'C' && <span className="mr-1 font-bold">{noteName}{octave}</span>}
            </div>
        );
    }

    // Generate grid lines
    const gridLines = [];
    const beatWidth = (60 / 120) * PX_PER_SECOND * zoom; // Assuming 120bpm for grid visualization, or passed props
    // For now just draw vertical lines every second
    for (let t = 0; t <= duration; t += 0.5) {
        gridLines.push(
            <div
                key={t}
                className={`absolute top-0 bottom-0 border-l ${t % 1 === 0 ? 'border-zinc-700' : 'border-zinc-800'}`}
                style={{ left: t * PX_PER_SECOND * zoom }}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
            <div className="bg-zinc-950 border border-zinc-800 w-full h-full max-w-6xl rounded-lg shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50">
                    <div className="flex items-center gap-4">
                        <h2 className="font-bold text-zinc-200">Piano Roll</h2>
                        <div className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
                            {trackName} • {instrument}
                        </div>

                        {/* Play Button */}
                        <button
                            onClick={handlePlay}
                            disabled={isLoadingAudio}
                            className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${isPlaying
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                                }`}
                            title={isPlaying ? "Stop" : "Play Clip"}
                        >
                            {isLoadingAudio ? (
                                <Loader2 className="animate-spin" size={16} />
                            ) : isPlaying ? (
                                <Square size={16} fill="currentColor" />
                            ) : (
                                <Play size={16} fill="currentColor" />
                            )}
                        </button>

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1 bg-zinc-900 rounded p-0.5 border border-zinc-800">
                            <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="px-2 text-zinc-400 hover:text-white">-</button>
                            <span className="text-xs text-zinc-500 w-8 text-center">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="px-2 text-zinc-400 hover:text-white">+</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 mr-2">
                            Double-click to add note • Ctrl+Scroll to zoom • Drag to move/resize • Del to delete
                        </span>
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 rounded bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white"
                        >
                            Done
                        </button>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Piano Keys (Left) */}
                    <div className="w-16 overflow-hidden border-r border-zinc-700 bg-zinc-900 shrink-0 relative">
                        <div
                            style={{
                                transform: `translateY(-${scrollTop}px)`
                            }}
                        >
                            {keys}
                        </div>
                    </div>

                    {/* Grid (Right) */}
                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-auto relative bg-zinc-900/30 cursor-crosshair select-none"
                        onMouseDown={handleCanvasMouseDown}
                        onDoubleClick={handleCanvasDoubleClick}
                        onScroll={(e) => {
                            setScrollTop(e.currentTarget.scrollTop);
                        }}
                        onWheel={(e) => {
                            if (e.ctrlKey) {
                                e.preventDefault();
                                const delta = -e.deltaY;
                                setZoom(z => Math.max(0.2, Math.min(5, z + delta * 0.001)));
                            }
                        }}
                    >
                        <div
                            style={{
                                width: widthPx,
                                height: heightPx,
                                position: 'relative'
                            }}
                        >
                            {/* Background Grid */}
                            <div className="absolute inset-0 pointer-events-none">
                                {/* Horizontal lines */}
                                {Array.from({ length: NUM_KEYS }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="border-b border-white/5 w-full absolute"
                                        style={{ top: i * NOTE_HEIGHT_PX, height: NOTE_HEIGHT_PX }}
                                    />
                                ))}
                                {/* Vertical lines */}
                                {gridLines}
                            </div>

                            {/* Notes */}
                            {notes.map((note, i) => {
                                const isSelected = i === selectedNoteIndex;
                                const top = (MAX_PITCH - note.pitch) * NOTE_HEIGHT_PX;
                                const left = note.start * PX_PER_SECOND * zoom;
                                const width = (note.end - note.start) * PX_PER_SECOND * zoom;

                                return (
                                    <div
                                        key={i}
                                        className={`absolute rounded-sm border text-[9px] flex items-center justify-center overflow-hidden cursor-move group ${isSelected ? 'bg-indigo-500 border-indigo-300 z-10' : 'bg-indigo-500/80 border-indigo-500/50'
                                            }`}
                                        style={{
                                            top,
                                            left,
                                            width: Math.max(4, width),
                                            height: NOTE_HEIGHT_PX - 1,
                                        }}
                                        onMouseDown={(e) => handleMouseDown(e, i, 'move')}
                                    >
                                        {/* Resize Handles */}
                                        <div
                                            className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-white/20"
                                            onMouseDown={(e) => handleMouseDown(e, i, 'resize-left')}
                                        />
                                        <span className="pointer-events-none select-none text-white/50">{note.pitch}</span>
                                        <div
                                            className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/20"
                                            onMouseDown={(e) => handleMouseDown(e, i, 'resize-right')}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
