import { Layers, PlayCircle, Globe, Sparkles, BarChart3 } from 'lucide-react';
import { Skin } from '../utils/skins';

export type TabType = 'decks' | 'review' | 'community' | 'ai-generator' | 'stats' | 'settings';

interface AndroidBottomNavProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  dueCardsCount: number;
  activeSkin?: Skin;
}

export function AndroidBottomNav({ currentTab, onTabChange, dueCardsCount, activeSkin }: AndroidBottomNavProps) {
  const tabs = [
    { id: 'decks' as TabType, label: 'Decks', icon: Layers },
    { id: 'review' as TabType, label: 'Review', icon: PlayCircle, badge: dueCardsCount > 0 ? dueCardsCount : undefined },
    { id: 'community' as TabType, label: 'Community', icon: Globe },
    { id: 'ai-generator' as TabType, label: 'AI Studio', icon: Sparkles },
    { id: 'stats' as TabType, label: 'Stats', icon: BarChart3 },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto backdrop-blur-xl border-t px-2 py-1.5 z-40 flex items-center justify-between sm:justify-around shadow-2xl transition-colors overflow-x-auto scrollbar-none"
      style={{
        backgroundColor: activeSkin ? `${activeSkin.colors.bg}f2` : 'rgba(2, 6, 23, 0.95)',
        borderColor: activeSkin?.colors.border || 'rgba(30, 41, 59, 0.8)',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        const accentColor = activeSkin?.colors.accent || '#818cf8';

        return (
          <button
            key={tab.id}
            id={`nav-tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all relative"
            style={{
              color: isActive ? accentColor : (activeSkin?.colors.textSecondary || '#94a3b8'),
            }}
          >
            <div className="relative">
              <div
                className="p-1.5 rounded-full transition-all duration-200"
                style={
                  isActive
                    ? {
                        backgroundColor: activeSkin ? `${activeSkin.colors.accent}20` : 'rgba(99, 102, 241, 0.2)',
                        boxShadow: activeSkin ? `0 0 12px ${activeSkin.colors.accentGlow}` : undefined,
                      }
                    : undefined
                }
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
              </div>
              {tab.badge !== undefined && (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center ring-2 ring-slate-950 animate-pulse">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>
            <span
              className="text-[11px] mt-0.5 tracking-tight font-medium"
              style={{
                color: isActive ? accentColor : (activeSkin?.colors.textMuted || '#64748b'),
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
