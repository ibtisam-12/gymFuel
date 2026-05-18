import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '../../types';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  sessionId: number | null;
}

const initialState: ChatState = {
  messages: [],
  loading: false,
  sessionId: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage(state, action: PayloadAction<ChatMessage>) {
      state.messages.push(action.payload);
    },
    setMessages(state, action: PayloadAction<ChatMessage[]>) {
      state.messages = action.payload;
    },
    setSessionId(state, action: PayloadAction<number | null>) {
      state.sessionId = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    clearChat(state) {
      state.messages = [];
      state.sessionId = null;
      state.loading = false;
    },
  },
});

export const { addMessage, setMessages, setSessionId, setLoading, clearChat } = chatSlice.actions;
export default chatSlice.reducer;

export const useChatStore = () => {
  const chatState = useSelector((state: RootState) => state.chat);
  return chatState;
};
