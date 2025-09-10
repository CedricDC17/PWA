import { useState, useEffect } from 'react';

export default function MealEditor({ day, time, initialValue = '', onSubmit, onCancel }) {
  const [text, setText] = useState(initialValue);

  useEffect(() => {
    setText(initialValue);
  }, [initialValue]);

  const submit = e => {
    e.preventDefault();
    onSubmit(text);
  };

  return (
    <div className="overlay" onClick={onCancel}>
      <form className="overlay-content" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className="btn-close" onClick={onCancel}>✖</button>
        <h2 className="overlay-title">Quoi pour {time} le {day} ?</h2>
        <input
          className="overlay-input-title"
          autoFocus
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="overlay-footer">
          <button type="submit" className="btn-save">Valider</button>
          <button type="button" className="btn-delete" onClick={onCancel}>Annuler</button>
        </div>
      </form>
    </div>
  );
}
