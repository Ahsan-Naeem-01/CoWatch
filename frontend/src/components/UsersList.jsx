import { useState } from 'react';
import { Icon } from './Icon.jsx';

export default function UsersList({ room, selfId, onRename }) {
  const [editingName, setEditingName] = useState('');
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="card-hd">
        <span className="title">Viewers</span>
        <span className="meta">
          {room.users.length} {room.users.length === 1 ? 'seat' : 'seats'}
        </span>
      </div>

      <ul className="flex-1 overflow-auto py-1 min-h-0">
        {room.users.map((u, i) => {
          const isHost = u.id === room.hostId;
          const isSelf = u.id === selfId;
          return (
            <li
              key={u.id}
              className="px-4 py-3 grid grid-cols-[36px_1fr_auto] items-center gap-3 hover:bg-surface-2/60"
            >
              <span
                className={`av av-${i % 6}`}
                style={{ width: 36, height: 36, fontSize: 12 }}
              >
                {(u.name || '?').slice(0, 1).toUpperCase()}
              </span>

              <div className="min-w-0">
                {isSelf && editing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onRename(editingName);
                      setEditing(false);
                    }}
                  >
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => setEditing(false)}
                      maxLength={24}
                      className="bg-transparent border-b border-accent text-[14px] text-fg outline-none w-full"
                    />
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      if (!isSelf) return;
                      setEditingName(u.name);
                      setEditing(true);
                    }}
                    className={`block w-full text-left text-[14px] font-medium text-fg truncate ${
                      isSelf
                        ? 'hover:text-accent cursor-text'
                        : 'cursor-default'
                    }`}
                  >
                    {u.name}
                    {isSelf && (
                      <span className="text-fg-3 font-normal"> (you)</span>
                    )}
                  </button>
                )}
                <div className="mono text-[10px] tracking-cinema uppercase text-fg-3 mt-0.5 flex items-center gap-1.5">
                  {isHost && <Icon name="crown" size={10} />}
                  {isHost ? 'HOST' : isSelf ? 'YOU' : 'VIEWER'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isSelf && (
                  <button
                    onClick={() => {
                      setEditingName(u.name);
                      setEditing(true);
                    }}
                    className="btn-icon"
                    title="Edit your name"
                    aria-label="Edit name"
                    style={{ width: 28, height: 28 }}
                  >
                    <Icon name="edit" size={12} />
                  </button>
                )}
                <span
                  className="w-1.5 h-1.5 rounded-full bg-success"
                  title="online"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
