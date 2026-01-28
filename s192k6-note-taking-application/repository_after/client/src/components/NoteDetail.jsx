export default function NoteDetail({ note, onBack }) {
    return (
        <div className="note-detail">
            <button onClick={onBack} className="secondary">
                ← Back to Notes
            </button>
            <h2>{note.title}</h2>
            <p className="note-id">Note ID: {note.id}</p>
            <div className="note-content">
                <p>{note.content}</p>
            </div>
            <div className="tags">
                {note.tags.map((t) => (
                    <span key={t} className="tag-label">
                        {t}
                    </span>
                ))}
            </div>
        </div>
    );
}
