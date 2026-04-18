import { useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { DeveloperLanding } from './components/DeveloperLanding';

export default function App() {
  const [view, setView] = useState<'landing' | 'chat'>('landing');

  if (view === 'landing') {
    return <DeveloperLanding onStart={() => setView('chat')} />;
  }

  return <ChatInterface />;
}
