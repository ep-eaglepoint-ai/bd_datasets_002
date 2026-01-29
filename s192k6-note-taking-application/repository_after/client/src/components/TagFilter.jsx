export default function TagFilter({ tags, activeTag, onSelectTag, onClear }) {
  return (
    <div className="tag-filter">
      <h2>Tags</h2>
      <div className="tag-list">
        {tags.map((tag) => (
          <button
            key={tag.id}
            className={activeTag === tag.name ? "tag active" : "tag"}
            onClick={() => onSelectTag(tag.name)}
          >
            {tag.name} ({tag.count})
          </button>
        ))}
      </div>

      {activeTag && (
        <div className="active-filter">
          Active filter: <strong>{activeTag}</strong>
          <button onClick={onClear} className="clear-btn">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
