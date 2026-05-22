import { useState } from 'react';

export default function UsersList({ room, selfId, onRename }) {
  const [editingName, setEditingName] = useState('');
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-bone-300/10 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-cinema text-bone-300">
          {room.users.length} in the room
        </span>
        <span className="font-mono text-[10px] uppercase tracking-cinema text-ember-400">
          host present
        </span>
      </div>

      <ul className="flex-1 overflow-auto thin-scroll py-2">
        {room.users.map((u) => {
          const isHost = u.id === room.hostId;
          const isSelf = u.id === selfId;
          return (
            <li
              key={u.id}
              className="px-4 py-3 flex items-center gap-3 border-b border-bone-300/5 last:border-b-0"
            >
              <Avatar name={u.name} accent={isHost} />
              <div className="flex-1 min-w-0">
                {isSelf && editing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onRename(editingName);
                      setEditing(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => setEditing(false)}
                      maxLength={24}
                      className="bg-transparent border-b border-ember-500 font-mono text-sm text-bone-50 outline-none w-full"
                    />
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      if (!isSelf) return;
                      setEditingName(u.name);
                      setEditing(true);
                    }}
                    className={`block w-full text-left text-bone-50 truncate ${
                      isSelf ? 'hover:text-ember-400 cursor-text' : 'cursor-default'
                    }`}
                  >
                    {u.name}
                  </button>
                )}
                <div className="font-mono text-[10px] tracking-cinema uppercase text-bone-300/60 mt-0.5">
                  {isHost ? 'HOST' : isSelf ? 'YOU' : 'VIEWER'}
                </div>
              </div>
              {isHost && <Ribbon>HOST</Ribbon>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Avatar({ name, accent }) {
  const letter = (name || '?').slice(0, 1).toUpperCase();
  return (
    <span
      className={`w-9 h-9 flex items-center justify-center font-display text-lg ${
        accent
          ? 'bg-ember-500 text-ink-900'
          : 'bg-ink-700 text-bone-100 border border-bone-300/15'
      }`}
    >
      {letter}
    </span>
  );
}

function Ribbon({ children }) {
  return (
    <span className="font-mono text-[9px] uppercase tracking-cinema bg-ember-500/15 text-ember-400 border border-ember-500/40 px-1.5 py-0.5">
      {children}
    </span>
  );
}
