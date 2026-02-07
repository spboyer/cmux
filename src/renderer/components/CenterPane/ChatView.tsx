import * as React from 'react';
import { useRef, useEffect, useState, useCallback } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import { Icon } from '../Icon';

function generateTitle(content: string): string {
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length <= 50) return firstLine;
  return firstLine.substring(0, 50) + '…';
}

export function ChatView() {
  const { state, dispatch } = useAppState();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const conversationIdRef = useRef<string | null>(state.activeConversationId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync with state
  useEffect(() => {
    conversationIdRef.current = state.activeConversationId;
  }, [state.activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [state.chatMessages]);

  // Refocus input when response completes
  useEffect(() => {
    if (!state.chatLoading) {
      inputRef.current?.focus();
    }
  }, [state.chatLoading]);

  // Fetch available models on mount
  useEffect(() => {
    if (state.availableModels.length > 0) return;
    window.electronAPI.copilot.listModels()
      .then(models => {
        dispatch({ type: 'SET_AVAILABLE_MODELS', payload: { models } });
        // Default to last-used model from localStorage, or first model
        if (!state.selectedModel) {
          const lastUsed = localStorage.getItem('lastUsedModel');
          const defaultModel = lastUsed && models.some(m => m.id === lastUsed)
            ? lastUsed
            : models[0]?.id ?? null;
          dispatch({ type: 'SET_SELECTED_MODEL', payload: { model: defaultModel } });
        }
      })
      .catch(() => { /* models unavailable — picker will be hidden */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [pickerOpen]);

  // Save conversation to disk after streaming completes
  const saveConversation = useCallback((messages: typeof state.chatMessages) => {
    const convId = conversationIdRef.current;
    if (!convId) return;
    const conv = state.conversations.find(c => c.id === convId);
    if (!conv) return;

    window.electronAPI.conversation.save({
      id: convId,
      title: conv.title,
      model: state.selectedModel ?? undefined,
      messages,
      createdAt: conv.createdAt,
      updatedAt: Date.now(),
    });
  }, [state.conversations, state.selectedModel]);

  // Listen for streaming chunks from main process
  useEffect(() => {
    const cleanupChunk = window.electronAPI.copilot.onChunk((messageId, content) => {
      dispatch({ type: 'APPEND_CHAT_CHUNK', payload: { messageId, content } });
    });

    const cleanupDone = window.electronAPI.copilot.onDone(() => {
      dispatch({ type: 'SET_CHAT_LOADING', payload: { loading: false } });
    });

    const cleanupError = window.electronAPI.copilot.onError((messageId, error) => {
      dispatch({ type: 'APPEND_CHAT_CHUNK', payload: { messageId, content: `Error: ${error}` } });
      dispatch({ type: 'SET_CHAT_LOADING', payload: { loading: false } });
    });

    return () => {
      cleanupChunk();
      cleanupDone();
      cleanupError();
    };
  }, [dispatch]);

  // Save conversation when loading finishes (streaming done/error)
  const prevLoadingRef = useRef(state.chatLoading);
  useEffect(() => {
    if (prevLoadingRef.current && !state.chatLoading) {
      saveConversation(state.chatMessages);
    }
    prevLoadingRef.current = state.chatLoading;
  }, [state.chatLoading, state.chatMessages, saveConversation]);

  const handleSend = () => {
    const content = inputValue.trim();
    if (!content || state.chatLoading) return;

    let convId = state.activeConversationId;

    // Create a new conversation if none is active
    if (!convId) {
      convId = `conv-${Date.now()}`;
      const now = Date.now();
      const title = generateTitle(content);
      dispatch({
        type: 'ADD_CONVERSATION',
        payload: {
          conversation: { id: convId, title, createdAt: now, updatedAt: now },
        },
      });
    }

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content,
      timestamp: Date.now(),
    };

    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { message: userMessage } });
    setInputValue('');

    // Create placeholder assistant message for streaming
    const assistantMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant' as const,
      content: '',
      timestamp: Date.now(),
    };

    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { message: assistantMessage } });
    dispatch({ type: 'SET_CHAT_LOADING', payload: { loading: true } });

    // Remember last-used model
    if (state.selectedModel) {
      localStorage.setItem('lastUsedModel', state.selectedModel);
    }

    // Send to main process via IPC
    window.electronAPI.copilot.send(convId, content, assistantMessage.id, state.selectedModel ?? undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Stop propagation to prevent global shortcuts from firing
    e.stopPropagation();

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedModelName = state.availableModels.find(m => m.id === state.selectedModel)?.name
    ?? state.selectedModel ?? 'Model';

  return (
    <div className="chat-view">
      <div className="chat-messages">
        {state.chatMessages.length === 0 ? (
          <div className="chat-empty">
            <Icon name="copilot" size={48} />
            <p>{state.activeConversationId ? 'No messages yet' : 'Start a new conversation'}</p>
          </div>
        ) : (
          state.chatMessages.map(msg => (
            <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
              <div className="chat-message-content">
                {msg.content || (msg.role === 'assistant' && state.chatLoading ? '...' : '')}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Copilot..."
            disabled={state.chatLoading}
            rows={1}
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim() || state.chatLoading}
            title="Send message"
          >
            <Icon name="chevron-right" size="sm" />
          </button>
        </div>
        {state.availableModels.length > 0 && (
          <div className="chat-input-footer">
            <div className="model-picker" ref={pickerRef}>
              <button
                className="model-picker-btn"
                onClick={() => setPickerOpen(prev => !prev)}
                disabled={state.chatLoading}
                title="Select model"
              >
                {selectedModelName} ▾
              </button>
              {pickerOpen && (
                <div className="model-picker-dropdown">
                  {state.availableModels.map(m => (
                    <button
                      key={m.id}
                      className={`model-picker-item${m.id === state.selectedModel ? ' active' : ''}`}
                      onClick={() => {
                        dispatch({ type: 'SET_SELECTED_MODEL', payload: { model: m.id } });
                        setPickerOpen(false);
                      }}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
