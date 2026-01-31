import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { TodayView } from './components/TodayView';
import { FeedView } from './components/FeedView';
import { SummaryView } from './components/SummaryView';
import { UIKitView } from './components/UiKitView';
import { SettingsView } from './components/SettingsView';

type Tab = 'today' | 'feed' | 'summary' | 'ui-kit' | 'settings';

function getInitialTab(): Tab {
  if (typeof window === 'undefined') return 'today';

  const path = window.location.pathname.replace(/\/+$/, '');

  if (path.endsWith('/today')) return 'today';
  if (path.endsWith('/feed')) return 'feed';
  if (path.endsWith('/summary')) return 'summary';
  if (path.endsWith('/ui-kit')) return 'ui-kit';
  if (path.endsWith('/settings')) return 'settings';

  return 'today';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab);

  // Синхронизируем активную вкладку с URL (history API), чтобы при перезагрузке
  // оставаться на том же экране без полноценного роутера.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const newPath = `/${activeTab === 'today' ? '' : activeTab}`;
    window.history.replaceState(null, '', newPath || '/');
  }, [activeTab]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  return (
    <Layout activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === 'today' && <TodayView />}
      {activeTab === 'feed' && <FeedView />}
      {activeTab === 'summary' && <SummaryView />}
      {activeTab === 'ui-kit' && <UIKitView />}
      {activeTab === 'settings' && <SettingsView />}
    </Layout>
  );
}
